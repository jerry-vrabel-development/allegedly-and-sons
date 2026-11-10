/**
 * The countdown script for /broadcast and /vault (design note 0009):
 * /assets/countdown.js, first-party, never inline.
 *
 * Every element with data-seconds-left ticks down each second as H:MM:SS.
 * The server says how many seconds are left, so a visitor's wrong clock
 * can't make it end early (or reload over and over). When a clock reaches zero the page reloads, so the next segment
 * (or the end of a streak) shows its real state. Without JavaScript the
 * server's words ("1 hour 22 minutes left") stay as they are.
 *
 * The clock text isn't announced every second (no live region); the words
 * around it say what it is. At zero it fires SEGMENT_END_EVENT first, so the
 * sound module can play the stinger.
 */

/** Fired when a clock reaches zero, just before the page reloads. */
export const SEGMENT_END_EVENT = "bureau:segment-end";

export const COUNTDOWN_SCRIPT_PATH = "/assets/countdown.js";

export const COUNTDOWN_JS = `"use strict";
(function () {
  var clocks = document.querySelectorAll("[data-seconds-left]");
  if (clocks.length === 0) return;
  var started = Date.now() / 1000;
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function tick() {
    var now = Date.now() / 1000;
    var expired = false;
    for (var i = 0; i < clocks.length; i++) {
      var total = Number(clocks[i].getAttribute("data-seconds-left"));
      var left = Math.max(0, Math.floor(started + total - now));
      if (left === 0) expired = true;
      var h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
      clocks[i].textContent = h + ":" + pad(m) + ":" + pad(s);
    }
    if (expired) {
      // The sound module (note 0011) plays the segment stinger for listeners who tuned in.
      document.dispatchEvent(new Event(${JSON.stringify(SEGMENT_END_EVENT)}));
      setTimeout(function () { window.location.reload(); }, 1500);
      return;
    }
    setTimeout(tick, 1000);
  }
  tick();
})();
`;
