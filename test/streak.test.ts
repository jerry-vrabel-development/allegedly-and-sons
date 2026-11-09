import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BADGES } from "../src/core/dossier";
import {
  canRepair,
  MAX_FREEZES,
  repairDeadline,
  MILESTONES,
  milestoneBadges,
  nextMilestone,
  streakFrom,
  summarizeStreaks,
} from "../src/core/streak";
import { BONUS_BADGES } from "../src/core/vault";

const T = 20_000; // today, in vault days

/** Days T-n+1 .. T (or ending at `end`). */
const run = (n: number, end = T) => Array.from({ length: n }, (_, i) => end - n + 1 + i);

describe("a duty streak", () => {
  it("is none before the first pull", () => {
    expect(streakFrom([], T)).toMatchObject({ status: "none", days: 0, lost: 0, longest: 0 });
  });

  it("counts days in a row, safe once today's pull is in", () => {
    expect(streakFrom([T], T)).toMatchObject({ status: "safe", days: 1, freezes: 0 });
    expect(streakFrom(run(5), T)).toMatchObject({ status: "safe", days: 5, longest: 5 });
  });

  it("is due, not dead, when yesterday was the last pull", () => {
    expect(streakFrom(run(5, T - 1), T)).toMatchObject({ status: "due", days: 5, covering: 0 });
  });

  it("dies after a missed day with no freeze, and remembers what was lost", () => {
    expect(streakFrom(run(5, T - 2), T)).toMatchObject({
      status: "none",
      days: 0,
      lost: 5,
      longest: 5,
    });
  });

  it("earns a freeze every 7 days, up to 2", () => {
    expect(streakFrom(run(6), T).freezes).toBe(0);
    expect(streakFrom(run(7), T).freezes).toBe(1);
    expect(streakFrom(run(14), T).freezes).toBe(2);
    expect(streakFrom(run(21), T).freezes).toBe(MAX_FREEZES);
  });

  it("uses a freeze to cover a missed day while the streak is still due", () => {
    expect(streakFrom(run(7, T - 2), T)).toMatchObject({
      status: "due",
      days: 7,
      covering: 1,
      freezes: 0,
      freezesSpent: 0,
    });
  });

  it("keeps going past a covered day once the agent pulls again", () => {
    const days = [...run(7, T - 2), T];
    expect(streakFrom(days, T)).toMatchObject({
      status: "safe",
      days: 8,
      freezes: 0,
      freezesSpent: 1,
    });
  });

  it("dies, freezes and all, when the gap is longer than the freezes held", () => {
    const days = [...run(14, T - 4)]; // 2 freezes, 3 missed days
    expect(streakFrom(days, T)).toMatchObject({ status: "none", lost: 14, freezes: 0 });
    const restarted = [...run(14, T - 10), ...run(2)]; // a gap of 6, then two days
    expect(streakFrom(restarted, T)).toMatchObject({
      status: "safe",
      days: 2,
      freezes: 0,
      longest: 14,
    });
  });

  it("ignores duplicates, order and days in the future", () => {
    expect(streakFrom([T, T - 1, T, T - 2, T + 5], T)).toMatchObject({ status: "safe", days: 3 });
  });

  it("never claims more days than were pulled, or more freezes than allowed", () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: T - 60, max: T }), { maxLength: 60 }), (days) => {
        const streak = streakFrom(days, T);
        expect(streak.days).toBeLessThanOrEqual(new Set(days).size);
        expect(streak.longest).toBeGreaterThanOrEqual(streak.days);
        expect(streak.freezes).toBeGreaterThanOrEqual(0);
        expect(streak.freezes).toBeLessThanOrEqual(MAX_FREEZES);
        expect(streak.status === "safe").toBe(days.includes(T));
        if (streak.status === "none") expect(streak.days).toBe(0);
      }),
    );
  });
});

describe("milestones", () => {
  it("award badges at 3, 7, 14 and 30 days", () => {
    expect(milestoneBadges(2)).toEqual([]);
    expect(milestoneBadges(7)).toEqual(["streak-regular", "streak-made"]);
    expect(milestoneBadges(45)).toHaveLength(4);
    expect(nextMilestone(0)?.days).toBe(3);
    expect(nextMilestone(14)?.days).toBe(30);
    expect(nextMilestone(30)).toBeUndefined();
  });

  it("match their dossier badges by name, and each is a bonus pull", () => {
    const bonus: readonly string[] = BONUS_BADGES;
    for (const milestone of MILESTONES) {
      expect(BADGES.find((badge) => badge.id === milestone.badge)?.name).toBe(milestone.name);
      expect(bonus).toContain(milestone.badge);
    }
  });
});

describe("the Ledger's summary", () => {
  it("sums alive, safe, dead, lengths, the longest and freezes spent", () => {
    const summary = summarizeStreaks(
      [
        run(1), // safe, 1 day
        run(4, T - 1), // due, 4 days
        [...run(7, T - 2), T], // safe, 8 days, 1 freeze spent
        run(30), // safe, 30 days
        run(5, T - 3), // dead
        [], // never pulled
      ].map((days) => ({ days })),
      T,
    );
    expect(summary).toEqual({
      alive: 4,
      safe: 3,
      byLength: [1, 1, 1, 0, 1],
      dead: 1,
      longest: 30,
      freezesSpent: 1,
    });
  });
});

describe("when a streak died, and buying it back", () => {
  it("dies the day after the first missed day no freeze could cover", () => {
    expect(streakFrom(run(5, T - 2), T).diedOn).toBe(T); // missed yesterday
    expect(streakFrom(run(5, T - 3), T).diedOn).toBe(T - 1); // missed two days ago
    expect(streakFrom(run(7, T - 3), T).diedOn).toBe(T); // a freeze covered one of two
    expect(streakFrom(run(5), T).diedOn).toBeUndefined();
    expect(streakFrom(run(5, T - 1), T).diedOn).toBeUndefined();
  });

  it("can be bought back the day it died and the next, until midnight UTC", () => {
    const diedToday = streakFrom(run(5, T - 2), T);
    expect(canRepair(diedToday, T)).toBe(true);
    expect(canRepair(diedToday, T + 1)).toBe(true);
    expect(canRepair(diedToday, T + 2)).toBe(false);
    expect(repairDeadline(diedToday)).toBe((T + 2) * 86_400);
    expect(canRepair(streakFrom(run(5), T), T)).toBe(false);
    expect(repairDeadline(streakFrom(run(5), T))).toBeUndefined();
  });

  it("treats bought-back days as covered: no freeze spent, streak due again", () => {
    expect(streakFrom(run(5, T - 2), T, [T - 1])).toMatchObject({
      status: "due",
      days: 5,
      covering: 0,
      freezesSpent: 0,
    });
    // And once the agent pulls again, the streak carries on.
    expect(streakFrom([...run(5, T - 2), T], T, [T - 1])).toMatchObject({
      status: "safe",
      days: 6,
    });
  });

  it("skips bought-back days when working out when a streak died", () => {
    // Missed T-4 (bought back), T-3 and T-2: died after T-3, the first uncovered miss.
    expect(streakFrom(run(5, T - 5), T, [T - 4]).diedOn).toBe(T - 2);
  });
});
