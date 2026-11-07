/**
 * POST /webhooks/stripe: records paid orders (design note 0004).
 *
 * Order of operations matters:
 * 1. Refuse if no signing secret is configured (503, so Stripe retries later).
 * 2. Read the raw body once, with a size cap, and verify the signature before
 *    parsing anything. Failures get a 400 and nothing is stored.
 * 3. In one D1 batch (a transaction), record the event id and, for a paid
 *    session, the order. Both ignore duplicates, so a redelivered event changes
 *    nothing. If the batch fails, nothing is stored and we answer 500, so
 *    Stripe retries the whole event.
 *
 * Logs carry the event type and id and a short reason. Never the payload.
 */

import { CHECKOUT_COMPLETED, orderFromCompletedSession, parseStripeEvent } from "../core/orders";
import { verifyStripeSignature } from "./stripe-signature";

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
  if (event.type === CHECKOUT_COMPLETED) {
    const outcome = orderFromCompletedSession(event.object, event.created);
    if (outcome.kind === "order") {
      const { order } = outcome;
      statements.push(
        deps.db
          .prepare(
            `INSERT INTO orders (stripe_session_id, payment_intent_id, item_slug, amount_cents, paid_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (stripe_session_id) DO NOTHING`,
          )
          .bind(
            order.stripeSessionId,
            order.paymentIntentId,
            order.itemSlug,
            order.amountCents,
            order.paidAt,
          ),
      );
      note = `order ${order.stripeSessionId}`;
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
  return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
}
