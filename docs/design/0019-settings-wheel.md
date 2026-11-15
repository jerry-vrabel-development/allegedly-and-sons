# 0019 — The settings wheel

- **Status:** Built
- **Date:** 2026-11-15
- **Author:** Jerry Vrabel

## Problem

The sound script put its toggles straight into the header: "Sound: on / off"
everywhere, and "Motion: on / off" on pages with the host. Each is a 44px
button, so on a phone the header grew a row or two before the first word of
the page. More options are coming (the hunt, the guest cast), and each would
add another button to the header.

## Decision (2026-11-15)

- **One "Settings" button, with a panel under it.** The header carries a
  single button. The toggles sit in the panel, each still said in words
  ("Sound: on", "Motion: off") with `aria-pressed`. Adding a setting later
  adds a line to the panel, not a button to the header.
- **The word does the work.** The button reads "Settings" with a gear in
  front. The gear is `aria-hidden` and the button's name is the word, so
  nothing depends on recognising an icon (never color or icon alone).
- **A disclosure, not a dialog.** The button has `aria-expanded` and
  `aria-controls`. The panel opens on click or Enter, Tab walks into it in
  order, and it closes with Escape (focus returns to the button), with a
  click outside, or with the button again. Flipping a setting leaves it open
  so both can be changed. It takes no focus trap and no backdrop, so a person
  can still read the page behind it.
- **Only for the sound-and-motion group.** The panel is part of the script
  that group gets, so the plain group still sees a header with no controls.
  That keeps the A/B test as it was (0011).
- **Same storage.** The two settings and their keys are unchanged, so nobody
  loses what they chose. The panel starts closed on every page load.
- **Reduced motion.** The Motion line is still left out under reduced motion,
  because nothing moves to turn off (WCAG 2.2.2).

## What it costs

The sound script grows by about 900 bytes (15,367 to 16,271), so its size
guard moves from 16,000 to 17,000. The header gets shorter on a phone: one
button where there were two.

## Not decided

- Whether the wheel also holds a "Reset my progress" or "Recover on this
  device" line once accounts are decided (0018). Not now.
- A volume setting. The sound recipes have no volume knob yet.
