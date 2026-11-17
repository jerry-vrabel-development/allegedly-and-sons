# 0021 — Finds on the certificate

- **Status:** Built (part 1 on screen, part 2 on paper)
- **Date:** 2026-11-17
- **Author:** Jerry Vrabel

## Problem

0018's loop ends with the payoff: the finds a buyer earned about an exhibit
appear on that exhibit's certificate, stamped by Gerald. This is build step 3.
Two things in the code change what "finds about that exhibit" can mean:

- **Contacts aren't about exhibits.** A find (0018 step 1) introduces a
  member of the cast. It belongs to a page, not to anything for sale.
- **Tips are.** Each tip (0020) is one contact's line about one exhibit,
  recorded as `tip:<exhibit>:<n>`. But tips are only told about exhibits
  that are on their way. So today no buyable exhibit has any, and stamps
  appear once an exhibit someone heard about goes on sale and they buy it.

## Decisions (2026-11-17)

- **Gerald stamps the exhibit's tips** that the buyer holds: the contact's
  name and their line, each marked "Witnessed" in words. Contacts met
  elsewhere are not stamped; they stay in the Book of Contacts.
- **A record, not a bonus.** Stamps come only from tips already in the
  buyer's file. Buying grants none (a test checks `awardsForOrder`). An
  exhibit with no tips on file gets a certificate that says so plainly.
- **On screen and on paper,** in two PRs:
  1. **On screen** (built). The paid return page shows the certificate,
     only to the visitor who started that Checkout Session (the cookie's
     id must match the session's `client_reference_id`). Anyone else who
     opens the link sees the page as before. The Dossier gets a
     Certificates section: one per exhibit kept, oldest first. Refunded
     orders don't count. Stamps are read live from the agent's awards, which
     are never removed, so they can't drift.
  2. **On paper** (built). When the webhook records an order, the same
     transaction copies the buyer's stamps into `order_stamps`
     (migration 0011), worded as they were. Only tips earned at or before
     the order's `paid_at` count, so a late or redelivered webhook stamps
     the same thing. `/bureau/packing`, behind Access like the Ledger and
     linked from it, lists every order waiting to ship, oldest first, with
     its certificate. The browser's print puts one certificate on each page,
     without the site's header and footer. Buy-backs ship nothing, so they
     are left out. An order whose exhibit Stripe didn't name says so instead
     of printing a certificate.
- **No figure in the block.** The return page already has the Courier as its
  one `data-host`, and the Dossier has none. Gerald stays drawn on the
  exhibit page's certificate box.

## Two sources, on purpose

The screen reads stamps live from the agent's awards. Paper reads the copy
taken at purchase. They agree, because tips are only told about exhibits on
their way, so nobody can hear a new tip about something they already bought.
If that ever changes (an exhibit goes back to pending), the paper copy is the
record of what was true at purchase.

## What would change our mind

- If buyers never have stamps because tipped exhibits rarely go on sale,
  stamp contacts met too, or give on-sale exhibits tips of their own.
- If the paper certificate needs more than a list (a real stamp image, a
  seal number), that belongs in part 2's print view, not here.
