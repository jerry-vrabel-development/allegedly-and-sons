import { describe, expect, it } from "vitest";
import { chicagoTime, nextSegment, segmentAt, type Segment } from "../src/core/broadcast";
import { AVAILABLE_ITEMS, CATALOG, THE_BUREAU } from "../src/core/catalog";
import { factLines, LORE_PER_SEGMENT, loreLines, tickerLines } from "../src/core/ticker";
import { WIRE_AUTHOR, WIRE_LINES } from "../src/core/wire-lines";

const T = (iso: string) => Date.parse(iso) / 1000;
/** 12:30pm Chicago (CST), Monday 2026-11-09: the noon segment. */
const NOON = T("2026-11-09T18:30:00Z");
/** 9:30pm Chicago: the segment before the Midnight Auction. */
const NINE = T("2026-11-10T03:30:00Z");
/** 11:30pm Chicago: in the Midnight Auction. */
const AUCTION = T("2026-11-10T05:30:00Z");

/** Every segment, in order, for a number of segments from `from`. */
function segmentsFrom(from: number, howMany: number): Segment[] {
  const segments: Segment[] = [];
  let at = from;
  for (let i = 0; i < howMany; i += 1) {
    const segment = segmentAt(at);
    segments.push(segment);
    at = segment.endsAt;
  }
  return segments;
}

describe("the Bureau's wire", () => {
  it("has 40 bulletins to start, none of them twice", () => {
    expect(WIRE_LINES).toHaveLength(40);
    expect(new Set(WIRE_LINES).size).toBe(WIRE_LINES.length);
    for (const line of WIRE_LINES) {
      expect(line).toBe(line.trim());
      expect(line).toMatch(/[.”]$/);
    }
  });

  // Every number on the ticker is a fact, so the wire has none.
  it("never uses a numeral", () => {
    for (const line of WIRE_LINES) expect(line).not.toMatch(/\d/);
  });

  // Notes 0003, 0009 and 0014: the ticker never fakes activity.
  it("never sounds like activity in the shop, a price or a deadline", () => {
    const activity =
      /[$£€¢%]|\b(bought|buy|buying|buyers?|purchas\w*|sold|selling|sales?|orders?|ordered|customers?|viewers?|watching|in stock|stock|remaining|hurry|ends|percent|discount|price[sd]?|acquired)\b/i;
    for (const line of WIRE_LINES) expect(line).not.toMatch(activity);
  });

  it("is credited to the Bureau until writers take seats (note 0002)", () => {
    expect(WIRE_AUTHOR).toBe(THE_BUREAU);
  });
});

describe("the ticker's facts", () => {
  it("says when the segment ends, what's next, tonight's auction and the collection's size", () => {
    const segment = segmentAt(NOON);
    const next = nextSegment(NOON);
    const auction = segmentAt(AUCTION);
    expect(factLines(NOON)).toEqual([
      "This segment ends at 3:00 PM Chicago time.",
      `On air next, at 3:00 PM: ${next.item.name}, 15% off.`,
      `The Midnight Auction, at 11:00 PM: ${auction.item.name}, 30% off.`,
      `${String(CATALOG.length)} exhibits in the collection, ${String(AVAILABLE_ITEMS.length)} for sale now.`,
    ]);
    expect(chicagoTime(segment.endsAt)).toBe("3:00 PM");
  });

  it("doesn't say the auction twice when the auction is what's next", () => {
    const auction = segmentAt(AUCTION);
    const lines = factLines(NINE);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("This segment ends at 11:00 PM Chicago time.");
    expect(lines[1]).toBe(`On air next, at 11:00 PM: ${auction.item.name}, 30% off.`);
  });

  it("points at tomorrow night's auction during tonight's", () => {
    const tomorrow = segmentAt(AUCTION + 86_400);
    const lines = factLines(AUCTION);
    expect(lines[0]).toBe("This segment ends at 12:00 AM Chicago time.");
    expect(lines[2]).toBe(`The Midnight Auction, at 11:00 PM: ${tomorrow.item.name}, 30% off.`);
  });

  it("is true all through a segment, and changes at its end", () => {
    const segment = segmentAt(NOON);
    expect(factLines(segment.startsAt)).toEqual(factLines(segment.endsAt - 1));
    expect(factLines(segment.endsAt)).not.toEqual(factLines(segment.endsAt - 1));
  });
});

describe("which lore runs", () => {
  it("runs three bulletins a segment, the same all through it", () => {
    const segment = segmentAt(NOON);
    expect(loreLines(segment)).toHaveLength(LORE_PER_SEGMENT);
    expect(loreLines(segmentAt(segment.startsAt))).toEqual(
      loreLines(segmentAt(segment.endsAt - 1)),
    );
    for (const line of loreLines(segment)) expect(WIRE_LINES).toContain(line);
  });

  it("never repeats a bulletin within a segment or from one segment to the next", () => {
    let before: readonly string[] = [];
    for (const segment of segmentsFrom(NOON, 200)) {
      const lore = loreLines(segment);
      expect(new Set(lore).size).toBe(LORE_PER_SEGMENT);
      for (const line of lore) expect(before).not.toContain(line);
      before = lore;
    }
  });

  it("gets through the whole wire, carrying on from its start when it reaches the end", () => {
    const heard = new Set(segmentsFrom(NOON, 14).flatMap((segment) => loreLines(segment)));
    expect(heard.size).toBe(WIRE_LINES.length);
  });
});

describe("the ticker's lines", () => {
  it("takes turns, a fact first, and never mixes the two kinds", () => {
    for (const now of [NOON, NINE, AUCTION]) {
      const lines = tickerLines(now);
      const facts = factLines(now);
      const lore = loreLines(segmentAt(now));
      expect(lines.filter((line) => line.kind === "fact").map((line) => line.text)).toEqual(facts);
      expect(lines.filter((line) => line.kind === "lore").map((line) => line.text)).toEqual(lore);
      expect(lines[0]?.kind).toBe("fact");
      expect(lines[1]?.kind).toBe("lore");
      for (const line of lines) {
        expect(WIRE_LINES.includes(line.text)).toBe(line.kind === "lore");
      }
    }
  });

  it("keeps every numeral in a fact", () => {
    for (const line of tickerLines(NOON)) {
      if (line.kind === "lore") expect(line.text).not.toMatch(/\d/);
    }
  });
});
