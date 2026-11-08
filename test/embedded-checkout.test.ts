import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../src/core/catalog";
import {
  checkoutSessionForm,
  embeddedCheckoutSessionForm,
  THANKS_PATH,
} from "../src/core/checkout";
import worker, { route, type Deps } from "../src/worker/index";
import { CHECKOUT_CSP, STRICT_CSP } from "../src/worker/security-headers";
import {
  clientSecretFrom,
  createEmbeddedCheckoutSession,
  MAX_CLIENT_SECRET_LENGTH,
} from "../src/worker/stripe";
import { testEnv } from "./test-env";

const BASE = "https://allegedly.example";
const ITEM = CATALOG[0];
const SECRET = "cs_test_a1B2_secret_c3D4";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("embeddedCheckoutSessionForm", () => {
  it("asks for an embedded session that returns to our thanks page with the session id", () => {
    const form = embeddedCheckoutSessionForm(ITEM, BASE);
    expect(form.get("ui_mode")).toBe("embedded");
    expect(form.get("return_url")).toBe(`${BASE}${THANKS_PATH}?session_id={CHECKOUT_SESSION_ID}`);
    expect(form.has("success_url")).toBe(false);
    expect(form.has("cancel_url")).toBe(false);
  });

  for (const item of CATALOG) {
    it(`sells ${item.slug} exactly like the hosted checkout: same price, metadata and branding`, () => {
      const without = (form: URLSearchParams, keys: readonly string[]) =>
        Object.fromEntries([...form].filter(([key]) => !keys.includes(key)));
      const hosted = without(checkoutSessionForm(item, BASE), ["success_url", "cancel_url"]);
      const embedded = without(embeddedCheckoutSessionForm(item, BASE), ["ui_mode", "return_url"]);
      expect(embedded).toEqual(hosted);
    });
  }
});

describe("clientSecretFrom", () => {
  it("accepts a realistic ~500-character secret with base64-style characters", () => {
    // Shaped like the real sandbox reply (2026-11-07): about 500 characters. The
    // characters here are a guess at the widest likely set; the real value is masked.
    const realistic = `cs_test_a1bXy3MC23NbNvw5Q5mNraBQ4n9x_secret_${"fidwbEhq+YWAn/Pyd=%2B-".repeat(20)}`;
    expect(realistic.length).toBeGreaterThan(450);
    expect(clientSecretFrom({ client_secret: realistic })).toBe(realistic);
    expect(clientSecretFrom({ client_secret: SECRET })).toBe(SECRET);
  });

  it("refuses anything that isn't a plausible Checkout Session secret", () => {
    for (const body of [
      null,
      "x",
      {},
      { client_secret: null },
      { client_secret: 5 },
      { client_secret: "" },
      { client_secret: "pi_123_secret_456" },
      { client_secret: "cs_" + "a".repeat(MAX_CLIENT_SECRET_LENGTH) },
      { client_secret: `${SECRET} extra` },
      { client_secret: `${SECRET}\n` },
      { client_secret: `${SECRET}\u0000` },
      { client_secret: `${SECRET}é` },
    ]) {
      expect(clientSecretFrom(body), JSON.stringify(body)).toBeUndefined();
    }
  });
});

describe("createEmbeddedCheckoutSession", () => {
  it("returns the client secret from Stripe's reply", async () => {
    const fetcher: typeof fetch = () => Promise.resolve(Response.json({ client_secret: SECRET }));
    expect(
      await createEmbeddedCheckoutSession("sk_test_x", new URLSearchParams(), fetcher),
    ).toEqual({
      ok: true,
      clientSecret: SECRET,
    });
  });

  it("reports failures with a reason that is safe to log", async () => {
    const cases: [typeof fetch, string][] = [
      [() => Promise.reject(new Error("offline")), "network error"],
      [() => Promise.resolve(new Response("{}", { status: 400 })), "stripe status 400"],
      [() => Promise.resolve(new Response("not json")), "unreadable reply"],
      [
        () => Promise.resolve(Response.json({ url: "https://checkout.stripe.com/x" })),
        "no client secret",
      ],
    ];
    for (const [fetcher, reason] of cases) {
      expect(
        await createEmbeddedCheckoutSession("sk_test_x", new URLSearchParams(), fetcher),
      ).toEqual({
        ok: false,
        reason,
      });
    }
  });
});

/** Router deps with a Stripe key and a fake Stripe that records what it was sent. */
function deps(
  reply: () => Response | Promise<Response> = () => Response.json({ client_secret: SECRET }),
) {
  const sent: URLSearchParams[] = [];
  const fetcher: typeof fetch = async (_input, init) => {
    const body = init?.body;
    if (!(body instanceof URLSearchParams)) throw new Error("expected a form body");
    sent.push(body);
    return reply();
  };
  const d: Deps = {
    stripeKey: "sk_test_fake",
    fetch: fetcher,
    webhookSecret: undefined,
    db: env.DB,
    nowSeconds: () => 0,
    waitUntil: () => undefined,
    visitorId: null,
  };
  return { deps: d, sent };
}

function postSession(
  slug = ITEM.slug,
  headers: Record<string, string> = { Origin: BASE },
): Request {
  return new Request(`${BASE}/checkout/${slug}/session`, { method: "POST", headers });
}

describe("GET /checkout/<item>", () => {
  it("serves the checkout page without calling Stripe", async () => {
    const { deps: d, sent } = deps();
    const response = await route(new Request(`${BASE}/checkout/${ITEM.slug}`), d);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, no-transform");
    const text = await response.text();
    expect(text).toContain(`data-session-url="/checkout/${ITEM.slug}/session"`);
    expect(text).toContain("Continue on Stripe’s secure page");
    expect(sent).toHaveLength(0);
  });

  it("is the one page the deployed Worker serves with the Stripe checkout policy", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/checkout/${ITEM.slug}`),
      testEnv({ STRIPE_SECRET_KEY: "sk_test_fake" }),
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Security-Policy")).toBe(CHECKOUT_CSP);
  });

  it("says acquisitions open soon (503, strict policy) when no Stripe key is set", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/checkout/${ITEM.slug}`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Acquisitions open soon");
    expect(response.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
  });

  it("is 404 for items that don't exist", async () => {
    const { deps: d } = deps();
    expect((await route(new Request(`${BASE}/checkout/xenoclip`), d)).status).toBe(404);
  });
});

describe("POST /checkout/<item>/session", () => {
  it("creates an embedded session priced from the catalog and returns only the client secret", async () => {
    const { deps: d, sent } = deps();
    const response = await route(postSession(), d);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ clientSecret: SECRET });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.get("ui_mode")).toBe("embedded");
    expect(sent[0]?.get("line_items[0][price_data][unit_amount]")).toBe(String(ITEM.priceCents));
    expect(sent[0]?.get("return_url")).toBe(`${BASE}/thanks?session_id={CHECKOUT_SESSION_ID}`);
  });

  it("refuses requests without our Origin, without calling Stripe", async () => {
    const { deps: d, sent } = deps();
    for (const headers of [{}, { Origin: "https://evil.example" }, { Origin: "null" }]) {
      const response = await route(postSession(ITEM.slug, headers), d);
      expect(response.status, JSON.stringify(headers)).toBe(403);
    }
    expect(sent).toHaveLength(0);
  });

  it("is 404 for items that don't exist, without calling Stripe", async () => {
    const { deps: d, sent } = deps();
    const response = await route(postSession("xenoclip"), d);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not found" });
    expect(sent).toHaveLength(0);
  });

  it("answers 503 'closed' when no Stripe key is set", async () => {
    const { deps: d } = deps();
    const response = await route(postSession(), { ...d, stripeKey: undefined });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "closed" });
  });

  it("answers 502 when Stripe fails, and logs only the reason", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    const { deps: d } = deps(() => new Response("{}", { status: 500 }));
    const response = await route(postSession(), d);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "unavailable" });
    expect(errors).toEqual(["embedded checkout failed: stripe status 500"]);
  });

  it("gets the strict policy from the deployed Worker (it's JSON, not the checkout page)", async () => {
    const response = await worker.fetch(postSession(), testEnv(), createExecutionContext());
    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
  });

  it("is only for POST", async () => {
    const { deps: d } = deps();
    expect((await route(new Request(`${BASE}/checkout/${ITEM.slug}/session`), d)).status).toBe(404);
  });
});
