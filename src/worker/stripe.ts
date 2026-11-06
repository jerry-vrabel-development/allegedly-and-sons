/**
 * A tiny Stripe client: just the one call the shop needs, with plain `fetch`
 * (no SDK, so no extra dependency in the Worker).
 */

const CHECKOUT_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";

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
  let response: Response;
  try {
    response = await fetcher(CHECKOUT_SESSIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
  } catch {
    return { ok: false, reason: "network error" };
  }

  if (!response.ok) return { ok: false, reason: `stripe status ${String(response.status)}` };

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "unreadable reply" };
  }

  const url = checkoutUrlFrom(body);
  return url === undefined ? { ok: false, reason: "no checkout url" } : { ok: true, url };
}
