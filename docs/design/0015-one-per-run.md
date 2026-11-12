# 0015 — One of each, per run

- **Status:** Proposed
- **Date:** 2026-11-12
- **Author:** Jerry Vrabel

## Problem

Every exhibit can be sold any number of times. That makes the shop feel like
a shelf, and it wastes the lore: an artifact that "was recovered from a crash
site" is odd when there is always another one. We want scarcity that is real,
so each sale is an event and the Broadcast has something to lose.

## Decisions

- **One of each, per run.** Each exhibit has one copy in the current run.
  When it sells, it is gone until a later run. A "run" is a batch of
  exhibits; how a new one starts is an open question below.
- **Sold exhibits disappear.** The shop shows only what can still be bought.
  Their item pages answer with a plain "Acquired" page, not a 404, so old
  links and search results land somewhere that makes sense.
- **The scarcity is real or it isn't said.** The site says "one of each" only
  while the shop enforces it, and the Terms of sale say so. This follows the
  rule in note 0003: no invented numbers, no fake near-misses.
- **Buying holds the item.** Starting checkout reserves the exhibit for a
  short time (the Stripe session's own expiry). An abandoned or expired
  checkout releases it. Two visitors can't both pay for the same exhibit.

## What changes

- **Stock in D1.** Each exhibit has a state for the current run: available,
  held (until a time) or sold (to an order). The webhook that records an
  order marks it sold; the checkout route holds it first.
- **The Broadcast skips sold exhibits.** The segment schedule picks among
  what's still available. This changes a rule in note 0009 (a fixed
  rotation), so `segmentAt` needs the stock as an input, or a schedule
  fixed ahead of time that treats a sold exhibit as "cut to the next lot".
- **The stage's empty states.** The item on air sells mid-segment: the stage
  cuts to the next lot and the host says so. Everything sold: the stage
  shows a "back soon" set and the sitemap shrinks to match.
- **The tally.** "Sold this segment" stays true, and now also tells the
  visitor the item is gone.
- **Refunds.** A refund puts the exhibit back on sale (decision needed, below).
- **Pipeline.** Adding exhibits (note 0010) becomes how the shop stays open.
  At 20 exhibits, a good week could empty it.

## Lines (law and money, note 0003)

- "Only one" is a claim about stock. It is shown only when it is true.
- A held item shows as available to others for the length of the hold, with
  no countdown that invents urgency. The only clock is the segment's.
- No buyer names. If anything about a sale is shown, it's a collector number.

## Open questions

- **When does a new run start?** Options: a fixed date for everything, new
  exhibits added by hand whenever the writers and artists finish them, or
  sold exhibits returning after a set time as "re-discovered". "Per run"
  needs a rule before we build.
- **Refunds:** back on sale, or retired?
- **Hold length** and what the page says when someone else holds the item.
- **Certificates:** are they numbered per exhibit, per run or across the shop?
  The Vault and dossier cards depend on this.
- **Existing orders:** exhibits already sold count against the first run, or
  the first run starts clean?

## Ideas to frame, not decided

- **A leaderboard.** Doable and cheap: a "Collectors' board" of agents ranked
  by acquisitions or streaks, shown by agent number (note 0003's dossier),
  with no names or emails. Opt-in, so nobody is ranked without choosing to be.
  It only means something once there are enough real buyers, and until then
  it must show nothing, not an invented list.
- **A resellers' market.** A different, much larger product. Buyers selling to
  other buyers means payments between people (Stripe Connect or similar),
  fees, tax reporting, fraud and moderation, and Terms of sale that cover a
  marketplace. For a one-person shop that's a company, not a feature. Suggest
  a "no" for now, and a revisit only if the shop has real demand for it.
- **A provenance page.** Sold exhibits could live on in the lore as a
  "Provenance" wing with no buyer details. That's the opposite of
  "disappear", so this is for the future if we change our minds.

## Build order

1. Stock table, hold on checkout start, sold on webhook, and tests for the race.
2. The Broadcast skips sold exhibits; the stage's empty states.
3. The "Acquired" item page, sitemap and catalog changes.
4. Terms and copy: where "one of each" is said, and only where it's true.
