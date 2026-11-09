# 0008 — Sound and motion: the vault as a slot machine

- **Status:** Decided; PR 1 (the reel), PR 2 (celebrations) and PR 3 (measuring) built
- **Date:** 2026-11-09
- **Author:** Jerry Vrabel

## Problem

Note 0003's loop runs on variable reward, and the most powerful part of a
variable reward is the anticipation before the reveal. The lever skipped it:
press a button, the page reloads, text appears. The shop is going for slot-
machine dopamine, and animation and sound for conversion (note 0003, revised
2026-11-09: every mechanic is judged on traffic, conversion and sales).

## Options

1. **Pure CSS on a reloaded page.** No script, but browsers only let a page
   play sound right after a click on that same page, so there can be no
   sound, and the page reload breaks the moment.
2. **A first-party script on the Vault (chosen).** The lever posts with
   `fetch`, the reel plays in place, and the click itself unlocks audio.
   Costs: the Vault gains a script (CSP `script-src 'self'`,
   `connect-src 'self'`), and we own the code. Third-party scripts stay
   banned.

## Decisions

- **The server draws first; the reel only reveals.** The card is decided
  and recorded before any animation, so nothing on screen can change it.
- **Honest spins.** The reel cycles every card evenly and stops on the draw.
  No fake near-misses: it never slows by a rarer card to suggest you almost
  had it (decided 2026-11-09). Odds stay posted.
- **The reveal grows with rarity:** Common pops, Uncommon glints, Rare
  flashes with a fanfare. The rarity is always also in the text.
- **Sounds are synthesized** (Web Audio oscillators and noise): lever clunk,
  a tick per card, a stinger per rarity. No files and nothing to license.
  Jerry's own Sonic Pi sounds can replace them later (only sounds he made or
  holds a clear license for).
- **Accessible floor:** every sound is under 3 seconds and has its text on
  screen; the result is announced (role="status"); the dialog is a native
  `<dialog>` with focus on "Collect"; a "Sound: on/off" toggle is
  remembered in the browser (the only thing stored); reduced motion skips
  the spin and flash.
- **No script, no problem:** without JavaScript, `fetch` or `<dialog>`, the
  lever is the same plain form as before. A lost answer reloads the Vault
  instead of posting again, so a pull is never doubled.

## PR 2 — celebrations

- A free pull that reaches a streak milestone gets a second moment after the
  card lands: "Day 7: you're Made", a fanfare and a confetti burst (no
  confetti under reduced motion). The pull's JSON says which milestone.
- A new card gets a "New" mark and a sparkle; the result says how many bonus
  pulls are left, so the next pull is one tap away.
- "Streak dies tonight" ticks visibly, second by second (`countdown.js`).
  Browsers don't allow sound before a click, so the ticking is on screen,
  not in the speakers.
- Not done: a celebration for a streak saved by a freeze (the pull doesn't
  know a freeze was spent; worth adding with the next streak change).

## PR 3 — measuring it

- Half of agents get the reel and sounds ("fx"), half the plain lever, by
  the last hex digit of the visitor id: stable, and nothing stored.
- `?fx=on` / `?fx=off` overrides the group for one view, to check both.
- The Ledger compares the groups: agents who pulled, pulls per agent, and
  how many came back on another day.
- The Fine Print says half of visitors get the animated lever and why.

## What would change our mind

- PR 3 shows the effects don't move pulls or returns → keep them lighter.
- Complaints about sound → default to muted.
