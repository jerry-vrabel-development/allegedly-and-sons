# 0014 — The front page as the show

- **Status:** Decided; step 1 (the stage band) is built
- **Date:** 2026-11-12
- **Author:** Jerry Vrabel

## Problem

The shop's front page is a product list: one featured exhibit, then a grid
of 20 cards. Everything around it is a show. The Back-Room Broadcast
([0009](0009-back-room-broadcast.md)) has a host, a clock and a price that
changes when the cameras do, and the host now has a face
([0013](0013-host-and-artists.md)). A first-time visitor arrives at the
catalog, not the show.

We want the front page to feel like a stage production, an alien black
market's shopping channel, and not a shelf.

## Decisions

- **The front page becomes the Broadcast's set.** The show is always on air
  (0009: segments run back to back, around the clock), so the front page
  shows what is on air now. Nothing about when things go on sale changes.
- **A top band, with the collection folded under it.** The stage is the top
  of the page. The grid stays, framed as the rest of the lineup. Buying is
  never harder than it is today.
- **The host leads, and the product is an inset,** the way a shopping channel
  frames it. The band is a stage: the host stands on it and talks, and the
  item on air sits in a small framed inset in the lower left, linked to its
  exhibit page. Below the stage is a lower-third bar. The band holds:
  1. **The set.** The host, with a speech bubble for the pitch, and the
     inset.
  2. **The lower-third bar.** The item's name, the special price beside the
     real regular price, the real countdown, the real tally of orders this
     segment, and the Acquire button. These are the same pieces
     `/broadcast` already builds, reused, not copied. The bar keeps the buy
     button on the first screen of a phone.
  3. **The ticker,** a thin strip along the bottom of the stage. Its lines
     are two kinds that never mix, each tagged by word and shape, never by
     color alone: **FACT** (when the segment ends, what comes next, how many
     exhibits there are) and **LORE** (the Bureau's wire).
  4. **Callers on the line,** beside the stage on a wide screen and below it
     on a phone: lore characters with a line about the item on air,
     answered by the host.
- **The ON AIR banner is not shown on the front page**, for the same reason
  the on-air exhibit's own page drops it: the page already says so.
- **`/broadcast` stays** for now, as the full-screen version with the whole
  lineup. Whether it folds into the front page, or redirects there, is a
  later decision.
- **On a phone,** the stage comes first, then the lower-third bar with the
  buy button, then the callers, then the rest of the lineup. The inset moves
  to the top-left so it never covers the item's name.
- **The page's title and description stay fixed.** The item on air rotates
  every three hours, so it appears in the page body only.

## Lines (law and money, note 0003)

Everything in 0009's lines carries over, and the stage makes them easier to
break, so they are repeated here:

- Every number is true. The countdown ends when the segment ends. The tally
  counts real orders. The special price comes off the real regular price.
- **No invented customers.** Callers are obviously lore characters with
  obviously absurd names and lines, never people who "just bought" anything.
  The FTC's 2024 rule bans fake reviews and testimonials.
- **The ticker never fakes activity.** No "someone in Ohio just bought this,"
  no viewer counts. Lore lines are marked as the Bureau's wire.

## Motion and the effects test (note 0011)

- Motion and sound on the stage belong to the "fx" group, as the host's
  motion does now. The plain group gets the same page, with the same words
  and the same host, still.
- The front page is the first page most visitors see, so changing it
  changes the effects test's comparison. When the stage ships, 0011 gets a
  dated line saying so.

## Access

- Any moving ticker has a visible pause control, stops under reduced motion,
  and has every line available as plain text. Nothing depends on color or on
  sound alone.
- A visitor can reach the exhibits and the buy buttons by keyboard without
  passing through the animation.
- Search engines and screen readers get real text, not only a performance.

## Build order

Small PRs, each one shippable:

1. **The stage band (built):** the host, the item on air as an inset, and the
   lower-third bar with its price, clock, tally and Acquire button, above
   the existing grid, with the banner dropped from the page. The host on
   the front page is still a drawing; his motion comes with the callers.
   Measured: the Acquire button is on the first screen at 1280x720, on a
   Pixel 7 and on a 390x664 phone (the tagline hides on phones to make room).
2. **Callers:** a few lore characters with lines per on-air item.
3. **The ticker.**
4. **More characters.** Each new sales character is a new seat for a writer
   and an artist (0013): the Archivist (a dry clerk who undersells what the
   host oversells), the Appraiser (for the Vault), the Courier (for the
   Dispatch).

## Open questions

- Whether `/broadcast` stays, folds into the front page, or redirects.
- How many callers, and who writes them. They are lore, so the writers'
  partnership in [0002](0002-writers.md) applies.
- How the front page is cached. It changes every three hours, and must
  never show a segment that has already ended.
- How big the inset can be. The picture sells these objects, and a small one
  sells them less. If it feels too small we enlarge it and move the host
  further right.
- Giving the host a wider curtain backdrop, so his drawing's own edge doesn't
  show on a wide stage.
- How the ticker marks its two kinds of lines so no one confuses lore with
  fact.
- The host's name, and the names of the characters after him.
