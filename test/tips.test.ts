import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { isAward, rankedCount } from "../src/core/dossier";
import { FINDS } from "../src/core/finds";
import {
  ALL_TIPS,
  inboundTips,
  isTipAward,
  tipAwardId,
  tipAwardsForPull,
  tipExhibit,
  tipForPull,
  tipsAbout,
  type Tip,
} from "../src/core/tips";

const PENDING = CATALOG.filter((item) => item.status === "pending");
const CONTACTS = FINDS.map((find) => find.contact);

describe("the tips", () => {
  it("are every one about an exhibit that exists, from a contact in the Book", () => {
    for (const tip of ALL_TIPS) {
      expect(tipExhibit(tip).slug).toBe(tip.exhibit);
      expect(CONTACTS, tip.line).toContain(tip.contact);
    }
  });

  it("cover every pending exhibit at least twice, so a file can fill in", () => {
    for (const item of PENDING) {
      expect(tipsAbout(item.slug).length, item.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("are numbered from 1 for each exhibit, and every award id is unique and valid", () => {
    for (const item of PENDING) {
      expect(tipsAbout(item.slug).map((tip) => tip.n)).toEqual(
        tipsAbout(item.slug).map((_, index) => index + 1),
      );
    }
    const ids = ALL_TIPS.map(tipAwardId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(isAward(id), id).toBe(true);
    expect(tipAwardId({ exhibit: "martian-rubber-band", n: 2, contact: "x", line: "y" })).toBe(
      "tip:martian-rubber-band:2",
    );
  });

  it("are short, and make no promise about price, stock, shipping or a right to buy (note 0003)", () => {
    for (const tip of ALL_TIPS) {
      expect(tip.line.length, tip.line).toBeLessThan(170);
      expect(tip.line, tip.line).not.toMatch(
        /\$|\bprice|\bcost|\bpay|\bbuy|\bsale\b|\bdiscount|\bshipping|\bdeliver|\bstock\b|\breserve|\bguarantee|\bhold(?:s|ing)? (?:it|one) for\b|\bfirst dibs/i,
      );
    }
  });

  it("know what an exhibit is, and fail loudly on one that isn't", () => {
    const stray: Tip = { exhibit: "no-such-exhibit", n: 1, contact: "Loupe", line: "…" };
    expect(() => tipExhibit(stray)).toThrow('No exhibit called "no-such-exhibit".');
  });
});

describe("which tips are inbound, and in what order", () => {
  it("are only the ones about pending exhibits", () => {
    const pending = new Set(PENDING.map((item) => item.slug));
    for (const tip of inboundTips()) expect(pending.has(tip.exhibit)).toBe(true);
    expect(inboundTips()).toHaveLength(
      PENDING.reduce((n, item) => n + tipsAbout(item.slug).length, 0),
    );
  });

  it("visit every pending exhibit's first tip before any second tip", () => {
    const tips = inboundTips();
    expect(tips.slice(0, PENDING.length).map((tip) => tip.exhibit)).toEqual(
      PENDING.map((item) => item.slug),
    );
    expect(tips.slice(0, PENDING.length).every((tip) => tip.n === 1)).toBe(true);
    expect(tips[PENDING.length]?.n).toBe(2);
  });
});

describe("the tip a pull carries", () => {
  const tips = inboundTips();

  it("is the same one every time for the same pull, and walks the list pull by pull", () => {
    expect(tipForPull(1)).toBe(tips[0]);
    expect(tipForPull(2)).toBe(tips[1]);
    expect(tipForPull(1)).toBe(tipForPull(1));
  });

  it("starts again from the top once every tip has been told", () => {
    expect(tipForPull(tips.length)).toBe(tips[tips.length - 1]);
    expect(tipForPull(tips.length + 1)).toBe(tips[0]);
  });

  it("is nothing when no exhibit is on its way", () => {
    expect(tipForPull(1, [])).toBeUndefined();
    expect(tipAwardsForPull(3, [])).toEqual([]);
  });

  it("records the award for its tip", () => {
    expect(tipAwardsForPull(1)).toEqual(tips.slice(0, 1).map(tipAwardId));
  });

  it("wants a whole pull number from 1", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() => tipForPull(bad)).toThrow("a pull number is a whole number from 1");
    }
  });
});

describe("tips in the dossier", () => {
  it("are accepted as awards only when the tip was written", () => {
    expect(isTipAward("tip:martian-rubber-band:1")).toBe(true);
    expect(isAward("tip:martian-rubber-band:1")).toBe(true);
    for (const bad of ["tip:martian-rubber-band:99", "tip:no-such-exhibit:1", "tip:", "tip"]) {
      expect(isAward(bad), bad).toBe(false);
    }
  });

  it("don't count toward rank: they are a record, not a reward", () => {
    const held = new Set(["first-contact", "find:parcel", "tip:martian-rubber-band:1"]);
    expect(rankedCount(held)).toBe(2);
    expect(rankedCount(new Set())).toBe(0);
  });
});
