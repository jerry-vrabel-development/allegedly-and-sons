# 0022 — The first guest: Silt Prenderby

- **Status:** Built
- **Date:** 2026-11-17
- **Author:** Jerry Vrabel

## Problem

0018 build step 4: the guest cast starts. A guest is a visitor from across
the universe with a stake in one exhibit, and arrives with it. 0018 said
"the next product". In the code, "inbound" means pending (0020), so the next
product is the pending exhibit that will be in hand and on sale first.

## Decisions (2026-11-17)

- **The exhibit:** the Atlantean Bottle Cap (AS-0011), the next one expected
  in hand.
- **The archetype:** a corrupt broker.
- **The guest:** Silt Prenderby (brief below), picked from three briefs.
- **Guests are data.** `src/core/guests.ts` holds each guest: the exhibit
  they arrive with, their lines and their drawing's credit. A later guest is
  a new entry and a new drawing, not new pages.
- **Where Silt appears:**
  - **The exhibit's page:** a "Who's asking" section after the case file,
    with his drawing and his lines. A plain line under it says he is a
    character, holds nothing, and doesn't speak for the shop.
  - **The Job Board:** one line on the exhibit's "on its way" card.
  - **The tips:** a third tip about the bottle cap, in his voice. Tips may
    come from a contact in the Book, or from the exhibit's own guest.
- **Drawn still.** The exhibit page already has Gerald, in the certificate
  box, as its one `data-host`. Silt's figure isn't one, so he stays still.
  His moving parts are named and styled so a later page can pose him.
- **Not built:** his farewell line, "where he went next". It is how "found a
  home" gets told, and it waits on one-of-each (0015), like the board's sold
  section (0020).

## Silt Prenderby

- **Job in the act:** deep-sea salvage broker. Corrupt, cheerfully.
- **From:** a trench two dimensions down.
- **What he is:** a crab-shaped being in a striped broker's suit. One claw is
  permanently clamped on a receipt, and his eyes are on stalks that never
  look at the same thing.
- **How he talks:** fast, and everything is a deal.
- **His claim:** he sold the Bureau the diving rights to Atlantis, and he is
  owed a finder's fee and the cap's deposit.
- **His joke:** he invoices for everything, including the bubbles. The
  invoice is to the Bureau, never to a visitor.
- **Parts that move:** `silt-claw` (snaps), `silt-receipt` (flutters),
  `silt-eyes` (look about).
- **Where he appears:** the Atlantean Bottle Cap's page, its Job Board card
  and its third tip.
- **Never:** a price, a promise, a hold or a claim on the item to a visitor.
  His receipt carries words, never a number or a currency sign.

## Changes to how tips are told

The bottle cap now has three tips. The pull rotation gives every exhibit's
first tip, then every second, then the one third. Pull numbers past the end
of the old list now point at different tips. That already happens whenever an
exhibit goes on sale and its tips leave the rotation, and tips already told
stay in each agent's file.

## What would change our mind

- If guests mostly arrive with exhibits that are already on sale, the guest
  belongs on the exhibit page alone, and the Job Board line goes.
- If a guest needs to move on their page, give that page's `data-host` to the
  guest and leave Gerald still there.
