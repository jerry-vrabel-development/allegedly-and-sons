/**
 * Honest statistics for the ledger (design note 0001, "Honest statistics").
 *
 * Every rate is shown with its sample size and a 95% Wilson score interval,
 * which behaves well for small samples and for rates near 0% or 100% (unlike
 * the textbook "rate ± 1.96 standard errors", which can go below zero).
 * Items aren't ranked until they have enough visitors to mean something.
 */

/** z for a 95% interval. */
const Z95 = 1.959963984540054;

/** Visitors an item needs before its rates are treated as more than anecdotes. */
export const MIN_VISITORS_TO_RANK = 100;

export interface Rate {
  /** successes / trials, 0..1. */
  readonly rate: number;
  /** The interval's lower and upper bounds, 0..1. */
  readonly low: number;
  readonly high: number;
  readonly successes: number;
  readonly trials: number;
}

/**
 * The rate and 95% Wilson interval for `successes` out of `trials`, or
 * undefined when there are no trials. Counts are clamped so a stray extra
 * success (say, an order without a recorded visit) can't push a rate past 100%.
 */
export function wilson(successes: number, trials: number): Rate | undefined {
  if (!Number.isFinite(trials) || trials <= 0) return undefined;
  const n = Math.floor(trials);
  const k = Math.min(Math.max(Math.floor(successes), 0), n);
  const p = k / n;
  const z2 = Z95 * Z95;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const margin = (Z95 / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    rate: p,
    // At 0 and n successes the bounds are exactly 0 and 1; floating point can miss by a hair.
    low: k === 0 ? 0 : Math.max(0, center - margin),
    high: k === n ? 1 : Math.min(1, center + margin),
    successes: k,
    trials: n,
  };
}

/** A percentage for display: "34%", or "0.4%" below 1%. */
export function percent(value: number): string {
  const pct = value * 100;
  if (pct > 0 && pct < 1) return `${pct.toFixed(1)}%`;
  return `${String(Math.round(pct))}%`;
}

/**
 * How a rate reads on the ledger: "34% (21–48%) of 63", or, when there aren't
 * enough trials yet, the raw count with a plain warning: "3 of 12 (too few to say)".
 */
export function describeRate(rate: Rate | undefined, minTrials = MIN_VISITORS_TO_RANK): string {
  if (rate === undefined) return "no data yet";
  if (rate.trials < minTrials) {
    return `${String(rate.successes)} of ${String(rate.trials)} (too few to say)`;
  }
  return `${percent(rate.rate)} (${percent(rate.low)}–${percent(rate.high)}) of ${String(rate.trials)}`;
}

/**
 * Whether two rates are clearly different: their 95% intervals don't overlap.
 * Conservative on purpose; "no clear difference yet" is the honest default.
 */
export function clearlyDifferent(a: Rate | undefined, b: Rate | undefined): boolean {
  if (a === undefined || b === undefined) return false;
  return a.low > b.high || b.low > a.high;
}
