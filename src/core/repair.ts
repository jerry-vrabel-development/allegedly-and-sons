/**
 * "Grease the Clerk" (design note 0003, G4 PR 2): buying back a dead duty
 * streak. Pure: the price lives here, never in a form, and the Checkout
 * Session it asks Stripe for is built from it.
 *
 * A definite digital item for a set price. Not a chance at anything: vault
 * prizes have no money value, so a restored streak (and the bonus pulls its
 * milestones bring) stays clear of lottery rules. Revisit if discount codes
 * ever become prizes.
 */

import { CHECKOUT_BRANDING } from "./checkout";

/** The order's item slug, and the Stripe metadata that marks a repair. */
export const REPAIR_SLUG = "streak-repair";

/** $2.99, in cents. */
export const REPAIR_PRICE_CENTS = 299;

export const REPAIR_NAME = "Grease the Clerk";

export const REPAIR_PATH = "/streak/repair";
export const REPAIR_RETURN_PATH = "/streak/restored";

/** "a 12-day streak" → the line on the receipt. */
export function repairDescription(days: number): string {
  return `Restores your ${String(days)}-day duty streak at the Bureau's vault.`;
}

/**
 * The Checkout Session for buying back a `days`-long streak, on Stripe's
 * hosted page. Cards only, so it's paid on the spot (no delayed methods for a
 * $2.99 instant item), and no shipping: nothing ships.
 */
export function repairSessionForm(
  origin: string,
  visitorId: string,
  days: number,
): URLSearchParams {
  const form = new URLSearchParams({
    mode: "payment",
    "payment_method_types[0]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(REPAIR_PRICE_CENTS),
    "line_items[0][price_data][product_data][name]": `${REPAIR_NAME}: streak restoration`,
    "line_items[0][price_data][product_data][description]": repairDescription(days),
    "metadata[slug]": REPAIR_SLUG,
    "payment_intent_data[description]": `${REPAIR_NAME} (${String(days)}-day streak)`,
    "payment_intent_data[metadata][slug]": REPAIR_SLUG,
    customer_creation: "always",
    client_reference_id: visitorId,
    // Stripe fills in the session id, so the page can ask Stripe whether it was paid.
    success_url: `${origin}${REPAIR_RETURN_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/vault`,
  });
  for (const [key, value] of Object.entries(CHECKOUT_BRANDING)) {
    form.set(`branding_settings[${key}]`, value);
  }
  return form;
}
