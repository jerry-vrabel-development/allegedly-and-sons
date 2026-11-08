import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { VISITOR_ID } from "../src/core/analytics";
import worker, { route, type Deps } from "../src/worker/index";
import { mayCarryVisitorCookie, withVisitorCookie } from "../src/worker/visitor";
import { testEnv } from "./test-env";

const BASE = "https://allegedly.example";
const ITEM = CATALOG[0];
const ID = "0123456789abcdef0123456789abcdef";
const BROWSER = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";
const COOKIE =
  /^__Host-vid=([0-9a-f]{32}); Max-Age=31536000; Path=\/; Secure; HttpOnly; SameSite=Lax$/;

/** Calls the deployed Worker (so the cookie wrapper runs) and waits for deferred writes. */
async function visit(path: string, init: RequestInit = {}): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`${BASE}${path}`, init), testEnv(), ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

function cookieId(response: Response): string | undefined {
  return COOKIE.exec(response.headers.get("Set-Cookie") ?? "")?.[1];
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM analytics_events").run();
});

describe("the visitor cookie", () => {
  it("is set on a first visit, on a private page", async () => {
    const response = await visit("/");
    expect(response.headers.get("Set-Cookie")).toMatch(COOKIE);
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=0, must-revalidate, no-transform",
    );
  });

  it("gives each new visitor a different id", async () => {
    const ids = new Set<string | undefined>();
    for (let i = 0; i < 5; i++) ids.add(cookieId(await visit("/")));
    expect(ids.size).toBe(5);
  });

  it("keeps a returning visitor's id and refreshes it for another year", async () => {
    const response = await visit("/", { headers: { Cookie: `__Host-vid=${ID}` } });
    expect(cookieId(response)).toBe(ID);
  });

  it("replaces a malformed id", async () => {
    const response = await visit("/", { headers: { Cookie: "__Host-vid=not-an-id" } });
    const id = cookieId(response);
    expect(id).toMatch(VISITOR_ID);
    expect(id).not.toBe("not-an-id");
  });

  it.each([
    ["the stylesheet", "/assets/site.css"],
    ["item art", `/assets/art/${ITEM.slug}.svg`],
    ["the health check", "/healthz"],
  ])("is never set on %s", async (_label, path) => {
    const response = await visit(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("is set on HTML error pages too (a 404 is still a visit)", async () => {
    expect((await visit("/nope")).headers.get("Set-Cookie")).toMatch(COOKIE);
  });

  it("follows the visitor into the item_viewed event", async () => {
    const response = await visit(`/items/${ITEM.slug}`, { headers: { "User-Agent": BROWSER } });
    const id = cookieId(response);
    const row = await env.DB.prepare("SELECT visitor_id FROM analytics_events").first();
    expect(row).toEqual({ visitor_id: id });
  });
});

describe("mayCarryVisitorCookie", () => {
  it.each([
    ["a private HTML page", "text/html; charset=utf-8", "private, max-age=0", true],
    ["a no-store HTML page", "text/html; charset=utf-8", "no-store, no-transform", true],
    ["a public HTML page", "text/html; charset=utf-8", "public, max-age=0", false],
    ["HTML with no cache header", "text/html; charset=utf-8", null, false],
    ["private JSON", "application/json", "no-store", false],
  ])("%s → %s", (_label, type, cache, expected) => {
    const headers = new Headers({ "Content-Type": type });
    if (cache !== null) headers.set("Cache-Control", cache);
    const response = new Response("x", { headers });
    expect(mayCarryVisitorCookie(response)).toBe(expected);
    expect(withVisitorCookie(response, ID).headers.has("Set-Cookie")).toBe(expected);
  });
});

it("doesn't set the cookie on a response with no body type (a redirect)", () => {
  const redirect = new Response(null, { status: 303, headers: { "Cache-Control": "no-store" } });
  expect(mayCarryVisitorCookie(redirect)).toBe(false);
});

describe("checkout_started", () => {
  /** Router deps with a fake Stripe answering `reply`, recording each form sent. */
  function deps(reply: () => Response) {
    const pending: Promise<unknown>[] = [];
    const sent: URLSearchParams[] = [];
    const d: Deps = {
      stripeKey: "sk_test_fake",
      fetch: (_input, init) => {
        if (init?.body instanceof URLSearchParams) sent.push(init.body);
        return Promise.resolve(reply());
      },
      webhookSecret: undefined,
      db: env.DB,
      nowSeconds: () => 1762531200,
      waitUntil: (promise) => {
        pending.push(promise);
      },
      visitorId: ID,
    };
    return { d, sent, settled: () => Promise.all(pending) };
  }

  const post = (path: string) =>
    new Request(`${BASE}${path}`, { method: "POST", headers: { Origin: BASE } });

  async function events() {
    const { results } = await env.DB.prepare(
      "SELECT event, item_slug, visitor_id FROM analytics_events",
    ).all();
    return results;
  }

  it("is recorded for an embedded session, and Stripe gets the visitor id", async () => {
    const { d, sent, settled } = deps(() =>
      Response.json({ client_secret: "cs_test_a1B2_secret_c3D4" }),
    );
    const response = await route(post(`/checkout/${ITEM.slug}/session`), d);
    expect(response.status).toBe(200);
    await settled();
    expect(sent[0]?.get("client_reference_id")).toBe(ID);
    expect(await events()).toEqual([
      { event: "checkout_started", item_slug: ITEM.slug, visitor_id: ID },
    ]);
  });

  it("is recorded for the hosted flow too", async () => {
    const { d, sent, settled } = deps(() =>
      Response.json({ url: "https://checkout.stripe.com/c/pay/cs_test_a1" }),
    );
    const response = await route(post(`/checkout/${ITEM.slug}`), d);
    expect(response.status).toBe(303);
    await settled();
    expect(sent[0]?.get("client_reference_id")).toBe(ID);
    expect(await events()).toEqual([
      { event: "checkout_started", item_slug: ITEM.slug, visitor_id: ID },
    ]);
  });

  it("isn't recorded when Stripe refuses", async () => {
    const quiet = console.error;
    console.error = () => undefined;
    try {
      for (const path of [`/checkout/${ITEM.slug}/session`, `/checkout/${ITEM.slug}`]) {
        const { d, settled } = deps(() => new Response("no", { status: 401 }));
        expect((await route(post(path), d)).status).toBe(502);
        await settled();
      }
    } finally {
      console.error = quiet;
    }
    expect(await events()).toEqual([]);
  });
});
