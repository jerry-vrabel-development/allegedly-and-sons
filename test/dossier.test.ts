import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { AnalyticsEvent } from "../src/core/analytics";
import { CATALOG, wingItems, type WingId } from "../src/core/catalog";
import {
  awardsForEvent,
  awardsForOrder,
  BADGES,
  cardId,
  codenameFor,
  isAward,
  RANKS,
  rankFor,
  TOTAL_AWARDS,
  wingAwardId,
  wingCommendations,
  withWingAwards,
} from "../src/core/dossier";
import { VAULT_CARDS, vaultAwardId } from "../src/core/vault";

const BASE: AnalyticsEvent = {
  event: "item_viewed",
  itemSlug: "alien-paperclip",
  ts: 1,
  visitorId: "a".repeat(32),
  referrerHost: null,
  country: null,
  utmSource: null,
  utmCampaign: null,
  ref: null,
  channel: null,
  readDepth: null,
};

describe("awards", () => {
  it("knows every badge, one card per catalog item, the vault cards, and nothing else", () => {
    for (const badge of BADGES) expect(isAward(badge.id)).toBe(true);
    for (const item of CATALOG) expect(isAward(cardId(item.slug))).toBe(true);
    for (const card of VAULT_CARDS) expect(isAward(vaultAwardId(card.id))).toBe(true);
    for (const bogus of [
      "",
      "card:",
      "card:xenoclip",
      "vault:",
      "vault:alien-paperclip",
      "card:the-moons-receipt",
      "admin",
      "Case-Closed",
    ]) {
      expect(isAward(bogus)).toBe(false);
    }
    expect(TOTAL_AWARDS).toBe(
      BADGES.length + wingCommendations().length + CATALOG.length + VAULT_CARDS.length,
    );
  });

  it("never grants a wing commendation directly: it's worked out from cards", () => {
    for (const wing of wingCommendations()) expect(isAward(wingAwardId(wing.id))).toBe(false);
  });

  it("gives every badge a name, what earned it, and a hint (never icons alone)", () => {
    for (const badge of BADGES) {
      expect(badge.name).not.toBe("");
      expect(badge.earned).toMatch(/\.$/);
      expect(badge.hint).toMatch(/\.$/);
    }
  });

  it.each([
    [{ event: "lore_expanded", readDepth: "opened" }, ["first-contact"]],
    [{ event: "lore_expanded", readDepth: "finished" }, ["case-closed", "card:alien-paperclip"]],
    [{ event: "share_clicked", ref: "0a1b2c3d4e", channel: "x" }, ["town-crier"]],
    [{ event: "item_viewed" }, []],
    [{ event: "checkout_started" }, []],
    // The sharer, not the visitor, earns Recruiter (the Worker looks them up).
    [{ event: "shared_visit", ref: "0a1b2c3d4e" }, []],
  ] as const)("%j earns %j", (overrides, expected) => {
    expect(awardsForEvent({ ...BASE, ...overrides })).toEqual(expected);
  });

  it("gives a buyer Acquirer and the item's card", () => {
    expect(awardsForOrder("second-best-quill")).toEqual(["acquirer", "card:second-best-quill"]);
  });
});

describe("wing commendations (note 0010)", () => {
  const offWorld = wingItems("off-world").map((item) => cardId(item.slug));

  it("comes with all four of a wing's cards", () => {
    expect(withWingAwards(offWorld).has(wingAwardId("off-world"))).toBe(true);
  });

  it("doesn't come with three of four", () => {
    expect(withWingAwards(offWorld.slice(1)).has(wingAwardId("off-world"))).toBe(false);
  });

  it("is offered for every wing once all twenty exhibits are in", () => {
    expect(wingCommendations()).toHaveLength(5);
  });

  it("needs the cards of that wing, not just any four", () => {
    const others: readonly WingId[] = [
      "cryptid",
      "unexplained",
      "royal-legendary",
      "lost-civilizations",
    ];
    const fromOtherWings = others.flatMap((wing) =>
      wingItems(wing)
        .slice(0, 1)
        .map((item) => cardId(item.slug)),
    );
    expect(fromOtherWings).toHaveLength(4);
    expect(withWingAwards(fromOtherWings).has(wingAwardId("off-world"))).toBe(false);
  });

  it("keeps everything else the agent holds", () => {
    expect(withWingAwards(["acquirer"]).has("acquirer")).toBe(true);
  });
});

describe("ranks", () => {
  it("climb with commendations, topping out at all of them", () => {
    expect(rankFor(0)).toEqual({ rank: RANKS[0], next: RANKS[1] });
    expect(rankFor(1).rank.title).toBe("Junior Field Agent");
    expect(rankFor(4).rank.title).toBe("Field Agent");
    expect(rankFor(TOTAL_AWARDS)).toEqual({
      rank: { title: "Director of Improbable Acquisitions", at: TOTAL_AWARDS },
      next: undefined,
    });
  });

  it("treat a nonsense count as a civilian", () => {
    expect(rankFor(-1).rank.title).toBe("Civilian Informant");
  });

  it("never move an existing threshold, so no agent loses a rank", () => {
    const at = (title: string) => RANKS.find((rank) => rank.title === title)?.at;
    expect(at("Junior Field Agent")).toBe(1);
    expect(at("Field Agent")).toBe(3);
    expect(at("Senior Field Agent")).toBe(5);
    expect(at("Senior Treasure Hunter")).toBe(6);
    expect(at("Case Officer")).toBe(10);
    expect(at("Station Chief")).toBe(15);
  });

  it("are in order and reachable", () => {
    const ats = RANKS.map((rank) => rank.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
    expect(Math.max(...ats)).toBeLessThanOrEqual(TOTAL_AWARDS);
  });
});

describe("codenameFor", () => {
  it("is two words, stable for a visitor, and always valid", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[0-9a-f]{32}$/), (id) => {
        const name = codenameFor(id);
        expect(name).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
        expect(codenameFor(id)).toBe(name);
      }),
    );
  });

  it("falls back to a fixed name for a malformed id instead of breaking", () => {
    expect(codenameFor("not a visitor id")).toBe("Velvet Platypus");
  });

  it("varies between visitors", () => {
    const names = new Set(
      ["00", "11", "22", "33", "44", "55"].map((p) => codenameFor(p + "0".repeat(30))),
    );
    expect(names.size).toBeGreaterThan(1);
  });
});
