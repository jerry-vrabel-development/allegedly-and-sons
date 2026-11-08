import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { returnOutcome, SESSION_ID } from "../src/core/checkout";
import worker, { route, type Deps } from "../src/worker/index";
import { retrieveCheckoutSession } from "../src/worker/stripe";
import { testEnv } from "./test-env";

const BASE = "https://allegedly.example";
const ID = "cs_test_a11yKKR7hXrvzcygm0yPSkeMfUvWk0VFdP5MrIif8LmjHn4HGbMaJNRnLE";

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: ID,
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    metadata: { slug: "alien-paperclip", exhibit: "AS-0001" },
    customer_details: { email: "buyer@example.com", name: "Pat Buyer" },
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("returnOutcome", () => {
  it("is paid only when Stripe says the session is complete and paid", () => {
    expect(returnOutcome(session())).toEqual({ kind: "paid", slug: "alien-paperclip" });
    expect(returnOutcome(session({ payment_status: "no_payment_required" })).kind).toBe("paid");
  });

  it("is processing when complete but not yet paid (delayed payment methods)", () => {
    expect(returnOutcome(session({ payment_status: "unpaid" }))).toEqual({
      kind: "processing",
      slug: "alien-paperclip",
    });
  });

  it("is incomplete when the session is still open or expired", () => {
    for (const status of ["open", "expired"]) {
      expect(returnOutcome(session({ status, payment_status: "unpaid" })).kind, status).toBe(
        "incomplete",
      );
    }
  });

  it("claims nothing for anything it doesn't recognize", () => {
    for (const value of [
      null,
      "paid",
      [],
      {},
      session({ status: "complete", payment_status: "mystery" }),
      session({ status: "weird" }),
    ]) {
      expect(returnOutcome(value), JSON.stringify(value)).toEqual({ kind: "unchecked" });
    }
  });

  it("drops a missing or odd item slug rather than trusting it", () => {
    for (const metadata of [undefined, {}, { slug: 5 }, { slug: "<b>" }]) {
      expect(returnOutcome(session({ metadata }))).toEqual({ kind: "paid", slug: undefined });
    }
  });
});

describe("SESSION_ID", () => {
  it("accepts real-looking session ids and nothing else", () => {
    expect(SESSION_ID.test(ID)).toBe(true);
    expect(SESSION_ID.test("cs_live_abc123")).toBe(true);
    for (const bad of [
      "",
      "cs_test_",
      "pi_test_abc",
      "cs_test_abc/../x",
      "cs_test_a b",
      `cs_test_${"a".repeat(201)}`,
    ]) {
      expect(SESSION_ID.test(bad), bad).toBe(false);
    }
  });
});

describe("retrieveCheckoutSession", () => {
  it("GETs the session with the key and pinned version", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const fetcher: typeof fetch = (input, init) => {
      calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
      return Promise.resolve(Response.json(session()));
    };
    const result = await retrieveCheckoutSession("sk_test_x", ID, fetcher);
    expect(result).toEqual({ ok: true, session: session() });
    expect(calls[0]?.url).toBe(`https://api.stripe.com/v1/checkout/sessions/${ID}`);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(new Headers(calls[0]?.init?.headers).get("Authorization")).toBe("Bearer sk_test_x");
    expect(new Headers(calls[0]?.init?.headers).get("Stripe-Version")).toBe("2025-09-30.clover");
  });

  it("reports failures with a reason that is safe to log", async () => {
    const cases: [typeof fetch, string][] = [
      [() => Promise.reject(new Error("offline")), "network error"],
      [() => Promise.resolve(new Response("{}", { status: 404 })), "stripe status 404"],
      [() => Promise.resolve(new Response("not json")), "unreadable reply"],
    ];
    for (const [fetcher, reason] of cases) {
      expect(await retrieveCheckoutSession("sk_test_x", ID, fetcher)).toEqual({
        ok: false,
        reason,
      });
    }
  });
});

/** Router deps with a Stripe key and a fake Stripe answering `reply`; records lookups. */
function deps(reply: () => Response | Promise<Response> = () => Response.json(session())) {
  const looked: string[] = [];
  const d: Deps = {
    stripeKey: "sk_test_fake",
    fetch: (input) => {
      looked.push(input instanceof Request ? input.url : input.toString());
      return Promise.resolve(reply());
    },
    webhookSecret: undefined,
    db: env.DB,
    nowSeconds: () => 0,
    waitUntil: () => undefined,
    visitorId: null,
    access: undefined,
  };
  return { deps: d, looked };
}

async function visit(
  query: string,
  d: Deps,
): Promise<{ status: number; text: string; cache: string | null }> {
  const response = await route(new Request(`${BASE}/thanks${query}`), d);
  return {
    status: response.status,
    text: await response.text(),
    cache: response.headers.get("Cache-Control"),
  };
}

describe("GET /thanks", () => {
  it("confirms a paid session with Stripe, then says so and names the item", async () => {
    const { deps: d, looked } = deps();
    const page = await visit(`?session_id=${ID}`, d);
    expect(page.status).toBe(200);
    expect(page.cache).toBe("no-store, no-transform");
    expect(page.text).toContain("Acquisition recorded");
    expect(page.text).toContain("Payment confirmed for The Alien Paperclip");
    expect(looked).toEqual([`https://api.stripe.com/v1/checkout/sessions/${ID}`]);
  });

  it("never shows the buyer's details, even though Stripe returns them", async () => {
    const { deps: d } = deps();
    const page = await visit(`?session_id=${ID}`, d);
    expect(page.text).not.toMatch(/buyer@example\.com|Pat Buyer/);
  });

  it("says processing, or not completed, when that's what Stripe says", async () => {
    const processing = deps(() => Response.json(session({ payment_status: "unpaid" })));
    expect((await visit(`?session_id=${ID}`, processing.deps)).text).toContain(
      "Payment processing",
    );

    const open = deps(() => Response.json(session({ status: "open", payment_status: "unpaid" })));
    const page = await visit(`?session_id=${ID}`, open.deps);
    expect(page.text).toContain("Acquisition not completed");
    expect(page.text).toContain('href="/checkout/alien-paperclip"');
  });

  it("still confirms payment when the item can't be named, without naming one", async () => {
    const { deps: d } = deps(() => Response.json(session({ metadata: {} })));
    const page = await visit(`?session_id=${ID}`, d);
    expect(page.text).toContain("Acquisition recorded");
    expect(page.text).toContain("Payment confirmed. Stripe");
  });

  it("claims nothing when Stripe's answer isn't one it recognizes", async () => {
    const { deps: d } = deps(() => Response.json(session({ status: "weird" })));
    const page = await visit(`?session_id=${ID}`, d);
    expect(page.text).toContain("<h1>Thank you</h1>");
    expect(page.text).not.toContain("Acquisition recorded");
  });

  it("claims nothing, and doesn't ask Stripe, without a usable session id", async () => {
    const { deps: d, looked } = deps();
    for (const query of [
      "",
      "?session_id=",
      "?session_id=pi_123",
      "?session_id=cs_test_a%2F..%2Fb",
    ]) {
      const page = await visit(query, d);
      expect(page.text, query).toContain("<h1>Thank you</h1>");
      expect(page.text, query).not.toContain("Acquisition recorded");
    }
    expect(looked).toHaveLength(0);
  });

  it("claims nothing when Stripe can't be asked, and logs only the reason", async () => {
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
    });
    const { deps: d } = deps(() => new Response("{}", { status: 500 }));
    const page = await visit(`?session_id=${ID}`, d);
    expect(page.status).toBe(200);
    expect(page.text).toContain("<h1>Thank you</h1>");
    expect(errors).toEqual(["return page: stripe status 500"]);
    expect(errors.join(" ")).not.toContain(ID);
  });

  it("claims nothing when no Stripe key is set", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/thanks?session_id=${ID}`),
      testEnv(),
      createExecutionContext(),
    );
    expect(await response.text()).toContain("<h1>Thank you</h1>");
  });
});
