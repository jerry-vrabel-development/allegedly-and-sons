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
 * Sounds come from the shop-wide sound module (note 0011, /assets/sound.js),
 * which the Worker adds for the same "fx" group and which owns the toggle.
 * Without it the reel runs silently. Reduced motion skips the spin and the
 * flash; sound still plays unless muted.
 */

import { VAULT_PULL_PATH } from "../core/paths";

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

  // --- Sound: the shop-wide module (note 0011), when it's on the page ------
  function play(name) { if (window.BureauSound) window.BureauSound.play(name); }
  var sounds = {};
  ["clunk", "tick", "Common", "Uncommon", "Rare", "sparkle", "milestone"].forEach(function (name) {
    sounds[name] = function () { play(name); };
  });

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
    if (data.next && data.next.bonusLeft > 0) {
      result.appendChild(el("p", null, "You have " + data.next.bonusLeft + (data.next.bonusLeft === 1 ? " bonus pull" : " bonus pulls") + " left."));
    }
    if (!data.duplicate) {
      windowBox.classList.add("new-card");
      setTimeout(sounds.sparkle, 250);
    }
    if (data.milestone) {
      // The bigger moment comes second, once the card has landed.
      setTimeout(function () { celebrate(data.milestone); }, reduced ? 0 : 900);
    }
    collect.hidden = false;
    collect.focus();
  }

  function celebrate(milestone) {
    var box = el("div", "milestone");
    box.appendChild(el("p", "milestone-title", "Day " + milestone.days + ": you're " + milestone.name + "."));
    box.appendChild(el("p", null, "A new rank, and a bonus pull is yours."));
    if (!reduced) {
      var burst = el("div", "confetti");
      burst.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 18; i++) {
        var bit = el("span", "confetti-bit");
        bit.style.setProperty("--x", String(Math.round(Math.random() * 240 - 120)) + "px");
        bit.style.setProperty("--y", String(Math.round(-60 - Math.random() * 120)) + "px");
        bit.style.setProperty("--r", String(Math.round(Math.random() * 720 - 360)) + "deg");
        burst.appendChild(bit);
      }
      box.appendChild(burst);
    }
    result.appendChild(box);
    sounds.milestone();
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
