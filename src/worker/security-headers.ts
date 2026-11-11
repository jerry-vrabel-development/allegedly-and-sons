/**
 * Security headers applied to every response the Worker sends.
 *
 * The CSP starts as strict as possible ("default-src 'none'") and gets loosened
 * deliberately, one directive at a time, as the shop grows real pages.
 * form-action allows our own checkout form and the redirect it gets to
 * Stripe-hosted Checkout (browsers check redirects after a form post too).
 *
 * Successful shop pages may run our own scripts (note 0011: the shop-wide
 * sound script), and nothing else: 'self' only, never inline. Some get a bit
 * more. The Vault (note 0008) and the Broadcast run scripts that talk to our
 * own origin, like item pages (note 0001, C4), which report reads. The
 * embedded checkout page (design note 0005, Option B) is the only place
 * Stripe.js may load, frame Stripe's Checkout and talk to Stripe's API.
 * Errors, redirects, assets and private pages keep the strict policy with no
 * script-src. Which page gets which policy is decided in page-rules.ts.
 */

import { pageRule, type Policy } from "./page-rules";

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

/** Shop pages: the strict policy plus our own scripts, and no connections. */
const SHOP_DIRECTIVES: Directives = {
  ...STRICT_DIRECTIVES,
  "script-src": ["'self'"],
};

/**
 * Pages whose own scripts talk to our own origin: the strict policy plus
 * 'self' for scripts (never inline) and for connections. Item pages send
 * beacons to /events, the Vault posts the pull, the Broadcast reloads its
 * clock. First-party only: no other host may load or receive anything.
 */
const OWN_ORIGIN_DIRECTIVES: Directives = {
  ...STRICT_DIRECTIVES,
  "script-src": ["'self'"],
  "connect-src": ["'self'"],
};

function serialize(directives: Directives): string {
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/** The strict policy, with no script-src: errors, redirects, assets and private pages. */
export const STRICT_CSP = serialize(STRICT_DIRECTIVES);

/** The policy for the embedded checkout page only. */
export const CHECKOUT_CSP = serialize(CHECKOUT_DIRECTIVES);

/** The policy for item pages, the Vault and the Broadcast. */
export const ITEM_CSP = serialize(OWN_ORIGIN_DIRECTIVES);

/** The Vault's policy: the same as an item page's. */
export const VAULT_CSP = ITEM_CSP;

/** The policy for every other successful shop page. */
export const SHOP_CSP = serialize(SHOP_DIRECTIVES);

/** Headers that are the same on every response. */
const COMMON_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function headersWith(csp: string): Readonly<Record<string, string>> {
  return { "Content-Security-Policy": csp, ...COMMON_HEADERS };
}

/** The default (strict) set of security headers. */
export const SECURITY_HEADERS = headersWith(STRICT_CSP);

/** The full header set for each policy in page-rules.ts. */
const HEADERS: Readonly<Record<Policy, Readonly<Record<string, string>>>> = {
  strict: SECURITY_HEADERS,
  shop: headersWith(SHOP_CSP),
  ownOrigin: headersWith(ITEM_CSP),
  checkout: headersWith(CHECKOUT_CSP),
};

/**
 * The security headers for one response. Only a successful (200) response
 * gets its page's policy (page-rules.ts); errors, redirects and not-found
 * pages run no script, so they stay strict.
 */
export function securityHeadersFor(
  pathname: string,
  status: number,
): Readonly<Record<string, string>> {
  return status === 200 ? HEADERS[pageRule(pathname).policy] : SECURITY_HEADERS;
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
