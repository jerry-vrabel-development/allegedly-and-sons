import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { route, type Deps } from "../src/worker/index";
import { MAX_WEBHOOK_BYTES } from "../src/worker/webhook";
import { stripeSignatureHeader } from "./stripe-test-signing";
import { testEnv } from "./test-env";
import { WEBHOOK_PATH } from "../src/core/paths";

const BASE = "https://allegedly.example";
const SECRET = "whsec_test_webhook";
const NOW = 1762531200;
const EMAIL = "buyer@example.com";

function deps(overrides: Partial<Deps> = {}): Deps {
  return {
    stripeKey: undefined,
    fetch: () => Promise.reject(new Error("the webhook must not call out")),
    webhookSecret: SECRET,
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId: null,
    access: undefined,
    ...overrides,
  };
}

function completedEvent(
  id = "evt_test_1",
  sessionOverrides: Record<string, unknown> = {},
  type = "checkout.session.completed",
) {
  return {
    id,
    object: "event",
    type,
    created: NOW - 2,
    data: {
      object: {
        id: "cs_test_a1",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 99_900,
        currency: "usd",
        payment_intent: "pi_test_a1",
        metadata: { slug: "alien-paperclip", exhibit: "AS-0001" },
        customer_details: { email: EMAIL, name: "Pat Buyer", address: { line1: "1 Secret St" } },
        ...sessionOverrides,
      },
    },
  };
}

async function signedRequest(body: unknown, secret = SECRET, timestamp = NOW): Promise<Request> {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`${BASE}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": await stripeSignatureHeader(payload, secret, timestamp),
    },
    body: payload,
  });
}

async function deliver(body: unknown, d: Deps = deps()): Promise<Response> {
  return route(await signedRequest(body), d);
}

async function count(table: "orders" | "stripe_events"): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>();
  return row?.n ?? -1;
}

let logs: string[];

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM orders"),
    env.DB.prepare("DELETE FROM stripe_events"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
  logs = [];
  for (const level of ["log", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe(`POST ${WEBHOOK_PATH}`, () => {
  it("records a paid order and the event, and answers 200", async () => {
    const response = await deliver(completedEvent());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });

    expect(await env.DB.prepare("SELECT * FROM orders").all()).toMatchObject({
      results: [
        {
          stripe_session_id: "cs_test_a1",
          payment_intent_id: "pi_test_a1",
          item_slug: "alien-paperclip",
          amount_cents: 99_900,
          status: "paid",
          paid_at: NOW - 2,
          shipped_at: null,
          visitor_id: null,
        },
      ],
    });
    expect(await env.DB.prepare("SELECT * FROM stripe_events").all()).toMatchObject({
      results: [{ id: "evt_test_1", type: "checkout.session.completed", received_at: NOW }],
    });
    expect(logs).toEqual(["webhook checkout.session.completed evt_test_1: order cs_test_a1"]);
  });

  it("stores the visitor id Stripe hands back, linking the order to the visits before it", async () => {
    const visitor = "0123456789abcdef0123456789abcdef";
    expect(
      (await deliver(completedEvent("evt_test_1", { client_reference_id: visitor }))).status,
    ).toBe(200);
    const row = await env.DB.prepare("SELECT visitor_id FROM orders").first();
    expect(row).toEqual({ visitor_id: visitor });
  });

  it("gives the buyer Acquirer and the item's card, once", async () => {
    const visitor = "0123456789abcdef0123456789abcdef";
    const paid = completedEvent("evt_test_1", { client_reference_id: visitor });
    expect((await deliver(paid)).status).toBe(200);
    expect((await deliver(paid)).status).toBe(200);
    const { results } = await env.DB.prepare("SELECT award FROM awards ORDER BY award").all();
    expect(results).toEqual([{ award: "acquirer" }, { award: "card:alien-paperclip" }]);
  });

  it("still acknowledges the order if the dossier grant fails", async () => {
    const visitor = "0123456789abcdef0123456789abcdef";
    let calls = 0;
    const db = new Proxy(env.DB, {
      get(target, prop, receiver) {
        if (prop === "batch") {
          return (statements: D1PreparedStatement[]) => {
            calls += 1;
            return calls === 1 ? target.batch(statements) : Promise.reject(new Error("D1 hiccup"));
          };
        }
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    const response = await deliver(
      completedEvent("evt_test_1", { client_reference_id: visitor }),
      deps({ db }),
    );
    expect(response.status).toBe(200);
    expect(await count("orders")).toBe(1);
    expect(logs.join("\n")).toContain("dossier grant failed");
  });

  it("does nothing the second time the same event arrives", async () => {
    expect((await deliver(completedEvent())).status).toBe(200);
    expect((await deliver(completedEvent())).status).toBe(200);
    expect(await count("orders")).toBe(1);
    expect(await count("stripe_events")).toBe(1);
    expect(logs[1]).toBe("webhook checkout.session.completed evt_test_1: duplicate, ignored");
  });

  it("records one order when two different events describe the same session", async () => {
    await deliver(completedEvent("evt_test_1"));
    await deliver(completedEvent("evt_test_2"));
    expect(await count("orders")).toBe(1);
    expect(await count("stripe_events")).toBe(2);
  });

  it("records the event but no order for an unpaid session", async () => {
    expect((await deliver(completedEvent("evt_test_1", { payment_status: "unpaid" }))).status).toBe(
      200,
    );
    expect(await count("orders")).toBe(0);
    expect(await count("stripe_events")).toBe(1);
    expect(logs).toEqual(["webhook checkout.session.completed evt_test_1: not paid"]);
  });

  it("records the order when a delayed payment clears, after skipping the unpaid session", async () => {
    // A delayed method (a bank debit, say): the session completes unpaid, and
    // Stripe sends async_payment_succeeded for the same session once it clears.
    const visitor = "c".repeat(32);
    const session = { client_reference_id: visitor };
    await deliver(completedEvent("evt_test_1", { ...session, payment_status: "unpaid" }));
    expect(await count("orders")).toBe(0);

    const cleared = completedEvent(
      "evt_test_2",
      session,
      "checkout.session.async_payment_succeeded",
    );
    expect((await deliver(cleared)).status).toBe(200);
    const order = await env.DB.prepare(
      "SELECT stripe_session_id, item_slug, amount_cents, paid_at, visitor_id FROM orders",
    ).first();
    expect(order).toEqual({
      stripe_session_id: "cs_test_a1",
      item_slug: "alien-paperclip",
      amount_cents: 99_900,
      // Paid when the payment cleared: the later event's time.
      paid_at: NOW - 2,
      visitor_id: visitor,
    });
    expect(logs).toContain(
      "webhook checkout.session.async_payment_succeeded evt_test_2: order cs_test_a1",
    );
    // The buyer's dossier is granted then too, once.
    const { results } = await env.DB.prepare("SELECT award FROM awards ORDER BY award").all<{
      award: string;
    }>();
    expect(results.map((row) => row.award)).toEqual(["acquirer", "card:alien-paperclip"]);

    // Redelivered, it changes nothing.
    await deliver(cleared);
    expect(await count("orders")).toBe(1);
  });

  it("records one order when a paid session is reported by both events", async () => {
    await deliver(completedEvent("evt_test_1"));
    await deliver(completedEvent("evt_test_2", {}, "checkout.session.async_payment_succeeded"));
    expect(await count("orders")).toBe(1);
  });

  it("records nothing when a delayed payment fails", async () => {
    const failed = completedEvent(
      "evt_test_1",
      { payment_status: "unpaid" },
      "checkout.session.async_payment_failed",
    );
    expect((await deliver(failed)).status).toBe(200);
    expect(await count("orders")).toBe(0);
    expect(logs).toEqual([
      "webhook checkout.session.async_payment_failed evt_test_1: acknowledged",
    ]);
  });

  it("acknowledges other event types without recording an order", async () => {
    expect((await deliver(completedEvent("evt_test_1", {}, "charge.refunded"))).status).toBe(200);
    expect(await count("orders")).toBe(0);
    expect(await count("stripe_events")).toBe(1);
    expect(logs).toEqual(["webhook charge.refunded evt_test_1: acknowledged"]);
  });

  it("logs a paid-looking session it can't read loudly, and still acknowledges it", async () => {
    expect((await deliver(completedEvent("evt_test_1", { currency: "eur" }))).status).toBe(200);
    expect(await count("orders")).toBe(0);
    expect(logs).toContain("webhook checkout.session.completed evt_test_1: unexpected currency");
  });

  it("answers 503 and stores nothing when no signing secret is configured", async () => {
    const response = await deliver(completedEvent(), deps({ webhookSecret: undefined }));
    expect(response.status).toBe(503);
    expect(await count("stripe_events")).toBe(0);
  });

  it("refuses bad signatures with 400, stores nothing, and logs only the reason", async () => {
    const payload = JSON.stringify(completedEvent());
    const unsigned = new Request(`${BASE}${WEBHOOK_PATH}`, { method: "POST", body: payload });
    const wrongSecret = await signedRequest(completedEvent(), "whsec_someone_else");
    const stale = await signedRequest(completedEvent(), SECRET, NOW - 301);

    for (const request of [unsigned, wrongSecret, stale]) {
      expect((await route(request, deps())).status).toBe(400);
    }
    expect(await count("stripe_events")).toBe(0);
    expect(await count("orders")).toBe(0);
    expect(logs).toEqual([
      "webhook refused: missing header",
      "webhook refused: no matching signature",
      "webhook refused: timestamp outside tolerance",
    ]);
  });

  it("refuses a signed body that isn't JSON, or isn't a Stripe event", async () => {
    expect((await deliver("not json")).status).toBe(400);
    expect((await deliver({ hello: "world" })).status).toBe(400);
    expect(await count("stripe_events")).toBe(0);
    expect(logs).toEqual([
      "webhook refused: unreadable body",
      "webhook refused: not a Stripe event",
    ]);
  });

  it("refuses bodies over the size cap with 413, before checking anything else", async () => {
    const huge = "x".repeat(MAX_WEBHOOK_BYTES + 1);
    expect((await deliver(huge)).status).toBe(413);
    expect((await deliver("x".repeat(MAX_WEBHOOK_BYTES))).status).toBe(400); // at the cap: read, then refused as JSON
  });

  it("answers 500 and stores nothing when the database fails, so Stripe retries", async () => {
    const broken = new Proxy(env.DB, {
      get(target, prop, receiver) {
        if (prop === "batch") return () => Promise.reject(new Error("D1 is down"));
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    const response = await deliver(completedEvent(), deps({ db: broken }));
    expect(response.status).toBe(500);
    expect(await count("stripe_events")).toBe(0);
    expect(logs).toEqual(["webhook checkout.session.completed evt_test_1: database error"]);

    // Stripe's retry then succeeds.
    expect((await deliver(completedEvent())).status).toBe(200);
    expect(await count("orders")).toBe(1);
  });

  it("writes the event and the order in one transaction: a late failure keeps neither", async () => {
    // Append a statement that fails after the real ones, inside the same batch.
    const failsLate = new Proxy(env.DB, {
      get(target, prop) {
        if (prop === "batch") {
          return (statements: D1PreparedStatement[]) =>
            target.batch([...statements, target.prepare("INSERT INTO no_such_table VALUES (1)")]);
        }
        const value: unknown = Reflect.get(target, prop);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    expect((await deliver(completedEvent(), deps({ db: failsLate }))).status).toBe(500);
    expect(await count("stripe_events")).toBe(0);
    expect(await count("orders")).toBe(0);
  });

  it("never logs or stores the buyer's details", async () => {
    await deliver(completedEvent());
    await deliver(completedEvent());
    await deliver(completedEvent("evt_test_3", { currency: "eur" }));
    await route(await signedRequest(completedEvent(), "whsec_wrong"), deps());

    const stored = JSON.stringify([
      await env.DB.prepare("SELECT * FROM orders").all(),
      await env.DB.prepare("SELECT * FROM stripe_events").all(),
    ]);
    for (const secret of [EMAIL, "Pat Buyer", "Secret St", SECRET]) {
      expect(stored).not.toContain(secret);
      expect(logs.join("\n")).not.toContain(secret);
    }
  });

  it("is not served for GET", async () => {
    const response = await route(new Request(`${BASE}${WEBHOOK_PATH}`), deps());
    expect(response.status).toBe(404);
    expect(await count("stripe_events")).toBe(0);
  });
});

describe("the deployed Worker", () => {
  it("routes the webhook with the env's secret and database", async () => {
    const secured = testEnv({ STRIPE_WEBHOOK_SECRET: ` ${SECRET} ` });
    const now = Math.floor(Date.now() / 1000);
    const response = await worker.fetch(
      await signedRequest(completedEvent(), SECRET, now),
      secured,
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    expect(await count("orders")).toBe(1);
  });

  it("answers 503 when the env has no signing secret", async () => {
    const response = await worker.fetch(
      await signedRequest(completedEvent()),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.status).toBe(503);
  });
});
