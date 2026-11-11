# 0009 — The Back-Room Broadcast

- **Status:** Decided; PR 1 (on air) built
- **Date:** 2026-11-09
- **Author:** Jerry Vrabel

## Problem

QVC sells with urgency theater: one item in the spotlight, a host who won't
stop talking, a ticking clock, and the feeling of catching something live.
The shop wants that, from the black market's side: a smuggler's broadcast
from the back room.

## Decisions

- **Both formats.** Rolling segments every 3 hours on Chicago's clock
  (midnight, 3am, …, 9pm) at **15% off**, plus the **Midnight Auction** from
  11pm to midnight at **30% off**. The 9pm segment runs 9 to 11.
- **Always on air.** Segments run back to back; something is always on.
  The lineup rotates through the catalog and shifts by one item each day, so
  the auction's item changes nightly. ("Least-sold that week" for the
  auction waits for real sales to rank.)
- **Chicago's wall clock, DST included.** On the nights clocks change, the
  midnight segment honestly runs 2 or 4 hours, and its countdown says so.
- **`/broadcast`:** the item, the host's pitch (per-item `pitch` lines in
  the catalog: outlandish, never plausible, never a price), the Smuggler's
  Special Value beside the real regular price, the real end time with a
  ticking clock, the real tally of orders this segment, and what's coming
  up.
- **An ON AIR banner** on every shop page, except checkout, private,
  return and error pages, and (since 2026-11-11) the page of the exhibit
  that's on air: its buy box already says so, and on a phone the banner
  pushed the buy button off the first screen.
- **The price you see is the price you pay.** The item page and checkout
  page show the on-air price too; the Checkout Session is created with it
  and tagged with the segment, so the price is locked when checkout starts.
  The Fine Print says so ("Prices Change When the Cameras Do").
- **Measured:** orders carry their segment (migration 0010); the Ledger
  splits exhibit sales on air and off.

## Lines (law and money, note 0003)

- Every number is true: countdowns end when the segment ends, tallies count
  real orders, and the special price comes off the real regular price.
- No fake viewer counts. No fake "was" prices.
- Callers (PR 2) are obvious lore characters, never invented customers:
  the FTC's 2024 rule bans fake reviews and testimonials.

## The countdown

A small first-party script (`/assets/countdown.js`) ticks every
`data-seconds-left` clock as H:MM:SS and reloads at zero. It counts from the
server's number, so a visitor's wrong clock can't end a segment early or
loop reloads. Without JavaScript, the server's words stay.

## Next

- **PR 2 — the show:** host audio and stingers, "callers on the line" with
  lore characters, a "next broadcast" countdown.
- **PR 3 — money and triggers:** "3 easy payments" (Klarna or Affirm through
  Stripe's checkout, enabled in the Stripe dashboard; no third-party script
  on our pages), and "We're live" Dispatch emails once registration opens.
