/**
 * Turning Stripe webhook events into orders (design note 0004).
 *
 * Pure and shared. Everything arrives as `unknown` and is checked field by
 * field; anything personal in the event (name, email, address) is never read.
 */

/** The event types the webhook acts on. Others are acknowledged and ignored. */
export const CHECKOUT_COMPLETED = "checkout.session.completed";

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
 * Builds the order for a `checkout.session.completed` event. `paidAt` is the
 * event's `created` time. Sessions that aren't paid yet (delayed payment
 * methods) are skipped; `async_payment_succeeded` will handle them later.
 */
export function orderFromCompletedSession(session: unknown, paidAt: number): SessionOutcome {
  if (!isRecord(session)) return { kind: "invalid", reason: "session is not an object" };
  const { id, payment_status, amount_total, currency, payment_intent, metadata } = session;

  if (!hasPrefix(id, "cs_")) return { kind: "invalid", reason: "no session id" };
  if (payment_status !== "paid") return { kind: "skip", reason: "not paid" };
  if (!isPositiveInteger(amount_total)) return { kind: "invalid", reason: "no amount" };
  if (currency !== "usd") return { kind: "invalid", reason: "unexpected currency" };

  const slug = isRecord(metadata) ? metadata["slug"] : undefined;
  return {
    kind: "order",
    order: {
      stripeSessionId: id,
      paymentIntentId: hasPrefix(payment_intent, "pi_") ? payment_intent : null,
      itemSlug: typeof slug === "string" && SLUG.test(slug) ? slug : UNKNOWN_ITEM,
      amountCents: amount_total,
      paidAt,
    },
  };
}
