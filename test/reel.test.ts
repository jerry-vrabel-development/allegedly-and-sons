import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  REEL_MS,
  REEL_RARITIES,
  confettiBit,
  milestoneTitle,
  pullFrom,
  reelGap,
  reelNameAt,
  reelNamesFrom,
  reelSteps,
  resultLines,
  type Pull,
} from "../src/client/reel";
import { MILESTONES } from "../src/core/streak";
import { VAULT_CARDS } from "../src/core/vault";
import { pullJson, type VaultState } from "../src/worker/vault";

const NAMES = ["Sock", "Card", "Thunder", "Receipt"] as const;

/** What POST /vault/pull answers, as the script receives it: plain JSON. */
function answer(overrides: Record<string, unknown> = {}): unknown {
  return {
    ok: true,
    kind: "daily",
    card: {
      id: "the-moons-receipt",
      designation: "V-004",
      name: "The Moon's Receipt",
      rarity: "Rare",
      summary: "Proof of purchase. Returns not accepted.",
      secretFile: "tides (assorted)",
    },
    duplicate: false,
    next: { dailyReady: false, bonusLeft: 1 },
    streakDays: 1,
    milestone: null,
    ...overrides,
  };
}

function pull(overrides: Partial<Pull> = {}): Pull {
  return {
    card: { designation: "V-004", name: "The Moon's Receipt", rarity: "Rare", summary: "Proof." },
    duplicate: false,
    bonusLeft: 0,
    streakDays: 0,
    milestone: undefined,
    ...overrides,
  };
}

describe("reelNamesFrom", () => {
  it("reads the card names the page lists for the reel", () => {
    expect(reelNamesFrom('["Sock","Card"]')).toEqual(["Sock", "Card"]);
  });

  it("gives nothing, so the plain lever is left alone, for anything else", () => {
    for (const bad of [null, "", "not json", "{}", "[]", '["Sock", 3]', '"Sock"', "null"]) {
      expect(reelNamesFrom(bad), String(bad)).toBeUndefined();
    }
  });
});

describe("pullFrom", () => {
  it("reads the card, whether it's new, the streak and what's left", () => {
    expect(pullFrom(answer())).toEqual({
      card: {
        designation: "V-004",
        name: "The Moon's Receipt",
        rarity: "Rare",
        summary: "Proof of purchase. Returns not accepted.",
      },
      duplicate: false,
      bonusLeft: 1,
      streakDays: 1,
      milestone: undefined,
    });
  });

  it("reads a milestone when the pull reached one", () => {
    const milestone = { days: 3, badge: "streak-regular", name: "Regular" };
    expect(pullFrom(answer({ milestone }))?.milestone).toEqual({ days: 3, name: "Regular" });
  });

  it("understands what the Worker really sends, for every card and milestone", () => {
    const vault: VaultState = {
      dailyReady: false,
      bonusLeft: 2,
      bonusEarned: 2,
      latest: undefined,
      owned: new Set(),
    };
    for (const card of VAULT_CARDS) {
      for (const days of [1, ...MILESTONES.map((m) => m.days)]) {
        const sent: unknown = JSON.parse(
          JSON.stringify(pullJson(card, "daily", vault, { status: "safe", days })),
        );
        const read = pullFrom(sent);
        expect(read?.card.name).toBe(card.name);
        expect(read?.card.rarity).toBe(card.rarity);
        expect(read?.duplicate).toBe(false);
        expect(read?.bonusLeft).toBe(2);
        expect(read?.streakDays).toBe(days);
        expect(read?.milestone?.days).toBe(MILESTONES.find((m) => m.days === days)?.days);
      }
    }
  });

  it("knows every rarity the Vault has, and no others", () => {
    expect([...new Set(VAULT_CARDS.map((card) => card.rarity))].sort()).toEqual(
      [...REEL_RARITIES].sort(),
    );
  });

  it("gives nothing for a refusal or an answer it doesn't understand", () => {
    const card = (answer() as { card: Record<string, unknown> }).card;
    const bad: unknown[] = [
      null,
      "ok",
      [],
      { ok: false, reason: "none-left" },
      answer({ ok: "true" }),
      answer({ card: null }),
      answer({ card: { ...card, name: 4 } }),
      answer({ card: { ...card, designation: undefined } }),
      answer({ card: { ...card, summary: null } }),
      answer({ card: { ...card, rarity: "Mythic" } }),
      answer({ card: { ...card, rarity: 3 } }),
      answer({ duplicate: "no" }),
      answer({ streakDays: "1" }),
      answer({ next: null }),
      answer({ next: { bonusLeft: "1" } }),
      answer({ milestone: "Regular" }),
      answer({ milestone: { days: "3", name: "Regular" } }),
      answer({ milestone: { days: 3, name: null } }),
    ];
    for (const body of bad) expect(pullFrom(body), JSON.stringify(body)).toBeUndefined();
  });

  it("never throws, whatever arrives", () => {
    fc.assert(
      fc.property(fc.anything(), (body) => {
        pullFrom(body);
      }),
    );
  });
});

describe("the spin", () => {
  it("goes round four times and stops on the drawn card", () => {
    expect(reelSteps(NAMES, "Sock")).toBe(16);
    expect(reelSteps(NAMES, "Thunder")).toBe(18);
    expect(reelNameAt(NAMES, reelSteps(NAMES, "Thunder"))).toBe("Thunder");
  });

  it("still stops, on the first card, if the draw isn't one the page listed", () => {
    expect(reelSteps(NAMES, "Unlisted")).toBe(16);
    expect(reelNameAt(NAMES, 16)).toBe("Sock");
  });

  it("shows nothing, rather than failing, with no names at all", () => {
    expect(reelSteps([], "Sock")).toBe(0);
    expect(reelNameAt([], 3)).toBe("");
  });

  it("always lands on the draw, for any list of names", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string(), { minLength: 1, maxLength: 12 }),
        fc.nat(),
        (names, pick) => {
          const drawn = names[pick % names.length] ?? "";
          expect(reelNameAt(names, reelSteps(names, drawn))).toBe(drawn);
        },
      ),
    );
  });

  it("shows every card equally often on the way: no lingering near a rarer one", () => {
    const steps = reelSteps(NAMES, "Sock");
    const shown = new Map<string, number>();
    for (let step = 1; step <= steps; step++) {
      const name = reelNameAt(NAMES, step);
      shown.set(name, (shown.get(name) ?? 0) + 1);
    }
    expect([...shown.values()]).toEqual([4, 4, 4, 4]);
  });

  it("slows down as it goes: short gaps first, long ones at the end", () => {
    const gaps = Array.from({ length: 16 }, (_, index) => reelGap(index + 1, 16, 0));
    expect(gaps[0]).toBeGreaterThanOrEqual(30);
    expect(gaps[0]).toBeLessThan(31);
    expect(gaps[15]).toBe(350);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1] ?? 0);
  });

  it("depends only on how far along it is, never on which card is showing", () => {
    expect(reelGap(8, 16, 0)).toBe(reelGap(9, 18, 0));
  });

  it("hurries to the end if it has already run well past its time", () => {
    expect(reelGap(3, 16, REEL_MS * 1.5)).toBeGreaterThan(0);
    expect(reelGap(3, 16, REEL_MS * 1.5 + 1)).toBe(0);
  });
});

describe("resultLines", () => {
  it("says the designation, the rarity in words, and whether it's new", () => {
    expect(resultLines(pull()).kicker).toBe("Vault card V-004 · Rare · New to your file");
    expect(resultLines(pull({ duplicate: true })).kicker).toBe(
      "Vault card V-004 · Rare · Duplicate",
    );
  });

  it("says the streak, in days, once there is one", () => {
    expect(resultLines(pull()).notes).toEqual([]);
    expect(resultLines(pull({ streakDays: 1 })).notes).toEqual(["Duty streak: 1 day."]);
    expect(resultLines(pull({ streakDays: 12 })).notes).toEqual(["Duty streak: 12 days."]);
  });

  it("says how many bonus pulls are left, when any are", () => {
    expect(resultLines(pull({ bonusLeft: 1 })).notes).toEqual(["You have 1 bonus pull left."]);
    expect(resultLines(pull({ streakDays: 2, bonusLeft: 3 })).notes).toEqual([
      "Duty streak: 2 days.",
      "You have 3 bonus pulls left.",
    ]);
  });
});

describe("the milestone", () => {
  it("names the day and the new rank", () => {
    expect(milestoneTitle({ days: 7, name: "Made" })).toBe("Day 7: you're Made.");
  });

  it("throws confetti up and outwards, in whole pixels and degrees", () => {
    expect(confettiBit(() => 0)).toEqual({ x: "-120px", y: "-60px", r: "-360deg" });
    expect(confettiBit(() => 0.5)).toEqual({ x: "0px", y: "-120px", r: "0deg" });
    const all = confettiBit(() => 0.999);
    expect(all).toEqual({ x: "120px", y: "-180px", r: "359deg" });
  });
});
