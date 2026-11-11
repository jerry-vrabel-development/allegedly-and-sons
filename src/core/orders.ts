/**
 * Turning Stripe webhook events into orders (design note 0004).
 *
 * Pure and shared. Everything arrives as `unknown` and is checked field by
 * field; anything personal in the event (name, email, address) is never read.
 */

import { VISITOR_ID } from "./analytics";
import { isSegmentId } from "./broadcast";

/** Checkout finished. Paid on the spot for cards; still unpaid for delayed methods. */
export const CHECKOUT_COMPLETED = "checkout.session.completed";

/** A delayed payment (a bank debit, say) cleared, some time after checkout finished. */
export const CHECKOUT_ASYNC_PAYMENT_SUCCEEDED = "checkout.session.async_payment_succeeded";

/**
 * The event types that can carry a paid Checkout Session, so the webhook
 * records an order from them. Others are acknowledged and ignored.
 */
const ORDER_EVENT_TYPES: readonly string[] = [CHECKOUT_COMPLETED, CHECKOUT_ASYNC_PAYMENT_SUCCEEDED];

export function isOrderEvent(type: string): boolean {
  return ORDER_EVENT_TYPES.includes(type);
}

export interface StripeEvent {
  /** e.g. "evt_1Q..." */
  readonly id: string;
  readonly type: string;
  /** When Stripe created the event, Unix seconds. */
  readonly created: number;
  /** `data.object`: the thing the event is about, still unchecked. */
  readonly object: unknown;
}

export interface NewOrder {
  readonly stripeSessionId: string;
  readonly paymentIntentId: string | null;
  readonly itemSlug: string;
  readonly amountCents: number;
  /** Unix seconds. */
  readonly paidAt: number;
  /** The visitor cookie's id, from client_reference_id, or null when absent or malformed. */
  readonly visitorId: string | null;
  /** The broadcast segment it sold in (note 0009), or null when bought off air. */
  readonly segment: string | null;
}

/** What to do with a completed Checkout Session. Reasons are short and safe to log. */
export type SessionOutcome =
  | { readonly kind: "order"; readonly order: NewOrder }
  | { readonly kind: "skip"; readonly reason: "not paid" }
  | { readonly kind: "invalid"; readonly reason: string };

/** Stands in for a missing or odd item slug, so a paid order is never dropped. */
export const UNKNOWN_ITEM = "unknown";

const SLUG = /^[a-z0-9-]{1,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasPrefix(value: unknown, prefix: string): value is string {
  return typeof value === "string" && value.startsWith(prefix) && value.length > prefix.length;
}

/** Reads the parts of a Stripe event we rely on, or undefined if it isn't one. */
export function parseStripeEvent(body: unknown): StripeEvent | undefined {
  if (!isRecord(body)) return undefined;
  const { id, type, created, data } = body;
  if (!hasPrefix(id, "evt_") || typeof type !== "string" || type === "") return undefined;
  if (!isPositiveInteger(created) || !isRecord(data) || !("object" in data)) return undefined;
  return { id, type, created, object: data["object"] };
}

/**
 * Builds the order for a Checkout Session from an order event (isOrderEvent).
 * `paidAt` is the event's `created` time. A session that completed but isn't
 * paid yet (delayed payment methods) is skipped; the same session arrives
 * again, paid, in `async_payment_succeeded` once the payment clears.
 */
export function orderFromCompletedSession(session: unknown, paidAt: number): SessionOutcome {
  if (!isRecord(session)) return { kind: "invalid", reason: "session is not an object" };
  const {
    id,
    payment_status,
    amount_total,
    currency,
    payment_intent,
    metadata,
    client_reference_id,
  } = session;

  if (!hasPrefix(id, "cs_")) return { kind: "invalid", reason: "no session id" };
  if (payment_status !== "paid") return { kind: "skip", reason: "not paid" };
  if (!isPositiveInteger(amount_total)) return { kind: "invalid", reason: "no amount" };
  if (currency !== "usd") return { kind: "invalid", reason: "unexpected currency" };

  const slug = isRecord(metadata) ? metadata["slug"] : undefined;
  const segment = isRecord(metadata) ? metadata["segment"] : undefined;
  return {
    kind: "order",
    order: {
      stripeSessionId: id,
      paymentIntentId: hasPrefix(payment_intent, "pi_") ? payment_intent : null,
      itemSlug: typeof slug === "string" && SLUG.test(slug) ? slug : UNKNOWN_ITEM,
      amountCents: amount_total,
      paidAt,
      // Never drop a paid order over this: a missing or odd id just means no attribution.
      visitorId:
        typeof client_reference_id === "string" && VISITOR_ID.test(client_reference_id)
          ? client_reference_id
          : null,
      segment: isSegmentId(segment) ? segment : null,
    },
  };
}
