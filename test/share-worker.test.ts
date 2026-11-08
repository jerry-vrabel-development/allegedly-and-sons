import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { NETWORKS, REF } from "../src/core/share";
import worker from "../src/worker/index";
import { testEnv } from "./test-env";

const BASE = "https://allegedly.example";
const ITEM = CATALOG[0];
const ID = "0123456789abcdef0123456789abcdef";
const BROWSER = "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";
const AS_VISITOR = { "User-Agent": BROWSER, Cookie: `__Host-vid=${ID}` };

/** Calls the deployed Worker and waits for its deferred writes. */
async function visit(path: string, headers: Record<string, string> = AS_VISITOR) {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`${BASE}${path}`, { headers }), testEnv(), ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

async function events() {
  const { results } = await env.DB.prepare(
    "SELECT event, item_slug, visitor_id, ref, channel FROM analytics_events ORDER BY id",
  ).all();
  return results;
}

/** The ref code inside a share redirect's Location (it's URL-encoded in the target). */
function refIn(location: string | null): string | undefined {
  return /%3Fr%3D([0-9a-f]{10})/.exec(location ?? "")?.[1];
}

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM analytics_events").run();
});

describe("GET /share/<item>/<network>", () => {
  it.each([
    ["bluesky", /^https:\/\/bsky\.app\/intent\/compose\?/],
    ["x", /^https:\/\/x\.com\/intent\/post\?/],
    ["facebook", /^https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?/],
    ["reddit", /^https:\/\/www\.reddit\.com\/submit\?/],
    ["email", /^mailto:\?/],
  ])("sends %s visitors on with a ref'd link, never cached", async (network, target) => {
    const response = await visit(`/share/${ITEM.slug}/${network}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const location = response.headers.get("Location");
    expect(location).toMatch(target);
    expect(location).toContain(encodeURIComponent(`${BASE}/items/${ITEM.slug}?r=`));
    expect(refIn(location)).toMatch(REF);
  });

  it("records share_clicked with the visitor, network and the same ref as the link", async () => {
    const response = await visit(`/share/${ITEM.slug}/reddit`);
    const ref = refIn(response.headers.get("Location"));
    expect(await events()).toEqual([
      { event: "share_clicked", item_slug: ITEM.slug, visitor_id: ID, ref, channel: "reddit" },
    ]);
  });

  it("gives every press its own ref", async () => {
    const refs = new Set<string | undefined>();
    for (const network of NETWORKS) {
      refs.add(refIn((await visit(`/share/${ITEM.slug}/${network}`)).headers.get("Location")));
    }
    expect(refs.size).toBe(NETWORKS.length);
  });

  it("still redirects bots, but doesn't count them", async () => {
    const response = await visit(`/share/${ITEM.slug}/x`, { "User-Agent": "Slackbot 1.0" });
    expect(response.status).toBe(303);
    expect(await events()).toEqual([]);
  });

  it.each([
    ["an unknown network", `/share/${ITEM.slug}/myspace`],
    ["an unknown item", "/share/xenoclip/x"],
  ])("answers 404 for %s, and records nothing", async (_label, path) => {
    expect((await visit(path)).status).toBe(404);
    expect(await events()).toEqual([]);
  });
});

describe("visits through a shared link", () => {
  it("record shared_visit with the ref, as well as the view", async () => {
    await visit(`/items/${ITEM.slug}?r=0a1b2c3d4e`);
    expect(await events()).toEqual([
      { event: "item_viewed", item_slug: ITEM.slug, visitor_id: ID, ref: null, channel: null },
      {
        event: "shared_visit",
        item_slug: ITEM.slug,
        visitor_id: ID,
        ref: "0a1b2c3d4e",
        channel: null,
      },
    ]);
  });

  it.each(["not-a-ref", "0A1B2C3D4E", "0a1b2c3d4", ""])(
    "ignore a malformed ref (%j) and record just the view",
    async (ref) => {
      await visit(`/items/${ITEM.slug}?r=${encodeURIComponent(ref)}`);
      expect((await events()).map((row) => row["event"])).toEqual(["item_viewed"]);
    },
  );

  it("from link-preview bots count for nothing", async () => {
    await visit(`/items/${ITEM.slug}?r=0a1b2c3d4e`, {
      "User-Agent": "Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)",
    });
    expect(await events()).toEqual([]);
  });

  it("serve the same page, pointing search engines at the plain address", async () => {
    const page = await (await visit(`/items/${ITEM.slug}?r=0a1b2c3d4e`)).text();
    expect(page).toContain(`<link rel="canonical" href="${BASE}/items/${ITEM.slug}" />`);
  });
});
