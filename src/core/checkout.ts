/**
 * What the shop asks Stripe for when a visitor acquires an exhibit.
 *
 * Pure and shared: the price always comes from the catalog, never from the
 * browser, so nobody can edit a form and pay one cent for an alien paperclip.
 */

import type { Item } from "./catalog";

/** Where buyers land after paying. */
export const THANKS_PATH = "/thanks";

/** Countries the shop ships to. The founder fulfills orders himself, so US only for now. */
export const SHIPPING_COUNTRIES = ["US"] as const;

/**
 * How Stripe's hosted Checkout page should look, so it matches the shop instead
 * of jarring buyers. Colors are the shop's light theme (see styles.ts; a test
 * keeps them in step). Stripe offers a fixed font list; PT Serif is the closest
 * to the shop's Georgia.
 */
export const CHECKOUT_BRANDING = {
  display_name: "Allegedly & Sons",
  background_color: "#fbf7ef",
  button_color: "#7a1f1f",
  border_style: "rounded",
  font_family: "pt_serif",
} as const;

export function checkoutPath(item: Item): string {
  return `/checkout/${item.slug}`;
}

/** How a payment is described in Stripe, e.g. "The Alien Paperclip (Exhibit AS-0001)". */
export function paymentDescription(item: Item): string {
  return `${item.name} (Exhibit ${item.exhibit})`;
}

/**
 * The form fields for Stripe's "create a Checkout Session" call, for one item.
 * `origin` is the shop's own origin (for example https://allegedly.example).
 */
export function checkoutSessionForm(item: Item, origin: string): URLSearchParams {
  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(item.priceCents),
    "line_items[0][price_data][product_data][name]": item.name,
    "line_items[0][price_data][product_data][description]": item.tagline,
    "metadata[slug]": item.slug,
    "metadata[exhibit]": item.exhibit,
    // The payment itself says what was bought, so the Transactions list reads as an order list.
    "payment_intent_data[description]": paymentDescription(item),
    "payment_intent_data[metadata][slug]": item.slug,
    "payment_intent_data[metadata][exhibit]": item.exhibit,
    // A customer record per buyer, so name and email show up beside each payment.
    customer_creation: "always",
    success_url: `${origin}${THANKS_PATH}`,
    cancel_url: `${origin}/items/${item.slug}`,
  });
  for (const [key, value] of Object.entries(CHECKOUT_BRANDING)) {
    form.set(`branding_settings[${key}]`, value);
  }
  SHIPPING_COUNTRIES.forEach((country, index) => {
    form.set(`shipping_address_collection[allowed_countries][${String(index)}]`, country);
  });
  return form;
}
