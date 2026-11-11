import { describe, expect, it } from "vitest";
import { dwell } from "../src/client/dwell";

/** Timers a test can run by hand. */
function fakeTimers() {
  let next = 1;
  const pending = new Map<number, { callback: () => void; ms: number }>();
  return {
    timers: {
      set: (callback: () => void, ms: number) => {
        pending.set(next, { callback, ms });
        return next++;
      },
      clear: (handle: number) => {
        pending.delete(handle);
      },
    },
    pending,
    /** Lets every waiting timer run out. */
    runOut: () => {
      for (const [handle, { callback }] of [...pending]) {
        pending.delete(handle);
        callback();
      }
    },
  };
}

describe("dwell", () => {
  it("is done once the thing has stayed visible for the whole wait", () => {
    const clock = fakeTimers();
    let done = 0;
    const seen = dwell(3000, () => done++, clock.timers);
    seen(true);
    expect([...clock.pending.values()].map((timer) => timer.ms)).toEqual([3000]);
    expect(done).toBe(0);
    clock.runOut();
    expect(done).toBe(1);
  });

  it("doesn't count a flick past: leaving cancels the wait", () => {
    const clock = fakeTimers();
    let done = 0;
    const seen = dwell(3000, () => done++, clock.timers);
    seen(true);
    seen(false);
    expect(clock.pending.size).toBe(0);
    clock.runOut();
    expect(done).toBe(0);
    // Coming back starts a fresh wait.
    seen(true);
    clock.runOut();
    expect(done).toBe(1);
  });

  it("starts one wait however many times it's told the thing is visible", () => {
    const clock = fakeTimers();
    const seen = dwell(3000, () => undefined, clock.timers);
    seen(true);
    seen(true);
    expect(clock.pending.size).toBe(1);
    // And being told it's hidden when nothing is waiting does nothing.
    seen(false);
    seen(false);
    expect(clock.pending.size).toBe(0);
  });

  it("is done only once, and ignores everything after", () => {
    const clock = fakeTimers();
    let done = 0;
    const seen = dwell(3000, () => done++, clock.timers);
    seen(true);
    clock.runOut();
    seen(false);
    seen(true);
    expect(clock.pending.size).toBe(0);
    clock.runOut();
    expect(done).toBe(1);
  });
});
