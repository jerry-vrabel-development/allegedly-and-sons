/**
 * The Vault's script (design note 0008): the lever plays in place, slot-
 * machine style. Served from /assets/vault.js, never inline, first-party only.
 *
 * 1. The lever button posts to /vault/pull asking for JSON. The server draws
 *    the card first; the reel only reveals it. If anything goes wrong (no
 *    script, no fetch, an error), the plain form submits as before.
 * 2. A dialog opens: the lever clunks, the reel spins through the vault's
 *    cards with a tick per card, slowing down, and lands on the real draw.
 * 3. The reveal grows with rarity (Common: a pop; Uncommon: a glint; Rare: a
 *    flash and a fanfare). The result is always also in text, announced to
 *    screen readers. "Collect" reloads the Vault to show it in the file.
 *
 * Honest spins: the reel cycles every card evenly and stops on the draw. It
 * never slows near a rarer card to fake a near-miss (note 0003).
 *
 * Sounds are synthesized with Web Audio (no files, nothing to license), all
 * under 3 seconds, started from the click, with a remembered mute toggle.
 * Reduced motion skips the spin and the flash; sound still plays unless muted.
 */

import { VAULT_PULL_PATH } from "./vault-page";

/** The browser-local key for the mute setting. Nothing else is stored. */
export const MUTE_KEY = "bureau-vault-muted";

/** How long the reel spins (ms) before it lands, when motion is allowed. */
export const REEL_MS = 2400;

export const VAULT_JS = `"use strict";
(function () {
  var form = document.querySelector('form.lever[action="${VAULT_PULL_PATH}"]');
  var vault = document.querySelector("[data-reel]");
  if (!form || !vault || typeof fetch !== "function" || typeof document.createElement("dialog").showModal !== "function") return;

  var names;
  try { names = JSON.parse(vault.getAttribute("data-reel")); } catch (e) { return; }
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Sound -------------------------------------------------------------
  var muted = false;
  try { muted = window.localStorage.getItem(${JSON.stringify(MUTE_KEY)}) === "1"; } catch (e) {}
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
  function tone(freq, start, length, type, volume) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + start;
    var osc = a.createOscillator();
    var gain = a.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume || 0.2, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain); gain.connect(a.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  }
  function noise(start, length, volume) {
    var a = ctx(); if (!a) return;
    var frames = Math.floor(a.sampleRate * length);
    var buffer = a.createBuffer(1, frames, a.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    var src = a.createBufferSource();
    var gain = a.createGain();
    gain.gain.value = volume;
    src.buffer = buffer; src.connect(gain); gain.connect(a.destination);
    src.start(a.currentTime + start);
  }
  var sounds = {
    clunk: function () { noise(0, 0.12, 0.5); tone(90, 0, 0.25, "sine", 0.6); tone(60, 0.08, 0.3, "sine", 0.4); },
    tick: function () { tone(1400, 0, 0.03, "square", 0.05); },
    Common: function () { tone(523, 0, 0.18, "triangle", 0.25); tone(659, 0.12, 0.3, "triangle", 0.25); },
    Uncommon: function () {
      [523, 659, 784].forEach(function (f, i) { tone(f, i * 0.1, 0.35, "triangle", 0.25); });
      tone(1568, 0.3, 0.5, "sine", 0.08);
    },
    Rare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * 0.11, 0.5, "sawtooth", 0.12); });
      [1047, 1319, 1568].forEach(function (f) { tone(f, 0.45, 1.4, "triangle", 0.15); });
      [2093, 2637, 3136, 2637].forEach(function (f, i) { tone(f, 0.5 + i * 0.12, 0.25, "sine", 0.05); });
    }
  };

  var toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sound-toggle";
  function label() {
    toggle.textContent = muted ? "Sound: off" : "Sound: on";
    toggle.setAttribute("aria-pressed", muted ? "false" : "true");
  }
  label();
  toggle.addEventListener("click", function () {
    muted = !muted;
    try { window.localStorage.setItem(${JSON.stringify(MUTE_KEY)}, muted ? "1" : "0"); } catch (e) {}
    label();
  });
  form.parentNode.insertBefore(toggle, form.nextSibling);

  // --- The reel dialog -----------------------------------------------------
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  var dialog = el("dialog", "reel-dialog");
  dialog.setAttribute("aria-labelledby", "reel-heading");
  var heading = el("h2", null, "The vault creaks open…");
  heading.id = "reel-heading";
  var windowBox = el("div", "reel-window");
  var reel = el("p", "reel-name", names[0]);
  reel.setAttribute("aria-hidden", "true");
  windowBox.appendChild(reel);
  var result = el("div", "reel-result");
  result.setAttribute("role", "status");
  var collect = el("button", "button", "Collect");
  collect.type = "button";
  collect.hidden = true;
  dialog.appendChild(heading);
  dialog.appendChild(windowBox);
  dialog.appendChild(result);
  dialog.appendChild(collect);
  document.body.appendChild(dialog);

  // A fresh load of the Vault shows the pull in the file. (Assigning the same
  // path with only a new #hash wouldn't reload, so reload explicitly.)
  function done() { window.location.hash = "latest-pull"; window.location.reload(); }
  collect.addEventListener("click", done);
  dialog.addEventListener("cancel", function (event) { event.preventDefault(); if (!collect.hidden) done(); });

  function reveal(data) {
    var card = data.card;
    reel.textContent = card.name;
    windowBox.className = "reel-window landed rarity-" + card.rarity.toLowerCase();
    sounds[card.rarity]();
    result.appendChild(el("p", "kicker", "Vault card " + card.designation + " · " + card.rarity + " · " + (data.duplicate ? "Duplicate" : "New to your file")));
    result.appendChild(el("h3", null, card.name));
    result.appendChild(el("p", null, card.summary));
    if (data.streakDays > 0) result.appendChild(el("p", null, "Duty streak: " + data.streakDays + (data.streakDays === 1 ? " day." : " days.")));
    collect.hidden = false;
    collect.focus();
  }

  function spin(data) {
    var landing = names.indexOf(data.card.name);
    // Enough steps for the reel to go round a few times and stop on the draw.
    var steps = names.length * 4 + (landing < 0 ? 0 : landing);
    var step = 0;
    var started = Date.now();
    function next() {
      step += 1;
      reel.textContent = names[step % names.length];
      sounds.tick();
      if (step >= steps) { reveal(data); return; }
      // Ease out: short gaps first, long ones as it slows.
      var progress = step / steps;
      var gap = 30 + Math.pow(progress, 3) * 320;
      if (Date.now() - started > ${String(REEL_MS)} * 1.5) gap = 0;
      setTimeout(next, gap);
    }
    next();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector("button");
    if (button) button.disabled = true;
    form.classList.add("pulling");
    sounds.clunk();
    fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, credentials: "same-origin" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) { window.location.reload(); return; }
        dialog.showModal();
        if (reduced) reveal(data); else spin(data);
      })
      // If the answer was lost, reload rather than post again: the Vault shows
      // whatever was drawn, and a lost request can simply be pulled again.
      .catch(done);
  });
})();
`;
