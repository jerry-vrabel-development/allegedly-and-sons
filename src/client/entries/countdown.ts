/**
 * The countdown script for /broadcast and /vault (design note 0009):
 * /assets/countdown.js, first-party, never inline.
 *
 * Every element with data-seconds-left ticks down each second as H:MM:SS.
 * When a clock reaches zero the page reloads, so the next segment (or the end
 * of a streak) shows its real state. Without JavaScript the server's words
 * ("1 hour 22 minutes left") stay as they are.
 *
 * The clock text isn't announced every second (no live region); the words
 * around it say what it is. At zero it fires SEGMENT_END_EVENT first, so the
 * sound script can play the stinger.
 */

import { SEGMENT_END_EVENT } from "../../core/dom-events";
import { clockText, secondsLeft } from "../clock";

/** Long enough for the stinger to start before the page goes. */
const RELOAD_DELAY_MS = 1500;

const clocks = document.querySelectorAll("[data-seconds-left]");
const started = Date.now() / 1000;

function tick(): void {
  const now = Date.now() / 1000;
  let expired = false;
  for (const clock of clocks) {
    const left = secondsLeft(Number(clock.getAttribute("data-seconds-left")), started, now);
    if (left === 0) expired = true;
    clock.textContent = clockText(left);
  }
  if (expired) {
    // The sound script (note 0011) plays the segment stinger for listeners who tuned in.
    document.dispatchEvent(new Event(SEGMENT_END_EVENT));
    setTimeout(() => {
      window.location.reload();
    }, RELOAD_DELAY_MS);
    return;
  }
  setTimeout(tick, 1000);
}

if (clocks.length > 0) tick();
