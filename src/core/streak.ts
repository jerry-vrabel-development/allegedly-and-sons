/**
 * Duty streaks (design note 0003, G4): pure rules.
 *
 * The duty is the daily vault pull. A streak is the number of days in a row
 * an agent pulled. Every 7 days of streak earns a freeze (at most 2 held); a
 * freeze covers one missed day, automatically. Miss more days than you hold
 * freezes for and the streak dies, freezes with it. Milestones award badges,
 * and each milestone badge is also a bonus pull.
 *
 * Built for loss aversion (note 0003): the deadline is real (midnight UTC),
 * and the pages say plainly what's at stake.
 */

/** Freezes an agent can hold at once. */
export const MAX_FREEZES = 2;

/** Days of streak per freeze earned. */
export const FREEZE_EVERY = 7;

export interface Milestone {
  readonly days: number;
  /** The badge it awards (see BADGES in dossier.ts; a test keeps the names in step). */
  readonly badge: string;
  readonly name: string;
}

/** Streak milestones, shortest first. */
export const MILESTONES: readonly Milestone[] = [
  { days: 3, badge: "streak-regular", name: "Regular" },
  { days: 7, badge: "streak-made", name: "Made" },
  { days: 14, badge: "streak-fixer", name: "Fixer" },
  { days: 30, badge: "streak-kingpin", name: "Kingpin" },
];

export type StreakStatus =
  /** Pulled today. Safe until tomorrow. */
  | "safe"
  /** Alive, but today's pull is still owed: it dies at midnight UTC. */
  | "due"
  /** Never started, or dead. */
  | "none";

export interface Streak {
  readonly status: StreakStatus;
  /** Days in the current streak (0 when there's none). */
  readonly days: number;
  /** Freezes held right now. */
  readonly freezes: number;
  /** Freezes the current gap is using (shown as "a freeze covered yesterday"). */
  readonly covering: number;
  /**
   * The streak that died, if the last one broke and no new one has started,
   * or the new one started only with today's pull (so pulling first doesn't
   * cost the agent the buy-back offer).
   */
  readonly lost: number;
  /** The longest streak ever. */
  readonly longest: number;
  /** Freezes ever spent. */
  readonly freezesSpent: number;
  /**
   * The vault day the last streak died (the first day without it), whenever
   * `lost` is set; undefined otherwise. The buy-back offer runs from here.
   */
  readonly diedOn: number | undefined;
}

const NO_STREAK: Streak = {
  status: "none",
  days: 0,
  freezes: 0,
  covering: 0,
  lost: 0,
  longest: 0,
  freezesSpent: 0,
  diedOn: undefined,
};

/**
 * An agent's streak on `today`, from the vault days they pulled their free
 * pull (whole UTC days, any order, duplicates ignored, future days ignored).
 * `bridged` days were bought back ("Grease the Clerk"): a missed day that's
 * bridged doesn't count as missed and costs no freeze.
 */
export function streakFrom(
  pullDays: readonly number[],
  today: number,
  bridged: readonly number[] = [],
): Streak {
  const days = [...new Set(pullDays)].filter((day) => day <= today).sort((a, b) => a - b);
  const [first, ...rest] = days;
  if (first === undefined) return NO_STREAK;
  const covered = new Set(bridged);
  /** Days strictly between `from` and `to` that weren't bridged. */
  const missedBetween = (from: number, to: number): number => {
    let count = 0;
    for (let day = from + 1; day < to; day++) if (!covered.has(day)) count += 1;
    return count;
  };

  let length = 1;
  let held = 0;
  let longest = 1;
  let spent = 0;
  let last = first;
  for (const day of rest) {
    const missed = missedBetween(last, day);
    if (missed > held) {
      length = 0;
      held = 0;
    } else {
      held -= missed;
      spent += missed;
    }
    length += 1;
    if (length % FREEZE_EVERY === 0) held = Math.min(MAX_FREEZES, held + 1);
    longest = Math.max(longest, length);
    last = day;
  }

  if (last === today) {
    // A 1-day streak with pulls before it means today's pull restarted a dead
    // one. Report what died, as it stood before today's pull, so it can still
    // be bought back.
    const before =
      length === 1 && rest.length > 0 ? streakFrom(days.slice(0, -1), today, bridged) : NO_STREAK;
    return {
      status: "safe",
      days: length,
      freezes: held,
      covering: 0,
      lost: before.lost,
      longest,
      freezesSpent: spent,
      diedOn: before.diedOn,
    };
  }
  // Days missed since the last pull, not counting today (still open).
  const missed = missedBetween(last, today);
  if (missed > held) {
    // It died the day after the missed day that freezes couldn't cover.
    let uncovered = 0;
    let diedOn = today;
    for (let day = last + 1; day < today; day++) {
      if (covered.has(day)) continue;
      uncovered += 1;
      if (uncovered > held) {
        diedOn = day + 1;
        break;
      }
    }
    return { ...NO_STREAK, lost: length, longest, freezesSpent: spent, diedOn };
  }
  return {
    status: "due",
    days: length,
    freezes: held - missed,
    covering: missed,
    lost: 0,
    longest,
    freezesSpent: spent,
    diedOn: undefined,
  };
}

/** Vault days a dead streak can be bought back: the day it died and the next. */
export const REPAIR_WINDOW_DAYS = 2;

/** Whether a dead streak can still be bought back today. */
export function canRepair(streak: Streak, today: number): boolean {
  return streak.diedOn !== undefined && today < streak.diedOn + REPAIR_WINDOW_DAYS;
}

/** When the buy-back offer ends, in Unix seconds (midnight UTC). */
export function repairDeadline(streak: Streak): number | undefined {
  return streak.diedOn === undefined ? undefined : (streak.diedOn + REPAIR_WINDOW_DAYS) * 86_400;
}

/** The milestone badges a streak of `days` has earned. */
export function milestoneBadges(days: number): readonly string[] {
  return MILESTONES.filter((milestone) => days >= milestone.days).map((m) => m.badge);
}

/** The next milestone above `days`, if any. */
export function nextMilestone(days: number): Milestone | undefined {
  return MILESTONES.find((milestone) => milestone.days > days);
}

/** Streak lengths grouped for the Ledger, shortest first. */
export const STREAK_BUCKETS = [
  { label: "1–2 days", min: 1, max: 2 },
  { label: "3–6 days", min: 3, max: 6 },
  { label: "7–13 days", min: 7, max: 13 },
  { label: "14–29 days", min: 14, max: 29 },
  { label: "30+ days", min: 30, max: Number.POSITIVE_INFINITY },
] as const;

export interface StreakSummary {
  /** Agents whose streak is alive today (pulled today, or still can). */
  readonly alive: number;
  /** Of those, how many have pulled today already. */
  readonly safe: number;
  /** Alive streaks per bucket, in STREAK_BUCKETS order. */
  readonly byLength: readonly number[];
  /** Agents whose last streak died and who haven't started another. */
  readonly dead: number;
  /** The longest streak anyone has ever had. */
  readonly longest: number;
  /** Freezes spent, all time. */
  readonly freezesSpent: number;
}

/** Sums every agent's streak for the Ledger. */
export function summarizeStreaks(
  agents: Iterable<{ readonly days: readonly number[]; readonly bridged?: readonly number[] }>,
  today: number,
): StreakSummary {
  const aliveLengths: number[] = [];
  let safe = 0;
  let dead = 0;
  let longest = 0;
  let freezesSpent = 0;
  for (const { days, bridged = [] } of agents) {
    const streak = streakFrom(days, today, bridged);
    longest = Math.max(longest, streak.longest);
    freezesSpent += streak.freezesSpent;
    if (streak.status === "none") {
      if (streak.lost > 0) dead += 1;
      continue;
    }
    aliveLengths.push(streak.days);
    if (streak.status === "safe") safe += 1;
  }
  const alive = aliveLengths.length;
  const byLength = STREAK_BUCKETS.map(
    (bucket) => aliveLengths.filter((days) => days >= bucket.min && days <= bucket.max).length,
  );
  return { alive, safe, byLength, dead, longest, freezesSpent };
}
