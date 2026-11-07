/**
 * Security headers applied to every response the Worker sends.
 *
 * The CSP starts as strict as possible ("default-src 'none'") and gets loosened
 * deliberately, one directive at a time, as the shop grows real pages.
 * form-action allows our own checkout form and the redirect it gets to
 * Stripe-hosted Checkout (browsers check redirects after a form post too).
 *
 * One page gets a looser policy: the embedded checkout page (design note 0005,
 * Option B). Only there may Stripe.js load, frame Stripe's Checkout and talk to
 * Stripe's API. Every other page keeps the strict policy with no script-src.
 */

import { CHECKOUT_PATH } from "../core/checkout";

type Directives = Readonly<Record<string, readonly string[]>>;

const STRICT_DIRECTIVES: Directives = {
  "default-src": ["'none'"],
  "style-src": ["'self'"],
  "img-src": ["'self'"],
  "frame-ancestors": ["'none'"],
  "base-uri": ["'none'"],
  "form-action": ["'self'", "https://checkout.stripe.com"],
};

/**
 * The strict policy plus only the sources Stripe's security guide lists for
 * Stripe.js and for Checkout (checked 2026-11-07). 'self' in script-src is for
 * our own small mount script (PR 3), served from our origin, never inline;
 * 'self' in connect-src lets that script ask our session endpoint for a
 * client secret.
 * hooks.stripe.com is where 3D Secure challenges run; without it they fail.
 */
const CHECKOUT_DIRECTIVES: Directives = {
  ...STRICT_DIRECTIVES,
  "script-src": [
    "'self'",
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://checkout.stripe.com",
  ],
  "frame-src": [
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
  ],
  "connect-src": ["'self'", "https://api.stripe.com", "https://checkout.stripe.com"],
  "img-src": ["'self'", "https://*.stripe.com"],
};

function serialize(directives: Directives): string {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/** The policy every page gets unless it's the embedded checkout page. */
export const STRICT_CSP = serialize(STRICT_DIRECTIVES);

/** The policy for the embedded checkout page only. */
export const CHECKOUT_CSP = serialize(CHECKOUT_DIRECTIVES);

/** Headers that are the same on every response. */
const COMMON_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

/** The default (strict) set of security headers. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy": STRICT_CSP,
  ...COMMON_HEADERS,
};

const CHECKOUT_HEADERS: Readonly<Record<string, string>> = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": CHECKOUT_CSP,
};

/**
 * The security headers for one response. Only a successful (200) response on
 * /checkout/<item> gets the checkout policy; its errors, redirects and
 * not-found pages run no script, so they stay strict.
 */
export function securityHeadersFor(
  pathname: string,
  status: number,
): Readonly<Record<string, string>> {
  return status === 200 && CHECKOUT_PATH.test(pathname) ? CHECKOUT_HEADERS : SECURITY_HEADERS;
}

/**
 * Returns a copy of `response` with the security headers set. Without a
 * pathname it falls back to the strict set, so forgetting it fails safe.
 */
export function withSecurityHeaders(response: Response, pathname = ""): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(securityHeadersFor(pathname, response.status))) {
    secured.headers.set(name, value);
  }
  return secured;
}
