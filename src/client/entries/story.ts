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
 * script (note 0011) answers with a stamp.
 */

import { CARD_EVENT } from "../../core/dom-events";
import { DOSSIER_PATH, EVENTS_PATH } from "../../core/paths";
import { CASE_CLOSED_ID, STORY_DWELL_MS, STORY_END_ID } from "../../core/story";
import { dwell } from "../dwell";
import { oncePerDepth, readBeaconBody } from "../story-beacon";

/** Says the card was earned, in words, and lets the sound script stamp it. */
function caseClosed(box: HTMLDetailsElement): void {
  const line = document.getElementById(CASE_CLOSED_ID);
  const card = box.getAttribute("data-card");
  if (line !== null && card !== null && card !== "") {
    // Built from text nodes, never markup: the card's name can't inject any.
    line.textContent = `Case closed. Card ${card} is in your dossier.`;
    const link = document.createElement("a");
    link.href = DOSSIER_PATH;
    link.textContent = "See your dossier";
    line.append(" ", link, ".");
  }
  document.dispatchEvent(new Event(CARD_EVENT));
}

function start(): void {
  const box = document.querySelector<HTMLDetailsElement>("details[data-story]");
  const end = document.getElementById(STORY_END_ID);
  if (box === null || end === null || !("sendBeacon" in navigator)) return;
  const item = box.getAttribute("data-story") ?? "";

  const beacon = oncePerDepth((depth) => {
    navigator.sendBeacon(EVENTS_PATH, readBeaconBody(item, depth));
  });

  let watcher: IntersectionObserver | undefined;
  if ("IntersectionObserver" in window) {
    const seen = dwell(
      STORY_DWELL_MS,
      () => {
        beacon.send("finished");
        watcher?.disconnect();
        caseClosed(box);
      },
      {
        set: (callback, ms) => window.setTimeout(callback, ms),
        clear: (id) => {
          window.clearTimeout(id);
        },
      },
    );
    watcher = new IntersectionObserver((entries) => {
      // Several changes can arrive at once; the last one is how things stand.
      seen(entries[entries.length - 1]?.isIntersecting === true);
    });
  }

  box.addEventListener("toggle", () => {
    if (!box.open) return;
    beacon.send("opened");
    if (watcher !== undefined && !beacon.sent("finished")) watcher.observe(end);
  });
}

start();
