/**
 * The shop's sound (design note 0011): /assets/sound.js, first-party, never
 * inline. The Worker adds it to shop pages for the "fx" group only.
 *
 * - Synthesizes every sound with Web Audio: no files, nothing to license,
 *   every sound under 3 seconds. Browsers allow audio only after a click on
 *   the page, so sounds follow clicks, never page loads.
 * - Puts one "Sound: on / off" toggle in the site header, said in words,
 *   remembered in the browser (the only thing it stores). On by default; the
 *   Vault's old setting carries over.
 * - Plays the page's sounds: an element with data-sound="<name>" plays on
 *   click (a link waits LINK_DELAY_MS so it's heard; a modified click never
 *   waits), a case file creaks open, and the story script's "bureau:card"
 *   event stamps.
 * - Exposes window.BureauSound.play(name) for the Vault's reel.
 *
 * Without the script, or without Web Audio, everything works the same in
 * silence.
 */

export const SOUND_SCRIPT_PATH = "/assets/sound.js";

/** The browser-local key for the shop-wide mute setting. */
export const SOUND_MUTE_KEY = "bureau-sound-muted";

/** The Vault's setting before note 0011, read once so nobody's choice is lost. */
export const LEGACY_MUTE_KEY = "bureau-vault-muted";

/** How long a link with a sound waits before navigating (ms). */
export const LINK_DELAY_MS = 180;

/** The event the story script fires when a case file is finished. */
export const CARD_EVENT = "bureau:card";

/** Every sound the module can play, by name. */
export const SOUND_NAMES = [
  "creak",
  "stamp",
  "whoosh",
  "kachunk",
  "clunk",
  "tick",
  "Common",
  "Uncommon",
  "Rare",
  "sparkle",
  "milestone",
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

export const SOUND_JS = `"use strict";
(function () {
  var muted = false;
  try {
    var saved = window.localStorage.getItem(${JSON.stringify(SOUND_MUTE_KEY)});
    if (saved === null) saved = window.localStorage.getItem(${JSON.stringify(LEGACY_MUTE_KEY)});
    muted = saved === "1";
  } catch (e) {}

  var audio = null;
  function ctx() {
    if (muted) return null;
    if (!audio) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audio = new Ctor();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }
  function tone(freq, start, length, type, volume, slideTo) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + start;
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + length);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume || 0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  }
  function noise(start, length, volume, from, to) {
    var a = ctx(); if (!a) return;
    var frames = Math.floor(a.sampleRate * length);
    var buffer = a.createBuffer(1, frames, a.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    var src = a.createBufferSource();
    var gain = a.createGain();
    gain.gain.value = volume;
    src.buffer = buffer;
    if (from) {
      var filter = a.createBiquadFilter();
      filter.type = "bandpass";
      var t = a.currentTime + start;
      filter.frequency.setValueAtTime(from, t);
      filter.frequency.exponentialRampToValueAtTime(to || from, t + length);
      src.connect(filter); filter.connect(gain);
    } else {
      src.connect(gain);
    }
    gain.connect(a.destination);
    src.start(a.currentTime + start);
  }

  // The back room: brass, stamps, drawers, vault mechanics.
  var sounds = {
    creak: function () { tone(180, 0, 0.45, "sawtooth", 0.05, 120); tone(240, 0.05, 0.4, "sawtooth", 0.03, 150); noise(0, 0.3, 0.08, 600, 300); },
    stamp: function () { noise(0, 0.08, 0.6, 900, 200); tone(110, 0, 0.18, "sine", 0.6); tone(82, 0.04, 0.22, "sine", 0.4); },
    whoosh: function () { noise(0, 0.35, 0.25, 400, 3000); },
    kachunk: function () {
      noise(0, 0.05, 0.4, 2000, 800); tone(140, 0, 0.12, "square", 0.08);
      noise(0.12, 0.08, 0.5, 600, 200); tone(70, 0.12, 0.3, "sine", 0.5);
      tone(2093, 0.22, 0.4, "sine", 0.06); tone(2637, 0.26, 0.5, "sine", 0.05);
    },
    clunk: function () { noise(0, 0.12, 0.5); tone(90, 0, 0.25, "sine", 0.6); tone(60, 0.08, 0.3, "sine", 0.4); },
    tick: function () { tone(1400, 0, 0.03, "square", 0.05); },
    Common: function () { tone(523, 0, 0.18, "triangle", 0.25); tone(659, 0.12, 0.3, "triangle", 0.25); },
    Uncommon: function () {
      [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.1, 0.35, "triangle", 0.25); });
      tone(1568, 0.3, 0.5, "sine", 0.08);
    },
    sparkle: function () { [2637, 3136, 3520].forEach(function (f, i) { tone(f, i * 0.06, 0.18, "sine", 0.06); }); },
    milestone: function () {
      [392, 523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.09, 0.4, "square", 0.07); });
      [523, 659, 784, 1047].forEach(function (f) { tone(f, 0.5, 1.2, "triangle", 0.12); });
    },
    Rare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.5, "sawtooth", 0.12); });
      [1047, 1319, 1568].forEach(function (f) { tone(f, 0.45, 1.4, "triangle", 0.15); });
      [2093, 2637, 3136, 2637].forEach(function (f, i) { tone(f, 0.5 + i * 0.12, 0.25, "sine", 0.05); });
    }
  };
  function play(name) {
    if (muted || !Object.prototype.hasOwnProperty.call(sounds, name)) return;
    try { sounds[name](); } catch (e) {}
  }
  window.BureauSound = { play: play, isMuted: function () { return muted; } };

  // --- The toggle, in the site header --------------------------------------
  var nav = document.querySelector("header.site nav ul");
  if (nav) {
    var item = document.createElement("li");
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sound-toggle";
    var label = function () {
      toggle.textContent = muted ? "Sound: off" : "Sound: on";
      toggle.setAttribute("aria-pressed", muted ? "false" : "true");
    };
    label();
    toggle.addEventListener("click", function () {
      muted = !muted;
      try { window.localStorage.setItem(${JSON.stringify(SOUND_MUTE_KEY)}, muted ? "1" : "0"); } catch (e) {}
      label();
      if (!muted) play("tick");
    });
    item.appendChild(toggle);
    nav.appendChild(item);
  }

  // --- The page's sounds ----------------------------------------------------
  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-sound]") : null;
    if (!target) return;
    var name = target.getAttribute("data-sound");
    play(name);
    // A link waits a beat so its sound is heard. New tabs and windows don't wait.
    var modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
    var href = target.tagName === "A" ? target.getAttribute("href") : null;
    if (href && !modified && !muted && !event.defaultPrevented && !target.hasAttribute("target")) {
      event.preventDefault();
      setTimeout(function () { window.location.assign(href); }, ${String(LINK_DELAY_MS)});
    }
  });

  var story = document.querySelector("details[data-story]");
  if (story) {
    story.addEventListener("toggle", function () { if (story.open) play("creak"); });
  }
  document.addEventListener(${JSON.stringify(CARD_EVENT)}, function () { play("stamp"); });
})();
`;

/**
 * Adds the sound script to a page, right after the stylesheet so it runs
 * before any page script that uses it (deferred scripts run in order). Our
 * own layout always has that link; anything else is left unchanged.
 */
export function withSound(page: string, stylesheetPath: string): string {
  const marker = `<link rel="stylesheet" href="${stylesheetPath}" />`;
  return page.replace(marker, `${marker}<script src="${SOUND_SCRIPT_PATH}" defer></script>`);
}

/** Pages that never get the sound script: checkout (its own policy), private pages, posts. */
const NO_SOUND = /^\/(?:checkout\/|bureau|vault\/pull|healthz)/;

/** Whether a page gets the sound script (for the "fx" group). */
export function wantsSound(pathname: string): boolean {
  return !NO_SOUND.test(pathname);
}
