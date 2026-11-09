import { describe, expect, it } from "vitest";
import {
  REPAIR_PRICE_CENTS,
  REPAIR_SLUG,
  repairDescription,
  repairSessionForm,
} from "../src/core/repair";

describe("the buy-back checkout", () => {
  const form = repairSessionForm("https://shop.example", "a".repeat(32), 12);

  it("charges the set price, by card only, with nothing to ship", () => {
    expect(REPAIR_PRICE_CENTS).toBe(299);
    expect(form.get("mode")).toBe("payment");
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("299");
    expect(form.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(form.get("payment_method_types[0]")).toBe("card");
    expect([...form.keys()].some((key) => key.startsWith("shipping"))).toBe(false);
  });

  it("says what it is, and ties the payment to the agent's file", () => {
    expect(form.get("line_items[0][price_data][product_data][name]")).toBe(
      "Grease the Clerk: streak restoration",
    );
    expect(form.get("line_items[0][price_data][product_data][description]")).toBe(
      repairDescription(12),
    );
    expect(repairDescription(12)).toBe("Restores your 12-day duty streak at the Bureau's vault.");
    expect(form.get("metadata[slug]")).toBe(REPAIR_SLUG);
    expect(form.get("payment_intent_data[description]")).toBe("Grease the Clerk (12-day streak)");
    expect(form.get("client_reference_id")).toBe("a".repeat(32));
    expect(form.get("success_url")).toBe(
      "https://shop.example/streak/restored?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(form.get("cancel_url")).toBe("https://shop.example/vault");
    expect(form.get("branding_settings[display_name]")).toBe("Allegedly & Sons");
  });
});
