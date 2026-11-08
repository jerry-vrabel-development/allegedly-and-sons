import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORY_DWELL_MS } from "../src/core/analytics";
import { CATALOG } from "../src/core/catalog";
import {
  READ_DEDUPE_SECONDS,
  READS_PER_VISITOR_PER_HOUR,
  recordStoryRead,
} from "../src/worker/analytics";
import { route, type Deps } from "../src/worker/index";
import { EVENTS_PATH, STORY_JS, STORY_SCRIPT_PATH } from "../src/worker/story-script";

const BASE = "https://allegedly.example";
const ITEM = CATALOG[0];
const ID = "0123456789abcdef0123456789abcdef";
const BROWSER = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";
const NOW = 1762531200;

function deps(now = NOW, visitorId: string | null = ID): Deps {
  return {
    stripeKey: undefined,
    fetch: () => Promise.reject(new Error("story reads must not call out")),
    webhookSecret: undefined,
    db: env.DB,
    nowSeconds: () => now,
    waitUntil: () => undefined,
    visitorId,
    access: undefined,
  };
}

function beacon(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${EVENTS_PATH}`, {
    method: "POST",
    headers: {
      Origin: BASE,
      "User-Agent": BROWSER,
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function reads() {
  const { results } = await env.DB.prepare(
    "SELECT event, item_slug, visitor_id, read_depth, ts FROM analytics_events ORDER BY id",
  ).all();
  return results;
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM analytics_events").run();
});

describe("POST /events (story reads)", () => {
  it("records opened and finished as lore_expanded with the depth", async () => {
    for (const depth of ["opened", "finished"]) {
      const response = await route(beacon({ item: ITEM.slug, depth }), deps());
      expect(response.status).toBe(204);
    }
    expect(await reads()).toEqual([
      {
        event: "lore_expanded",
        item_slug: ITEM.slug,
        visitor_id: ID,
        read_depth: "opened",
        ts: NOW,
      },
      {
        event: "lore_expanded",
        item_slug: ITEM.slug,
        visitor_id: ID,
        read_depth: "finished",
        ts: NOW,
      },
    ]);
  });

  it("counts a repeat read once per half hour, then again after", async () => {
    const read = { item: ITEM.slug, depth: "opened" };
    await route(beacon(read), deps(NOW));
    await route(beacon(read), deps(NOW + 60));
    expect(await reads()).toHaveLength(1);
    await route(beacon(read), deps(NOW + READ_DEDUPE_SECONDS + 1));
    expect(await reads()).toHaveLength(2);
  });

  it("stops recording a visitor who floods it, but still answers 204", async () => {
    const items = CATALOG.map((item) => item.slug);
    for (let i = 0; i < READS_PER_VISITOR_PER_HOUR + 5; i++) {
      // Different items and times, so the half-hour repeat rule doesn't hide anything.
      const read = { item: items[i % items.length], depth: i % 2 === 0 ? "opened" : "finished" };
      const response = await route(beacon(read), deps(NOW + i * 61));
      expect(response.status).toBe(204);
    }
    expect((await reads()).length).toBeLessThanOrEqual(READS_PER_VISITOR_PER_HOUR);
  });

  it("ignores bots, quietly", async () => {
    const response = await route(
      beacon({ item: ITEM.slug, depth: "opened" }, { "User-Agent": "curl/8.5.0" }),
      deps(),
    );
    expect(response.status).toBe(204);
    expect(await reads()).toEqual([]);
  });

  it.each([
    ["another site", { Origin: "https://evil.example" }, 403],
    ["no Origin at all", { Origin: "" }, 403],
  ])("refuses beacons from %s", async (_label, headers, status) => {
    const request = beacon({ item: ITEM.slug, depth: "opened" }, headers);
    if (headers.Origin === "") request.headers.delete("Origin");
    expect((await route(request, deps())).status).toBe(status);
    expect(await reads()).toEqual([]);
  });

  it.each([
    ["not JSON", "opened please"],
    ["an unknown item", { item: "xenoclip", depth: "opened" }],
    ["an unknown depth", { item: ITEM.slug, depth: "skimmed" }],
    ["an empty body", ""],
  ])("answers 400 for %s", async (_label, body) => {
    expect((await route(beacon(body), deps())).status).toBe(400);
    expect(await reads()).toEqual([]);
  });

  it("answers 413 for an oversized body, without reading it as JSON", async () => {
    const huge = JSON.stringify({ item: ITEM.slug, depth: "opened", pad: "x".repeat(2000) });
    expect((await route(beacon(huge), deps())).status).toBe(413);
  });

  it("records a read without a visitor id, unchecked for repeats", async () => {
    await route(beacon({ item: ITEM.slug, depth: "opened" }), deps(NOW, null));
    await route(beacon({ item: ITEM.slug, depth: "opened" }), deps(NOW, null));
    expect(await reads()).toHaveLength(2);
  });

  it("still records when the repeat check finds nothing to count", async () => {
    // D1 always returns a row for COUNT(*); this covers the defensive null branch.
    const db = {
      prepare: vi.fn((sql: string) => {
        const statement = env.DB.prepare(sql);
        return sql.includes("COUNT(*)")
          ? { bind: () => ({ first: () => Promise.resolve(null) }) }
          : statement;
      }),
    } as unknown as D1Database;
    const stored = await recordStoryRead(
      beacon({ item: ITEM.slug, depth: "opened" }),
      { itemSlug: ITEM.slug, depth: "opened" },
      { ...deps(), db },
    );
    expect(stored).toBe(true);
  });
});

describe("the story script", () => {
  it("is served from our own origin as JavaScript", async () => {
    const response = await route(new Request(`${BASE}${STORY_SCRIPT_PATH}`), deps());
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(await response.text()).toBe(STORY_JS);
  });

  it("reports only to /events, with sendBeacon, and waits the dwell time for 'finished'", () => {
    expect(STORY_JS).toContain(`navigator.sendBeacon("/events"`);
    expect(STORY_JS).toContain(`}, ${String(STORY_DWELL_MS)});`);
    expect(STORY_JS).not.toMatch(/https?:\/\/|eval\(|innerHTML|document\.cookie/);
  });
});
