/**
 * POST /webhooks/stripe: records paid orders (design note 0004).
 *
 * Order of operations matters:
 * 1. Refuse if no signing secret is configured (503, so Stripe retries later).
 * 2. Read the raw body once, with a size cap, and verify the signature before
 *    parsing anything. Failures get a 400 and nothing is stored.
 * 3. In one D1 batch (a transaction), record the event id and, for a paid
 *    session, the order. A session is paid either when checkout completes
 *    (cards) or later, when a delayed payment clears; both events are handled. Both ignore duplicates, so a redelivered event changes
 *    nothing. If the batch fails, nothing is stored and we answer 500, so
 *    Stripe retries the whole event.
 *
 * Logs carry the event type and id and a short reason. Never the payload.
 */

import { awardsForOrder } from "../core/dossier";
import { grantAwards } from "./dossier";
import { isOrderEvent, orderFromCompletedSession, parseStripeEvent } from "../core/orders";
import { verifyStripeSignature } from "./stripe-signature";
import { REPAIR_SLUG } from "../core/repair";
import { vaultDay } from "../core/vault";

export const WEBHOOK_PATH = "/webhooks/stripe";

/** Stripe events are a few kilobytes; anything near this is not from Stripe. */
export const MAX_WEBHOOK_BYTES = 256 * 1024;

export interface WebhookDeps {
  /** The endpoint's signing secret (whsec_...), or undefined when not configured. */
  readonly webhookSecret: string | undefined;
  readonly db: D1Database;
  /** Current time, Unix seconds. Injected so tests control the clock. */
  readonly nowSeconds: () => number;
}

function text(body: string, status: number): Response {
  return new Response(`${body}\n`, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function stripeWebhook(request: Request, deps: WebhookDeps): Promise<Response> {
  if (deps.webhookSecret === undefined) return text("Webhooks are not configured.", 503);

  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_WEBHOOK_BYTES) return text("Too large.", 413);
  const payload = new TextDecoder().decode(raw);

  const check = await verifyStripeSignature(
    payload,
    request.headers.get("Stripe-Signature"),
    deps.webhookSecret,
    deps.nowSeconds(),
  );
  if (!check.ok) {
    console.warn(`webhook refused: ${check.reason}`);
    return text("Bad signature.", 400);
  }

  let body: unknown;
  try {
    body = JSON.parse(payload);
  } catch {
    console.warn("webhook refused: unreadable body");
    return text("Unreadable.", 400);
  }
  const event = parseStripeEvent(body);
  if (event === undefined) {
    console.warn("webhook refused: not a Stripe event");
    return text("Not an event.", 400);
  }

  const label = `webhook ${event.type} ${event.id}`;
  const statements = [
    deps.db
      .prepare("INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)")
      .bind(event.id, event.type, deps.nowSeconds()),
  ];

  let note = "acknowledged";
  let buyer: { visitorId: string; itemSlug: string } | undefined;
  if (isOrderEvent(event.type)) {
    const outcome = orderFromCompletedSession(event.object, event.created);
    if (outcome.kind === "order") {
      const { order } = outcome;
      statements.push(
        deps.db
          .prepare(
            `INSERT INTO orders
               (stripe_session_id, payment_intent_id, item_slug, amount_cents, paid_at, visitor_id,
                segment)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (stripe_session_id) DO NOTHING`,
          )
          .bind(
            order.stripeSessionId,
            order.paymentIntentId,
            order.itemSlug,
            order.amountCents,
            order.paidAt,
            order.visitorId,
            order.segment,
          ),
      );
      note = `order ${order.stripeSessionId}`;
      if (order.itemSlug === REPAIR_SLUG) {
        // A bought-back streak: bridge the days missed since the agent's last
        // free pull, up to the day before payment, in the same transaction as
        // the order. Skipped (never failing the batch) if there's no gap to
        // bridge or it's longer than a repair can cover.
        note = `repair ${order.stripeSessionId}`;
        if (order.visitorId !== null) {
          statements.push(
            deps.db
              .prepare(
                `INSERT OR IGNORE INTO streak_repairs
                   (stripe_session_id, visitor_id, from_day, to_day, repaired_at)
                 SELECT ?1, ?2, MAX(day) + 1, ?3 - 1, ?4
                 FROM vault_pulls WHERE visitor_id = ?2 AND kind = 'daily'
                 HAVING MAX(day) IS NOT NULL AND MAX(day) + 1 <= ?3 - 1
                   AND (?3 - 1) - (MAX(day) + 1) < 10`,
              )
              .bind(order.stripeSessionId, order.visitorId, vaultDay(order.paidAt), order.paidAt),
          );
        }
      } else if (order.visitorId !== null) {
        buyer = { visitorId: order.visitorId, itemSlug: order.itemSlug };
      }
    } else {
      note = outcome.reason;
      // A paid-looking session we can't read is worth a louder log line.
      if (outcome.kind === "invalid") console.error(`${label}: ${outcome.reason}`);
    }
  }

  let results: D1Result[];
  try {
    results = await deps.db.batch(statements);
  } catch {
    console.error(`${label}: database error`);
    return text("Try again.", 500);
  }

  const duplicate = results[0]?.meta.changes === 0;
  console.log(`${label}: ${duplicate ? "duplicate, ignored" : note}`);
  // The buyer's dossier: Acquirer and the item's card. The order is already
  // safe, so a failure here is logged and never makes Stripe retry.
  if (!duplicate && buyer !== undefined) {
    try {
      await grantAwards(
        deps.db,
        buyer.visitorId,
        awardsForOrder(buyer.itemSlug),
        deps.nowSeconds(),
      );
    } catch {
      console.error(`${label}: dossier grant failed`);
    }
  }
  return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}
