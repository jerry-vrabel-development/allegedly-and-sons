# 0011 — Sound for the whole shop

- **Status:** Decided; PR 1 (the shared module, toggle and shop sounds) and PR 2 (Tune in, the certificate stamp) built
- **Date:** 2026-11-10
- **Author:** Jerry Vrabel

## Problem

Sound and motion live only in the Vault (note 0008). The rest of the shop is
silent: opening a case file, finishing one, earning its card, sharing and
buying all happen without a sound, and finishing a case file doesn't even say
on screen that a card was earned. The Back-Room Broadcast has no sound at all.
The shop is going for slot-machine dopamine everywhere (note 0003), so sound
belongs to the whole shop, not one page.

## Two browser facts that shape this

1. **No sound before a click on that page.** Every page load starts silent,
   and only a click (or a key press) on that page can start audio. So sounds
   go on clicks and on what follows a click on the same page. A purchase
   lands on a fresh `/thanks` page, which can't play anything by itself.
2. **Most pages run no script.** Sound everywhere means our own script loads
   on every shop page.

## Decisions

- **One shared module, `/assets/sound.js`.** It synthesizes every sound
  (Web Audio, no files, nothing to license), owns the toggle, and plays sounds
  for the page. The Vault's reel uses it instead of its own copy.
- **Every shop page may run our own scripts.** Successful shop pages get
  `script-src 'self'`. Still first-party only, never third-party, never inline.
  Checkout keeps its own policy, and error pages stay strict.
- **The Worker adds it, by group.** The Worker already rewrites each shop page
  once for the ON AIR banner, and it adds the sound script in the same step,
  for the "fx" group only. No page function has to know about sound.
- **One toggle for the whole shop:** "Sound: on" / "Sound: off" in the site
  header, said in words, `aria-pressed`, remembered in the browser. On by
  default. The Vault's old setting carries over.
- **The sound map** (every sound also has its text on screen, and none is
  longer than 3 seconds):

  | Moment                                     | Sound                         | On screen                                            |
  | ------------------------------------------ | ----------------------------- | ---------------------------------------------------- |
  | Open a case file                           | Drawer creak                  | The case file opens                                  |
  | Finish a case file                         | Rubber-stamp thunk            | New: "Case closed. Card AS-0007 is in your dossier." |
  | Share an exhibit                           | Paper whoosh                  | The share page opens                                 |
  | Acquire                                    | Cash-drawer ka-chunk          | The checkout page opens                              |
  | The Vault                                  | Unchanged (note 0008)         | Unchanged                                            |
  | Broadcast "Tune in" (PR 2)                 | Radio static, station stinger | The show, with a "now on air" line                   |
  | "Stamp your certificate" on /thanks (PR 2) | Vault-door slam, fanfare      | The certificate gets a stamp, in words               |

- **The sound identity:** a noir back room. Low brass, typewriter, rubber
  stamps, vault mechanics, radio static.
- **Links wait a beat for their sound.** A link with a sound navigates about
  a fifth of a second later, so the sound is heard. Modified clicks
  (new tab, new window) aren't delayed. Without the script, links work as
  before.
- **Synthesized now, Jerry's later.** His Sonic Pi tracks and effects library
  can replace any synthesized sound later, as short files, and only sounds he
  made or holds a clear license for.

## Measuring it: the A/B test grows

The Vault's A/B split (note 0008, PR 3) extends to sound everywhere: the
"fx" half gets the shop-wide sounds and the reel, the "plain" half gets
neither. `?fx=on` and `?fx=off` still override one view.

**Stopping rule** (it had none before): the test runs until each group has
about **200 agents who pulled**, or for **30 days** after this ships,
whichever comes first. A clear winner ships to everyone. If 30 days pass
without a clear answer, everyone gets the effects. PR 3 has the Ledger compare
the groups on finished case files, shares and buyers, and show the test's day
and group sizes.

## Plan

- **PR 1:** the shared module, the header toggle, the shop-wide CSP, the
  case-file, share and Acquire sounds, the "Case closed" line, and the Vault
  moved onto the module.
- **PR 2:** Broadcast "Tune in" and stingers; "Stamp your certificate" on
  `/thanks`.
- **PR 3:** the Ledger's shop-wide group comparison and the stopping rule.

## What would change our mind

- The groups show no difference in reads, shares or buyers → keep sound,
  but quieter and fewer.
- Complaints about sound → default to off.
- The delay on links shows up as a drop in checkout starts → drop the delay.
