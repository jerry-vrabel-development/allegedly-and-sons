/**
 * A tiny Stripe client: just the one call the shop needs, with plain `fetch`
 * (no SDK, so no extra dependency in the Worker).
 */

const CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";

/**
 * The Stripe API version this code is written against. Pinned so the account's
 * default version can't change behavior under us; branding_settings needs
 * 2025-09-30.clover or later.
 */
export const STRIPE_API_VERSION = "2025-09-30.clover";

/** Stripe-hosted Checkout pages always live here; anything else is refused. */
export const STRIPE_CHECKOUT_ORIGIN = "https://checkout.stripe.com";

export type CheckoutResult =
  { readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: string };

/** Reads the Checkout URL out of Stripe's reply, which arrives as `unknown`. */
export function checkoutUrlFrom(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("url" in body)) return undefined;
  const { url } = body;
  if (typeof url !== "string" || !url.startsWith(`${STRIPE_CHECKOUT_ORIGIN}/`)) return undefined;
  return url;
}

/** Generous: real embedded-session secrets are about 500 characters. */
export const MAX_CLIENT_SECRET_LENGTH = 4096;

/**
 * Reads an embedded session's client secret out of Stripe's reply. Stripe
 * doesn't document its format beyond the `cs_` prefix (a real one is ~500
 * characters, and an earlier, stricter pattern rejected it), so this checks
 * only what we rely on: it starts with `cs_`, is printable with no spaces,
 * and is a sane length. It only ever travels as JSON to Stripe.js.
 */
export function clientSecretFrom(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null || !("client_secret" in body)) return undefined;
  const secret = body.client_secret;
  if (
    typeof secret !== "string" ||
    !secret.startsWith("cs_") ||
    secret.length > MAX_CLIENT_SECRET_LENGTH ||
    !/^[\x21-\x7e]+$/.test(secret)
  ) {
    return undefined;
  }
  return secret;
}

type StripeReply =
  { readonly ok: true; readonly body: unknown } | { readonly ok: false; readonly reason: string };

/** POSTs a Checkout Session form to Stripe. Never throws; reasons are safe to log. */
async function postCheckoutSession(
  secretKey: string,
  form: URLSearchParams,
  fetcher: typeof fetch,
): Promise<StripeReply> {
  let response: Response;
  try {
    response = await fetcher(CHECKOUT_SESSIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: form,
    });
  } catch {
    return { ok: false, reason: "network error" };
  }

  if (!response.ok) return { ok: false, reason: `stripe status ${String(response.status)}` };

  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, reason: "unreadable reply" };
  }
}

/**
 * Asks Stripe for a hosted Checkout page. Never throws: network and Stripe
 * errors come back as `{ ok: false }` with a short reason that is safe to log
 * (a status code, never the key or anything about the buyer).
 */
export async function createCheckoutSession(
  secretKey: string,
  form: URLSearchParams,
  fetcher: typeof fetch,
): Promise<CheckoutResult> {
  const reply = await postCheckoutSession(secretKey, form, fetcher);
  if (!reply.ok) return reply;
  const url = checkoutUrlFrom(reply.body);
  return url === undefined ? { ok: false, reason: "no checkout url" } : { ok: true, url };
}

export type EmbeddedCheckoutResult =
  | { readonly ok: true; readonly clientSecret: string }
  | { readonly ok: false; readonly reason: string };

/**
 * Asks Stripe for an embedded Checkout Session and returns its client secret,
 * which Stripe.js uses to mount Checkout on our page. Never throws.
 */
export async function createEmbeddedCheckoutSession(
  secretKey: string,
  form: URLSearchParams,
  fetcher: typeof fetch,
): Promise<EmbeddedCheckoutResult> {
  const reply = await postCheckoutSession(secretKey, form, fetcher);
  if (!reply.ok) return reply;
  const clientSecret = clientSecretFrom(reply.body);
  return clientSecret === undefined
    ? { ok: false, reason: "no client secret" }
    : { ok: true, clientSecret };
}

export type SessionLookup =
  | { readonly ok: true; readonly session: unknown }
  | { readonly ok: false; readonly reason: string };

/**
 * Reads one Checkout Session from Stripe, for the return page. `id` must
 * already match SESSION_ID. Never throws; reasons are safe to log (a status
 * code, never the key, the id or anything about the buyer).
 */
export async function retrieveCheckoutSession(
  secretKey: string,
  id: string,
  fetcher: typeof fetch,
): Promise<SessionLookup> {
  let response: Response;
  try {
    response = await fetcher(`${CHECKOUT_SESSIONS_URL}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secretKey}`, "Stripe-Version": STRIPE_API_VERSION },
    });
  } catch {
    return { ok: false, reason: "network error" };
  }
  if (!response.ok) return { ok: false, reason: `stripe status ${String(response.status)}` };
  try {
    return { ok: true, session: await response.json() };
  } catch {
    return { ok: false, reason: "unreadable reply" };
  }
}
