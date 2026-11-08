import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { countsAsView, recordEvent } from "../src/worker/analytics";
import worker, { route, type Deps } from "../src/worker/index";
import { testEnv } from "./test-env";

const BASE = "https://allegedly.example";
const NOW = 1762531200;
const ITEM = CATALOG[0];
const BROWSER = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";

type Row = Record<string, string | number | null>;

const EMPTY = {
  visitor_id: null,
  referrer_host: null,
  country: null,
  utm_source: null,
  utm_campaign: null,
};

async function rows(): Promise<Record<string, unknown>[]> {
  const { results } = await env.DB.prepare("SELECT * FROM analytics_events ORDER BY id").all();
  return results;
}

/** Router deps whose waitUntil collects the deferred writes, so tests can await them. */
function deps(db: D1Database = env.DB): { deps: Deps; settled: () => Promise<unknown> } {
  const pending: Promise<unknown>[] = [];
  return {
    deps: {
      stripeKey: undefined,
      fetch: () => Promise.reject(new Error("analytics must not call out")),
      webhookSecret: undefined,
      db,
      nowSeconds: () => NOW,
      waitUntil: (promise) => {
        pending.push(promise);
      },
    },
    settled: () => Promise.all(pending),
  };
}

function visit(path: string, headers: Record<string, string> = {}, method = "GET"): Request {
  return new Request(`${BASE}${path}`, { method, headers: { "User-Agent": BROWSER, ...headers } });
}

/** A D1 stand-in whose every query fails. */
const BROKEN_DB = {
  prepare: () => {
    throw new Error("D1 is down");
  },
} as unknown as D1Database;

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM analytics_events").run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("item views", () => {
  it("records item_viewed with the referrer's host, country and campaign", async () => {
    const { deps: d, settled } = deps();
    const request = visit(
      `/items/${ITEM.slug}?utm_source=Bluesky&utm_campaign=Xenoclip%20Launch&utm_medium=social`,
      { Referer: "https://bsky.app/profile/someone?q=x" },
    );
    // Cloudflare sets request.cf at the edge; a test Request has none, so add it.
    Object.defineProperty(request, "cf", { value: { country: "US" } });
    const response = await route(request, d);
    expect(response.status).toBe(200);
    await settled();
    expect(await rows()).toEqual([
      {
        id: 1,
        event: "item_viewed",
        item_slug: ITEM.slug,
        ts: NOW,
        visitor_id: null,
        referrer_host: "bsky.app",
        country: "US",
        utm_source: "bluesky",
        utm_campaign: "xenoclip-launch",
      },
    ]);
  });

  it("stores nulls for what a plain visit doesn't have", async () => {
    const { deps: d, settled } = deps();
    await route(visit(`/items/${ITEM.slug}`), d);
    await settled();
    expect((await rows())[0]).toMatchObject(EMPTY);
  });

  it.each([
    ["a HEAD request", visit(`/items/${ITEM.slug}`, {}, "HEAD")],
    ["a prefetch", visit(`/items/${ITEM.slug}`, { "Sec-Purpose": "prefetch" })],
    ["a bot", visit(`/items/${ITEM.slug}`, { "User-Agent": "Googlebot/2.1" })],
    ["a request with no user agent", new Request(`${BASE}/items/${ITEM.slug}`)],
    ["an unknown item", visit("/items/xenoclip")],
    ["the home page", visit("/")],
    ["the checkout page", visit(`/checkout/${ITEM.slug}`)],
  ])("records nothing for %s", async (_label, request) => {
    const { deps: d, settled } = deps();
    await route(request, d);
    await settled();
    expect(await rows()).toEqual([]);
  });

  it("still serves the page when the database is down", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { deps: d, settled } = deps(BROKEN_DB);
    const response = await route(visit(`/items/${ITEM.slug}`), d);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(ITEM.exhibit);
    await settled();
    expect(error).toHaveBeenCalledWith("analytics: could not record item_viewed");
  });

  it("is recorded by the deployed Worker after the response is sent", async () => {
    const ctx = createExecutionContext();
    const response = await worker.fetch(visit(`/items/${ITEM.slug}`), testEnv(), ctx);
    expect(response.status).toBe(200);
    await waitOnExecutionContext(ctx);
    expect(await rows()).toHaveLength(1);
  });
});

describe("recordEvent", () => {
  it("drops an invalid event with a warning that says nothing about it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stored = await recordEvent(env.DB, { event: "purchased", itemSlug: "203.0.113.7" });
    expect(stored).toBe(false);
    expect(warn).toHaveBeenCalledWith("analytics: dropped an invalid event");
    expect(await rows()).toEqual([]);
  });

  it("returns false and logs only the event name when the write fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stored = await recordEvent(BROKEN_DB, {
      event: "item_viewed",
      itemSlug: ITEM.slug,
      ts: NOW,
      visitorId: null,
      referrerHost: null,
      country: null,
      utmSource: null,
      utmCampaign: null,
    });
    expect(stored).toBe(false);
    expect(error).toHaveBeenCalledWith("analytics: could not record item_viewed");
  });
});

describe("countsAsView", () => {
  it("counts a plain browser GET", () => {
    expect(countsAsView(visit(`/items/${ITEM.slug}`))).toBe(true);
  });
});

describe("what isn't kept", () => {
  it("never stores or logs the raw IP address or user agent", async () => {
    const IP = "203.0.113.7";
    const UA = `${BROWSER} PrivacyMarker/9.9`;
    const REFERRER_PATH = "/search?q=paperclips";
    const lines: string[] = [];
    for (const level of ["log", "info", "warn", "error", "debug"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(" "));
      });
    }

    const ctx = createExecutionContext();
    const response = await worker.fetch(
      new Request(`${BASE}/items/${ITEM.slug}`, {
        headers: {
          "User-Agent": UA,
          "CF-Connecting-IP": IP,
          "X-Forwarded-For": IP,
          Referer: `https://search.example${REFERRER_PATH}`,
        },
      }),
      testEnv(),
      ctx,
    );
    await response.text();
    await waitOnExecutionContext(ctx);

    const stored = JSON.stringify(await rows());
    expect(stored).toContain("search.example");
    for (const secret of [IP, "PrivacyMarker", "Firefox", "paperclips", "/search"]) {
      expect(stored).not.toContain(secret);
      expect(lines.join("\n")).not.toContain(secret);
    }
  });
});

describe("the analytics_events table (migrations/0002)", () => {
  async function insert(values: Row) {
    const row: Row = { event: "item_viewed", item_slug: ITEM.slug, ts: NOW, ...EMPTY, ...values };
    const names = Object.keys(row);
    return env.DB.prepare(
      `INSERT INTO analytics_events (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
    )
      .bind(...Object.values(row))
      .run();
  }

  it("has the planned columns, and none for an IP address or user agent", async () => {
    const { results } = await env.DB.prepare("PRAGMA table_info(analytics_events)").all<{
      name: string;
    }>();
    expect(results.map((c) => c.name)).toEqual([
      "id",
      "event",
      "item_slug",
      "ts",
      "visitor_id",
      "referrer_host",
      "country",
      "utm_source",
      "utm_campaign",
    ]);
  });

  it("stores a fully filled-in row", async () => {
    await insert({
      visitor_id: "0123456789abcdef0123456789abcdef",
      referrer_host: "bsky.app",
      country: "US",
      utm_source: "bluesky",
      utm_campaign: "launch",
    });
    expect(await rows()).toHaveLength(1);
  });

  it("accepts every planned event", async () => {
    for (const event of [
      "item_viewed",
      "lore_expanded",
      "share_clicked",
      "shared_visit",
      "checkout_started",
    ]) {
      await insert({ event });
    }
    expect(await rows()).toHaveLength(5);
  });

  it.each([
    ["an unknown event", { event: "purchased" }],
    ["an empty item", { item_slug: "" }],
    ["a negative time", { ts: -1 }],
    ["an empty referrer", { referrer_host: "" }],
    ["an overlong referrer", { referrer_host: "a".repeat(254) }],
    ["a short visitor id", { visitor_id: "abc" }],
    ["a visitor id that isn't hex", { visitor_id: "z".repeat(32) }],
    ["a three-letter country", { country: "USA" }],
    ["an empty UTM source", { utm_source: "" }],
    ["an overlong UTM campaign", { utm_campaign: "a".repeat(101) }],
  ])("rejects %s", async (_label, values) => {
    await expect(insert(values)).rejects.toThrow();
  });
});
