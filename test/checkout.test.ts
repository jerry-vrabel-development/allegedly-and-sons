import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import {
  checkoutPath,
  checkoutSessionForm,
  paymentDescription,
  THANKS_PATH,
} from "../src/core/checkout";

const ORIGIN = "https://allegedly.example";

describe("checkoutSessionForm", () => {
  for (const item of CATALOG) {
    it(`asks Stripe for ${item.slug} at the catalog price, once`, () => {
      const form = checkoutSessionForm(item, ORIGIN);
      expect(form.get("mode")).toBe("payment");
      expect(form.get("line_items[0][quantity]")).toBe("1");
      expect(form.get("line_items[0][price_data][currency]")).toBe("usd");
      expect(form.get("line_items[0][price_data][unit_amount]")).toBe(String(item.priceCents));
      expect(form.get("line_items[0][price_data][product_data][name]")).toBe(item.name);
      expect(form.get("metadata[slug]")).toBe(item.slug);
      expect(form.get("metadata[exhibit]")).toBe(item.exhibit);
    });
  }

  it("sends buyers back to our own origin, and to the item if they cancel", () => {
    const item = CATALOG[0];
    const form = checkoutSessionForm(item, ORIGIN);
    expect(form.get("success_url")).toBe(`${ORIGIN}${THANKS_PATH}`);
    expect(form.get("cancel_url")).toBe(`${ORIGIN}/items/${item.slug}`);
  });

  for (const item of CATALOG) {
    it(`labels the ${item.slug} payment so the dashboard reads as an order list`, () => {
      const form = checkoutSessionForm(item, ORIGIN);
      expect(form.get("payment_intent_data[description]")).toBe(
        `${item.name} (Exhibit ${item.exhibit})`,
      );
      expect(form.get("payment_intent_data[metadata][slug]")).toBe(item.slug);
      expect(form.get("payment_intent_data[metadata][exhibit]")).toBe(item.exhibit);
    });
  }

  it("always creates a customer, so name and email show beside each payment", () => {
    expect(checkoutSessionForm(CATALOG[0], ORIGIN).get("customer_creation")).toBe("always");
  });

  it("collects a US shipping address, since real objects ship", () => {
    const form = checkoutSessionForm(CATALOG[0], ORIGIN);
    expect(form.get("shipping_address_collection[allowed_countries][0]")).toBe("US");
  });

  it("sends whole cents for any price, with no floating-point drift", () => {
    fc.assert(
      fc.property(fc.integer({ min: 50, max: 99_999_999 }), (priceCents) => {
        const form = checkoutSessionForm({ ...CATALOG[0], priceCents }, ORIGIN);
        expect(form.get("line_items[0][price_data][unit_amount]")).toBe(String(priceCents));
      }),
    );
  });
});

describe("checkoutPath", () => {
  it("is /checkout/<slug>", () => {
    expect(checkoutPath(CATALOG[0])).toBe(`/checkout/${CATALOG[0].slug}`);
  });
});

describe("paymentDescription", () => {
  it("names the item and its exhibit number", () => {
    const item = CATALOG[0];
    expect(paymentDescription(item)).toBe(`${item.name} (Exhibit ${item.exhibit})`);
  });
});
