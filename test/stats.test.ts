import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  clearlyDifferent,
  describeRate,
  MIN_VISITORS_TO_RANK,
  percent,
  wilson,
} from "../src/core/stats";

describe("wilson", () => {
  it("matches a known value: 10 of 100 is 10% (5.5%–17.4%)", () => {
    const rate = wilson(10, 100);
    expect(rate?.rate).toBe(0.1);
    expect(rate?.low).toBeCloseTo(0.0552, 3);
    expect(rate?.high).toBeCloseTo(0.1744, 3);
  });

  it("stays inside 0..1 at the edges, where the textbook formula breaks", () => {
    expect(wilson(0, 10)?.low).toBe(0);
    expect(wilson(0, 10)?.high).toBeGreaterThan(0);
    expect(wilson(10, 10)?.high).toBe(1);
    expect(wilson(10, 10)?.low).toBeLessThan(1);
  });

  it("has nothing to say about zero trials", () => {
    expect(wilson(0, 0)).toBeUndefined();
    expect(wilson(3, -1)).toBeUndefined();
    expect(wilson(1, Number.NaN)).toBeUndefined();
  });

  it("clamps impossible counts instead of passing 100%", () => {
    expect(wilson(12, 10)?.rate).toBe(1);
    expect(wilson(-2, 10)?.rate).toBe(0);
  });

  it("always brackets the rate within 0..1, and narrows as samples grow", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (n, p) => {
          const k = Math.round(p * n);
          const rate = wilson(k, n);
          expect(rate).toBeDefined();
          if (rate === undefined) return;
          expect(rate.low).toBeGreaterThanOrEqual(0);
          expect(rate.high).toBeLessThanOrEqual(1);
          expect(rate.low).toBeLessThanOrEqual(rate.rate + 1e-12);
          expect(rate.high).toBeGreaterThanOrEqual(rate.rate - 1e-12);
          const bigger = wilson(k * 4, n * 4);
          if (bigger !== undefined) {
            expect(bigger.high - bigger.low).toBeLessThanOrEqual(rate.high - rate.low + 1e-12);
          }
        },
      ),
    );
  });
});

describe("percent", () => {
  it.each([
    [0, "0%"],
    [0.004, "0.4%"],
    [0.1, "10%"],
    [0.346, "35%"],
    [1, "100%"],
  ])("%d → %s", (value, expected) => {
    expect(percent(value)).toBe(expected);
  });
});

describe("describeRate", () => {
  it("shows the rate, range and sample once there's enough data", () => {
    expect(describeRate(wilson(30, 150))).toBe("20% (14%–27%) of 150");
  });

  it("shows raw counts, plainly flagged, below the threshold", () => {
    expect(MIN_VISITORS_TO_RANK).toBe(100);
    expect(describeRate(wilson(3, 12))).toBe("3 of 12 (too few to say)");
  });

  it("says when there's nothing yet", () => {
    expect(describeRate(undefined)).toBe("no data yet");
  });
});

describe("clearlyDifferent", () => {
  it("only when the 95% ranges don't overlap", () => {
    expect(clearlyDifferent(wilson(50, 100), wilson(10, 100))).toBe(true);
    expect(clearlyDifferent(wilson(10, 100), wilson(50, 100))).toBe(true);
    expect(clearlyDifferent(wilson(12, 100), wilson(10, 100))).toBe(false);
    expect(clearlyDifferent(wilson(1, 2), undefined)).toBe(false);
  });
});
