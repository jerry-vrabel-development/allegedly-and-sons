/**
 * The item page's story script (design note 0001, C4). Served from
 * /assets/story.js, never inline. It reports two moments to POST /events:
 *
 * - "opened": the reader opened "Keep reading the case file".
 * - "finished": the story's last paragraph then stayed on screen for
 *   STORY_DWELL_MS, so a quick flick past it doesn't count as reading.
 *
 * Each is sent at most once per page view, with navigator.sendBeacon (it
 * survives the reader leaving the page). Without JavaScript, sendBeacon or
 * IntersectionObserver, the page works the same and reads just aren't counted.
 *
 * Finishing earns the exhibit's card (note 0003), so once "finished" is on
 * its way the page says so in words and fires CARD_EVENT, which the sound
 * module (note 0011) answers with a stamp.
 */

import { STORY_DWELL_MS } from "../core/analytics";
import { CARD_EVENT } from "./sound-script";
import { DOSSIER_PATH, EVENTS_PATH } from "../core/paths";

/** The id of a story's last paragraph, watched for "finished". */
export const STORY_END_ID = "story-end";

/** The id of the status line that says a case file earned its card. */
export const CASE_CLOSED_ID = "case-closed";

export const STORY_JS = `"use strict";
(function () {
  var box = document.querySelector("details[data-story]");
  var end = document.getElementById(${JSON.stringify(STORY_END_ID)});
  if (!box || !end || typeof navigator.sendBeacon !== "function") return;
  var item = box.getAttribute("data-story");
  var sent = {};

  function send(depth) {
    if (sent[depth]) return;
    sent[depth] = true;
    // A plain string body (sent as text/plain): the simplest beacon there is.
    navigator.sendBeacon(${JSON.stringify(EVENTS_PATH)}, JSON.stringify({ item: item, depth: depth }));
  }

  // Say the card was earned, in words, and let the sound module stamp it.
  function closed() {
    var line = document.getElementById(${JSON.stringify(CASE_CLOSED_ID)});
    var card = box.getAttribute("data-card");
    if (line && card) {
      line.textContent = "Case closed. Card " + card + " is in your dossier.";
      var link = document.createElement("a");
      link.href = ${JSON.stringify(DOSSIER_PATH)};
      link.textContent = "See your dossier";
      line.appendChild(document.createTextNode(" "));
      line.appendChild(link);
      line.appendChild(document.createTextNode("."));
    }
    document.dispatchEvent(new Event(${JSON.stringify(CARD_EVENT)}));
  }

  var timer = null;
  var watcher = null;
  if (typeof IntersectionObserver === "function") {
    watcher = new IntersectionObserver(function (entries) {
      var visible = entries[entries.length - 1].isIntersecting;
      if (visible && timer === null) {
        timer = setTimeout(function () {
          send("finished");
          watcher.disconnect();
          closed();
        }, ${String(STORY_DWELL_MS)});
      } else if (!visible && timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    });
  }

  box.addEventListener("toggle", function () {
    if (!box.open) return;
    send("opened");
    if (watcher && !sent.finished) watcher.observe(end);
  });
})();
`;
