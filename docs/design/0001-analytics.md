# 0001 — Privacy-first analytics for the shop

- **Status:** Draft
- **Date:** 2026-11-03
- **Author:** Jerry Vrabel

## Problem

Allegedly & Sons sells comedy items wrapped in outrageous lore. The strategy is to
release many small items, see which ones get bites and build more lore around the
winners. That only works if we can answer, per item:

1. How many people saw it?
2. How many read the lore?
3. How many shared it, and how many visits did each share bring back?
4. How many started checkout, and how many paid?

The shop is also a portfolio piece, so the analytics must be trustworthy,
privacy-respecting and honest about uncertainty. A wrong "winner" picked from
twelve visits is worse than no answer.

### Constraints

- No third-party trackers, no cookies for tracking, no cookie banner needed.
- No personal data stored: no raw IP addresses, no user agents, no emails in
  analytics. (Stripe holds the customer data for purchases; we keep only the
  Stripe session id and amount.)
- Runs on the same stack as Quest Log: Cloudflare Workers, strict TypeScript.
- Traffic will be small at first (tens to hundreds of visits a day).

## Event model

Every event is one row with a fixed, typed shape, validated in the Worker.
Anything that fails validation is dropped and counted, never stored.

| Event              | Sent from         | Extra fields                                |
| ------------------ | ----------------- | ------------------------------------------- |
| `item_viewed`      | browser → Worker  | —                                           |
| `lore_expanded`    | browser → Worker  | `section`                                   |
| `share_clicked`    | browser → Worker  | `channel`, `ref`                            |
| `shared_visit`     | Worker (on `?r=`) | `ref`                                       |
| `add_to_cart`      | browser → Worker  | `tier`                                      |
| `checkout_started` | Worker            | `tier`, `stripe_session_id`                 |
| `purchased`        | Stripe webhook    | `tier`, `amount_cents`, `stripe_session_id` |

Common fields: `event`, `item_id`, `ts`, `visitor_day_id`, `referrer_host`
(host only, no path or query).

- **`purchased` comes only from a verified Stripe webhook**, never from the
  browser, so revenue numbers can't be faked by a client.
- **`ref`** is a short random code created when someone clicks Share. A visit
  with `?r=<ref>` logs a `shared_visit` linked to the original share, which gives
  us shares → return visits per item and per channel.
- **`visitor_day_id`** is `hash(ip + user_agent + daily_salt)`. The salt
  lives in KV, a cron trigger rotates it daily, and the old salt is deleted. That
  lets us count unique visitors within a day but makes it impossible (for us too)
  to link a visitor across days. The IP is used only in memory to compute the hash
  and is never written anywhere.

## Options for the event store

### Option A — Workers Analytics Engine

Cloudflare's built-in time-series store, written from the Worker with
`writeDataPoint` and queried over a SQL API.

- ➕ Purpose-built for event analytics, cheap at high volume, no schema to manage.
- ➖ Data is kept for three months only.
- ➖ It samples data at write and read time, so counts are estimates. That's fine at
  CDN scale, but it works against "exact, honest numbers" at our scale.
- ➖ No joins, so share → return-visit → purchase attribution gets awkward.
- ➖ Harder to test locally and in CI than SQL against a real database.

### Option B — D1 raw events plus daily rollups

Store each event as a row in D1 (SQLite). A cron trigger builds a
`daily_item_stats` table each night. The dashboard reads the rollups; ad-hoc
questions use SQL on the raw events.

- ➕ Exact counts, real joins (shares → visits → purchases), and unlimited retention
  under our control.
- ➕ Plain SQL migrations, testable in Vitest with the Workers pool, the same as
  Quest Log.
- ➕ Easy to explain in a README or an interview.
- ➖ We own the schema, indexes and retention policy.
- ➖ Write volume is limited by D1. That isn't a concern at our traffic, but it would
  be at viral-spike scale.

## Decision

**Option B: D1 raw events plus daily rollups.**

At our scale, exact numbers and joins matter more than unlimited write
throughput. D1 also keeps the whole system testable and explainable, which is
the point of a portfolio piece.

Raw events are kept for 13 months, then deleted by the cron job. Rollups are
kept indefinitely; they contain no visitor ids.

### What would change my mind

- **Sustained traffic in the thousands of events per second, or D1 write
  errors during a spike.** Then add Analytics Engine as a write-through
  buffer for the high-volume events (`item_viewed`) and keep D1 for the
  low-volume, high-value ones (shares, checkouts, purchases).
- **A need for real-time dashboards.** Rollups would move from nightly to hourly
  first; only then would we consider anything else.

## Honest statistics

The dashboard ranks items by bites, and it must not overclaim.

- Every rate (share rate, conversion rate) is shown with its sample size and a
  95% Wilson score interval.
- An item isn't ranked until it has at least **100 views**. Below that, it
  shows "not enough data yet."
- Comparisons ("Xenoclip shares 4× more than the Quill") are shown only
  when the intervals don't overlap. Otherwise the dashboard says "no clear
  difference yet."
- Each lore decision ("gave the Xenoclip a sequel") is logged with the numbers
  behind it, so the data → decision loop is visible and auditable.

## Security and abuse

- Event endpoints are rate-limited per `visitor_day_id` and validate the
  `item_id` against the catalog, so junk can't pile up.
- Stripe webhooks are verified with the signing secret; unverified calls are
  rejected and counted.
- Secrets (Stripe keys, webhook secret) live in Worker secrets, never in code.
- Logs never contain IPs, user agents, Stripe customer details or full referrer
  URLs.

## Testing

- Unit tests for the event schema and validation, including property-based
  tests for malformed input.
- Unit tests for the Wilson interval and the "not enough data" thresholds.
- Worker tests: event ingestion, `?r=` attribution, webhook signature
  rejection, salt rotation, retention cleanup.
- A test proving no stored row or log line contains an IP or user agent.

## Open questions

- Which tiers launch first (digital certificate, `.wav`, sticker,
  headline item)?
- Dashboard: public "museum stats" page as part of the joke, private admin
  view, or both?
