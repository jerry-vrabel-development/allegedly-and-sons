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
 */

import { STORY_DWELL_MS } from "../core/analytics";

export const STORY_SCRIPT_PATH = "/assets/story.js";

/** Where the script reports reads. */
export const EVENTS_PATH = "/events";

/** The id of a story's last paragraph, watched for "finished". */
export const STORY_END_ID = "story-end";

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

  var timer = null;
  var watcher = null;
  if (typeof IntersectionObserver === "function") {
    watcher = new IntersectionObserver(function (entries) {
      var visible = entries[entries.length - 1].isIntersecting;
      if (visible && timer === null) {
        timer = setTimeout(function () {
          send("finished");
          watcher.disconnect();
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
