# 0004 — Recording orders with Stripe webhooks

- **Status:** Built (2026-11-07): steps 1–3, Option A. Step 4 (order list) not built yet
- **Date:** 2026-11-06
- **Author:** Jerry Vrabel

## Problem

Checkout works (#9, #10): the Worker creates a Stripe Checkout Session and the
buyer pays on Stripe's page. But the shop itself never learns that an order was
paid. The `/thanks` page only means "the buyer was redirected," which can't be
trusted: anyone can open `/thanks`, and a buyer can close the tab before the
redirect.

We need the shop to know, reliably, when an order is paid, so that:

1. there's an order list to fulfill from (pack, ship, mark shipped),
2. the `purchased` analytics event from [0001](0001-analytics.md) exists, and
3. refunds within the 24-hour window can be checked against the purchase time.

### Constraints

- Builds on 0001: D1 is the store, and `purchased` comes **only** from a
  verified Stripe webhook, never from the browser.
- Privacy as in 0001: Stripe holds the buyer's name, email and address. The shop
  stores Stripe ids, the item, the amount and timestamps, nothing personal.
  Fulfillment reads the shipping address from the Stripe dashboard.
- Stripe may deliver the same event more than once, late, or out of order.
- No Stripe SDK, as with checkout: plain `fetch` and Web Crypto.

## How it works

1. Stripe sends `POST /webhooks/stripe` with a `Stripe-Signature` header.
2. The Worker verifies the signature with the webhook signing secret
   (HMAC-SHA256 over `timestamp.body`, constant-time compare, and a 5-minute
   tolerance on the timestamp). Anything that fails gets a 400 and is counted,
   never stored.
3. It records the Stripe event id first. If that id was already seen, it answers
   200 and does nothing else (idempotent).
4. On `checkout.session.completed` with `payment_status = paid`, it inserts an
   order row and a `purchased` event in one D1 batch.
5. It answers 200 quickly. Anything slow can move to a queue later.

Events handled: `checkout.session.completed`, and
`checkout.session.async_payment_succeeded` for delayed payment methods (the
session completes unpaid, then arrives again, paid, when the payment clears;
added 2026-11-10). Later: `charge.refunded` (mark the order refunded).

## Options

### Option A — D1 orders table, written by the webhook

An `orders` table (`stripe_session_id` unique, `payment_intent_id`, `item_slug`,
`amount_cents`, `status`, `paid_at`, `shipped_at`) plus a `stripe_events` table
of processed event ids.

- ➕ The shop has its own order list for fulfillment and the dashboard.
- ➕ Joins with the analytics events in 0001 (views → checkouts → purchases).
- ➕ Testable in Vitest with the Workers pool, like the rest of the shop.
- ➖ One more secret (the webhook signing secret) and a D1 schema to own.
- ➖ Two copies of the order (Stripe's and ours) that could drift; the webhook
  is the only writer, which keeps that risk small.

### Option B — No webhook; ask Stripe when we need to know

The dashboard and fulfillment call Stripe's API (list Checkout Sessions) on
demand.

- ➕ Nothing new to store; Stripe is the single source of truth.
- ➖ No `purchased` event, so 0001's funnel and attribution don't work.
- ➖ Every dashboard view becomes Stripe API calls, with rate limits and latency.
- ➖ Weaker portfolio story: the shop never reacts to a sale.

## Decision

**Option A.** It's what 0001 already assumes, and it's the only option that
gives us a real funnel. The drift risk is handled by making the webhook the only
writer and by keeping Stripe as the authority for anything about money.

### What would change my mind

- **Webhook deliveries failing or arriving very late in practice.** Then add a
  daily cron that lists the last day's paid Checkout Sessions from Stripe and
  fills in any missing orders.
- **Fulfillment moving to a partner** (the packaging partner idea). Then the
  webhook would also notify the partner, probably through a queue.

## Security

- The signing secret is a Worker secret (`STRIPE_WEBHOOK_SECRET`), never in code.
  Sandbox and live endpoints have different secrets.
- The webhook route accepts only `POST`, reads the raw body exactly once, and
  verifies before parsing JSON.
- Logs carry the event type and id, never the payload.
- The `Stripe-Signature` check uses a constant-time comparison.

## Testing

- Signature verification: valid, wrong secret, tampered body, old timestamp,
  missing header, several `v1` signatures (Stripe sends more than one during
  secret rotation).
- Idempotency: the same event twice produces one order.
- Unpaid sessions don't create orders.
- No stored row or log line contains a name, email or address.
- End to end in the sandbox with the Stripe CLI (`stripe listen --forward-to`)
  or a sandbox webhook endpoint pointed at a preview Worker.

## Build plan (small PRs)

1. D1 database, migrations for `orders` and `stripe_events`, wired into
   `wrangler.jsonc` and the tests. **Done: #26.**
2. Signature verification as a pure function, with its tests. **Done: #25.**
3. The webhook route: verify, dedupe, record the order. **Done: #27**,
   released in #28.
4. A minimal private order list for fulfillment (who to ship to still comes from
   Stripe). **Not built yet.**

Two deliberate changes from the plan above:

- The event id and the order are written in **one** D1 batch (a transaction),
  not "event id first". Recording the event first would let a crash between the
  two writes mark the event as seen while losing the order, and Stripe's retry
  would then be skipped as a duplicate.
- The `purchased` analytics event (0001) waits until the analytics tables exist.

## What building it taught us

- **The retry path works in real life.** During the first embedded-checkout
  test, the Worker's signing secret didn't match the endpoint's. The webhook
  answered 400, stored nothing, and Stripe queued a retry; after the secret was
  fixed, one "Resend" recorded the order. That's the failure mode the design
  is built for.
- **Two endpoints, one secret, one always fails.** Each Stripe endpoint has its
  own signing secret, and the Worker holds one. Keep exactly one endpoint per
  environment.

## Open questions

- Private order list: behind Cloudflare Access, or a simple secret link to
  start?
- 0001 mentions purchase tiers (certificate, `.wav`, sticker). Checkout sells one
  item at one price today; do tiers come before or after orders?
