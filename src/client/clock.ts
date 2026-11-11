/**
 * The countdown's arithmetic (design note 0009). Pure: no DOM, so it's unit
 * tested like the core.
 */

/**
 * Whole seconds left on a clock that showed `total` seconds when the page
 * started at `startedAt`, as of `now` (both in seconds). Never below zero.
 *
 * The server says how many seconds are left and the browser only measures
 * time passing, so a visitor's wrong clock can't make it end early.
 */
export function secondsLeft(total: number, startedAt: number, now: number): number {
  return Math.max(0, Math.floor(startedAt + total - now));
}

function pad(n: number): string {
  return n < 10 ? `0${String(n)}` : String(n);
}

/** Seconds as H:MM:SS, the way the clocks show them. */
export function clockText(left: number): string {
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  return `${String(hours)}:${pad(minutes)}:${pad(left % 60)}`;
}
