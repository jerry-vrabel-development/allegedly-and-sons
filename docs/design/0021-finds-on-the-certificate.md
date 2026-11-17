# 0021 — Finds on the certificate

- **Status:** Part 1 (on screen) built; part 2 (paper) next
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
  2. **On paper** (next). Copy the stamps onto the order when the webhook
     records it, so the certificate packed with the exhibit is fixed at the
     moment of purchase. Add a print view behind Access, for fulfillment.
     This needs a migration.
- **No figure in the block.** The return page already has the Courier as its
  one `data-host`, and the Dossier has none. Gerald stays drawn on the
  exhibit page's certificate box.

## What would change our mind

- If buyers never have stamps because tipped exhibits rarely go on sale,
  stamp contacts met too, or give on-sale exhibits tips of their own.
- If the paper certificate needs more than a list (a real stamp image, a
  seal number), that belongs in part 2's print view, not here.
