import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { clockText, secondsLeft } from "../src/client/clock";

describe("secondsLeft", () => {
  it("counts down from the server's total as time passes", () => {
    expect(secondsLeft(90, 1000, 1000)).toBe(90);
    expect(secondsLeft(90, 1000, 1030)).toBe(60);
    // Part of a second left still shows the whole second below it.
    expect(secondsLeft(90, 1000, 1000.4)).toBe(89);
  });

  it("stops at zero and never goes below", () => {
    expect(secondsLeft(90, 1000, 1090)).toBe(0);
    expect(secondsLeft(90, 1000, 5000)).toBe(0);
    expect(secondsLeft(0, 1000, 1000)).toBe(0);
  });

  it("is a whole number from zero to the total, whatever the clock says", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200_000 }),
        fc.double({ min: 0, max: 2e9, noNaN: true }),
        fc.double({ min: 0, max: 300_000, noNaN: true }),
        (total, startedAt, elapsed) => {
          const left = secondsLeft(total, startedAt, startedAt + elapsed);
          expect(Number.isInteger(left)).toBe(true);
          expect(left).toBeGreaterThanOrEqual(0);
          expect(left).toBeLessThanOrEqual(total);
        },
      ),
    );
  });
});

describe("clockText", () => {
  it("shows hours unpadded, minutes and seconds as two digits", () => {
    expect(clockText(0)).toBe("0:00:00");
    expect(clockText(9)).toBe("0:00:09");
    expect(clockText(75)).toBe("0:01:15");
    expect(clockText(3600)).toBe("1:00:00");
    expect(clockText(4979)).toBe("1:22:59");
    expect(clockText(36_000 + 59 * 60 + 59)).toBe("10:59:59");
  });

  it("always matches the shape the page's words promise", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 400_000 }), (left) => {
        expect(clockText(left)).toMatch(/^\d+:[0-5]\d:[0-5]\d$/);
      }),
    );
  });
});
