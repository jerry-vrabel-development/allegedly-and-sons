import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findItem } from "../src/core/catalog";
import { PACKING_PATH, WEBHOOK_PATH } from "../src/core/paths";
import { REPAIR_SLUG } from "../src/core/repair";
import { ALL_TIPS, tipAwardId, tipsAbout } from "../src/core/tips";
import { readToPack, snapshotStamps } from "../src/worker/certificate-store";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";
import { orderRef, packingPage } from "../src/worker/packing-page";
import { AUD, NOW, SIGNER, TEAM, token, urlOf } from "./access-signing";
import { stripeSignatureHeader } from "./stripe-test-signing";

const BASE = "https://allegedly.example";
const SECRET = "whsec_test_webhook";
const A = "a".repeat(32);
const B = "b".repeat(32);
const SESSION = "cs_test_paper1";
const PAID_AT = NOW - 2;

// An exhibit with two tips, standing in for one that has gone on sale.
const SLUG = "martian-rubber-band";
const [FIRST, SECOND] = tipsAbout(SLUG);

function deps(): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: SECRET,
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId: null,
    access: { teamDomain: TEAM, aud: AUD },
    // The only outside call here: the Access team's public keys.
    fetch: (input) =>
      urlOf(input) === `https://${TEAM}/cdn-cgi/access/certs`
        ? Promise.resolve(Response.json({ keys: [SIGNER.jwk] }))
        : Promise.reject(new Error(`unexpected fetch: ${urlOf(input)}`)),
  };
}

function paidEvent(id: string, session: Record<string, unknown> = {}) {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    created: PAID_AT,
    data: {
      object: {
        id: SESSION,
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 4_200,
        currency: "usd",
        payment_intent: "pi_test_paper1",
        metadata: { slug: SLUG },
        client_reference_id: A,
        ...session,
      },
    },
  };
}

async function deliver(body: unknown): Promise<number> {
  const payload = JSON.stringify(body);
  const request = new Request(`${BASE}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": await stripeSignatureHeader(payload, SECRET, NOW),
    },
    body: payload,
  });
  return (await route(request, deps())).status;
}

async function stamps(): Promise<{ award: string; n: number; contact: string }[]> {
  const { results } = await env.DB.prepare(
    "SELECT award, n, contact FROM order_stamps WHERE stripe_session_id = ? ORDER BY n",
  )
    .bind(SESSION)
    .all<{ award: string; n: number; contact: string }>();
  return results;
}

async function order(
  session: string,
  slug: string,
  paidAt: number,
  status = "paid",
  visitor: string | null = A,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO orders (stripe_session_id, item_slug, amount_cents, paid_at, visitor_id, status)
     VALUES (?, ?, 1000, ?, ?, ?)`,
  )
    .bind(session, slug, paidAt, visitor, status)
    .run();
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM order_stamps"),
    env.DB.prepare("DELETE FROM orders"),
    env.DB.prepare("DELETE FROM stripe_events"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
  for (const level of ["log", "warn", "error"] as const) {
    vi.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the order_stamps table (migrations/0011_order_stamps.sql)", () => {
  it("belongs to an order, and goes when the order does", async () => {
    await order(SESSION, SLUG, PAID_AT);
    await env.DB.prepare(
      "INSERT INTO order_stamps (stripe_session_id, award, n, contact, line) VALUES (?, ?, 1, 'Loupe', 'A line.')",
    )
      .bind(SESSION, `tip:${SLUG}:1`)
      .run();
    await env.DB.prepare("DELETE FROM orders").run();
    expect(await stamps()).toEqual([]);
  });

  it("refuses a stamp that isn't a tip, has no words, or has no order", async () => {
    await order(SESSION, SLUG, PAID_AT);
    const insert = (session: string, award: string, n: number, contact: string, line: string) =>
      env.DB.prepare(
        "INSERT INTO order_stamps (stripe_session_id, award, n, contact, line) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(session, award, n, contact, line)
        .run();
    await expect(insert(SESSION, "acquirer", 1, "Loupe", "A line.")).rejects.toThrow();
    await expect(insert(SESSION, `tip:${SLUG}:1`, 0, "Loupe", "A line.")).rejects.toThrow();
    await expect(insert(SESSION, `tip:${SLUG}:1`, 1, "", "A line.")).rejects.toThrow();
    await expect(insert(SESSION, `tip:${SLUG}:1`, 1, "Loupe", "")).rejects.toThrow();
    await expect(insert(SESSION, `tip:${SLUG}:1`, 1, "Loupe", "x".repeat(301))).rejects.toThrow();
    await expect(
      insert("cs_test_nobody", `tip:${SLUG}:1`, 1, "Loupe", "A line."),
    ).rejects.toThrow();
  });

  it("fits every tip that was written", () => {
    for (const tip of ALL_TIPS) {
      expect(tip.line.length).toBeLessThanOrEqual(300);
      expect(tip.contact.length).toBeLessThanOrEqual(60);
    }
  });
});

describe("the webhook copies the buyer's stamps onto the order", () => {
  it("stamps the tips held when the order was paid, in order, and no later ones", async () => {
    if (FIRST === undefined || SECOND === undefined) throw new Error("expected two tips");
    await grantAwards(env.DB, A, [tipAwardId(SECOND)], PAID_AT - 100);
    await grantAwards(env.DB, A, [tipAwardId(FIRST)], PAID_AT);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    expect(await stamps()).toEqual([
      { award: tipAwardId(FIRST), n: 1, contact: FIRST.contact },
      { award: tipAwardId(SECOND), n: 2, contact: SECOND.contact },
    ]);
  });

  it("leaves out a tip earned after payment, even if the webhook comes later", async () => {
    if (FIRST === undefined || SECOND === undefined) throw new Error("expected two tips");
    await grantAwards(env.DB, A, [tipAwardId(FIRST)], PAID_AT - 100);
    await grantAwards(env.DB, A, [tipAwardId(SECOND)], PAID_AT + 1);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    expect((await stamps()).map((stamp) => stamp.award)).toEqual([tipAwardId(FIRST)]);
  });

  it("stamps the same thing when Stripe redelivers, under the same or a new event id", async () => {
    if (FIRST === undefined) throw new Error("expected a tip");
    await grantAwards(env.DB, A, [tipAwardId(FIRST)], PAID_AT - 100);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    expect(await deliver(paidEvent("evt_test_2"))).toBe(200);
    expect(await stamps()).toHaveLength(1);
  });

  it("stamps nothing from someone else's file, or without a buyer", async () => {
    if (FIRST === undefined) throw new Error("expected a tip");
    await grantAwards(env.DB, B, [tipAwardId(FIRST)], PAID_AT - 100);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    expect(await deliver(paidEvent("evt_test_2", { id: "cs_test_nobuyer" }))).toBe(200);
    const { results } = await env.DB.prepare("SELECT * FROM order_stamps").all();
    expect(results).toEqual([]);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM orders").first())?.["n"]).toBe(2);
  });

  it("has nothing to copy for an exhibit nobody wrote tips about", () => {
    expect(snapshotStamps(env.DB, SESSION, "alien-paperclip")).toBeUndefined();
    expect(snapshotStamps(env.DB, SESSION, SLUG)).toBeDefined();
  });
});

describe("readToPack", () => {
  it("lists unshipped orders oldest first, with their stamps, and no buy-backs", async () => {
    await order("cs_test_late", "alien-paperclip", NOW);
    await order(SESSION, SLUG, PAID_AT);
    await order("cs_test_shipped", SLUG, PAID_AT - 50, "shipped");
    await order("cs_test_refunded", SLUG, PAID_AT - 40, "refunded");
    await order("cs_test_repair", REPAIR_SLUG, PAID_AT - 30);
    await order("cs_test_mystery", "unknown", PAID_AT + 1, "paid", null);
    await env.DB.batch(
      [SESSION, "cs_test_shipped"].map((session) =>
        env.DB.prepare(
          "INSERT INTO order_stamps (stripe_session_id, award, n, contact, line) VALUES (?, ?, 1, 'Loupe', 'Said so.')",
        ).bind(session, `tip:${SLUG}:1`),
      ),
    );
    const toPack = await readToPack(env.DB);
    expect(toPack.map((row) => row.sessionId)).toEqual([
      SESSION,
      "cs_test_mystery",
      "cs_test_late",
    ]);
    expect(toPack[0]?.item?.slug).toBe(SLUG);
    expect(toPack[0]?.stamps).toEqual([{ contact: "Loupe", line: "Said so." }]);
    expect(toPack[1]?.item).toBeUndefined();
    expect(toPack[2]?.stamps).toEqual([]);
  });
});

describe(`GET ${PACKING_PATH}`, () => {
  async function get(jwt: string | null): Promise<Response> {
    const headers = jwt === null ? {} : { "Cf-Access-Jwt-Assertion": jwt };
    return route(new Request(`${BASE}${PACKING_PATH}`, { headers }), deps());
  }

  it("is simply not found without Access's signed token", async () => {
    await order(SESSION, SLUG, PAID_AT);
    for (const jwt of [null, "not-a-token", await token({ aud: ["someone-else"] })]) {
      const response = await get(jwt);
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain(orderRef(SESSION));
    }
  });

  it("prints one certificate per order waiting to ship, privately", async () => {
    if (FIRST === undefined) throw new Error("expected a tip");
    await grantAwards(env.DB, A, [tipAwardId(FIRST)], PAID_AT - 100);
    expect(await deliver(paidEvent("evt_test_1"))).toBe(200);
    const response = await get(await token());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store, no-transform");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    const page = await response.text();
    expect(page).toContain("<h1>Certificates to pack</h1>");
    expect(page).toContain(`Order ${orderRef(SESSION)} · paid November 7, 2025`);
    expect(page).toContain(`<strong>${FIRST.contact}</strong>`);
    expect(page.match(/<span class="stamp">Witnessed<\/span>/g)).toHaveLength(1);
  });
});

describe("packingPage", () => {
  it("says when nothing is waiting to ship", () => {
    expect(packingPage([]).value).toContain("Nothing is waiting to ship.");
  });

  it("gives each certificate its own heading id, even for the same exhibit twice", () => {
    const item = findItem(SLUG);
    const base = { paidAt: PAID_AT, stamps: [], item };
    const page = packingPage([
      { ...base, sessionId: "cs_test_aaaaaaaa11111111" },
      { ...base, sessionId: "cs_test_bbbbbbbb22222222" },
      { ...base, sessionId: "cs_test_cccccccc33333333", item: undefined },
    ]).value;
    expect(page).toContain('id="certificate-11111111"');
    expect(page).toContain('id="certificate-22222222"');
    expect(page.match(/Exhibit unknown\./g)).toHaveLength(1);
  });

  it("names an order by the end of its session id", () => {
    expect(orderRef("cs_test_abcdefgh12345678")).toBe("…12345678");
  });
});
