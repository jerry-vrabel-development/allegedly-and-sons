import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_ASYNC_PAYMENT_SUCCEEDED,
  CHECKOUT_COMPLETED,
  isOrderEvent,
  orderFromCompletedSession,
  parseStripeEvent,
  UNKNOWN_ITEM,
} from "../src/core/orders";

const PAID_AT = 1762531200;

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "cs_test_a1",
    object: "checkout.session",
    payment_status: "paid",
    amount_total: 99_900,
    currency: "usd",
    payment_intent: "pi_test_a1",
    metadata: { slug: "alien-paperclip", exhibit: "AS-0001" },
    customer_details: { email: "buyer@example.com", name: "Pat Buyer" },
    ...overrides,
  };
}

describe("parseStripeEvent", () => {
  const event = {
    id: "evt_1",
    type: "checkout.session.completed",
    created: PAID_AT,
    data: { object: { a: 1 } },
  };

  it("reads id, type, created and data.object", () => {
    expect(parseStripeEvent(event)).toEqual({
      id: "evt_1",
      type: "checkout.session.completed",
      created: PAID_AT,
      object: { a: 1 },
    });
  });

  it("refuses anything that isn't an event", () => {
    for (const bad of [
      null,
      "evt_1",
      [],
      { ...event, id: "cs_1" },
      { ...event, id: "evt_" },
      { ...event, type: "" },
      { ...event, type: 5 },
      { ...event, created: "1762531200" },
      { ...event, created: 0 },
      { ...event, data: null },
      { ...event, data: {} },
    ]) {
      expect(parseStripeEvent(bad), JSON.stringify(bad)).toBeUndefined();
    }
  });

  it("never throws, whatever arrives", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        parseStripeEvent(value);
      }),
    );
  });
});

describe("orderFromCompletedSession", () => {
  it("builds the order from a paid session, reading nothing personal", () => {
    expect(orderFromCompletedSession(session(), PAID_AT)).toEqual({
      kind: "order",
      order: {
        stripeSessionId: "cs_test_a1",
        paymentIntentId: "pi_test_a1",
        itemSlug: "alien-paperclip",
        amountCents: 99_900,
        paidAt: PAID_AT,
        visitorId: null,
        segment: null,
      },
    });
    expect(JSON.stringify(orderFromCompletedSession(session(), PAID_AT))).not.toMatch(
      /buyer@example\.com|Pat Buyer/,
    );
  });

  it("reads the visitor id from client_reference_id", () => {
    const visitor = "0123456789abcdef0123456789abcdef";
    const outcome = orderFromCompletedSession(session({ client_reference_id: visitor }), PAID_AT);
    expect(outcome).toMatchObject({ kind: "order", order: { visitorId: visitor } });
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["too short", "abc123"],
    ["uppercase", "0123456789ABCDEF0123456789ABCDEF"],
    ["a number", 42],
    ["an email", "buyer@example.com"],
  ])("still records the order, unattributed, when client_reference_id is %s", (_label, value) => {
    const outcome = orderFromCompletedSession(session({ client_reference_id: value }), PAID_AT);
    expect(outcome).toMatchObject({ kind: "order", order: { visitorId: null } });
  });

  it("skips sessions that aren't paid yet", () => {
    for (const payment_status of ["unpaid", "no_payment_required", undefined]) {
      expect(orderFromCompletedSession(session({ payment_status }), PAID_AT)).toEqual({
        kind: "skip",
        reason: "not paid",
      });
    }
  });

  it("calls out sessions it can't read", () => {
    const cases: [unknown, string][] = [
      [null, "session is not an object"],
      [session({ id: "pi_wrong" }), "no session id"],
      [session({ amount_total: 0 }), "no amount"],
      [session({ amount_total: 12.5 }), "no amount"],
      [session({ amount_total: null }), "no amount"],
      [session({ currency: "eur" }), "unexpected currency"],
    ];
    for (const [input, reason] of cases) {
      expect(orderFromCompletedSession(input, PAID_AT), reason).toEqual({
        kind: "invalid",
        reason,
      });
    }
  });

  it("keeps a paid order even when the item slug is missing or odd", () => {
    for (const metadata of [
      undefined,
      {},
      { slug: 7 },
      { slug: "Not A Slug!" },
      { slug: "x".repeat(65) },
    ]) {
      const outcome = orderFromCompletedSession(session({ metadata }), PAID_AT);
      expect(outcome.kind === "order" && outcome.order.itemSlug).toBe(UNKNOWN_ITEM);
    }
  });

  it("stores no payment intent id when Stripe sends none or an expanded object", () => {
    for (const payment_intent of [null, undefined, { id: "pi_x" }, "ch_wrong"]) {
      const outcome = orderFromCompletedSession(session({ payment_intent }), PAID_AT);
      expect(outcome.kind === "order" && outcome.order.paymentIntentId).toBeNull();
    }
  });

  it("never throws, whatever arrives", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        orderFromCompletedSession(value, PAID_AT);
      }),
    );
  });
});

describe("isOrderEvent", () => {
  it("is true only for the events that can carry a paid session", () => {
    expect(isOrderEvent(CHECKOUT_COMPLETED)).toBe(true);
    expect(isOrderEvent(CHECKOUT_ASYNC_PAYMENT_SUCCEEDED)).toBe(true);
    for (const other of ["checkout.session.async_payment_failed", "charge.refunded", ""]) {
      expect(isOrderEvent(other), other).toBe(false);
    }
  });
});
