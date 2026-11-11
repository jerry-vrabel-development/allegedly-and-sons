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
 * The rules (what the answer means, the spin's pace, the wording) are in
 * ../reel.ts and unit tested; this file only wires them to the page.
 *
 * Sounds come from the shop-wide sound module (note 0011, /assets/sound.js),
 * which the Worker adds for the same "fx" group and which owns the toggle.
 * Without it the reel runs silently. Reduced motion skips the spin and the
 * flash; sound still plays unless muted.
 */

import { VAULT_PULL_PATH } from "../../core/paths";
import {
  confettiBit,
  milestoneTitle,
  pullFrom,
  reelGap,
  reelNameAt,
  reelNamesFrom,
  reelSteps,
  resultLines,
  type Pull,
  type ReachedMilestone,
} from "../reel";
import type { SoundName } from "../sounds";

/** How many pieces of confetti a milestone throws. */
const CONFETTI_BITS = 18;

function play(name: SoundName): void {
  if (window.BureauSound) window.BureauSound.play(name);
}

function el<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className !== undefined) node.className = className;
  // Always text, never markup: nothing from the answer can inject any.
  if (text !== undefined) node.textContent = text;
  return node;
}

function start(): void {
  const form = document.querySelector<HTMLFormElement>(`form.lever[action="${VAULT_PULL_PATH}"]`);
  const vault = document.querySelector("[data-reel]");
  if (
    form === null ||
    vault === null ||
    typeof fetch !== "function" ||
    typeof document.createElement("dialog").showModal !== "function"
  ) {
    return;
  }
  const names = reelNamesFrom(vault.getAttribute("data-reel"));
  if (names === undefined) return;
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- The reel dialog -----------------------------------------------------
  const dialog = el("dialog", "reel-dialog");
  dialog.setAttribute("aria-labelledby", "reel-heading");
  const heading = el("h2", undefined, "The vault creaks open…");
  heading.id = "reel-heading";
  const windowBox = el("div", "reel-window");
  const reel = el("p", "reel-name", reelNameAt(names, 0));
  reel.setAttribute("aria-hidden", "true");
  windowBox.append(reel);
  const result = el("div", "reel-result");
  result.setAttribute("role", "status");
  const collect = el("button", "button", "Collect");
  collect.type = "button";
  collect.hidden = true;
  dialog.append(heading, windowBox, result, collect);
  document.body.append(dialog);

  // A fresh load of the Vault shows the pull in the file. (Assigning the same
  // path with only a new #hash wouldn't reload, so reload explicitly.)
  const done = (): void => {
    window.location.hash = "latest-pull";
    window.location.reload();
  };
  collect.addEventListener("click", done);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    if (!collect.hidden) done();
  });

  const celebrate = (milestone: ReachedMilestone): void => {
    const box = el("div", "milestone");
    box.append(
      el("p", "milestone-title", milestoneTitle(milestone)),
      el("p", undefined, "A new rank, and a bonus pull is yours."),
    );
    if (!reduced) {
      const burst = el("div", "confetti");
      burst.setAttribute("aria-hidden", "true");
      for (let i = 0; i < CONFETTI_BITS; i++) {
        const bit = el("span", "confetti-bit");
        const { x, y, r } = confettiBit(Math.random);
        bit.style.setProperty("--x", x);
        bit.style.setProperty("--y", y);
        bit.style.setProperty("--r", r);
        burst.append(bit);
      }
      box.append(burst);
    }
    result.append(box);
    play("milestone");
  };

  const reveal = (pull: Pull): void => {
    const { card, milestone } = pull;
    const lines = resultLines(pull);
    reel.textContent = card.name;
    windowBox.className = `reel-window landed rarity-${card.rarity.toLowerCase()}`;
    play(card.rarity);
    result.append(
      el("p", "kicker", lines.kicker),
      el("h3", undefined, card.name),
      el("p", undefined, card.summary),
      ...lines.notes.map((note) => el("p", undefined, note)),
    );
    if (!pull.duplicate) {
      windowBox.classList.add("new-card");
      setTimeout(() => {
        play("sparkle");
      }, 250);
    }
    if (milestone !== undefined) {
      // The bigger moment comes second, once the card has landed.
      setTimeout(
        () => {
          celebrate(milestone);
        },
        reduced ? 0 : 900,
      );
    }
    collect.hidden = false;
    collect.focus();
  };

  const spin = (pull: Pull): void => {
    const steps = reelSteps(names, pull.card.name);
    const started = Date.now();
    let step = 0;
    const next = (): void => {
      step += 1;
      reel.textContent = reelNameAt(names, step);
      play("tick");
      if (step >= steps) {
        reveal(pull);
        return;
      }
      setTimeout(next, reelGap(step, steps, Date.now() - started));
    };
    next();
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    if (button !== null) button.disabled = true;
    form.classList.add("pulling");
    play("clunk");
    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then((response): Promise<unknown> => (response.ok ? response.json() : Promise.resolve(null)))
      .then((body) => {
        const pull = pullFrom(body);
        if (pull === undefined) {
          window.location.reload();
          return;
        }
        dialog.showModal();
        if (reduced) reveal(pull);
        else spin(pull);
      })
      // If the answer was lost, reload rather than post again: the Vault shows
      // whatever was drawn, and a lost request can simply be pulled again.
      .catch(done);
  });
}

start();
