import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { BADGES } from "../src/core/dossier";
import {
  BONUS_BADGES,
  cardForRoll,
  describeWait,
  findVaultCard,
  nextDailyAt,
  oddsLabel,
  rollFrom,
  VAULT_CARDS,
  VAULT_ODDS_TOTAL,
  vaultAwardId,
  vaultDay,
} from "../src/core/vault";

describe("the vault cards", () => {
  it("have unique ids and designations, and the odds add up to 100%", () => {
    expect(new Set(VAULT_CARDS.map((card) => card.id)).size).toBe(VAULT_CARDS.length);
    expect(new Set(VAULT_CARDS.map((card) => card.designation)).size).toBe(VAULT_CARDS.length);
    expect(VAULT_ODDS_TOTAL).toBe(100);
    for (const card of VAULT_CARDS) {
      expect(card.id).toMatch(/^[a-z0-9-]{1,60}$/);
      expect(Number.isInteger(card.weight) && card.weight > 0).toBe(true);
      expect(card.summary).toMatch(/\.$/);
      expect(card.secretFile.length).toBeGreaterThan(40);
    }
  });

  it("posts each card's odds as a percentage", () => {
    expect(VAULT_CARDS.map(oddsLabel)).toEqual(["40%", "30%", "20%", "10%"]);
    expect(oddsLabel({ ...VAULT_CARDS[0], weight: 1 / 3 })).toBe("0.3%");
  });

  it("finds cards by id and names their awards", () => {
    expect(findVaultCard("the-moons-receipt")?.rarity).toBe("Rare");
    expect(findVaultCard("alien-paperclip")).toBeUndefined();
    expect(vaultAwardId("the-moons-receipt")).toBe("vault:the-moons-receipt");
  });
});

describe("drawing a card", () => {
  it("gives every card exactly its posted share of rolls", () => {
    const counts = new Map<string, number>();
    for (let roll = 0; roll < VAULT_ODDS_TOTAL; roll++) {
      const { id } = cardForRoll(roll);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const card of VAULT_CARDS) expect(counts.get(card.id)).toBe(card.weight);
  });

  it("draws in order at the edges", () => {
    expect(cardForRoll(0).id).toBe("left-sock-of-atlantis");
    expect(cardForRoll(39).id).toBe("left-sock-of-atlantis");
    expect(cardForRoll(40).id).toBe("yetis-library-card");
    expect(cardForRoll(99).id).toBe("the-moons-receipt");
  });

  it("refuses a roll outside the vault", () => {
    for (const bad of [-1, 100, 1.5, Number.NaN]) {
      expect(() => cardForRoll(bad)).toThrow(RangeError);
    }
  });

  it("turns any 32-bit number into a fair roll, rejecting the biased top sliver", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 ** 32 - 97 }), (value) => {
        const roll = rollFrom(() => value);
        expect(roll).toBe(value % 100);
        expect(() => cardForRoll(roll)).not.toThrow();
      }),
    );
    // 2^32 isn't a multiple of 100: the last 96 values would favor low rolls, so they're redrawn.
    const values = [2 ** 32 - 1, 2 ** 32 - 96, 42];
    expect(rollFrom(() => values.shift() ?? 0)).toBe(42);
  });
});

describe("bonus pulls", () => {
  it("come only from commendations earned by doing, never by buying", () => {
    const ids = BADGES.map((badge) => badge.id);
    for (const id of BONUS_BADGES) expect(ids).toContain(id);
    expect(BONUS_BADGES).not.toContain("acquirer");
    for (const id of BONUS_BADGES) expect(id.startsWith("card:")).toBe(false);
  });
});

describe("the vault's day", () => {
  it("turns over at midnight UTC", () => {
    const midnight = Date.UTC(2026, 10, 9) / 1000;
    expect(vaultDay(midnight - 1)).toBe(vaultDay(midnight) - 1);
    expect(vaultDay(midnight + 86_399)).toBe(vaultDay(midnight));
    expect(nextDailyAt(midnight)).toBe(midnight + 86_400);
    expect(nextDailyAt(midnight - 1)).toBe(midnight);
  });

  it("says how long until the next pull, in words", () => {
    expect(describeWait(0)).toBe("under a minute");
    expect(describeWait(-5)).toBe("under a minute");
    expect(describeWait(60)).toBe("1 minute");
    expect(describeWait(150)).toBe("2 minutes");
    expect(describeWait(3600)).toBe("1 hour");
    expect(describeWait(2 * 3600)).toBe("2 hours");
    expect(describeWait(3660)).toBe("1 hour 1 minute");
    expect(describeWait(5 * 3600 + 12 * 60 + 59)).toBe("5 hours 12 minutes");
  });
});
