import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { route, type Deps } from "../src/worker/index";
import { LEDGER_PATH, periodFrom, readLedger } from "../src/worker/ledger";
import { AUD, NOW, OTHER, SIGNER, TEAM, token, urlOf } from "./access-signing";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const C = "c".repeat(32);
const DAY = 86_400;

function deps(access: Deps["access"] = { teamDomain: TEAM, aud: AUD }): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId: null,
    access,
    // The only outside call the ledger makes: the Access team's public keys.
    fetch: (input) =>
      urlOf(input) === `https://${TEAM}/cdn-cgi/access/certs`
        ? Promise.resolve(Response.json({ keys: [SIGNER.jwk] }))
        : Promise.reject(new Error(`unexpected fetch: ${urlOf(input)}`)),
  };
}

async function event(values: Record<string, string | number | null>): Promise<void> {
  const row = { ts: NOW - 60, visitor_id: null, ...values };
  const names = Object.keys(row);
  await env.DB.prepare(
    `INSERT INTO analytics_events (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
  )
    .bind(...Object.values(row))
    .run();
}

async function order(session: string, slug: string, visitor: string | null, paidAt = NOW - 30) {
  await env.DB.prepare(
    `INSERT INTO orders (stripe_session_id, payment_intent_id, item_slug, amount_cents, paid_at, visitor_id)
     VALUES (?, ?, ?, 27500, ?, ?)`,
  )
    .bind(session, `pi_${session}`, slug, paidAt, visitor)
    .run();
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM analytics_events"),
    env.DB.prepare("DELETE FROM orders"),
  ]);
});

/** A small, known story: A reads, shares on Reddit; B arrives through it and buys. */
async function seed(): Promise<void> {
  const trophy = "viking-participation-trophy";
  await event({
    event: "item_viewed",
    item_slug: trophy,
    visitor_id: A,
    referrer_host: "old.reddit.com",
  });
  await event({
    event: "item_viewed",
    item_slug: trophy,
    visitor_id: A,
    referrer_host: "allegedly.example",
  });
  await event({ event: "lore_expanded", item_slug: trophy, visitor_id: A, read_depth: "opened" });
  await event({ event: "lore_expanded", item_slug: trophy, visitor_id: A, read_depth: "finished" });
  await event({
    event: "share_clicked",
    item_slug: trophy,
    visitor_id: A,
    ref: "0a1b2c3d4e",
    channel: "reddit",
  });
  // A opening their own link isn't a return visit.
  await event({ event: "shared_visit", item_slug: trophy, visitor_id: A, ref: "0a1b2c3d4e" });
  await event({
    event: "shared_visit",
    item_slug: trophy,
    visitor_id: B,
    ref: "0a1b2c3d4e",
    ts: NOW - 50,
  });
  await event({
    event: "item_viewed",
    item_slug: trophy,
    visitor_id: B,
    utm_source: "bluesky",
    ts: NOW - 50,
  });
  await event({ event: "checkout_started", item_slug: trophy, visitor_id: B, ts: NOW - 40 });
  await order("cs_test_1", trophy, B);
  // C looked at the paperclip, directly, 40 days ago: outside the 30-day window.
  await event({
    event: "item_viewed",
    item_slug: "alien-paperclip",
    visitor_id: C,
    ts: NOW - 40 * DAY,
  });
}

describe("readLedger", () => {
  it("counts each item's funnel from the raw events and orders", async () => {
    await seed();
    const ledger = await readLedger(env.DB, 30, NOW, "allegedly.example");
    const trophy = ledger.items.find((row) => row.slug === "viking-participation-trophy");
    expect(trophy).toEqual({
      slug: "viking-participation-trophy",
      name: "The Viking Participation Trophy",
      visitors: 2,
      views: 3,
      opened: 1,
      finished: 1,
      shares: 1,
      sharedVisits: 2,
      checkouts: 1,
      orders: 1,
      revenueCents: 27500,
    });
    const paperclip = ledger.items.find((row) => row.slug === "alien-paperclip");
    expect(paperclip?.visitors).toBe(0);
  });

  it("lists every catalog item, even ones nobody has seen", async () => {
    const ledger = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(ledger.items.map((row) => row.visitors)).toEqual([0, 0, 0]);
  });

  it("names where visitors came from, and who later bought", async () => {
    await seed();
    const { sources } = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(sources).toEqual([
      { source: "(this site)", visitors: 1, buyers: 0 },
      { source: "bluesky", visitors: 1, buyers: 1 },
      { source: "old.reddit.com", visitors: 1, buyers: 0 },
    ]);
  });

  it("credits shares with return visits and sales, not counting the sharer", async () => {
    await seed();
    const { shares } = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(shares.find((row) => row.channel === "reddit")).toEqual({
      channel: "reddit",
      shares: 1,
      visits: 1,
      orders: 1,
    });
    expect(shares.find((row) => row.channel === "x")).toEqual({
      channel: "x",
      shares: 0,
      visits: 0,
      orders: 0,
    });
  });

  it("includes older activity in 'all time'", async () => {
    await seed();
    const ledger = await readLedger(env.DB, 0, NOW, "allegedly.example");
    expect(ledger.items.find((row) => row.slug === "alien-paperclip")?.visitors).toBe(1);
    expect(ledger.sources).toContainEqual({ source: "(direct)", visitors: 1, buyers: 0 });
  });
});

describe("periodFrom", () => {
  it.each([
    ["", 30],
    ["?days=7", 7],
    ["?days=90", 90],
    ["?days=0", 0],
    ["?days=365", 30],
    ["?days=banana", 30],
    ["?days=", 30],
  ])("%s → %d", (query, days) => {
    expect(periodFrom(new URL(`${BASE}${LEDGER_PATH}${query}`))).toBe(days);
  });
});

describe("GET /bureau/ledger", () => {
  async function get(path: string, jwt: string | null, d: Deps = deps()) {
    const headers = jwt === null ? {} : { "Cf-Access-Jwt-Assertion": jwt };
    return route(new Request(`${BASE}${path}`, { headers }), d);
  }

  it("shows the ledger to the signed-in owner, never cached or indexed", async () => {
    await seed();
    const response = await get(LEDGER_PATH, await token());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, no-transform");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    const page = (await response.text()).replace(/\s+/g, " ");
    expect(page).toContain("Signed in as jerry@example.com");
    expect(page).toContain("<strong>2</strong> visitors");
    expect(page).toContain("<strong>$275.00</strong> in sales");
    expect(page).toContain("1 of 2 (too few to say)");
    expect(page).toContain('<meta name="robots" content="noindex" />');
    expect(page).not.toContain("<script");
  });

  it("marks the period being shown", async () => {
    const page = await (await get(`${LEDGER_PATH}?days=7`, await token())).text();
    expect(page.replace(/\s+/g, " ")).toMatch(
      /href="\/bureau\/ledger\?days=7" aria-current="page"/,
    );
  });

  it.each([
    ["no Access token", () => Promise.resolve(null)],
    ["a token signed with someone else's key", () => token({}, {}, OTHER.privateKey)],
    ["another application's token", () => token({ aud: ["f".repeat(64)] })],
  ])("is simply not found with %s", async (_label, jwt) => {
    const response = await get(LEDGER_PATH, await jwt());
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain("Ledger");
  });

  it("stays closed until Access is configured, even with a valid token", async () => {
    const closed: Deps = { ...deps(), access: undefined };
    expect((await get(LEDGER_PATH, await token(), closed)).status).toBe(404);
  });

  it.each(["/bureau", "/bureau/", "/bureau/other"])(
    "has nothing else under /bureau (%s), even for the owner",
    async (path) => {
      expect((await get(path, await token())).status).toBe(404);
    },
  );
});
