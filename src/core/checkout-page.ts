/**
 * What the embedded checkout page and its script
 * (src/client/entries/checkout.ts) agree on. Kept on its own, with no
 * imports, so the script's bundle carries these few values and nothing else.
 */

/** Stripe.js, pinned to the release that matches STRIPE_API_VERSION (clover). */
export const STRIPE_JS_URL = "https://js.stripe.com/clover/stripe.js";

/** The id of the element Stripe's Checkout mounts into. */
export const CHECKOUT_MOUNT_ID = "checkout";

/** The id of the status line above it. */
export const CHECKOUT_STATUS_ID = "checkout-status";

/** What the status line says. */
export const CHECKOUT_STATUS = {
  loading: "Opening the vault…",
  failed:
    "The secure form couldn’t open here. Nothing was charged. You can still pay on Stripe’s own secure page below.",
} as const;
