# 0001 — Analytics for the shop

- **Status:** Decided; building (C1 built in #34; C2 in progress)
- **Date:** 2026-11-03, revised 2026-11-08
- **Author:** Jerry Vrabel

## Problem

Allegedly & Sons sells comedy items wrapped in outrageous lore. The strategy is to
release many small items, see which ones get bites and build more lore around the
winners. That only works if we can answer, per item:

1. How many people saw it, and where did they come from?
2. How many read the lore, and how far?
3. How many shared it, and how many visits (and sales) did each share bring back?
4. How many started checkout, and how many paid?

The goal is sales. The shop is also a portfolio piece, so the numbers must be
trustworthy: a wrong "winner" picked from twelve visits is worse than no answer.

### What changed on 2026-11-08

The first draft was "privacy-first": no cookies, a daily-rotating hash instead
of a visitor id, nothing linkable across days. That rules out the most valuable
number for a shop, which is which visit, share or campaign led to a sale days
later. This is an ecommerce site, so the note now optimizes for conversion:

- **A first-party visitor cookie** (random id, one year) replaces the daily
  hash. Returning visitors, multi-day funnels and purchase attribution all work.
  The daily-salt cron and its rate limiting are gone from the plan.
- **First-party JavaScript on item pages** is fine (story-read depth now; loot
  spins, badges and add-to-cart later). Item pages get `script-src 'self'`.
- **UTM parameters** are captured so posts and ads can be compared.
- **Ad pixels** (Meta, Google Ads) come later, as their own PR, the week paid
  ads start. Purchase conversions will be sent from the verified webhook.

### Constraints that still hold

- Exact, testable numbers on the stack we already run: Workers, D1, strict
  TypeScript, Vitest in the Workers runtime.
- **No raw IP addresses or user agents are stored.** They don't help sell
  anything, and a table of them is only a liability. Cloudflare's country code
  covers "where"; the user agent is read in memory to skip bots.
- `purchased` comes only from the verified Stripe webhook, never from the
  browser, so revenue numbers can't be faked by a client.
- Analytics never breaks or slows a page: writes happen after the response is
  sent, and failures are logged and dropped.
- Once the cookie (and later pixels) exist, the shop needs a short privacy
  policy saying what's collected. It goes to the same lawyer review as the
  terms of sale. The Fine Print's "What the Bureau Keeps on File" section (C2)
  says what's collected, and must change when pixels arrive.

## Event model

Every event is one row in `analytics_events`, with a fixed, typed shape
validated in `src/core/analytics.ts`. Anything that fails validation is dropped
and logged, never stored.

| Event              | Recorded by                        | Notes                                   |
| ------------------ | ---------------------------------- | --------------------------------------- |
| `item_viewed`      | Worker, on GET `/items/<slug>`     | Skips HEAD, prefetch and declared bots  |
| `lore_expanded`    | first-party script → Worker        | Opened the case file; later, read depth |
| `share_clicked`    | Worker, on `/share/<slug>/<net>`   | 303 to the network, with a `?r=` ref    |
| `shared_visit`     | Worker, on an item page with `?r=` | Links the visit to the share            |
| `checkout_started` | Worker, when it creates a session  | Visitor id passed to Stripe             |

Common columns: `event`, `item_slug`, `ts`, `visitor_id`, `referrer_host`
(host only), `country`, `utm_source`, `utm_campaign`. Later PRs add columns
for `ref`, `channel` and read depth; the event list in the table's `CHECK` is
already complete, so the table never needs rebuilding.

**Purchases aren't copied into this table.** The `orders` table, written only by
the verified webhook, is the purchase record. Checkout passes the visitor id to
Stripe (`client_reference_id`), the webhook stores it on the order, and the
funnel joins views → shares → checkouts → orders by visitor. One writer per
fact means nothing can drift.

"Views" are page loads by browsers that don't announce they're bots. Bots that
pretend to be browsers still count, so the dashboard says "page views," and
"visitors" once the cookie exists.

## Options for the event store

### Option A — Workers Analytics Engine

- ➕ Purpose-built for event analytics, cheap at high volume, no schema to manage.
- ➖ Keeps data for three months only, and samples, so counts are estimates.
- ➖ No joins, so share → visit → purchase attribution gets awkward.
- ➖ Harder to test locally and in CI than SQL against a real database.

### Option B — D1 raw events plus daily rollups

- ➕ Exact counts, real joins (visitor → share → order), retention we control.
- ➕ Plain SQL migrations, testable in Vitest with the Workers pool.
- ➖ We own the schema, indexes and retention.
- ➖ D1 write volume would matter at viral-spike scale, not at ours.

## Decision

**Option B: D1 raw events plus nightly rollups.** Exact numbers and joins
matter more than write throughput at our scale, and attribution needs joins.
Raw events are kept for 13 months; rollups indefinitely.

### What would change my mind

- **Sustained thousands of events per second, or D1 write errors in a spike.**
  Then `item_viewed` goes to Analytics Engine as a write-through buffer, and D1
  keeps the low-volume, high-value events (shares, checkouts, orders).
- **A need for real-time dashboards.** Rollups move from nightly to hourly first.

## Honest statistics

The dashboard ranks items by bites, and it must not overclaim. This is about
money: lore effort should go to real winners.

- Every rate is shown with its sample size and a 95% Wilson score interval.
- An item isn't ranked until it has at least **100 views**.
- Comparisons ("the Xenoclip gets shared 4× more than the Quill") are shown only when the
  intervals don't overlap; otherwise "no clear difference yet."
- Each lore decision is logged with the numbers behind it.

## Build plan

Each step is a small PR into `dev` with green CI.

1. **C1 — events table and item views. Built (#34, released in #35).**
   Migration 0002 with every planned column, the pure event schema with
   property-based tests, server-side `item_viewed` with country, referrer host
   and UTMs.
2. **C2 — visitor cookie and attribution.** `__Host-vid`: a random 128-bit id,
   `Secure`, `HttpOnly`, `SameSite=Lax`, refreshed on every page load so it
   lasts a year from the latest visit. It's set only on HTML pages, which
   become `Cache-Control: private` so no shared cache can hand one visitor's
   cookie to another; static files stay public and never carry it. The id goes
   on every event, to Stripe as `client_reference_id`, and onto the order
   (migration 0003, written by the webhook). `checkout_started` is recorded
   when Stripe returns a session. The Fine Print gains "What the Bureau Keeps
   on File."
3. **C3 — shares.** `/share/<slug>/<network>` records `share_clicked`, mints a
   `ref`, and redirects; visits with `?r=` record `shared_visit`.
4. **C4 — story reads.** A small first-party script on item pages reports
   opening the case file and how far it was read.
5. **C5 — rollups, retention and stats.** Nightly cron, 13-month cleanup, Wilson
   intervals. Then the dashboard (private admin view first; a public "museum
   stats" page is still an open question).

## Testing

- Unit and property-based tests for the event schema, referrer, UTM and
  country parsing, and bot/prefetch detection.
- Worker tests: views recorded after the response, nothing recorded for HEAD,
  prefetch, bots or unknown items, pages still served when D1 is down.
- A test that no stored row or log line contains the raw IP or user agent.
- Browser tests run the real Worker with migrations applied to local D1.

## Open questions

- Which tiers launch first (digital certificate, `.wav`, sticker, headline item)?
- Dashboard: private admin view only, or also a public "museum stats" page?
