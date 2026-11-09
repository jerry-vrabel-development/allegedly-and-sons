# 0008 — Sound and motion: the vault as a slot machine

- **Status:** Decided; building (PR 1, the reel)
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

## Next

- **PR 2 — celebrations:** milestone badges, new cards, a saved streak; a low
  ticking sound when the streak dies tonight.
- **PR 3 — measure it:** half of agents (by visitor id) get effects, half
  don't; the Ledger compares pulls per agent and return rate.

## What would change our mind

- PR 3 shows the effects don't move pulls or returns → keep them lighter.
- Complaints about sound → default to muted.
