import { exports } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { CATALOG } from "../src/core/catalog";
import worker, { globalFetch, route, stripeKeyFrom } from "../src/worker/index";

const BASE = "https://allegedly.example";

function get(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${BASE}${path}`, init));
}

describe("Worker", () => {
  it("serves the home page as HTML", async () => {
    const response = await get("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("The Collection");
  });

  it("serves every item page", async () => {
    for (const item of CATALOG) {
      const response = await get(`/items/${item.slug}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(item.exhibit);
    }
  });

  it("serves the fine print", async () => {
    const response = await get("/disclaimer");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("The Fine Print");
  });

  it("serves the stylesheet as CSS", async () => {
    const response = await get("/assets/site.css");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(await response.text()).toContain("prefers-reduced-motion");
  });

  it("reports health as JSON and is never cached", async () => {
    const response = await get("/healthz");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers HEAD like GET", async () => {
    const response = await get("/", { method: "HEAD" });
    expect(response.status).toBe(200);
  });

  it("serves each item's art as SVG", async () => {
    for (const item of CATALOG) {
      const response = await get(`/assets/art/${item.slug}.svg`);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/svg+xml; charset=utf-8");
      expect(await response.text()).toContain(item.exhibit);
    }
  });

  it("returns 404 for art that doesn't exist", async () => {
    for (const path of ["/assets/art/xenoclip.svg", "/assets/art/alien-paperclip.png"]) {
      expect((await get(path)).status).toBe(404);
    }
  });

  it("builds share links from the request's own origin", async () => {
    const page = await (await get("/items/alien-paperclip")).text();
    expect(page).toContain(encodeURIComponent(`${BASE}/items/alien-paperclip`));
  });

  it("returns a friendly HTML 404 for unknown paths and items", async () => {
    for (const path of [
      "/the-other-three-xenoclips",
      "/items/xenoclip",
      "/items/ALIEN",
      "/items/",
    ]) {
      const response = await get(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
      expect(await response.text()).toContain("The Bureau is still looking.");
    }
  });

  it("rejects non-GET methods with 405 and an Allow header", async () => {
    const response = await get("/", { method: "POST", body: "{}" });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("puts security headers on every response, including errors", async () => {
    for (const response of [
      await get("/"),
      await get("/nope"),
      await get("/", { method: "DELETE" }),
    ]) {
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("style-src 'self'");
      expect(csp).toContain("img-src 'self'");
      expect(csp).not.toContain("script-src");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });
});

describe("checkout", () => {
  const ITEM = CATALOG[0];
  const STRIPE_URL = "https://checkout.stripe.com/c/pay/cs_test_123";

  function post(path: string, headers: Record<string, string> = { Origin: BASE }): Request {
    return new Request(`${BASE}${path}`, { method: "POST", headers });
  }

  function deps(
    reply: () => Response | Promise<Response>,
    stripeKey: string | undefined = "sk_test_fake",
  ) {
    const sent: URLSearchParams[] = [];
    const fetcher: typeof fetch = async (_input, init) => {
      const body = init?.body;
      if (!(body instanceof URLSearchParams)) throw new Error("expected a form body");
      sent.push(body);
      return reply();
    };
    return { deps: { stripeKey, fetch: fetcher }, sent };
  }

  it("redirects to Stripe Checkout with a 303, priced from the catalog", async () => {
    const { deps: d, sent } = deps(() => Response.json({ url: STRIPE_URL }));
    const response = await route(post(`/checkout/${ITEM.slug}`), d);
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(STRIPE_URL);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(sent[0]?.get("line_items[0][price_data][unit_amount]")).toBe(String(ITEM.priceCents));
    expect(sent[0]?.get("success_url")).toBe(`${BASE}/thanks`);
  });

  it("allows a post with no Origin header (older browsers, curl)", async () => {
    const { deps: d } = deps(() => Response.json({ url: STRIPE_URL }));
    expect((await route(post(`/checkout/${ITEM.slug}`, {}), d)).status).toBe(303);
  });

  it("refuses checkouts started from another site", async () => {
    const { deps: d, sent } = deps(() => Response.json({ url: STRIPE_URL }));
    const response = await route(
      post(`/checkout/${ITEM.slug}`, { Origin: "https://evil.example" }),
      d,
    );
    expect(response.status).toBe(403);
    expect(sent).toHaveLength(0);
  });

  it("returns 404 for items that don't exist, without calling Stripe", async () => {
    const { deps: d, sent } = deps(() => Response.json({ url: STRIPE_URL }));
    expect((await route(post("/checkout/xenoclip"), d)).status).toBe(404);
    expect(sent).toHaveLength(0);
  });

  it("shows a friendly 502 page when Stripe fails, and logs only the reason", async () => {
    const { deps: d } = deps(() => new Response("{}", { status: 500 }));
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(...args);
    try {
      const response = await route(post(`/checkout/${ITEM.slug}`), d);
      expect(response.status).toBe(502);
      expect(await response.text()).toContain("Nothing was charged.");
    } finally {
      console.error = original;
    }
    expect(errors).toEqual(["checkout failed: stripe status 500"]);
  });

  it("shows a friendly 503 page when no Stripe key is set (the deployed Worker without the secret)", async () => {
    // Call the Worker with an explicitly empty environment. Going through `exports.default`
    // would pick up a developer's local .dev.vars key and call the real Stripe sandbox.
    const request = new Request(`${BASE}/checkout/${ITEM.slug}`, {
      method: "POST",
      headers: { Origin: BASE },
    });
    const response = await worker.fetch(request, {});
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Nothing was charged.");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "form-action 'self' https://checkout.stripe.com",
    );
  });

  it("still rejects GET on the checkout path and POST elsewhere", async () => {
    const { deps: d } = deps(() => Response.json({ url: STRIPE_URL }));
    expect((await route(new Request(`${BASE}/checkout/${ITEM.slug}`), d)).status).toBe(404);
    expect((await route(post("/items/alien-paperclip"), d)).status).toBe(405);
  });

  it("serves the thank-you page", async () => {
    const response = await get("/thanks");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Acquisition recorded");
  });
});

describe("stripeKeyFrom", () => {
  it("treats a missing or blank key as unset, and trims stray whitespace", () => {
    expect(stripeKeyFrom({})).toBeUndefined();
    expect(stripeKeyFrom({ STRIPE_SECRET_KEY: "  " })).toBeUndefined();
    expect(stripeKeyFrom({ STRIPE_SECRET_KEY: " sk_test_x\n" })).toBe("sk_test_x");
  });
});

describe("globalFetch", () => {
  it("passes requests straight through to the real fetch", async () => {
    const real = vi.fn<typeof fetch>(() => Promise.resolve(new Response("ok")));
    vi.stubGlobal("fetch", real);
    try {
      const init = { method: "POST" };
      expect(await (await globalFetch("https://api.example/x", init)).text()).toBe("ok");
      expect(real).toHaveBeenCalledWith("https://api.example/x", init);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
