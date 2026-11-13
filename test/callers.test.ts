import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { segmentAt, type Segment } from "../src/core/broadcast";
import {
  CALLERS_AUTHOR,
  EXHIBIT_CALLERS,
  OPEN_LINE_CALLERS,
  type Caller,
} from "../src/core/caller-lines";
import { ALL_CALLERS, CALLERS_PER_SEGMENT, callersFor } from "../src/core/callers";
import { AVAILABLE_ITEMS, CATALOG, THE_BUREAU, type Item } from "../src/core/catalog";

const T = (iso: string) => Date.parse(iso) / 1000;
const START = T("2026-11-09T18:30:00Z");

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

describe("the switchboard's lines", () => {
  it("has 144 one-off callers: four for every exhibit and 64 on the open line", () => {
    expect(ALL_CALLERS).toHaveLength(144);
    expect(OPEN_LINE_CALLERS).toHaveLength(64);
    expect(Object.keys(EXHIBIT_CALLERS).sort()).toEqual(CATALOG.map((item) => item.slug).sort());
    for (const callers of Object.values(EXHIBIT_CALLERS)) expect(callers).toHaveLength(4);
  });

  it("never has the same caller, or the same line, twice", () => {
    for (const field of ["name", "says", "answer"] as const) {
      const values = ALL_CALLERS.map((caller) => caller[field]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("gives every caller a name, a place, a line and an answer", () => {
    for (const caller of ALL_CALLERS) {
      for (const text of [caller.name, caller.from, caller.says, caller.answer]) {
        expect(text).toBe(text.trim());
        expect(text.length).toBeGreaterThan(0);
      }
      // `from` reads after "calling from", mid-sentence.
      expect(caller.from).not.toMatch(/[.!?]$/);
    }
  });

  // Notes 0003, 0009 and 0014: callers are characters, never customers, and
  // the price is never theirs to say.
  it("never has a caller who bought, ordered, received or reviewed anything", () => {
    const customerTalk =
      /\b(bought|buy|buying|purchased?|ordered|my order|delivered|delivery|arrived|received|shipped|refund|review(ed|s)?|stars?|recommend(ed)?|worth every)\b/i;
    for (const caller of ALL_CALLERS) {
      expect(caller.says).not.toMatch(customerTalk);
      expect(caller.name).not.toMatch(customerTalk);
    }
  });

  it("never names a price or an amount of money", () => {
    const money = /[$£€¢]|\b(dollars?|bucks|cents|percent|% off|discount|half price)\b/i;
    for (const caller of ALL_CALLERS) {
      expect(`${caller.says} ${caller.answer}`).not.toMatch(money);
    }
  });

  it("is credited to the Bureau until writers take seats (note 0002)", () => {
    expect(CALLERS_AUTHOR).toBe(THE_BUREAU);
  });
});

describe("who is on the line", () => {
  it("puts three different callers on every segment, the exhibit's own first", () => {
    for (const segment of segmentsFrom(START, 200)) {
      const callers = callersFor(segment);
      expect(callers).toHaveLength(CALLERS_PER_SEGMENT);
      expect(new Set(callers).size).toBe(CALLERS_PER_SEGMENT);
      expect(EXHIBIT_CALLERS[segment.item.slug]).toContain(callers[0]);
      expect(OPEN_LINE_CALLERS).toContain(callers[1]);
      expect(OPEN_LINE_CALLERS).toContain(callers[2]);
    }
  });

  it("is the same for everyone, all through a segment", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: T("2026-01-01T00:00:00Z"), max: T("2028-12-31T00:00:00Z") }),
        (t) => {
          const segment = segmentAt(t);
          expect(callersFor(segmentAt(segment.startsAt))).toEqual(callersFor(segment));
          expect(callersFor(segmentAt(segment.endsAt - 1))).toEqual(callersFor(segment));
        },
      ),
    );
  });

  it("changes the whole open line from each segment to the next", () => {
    let before: readonly Caller[] = [];
    for (const segment of segmentsFrom(START, 200)) {
      const openLine = callersFor(segment).slice(1);
      for (const caller of openLine) expect(before).not.toContain(caller);
      before = openLine;
    }
  });

  it("gets through the whole open line before anyone on it rings twice", () => {
    const round = OPEN_LINE_CALLERS.length / (CALLERS_PER_SEGMENT - 1);
    const heard = segmentsFrom(START, round).flatMap((segment) => callersFor(segment).slice(1));
    expect(new Set(heard).size).toBe(OPEN_LINE_CALLERS.length);
  });

  it("gives an exhibit's own callers turns, one airing after another", () => {
    const heard = new Map<string, string[]>();
    for (const segment of segmentsFrom(START, 400)) {
      const [first] = callersFor(segment) as [Caller];
      heard.set(segment.item.slug, [...(heard.get(segment.item.slug) ?? []), first.name]);
    }
    for (const item of AVAILABLE_ITEMS) {
      const names = heard.get(item.slug) ?? [];
      const own = (EXHIBIT_CALLERS[item.slug] ?? []).map((caller) => caller.name);
      expect(names.length).toBeGreaterThan(own.length);
      // Every airing's caller is the one after the last airing's.
      let last: string | undefined;
      for (const name of names) {
        if (last !== undefined) expect(name).toBe(own[(own.indexOf(last) + 1) % own.length]);
        last = name;
      }
    }
  });

  it("falls back to the open line for an exhibit with no callers of its own", () => {
    const segment = segmentAt(START);
    const stranger: Item = { ...segment.item, slug: "not-in-the-switchboard" };
    const callers = callersFor({ ...segment, item: stranger });
    expect(callers).toHaveLength(CALLERS_PER_SEGMENT);
    expect(new Set(callers).size).toBe(CALLERS_PER_SEGMENT);
    for (const caller of callers) expect(OPEN_LINE_CALLERS).toContain(caller);
  });
});

describe("a segment's turn and airing (what the switchboard turns on)", () => {
  it("counts every segment, one after another, across midnight and clock changes", () => {
    // From late October 2026 to mid March 2027: both clock changes.
    const segments = segmentsFrom(T("2026-10-25T12:00:00Z"), 9 * 140);
    let last: number | undefined;
    for (const segment of segments) {
      if (last !== undefined) expect(segment.turn).toBe(last + 1);
      last = segment.turn;
    }
    expect(segments).toHaveLength(9 * 140);
  });

  it("counts each item's airings, one after another", () => {
    const last = new Map<string, number>();
    for (const segment of segmentsFrom(START, 600)) {
      const before = last.get(segment.item.slug);
      if (before !== undefined) expect(segment.airing).toBe(before + 1);
      last.set(segment.item.slug, segment.airing);
    }
    expect(last.size).toBe(AVAILABLE_ITEMS.length);
  });
});
