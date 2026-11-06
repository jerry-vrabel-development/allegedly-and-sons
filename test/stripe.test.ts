import { describe, expect, it } from "vitest";
import { checkoutUrlFrom, createCheckoutSession, STRIPE_API_VERSION } from "../src/worker/stripe";

const KEY = "sk_test_fake";
const GOOD_URL = "https://checkout.stripe.com/c/pay/cs_test_123";

/** A fake `fetch` that records what it was asked and answers with `reply`. */
function fakeFetch(reply: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit | undefined }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    return reply();
  };
  return { fetcher, calls };
}

describe("createCheckoutSession", () => {
  it("posts the form to Stripe with the key as a bearer token", async () => {
    const { fetcher, calls } = fakeFetch(() => Response.json({ url: GOOD_URL }));
    const form = new URLSearchParams({ mode: "payment" });
    const result = await createCheckoutSession(KEY, form, fetcher);

    expect(result).toEqual({ ok: true, url: GOOD_URL });
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.stripe.com/v1/checkout/sessions");
    expect(call?.init?.method).toBe("POST");
    const headers = new Headers(call?.init?.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${KEY}`);
    expect(headers.get("Content-Type")).toBe("application/x-www-form-urlencoded");
    expect(headers.get("Stripe-Version")).toBe(STRIPE_API_VERSION);
    const body = call?.init?.body;
    expect(body instanceof URLSearchParams ? body.toString() : body).toBe("mode=payment");
  });

  it("reports Stripe errors by status, without the key", async () => {
    const { fetcher } = fakeFetch(() =>
      Response.json({ error: { message: "nope" } }, { status: 401 }),
    );
    const result = await createCheckoutSession(KEY, new URLSearchParams(), fetcher);
    expect(result).toEqual({ ok: false, reason: "stripe status 401" });
    expect(JSON.stringify(result)).not.toContain(KEY);
  });

  it("survives a network failure", async () => {
    const { fetcher } = fakeFetch(() => Promise.reject(new Error(`boom ${KEY}`)));
    const result = await createCheckoutSession(KEY, new URLSearchParams(), fetcher);
    expect(result).toEqual({ ok: false, reason: "network error" });
  });

  it("survives a reply that isn't JSON", async () => {
    const { fetcher } = fakeFetch(() => new Response("<html>"));
    expect(await createCheckoutSession(KEY, new URLSearchParams(), fetcher)).toEqual({
      ok: false,
      reason: "unreadable reply",
    });
  });

  it("refuses a reply without a Stripe Checkout URL", async () => {
    const { fetcher } = fakeFetch(() => Response.json({ url: "https://evil.example/pay" }));
    expect(await createCheckoutSession(KEY, new URLSearchParams(), fetcher)).toEqual({
      ok: false,
      reason: "no checkout url",
    });
  });
});

describe("checkoutUrlFrom", () => {
  it("accepts only https://checkout.stripe.com/ URLs", () => {
    expect(checkoutUrlFrom({ url: GOOD_URL })).toBe(GOOD_URL);
    for (const body of [
      null,
      "x",
      42,
      {},
      { url: 7 },
      { url: "http://checkout.stripe.com/c/pay" },
      { url: "https://checkout.stripe.com.evil.example/c/pay" },
      { url: "https://evil.example/?https://checkout.stripe.com/" },
    ]) {
      expect(checkoutUrlFrom(body)).toBeUndefined();
    }
  });
});

describe("STRIPE_API_VERSION", () => {
  it("is pinned to a version that supports Checkout branding_settings", () => {
    expect(STRIPE_API_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.[a-z]+$/);
    expect(STRIPE_API_VERSION.slice(0, 10).localeCompare("2025-09-30")).toBeGreaterThanOrEqual(0);
  });
});
