import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { segmentAt, specialPriceCents } from "../src/core/broadcast";
import { CATALOG, formatPrice } from "../src/core/catalog";
import worker, { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { COUNTDOWN_JS } from "../src/worker/broadcast-script";
import { VAULT_CSP } from "../src/worker/security-headers";
import { stripeSignatureHeader } from "./stripe-test-signing";
import { testEnv } from "./test-env";
import { COUNTDOWN_SCRIPT_PATH, WEBHOOK_PATH } from "../src/core/paths";

const BASE = "https://allegedly.example";
const T = (iso: string) => Date.parse(iso) / 1000;
/** 12:30pm Chicago, in the noon segment (12 to 3). */
const NOON = T("2026-11-09T18:30:00Z");
/** 11:30pm Chicago, in the Midnight Auction. */
const AUCTION = T("2026-11-10T05:30:00Z");
const SECRET = "whsec_test_broadcast";

let stripeForms: URLSearchParams[];

function deps(now = NOON, overrides: Partial<Deps> = {}): Deps {
  return {
    stripeKey: "sk_test_fake",
    webhookSecret: SECRET,
    fetch: (_input, init) => {
      const body = init?.body;
      if (body instanceof URLSearchParams) stripeForms.push(body);
      return Promise.resolve(
        Response.json({
          id: "cs_test_x",
          url: "https://checkout.stripe.com/c/pay/cs_test_x",
          client_secret: "cs_test_x_secret_y",
        }),
      );
    },
    db: env.DB,
    nowSeconds: () => now,
    waitUntil: () => undefined,
    visitorId: null,
    access: undefined,
    ...overrides,
  };
}

async function get(path: string, d: Deps = deps()) {
  const response = await route(new Request(`${BASE}${path}`), d);
  return { response, html: (await response.text()).replace(/\s+/g, " ") };
}

async function orderIn(segment: string | null, slug: string, cents: number, at = NOON) {
  await env.DB.prepare(
    `INSERT INTO orders (stripe_session_id, item_slug, amount_cents, paid_at, segment)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(`cs_test_${String(Math.random()).slice(2)}`, slug, cents, at, segment)
    .run();
}

beforeEach(async () => {
  stripeForms = [];
  await env.DB.batch([
    env.DB.prepare("DELETE FROM orders"),
    env.DB.prepare("DELETE FROM stripe_events"),
  ]);
});

describe("GET /broadcast", () => {
  const segment = segmentAt(NOON);
  const special = formatPrice(specialPriceCents(segment.item, "rolling"));

  it("puts one item on air with its special price, real clock and host", async () => {
    const { response, html } = await get("/broadcast");
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=0, must-revalidate, no-transform",
    );
    expect(html).toContain('<p class="on-air-tag"><strong>On air</strong> · Rolling segment</p>');
    expect(html).toContain(segment.item.name);
    expect(html).toContain(
      `${special} <span class="regular">(regularly ${formatPrice(segment.item.priceCents)}, 15% off)</span>`,
    );
    expect(html).toContain("<strong>Ends at 3:00 PM Chicago time:</strong>");
    expect(html).toContain('data-seconds-left="9000">2 hours 30 minutes</span> left.');
    expect(html).toContain("Nobody's moved on it yet this segment.");
    expect(html).toContain(`>Acquire it for ${special}</a`);
    expect(html).toContain(`“${segment.item.pitch[0]}”`);
    expect(html).toContain("<strong>3:00 PM:</strong>");
    expect(html).toContain("<strong>11:00 PM, the Midnight Auction:</strong>");
    expect(html).toContain('<script src="/assets/countdown.js" defer></script>');
    expect(html).not.toContain('class="on-air-banner"');
  });

  it("counts only real orders from this segment", async () => {
    await orderIn(segment.id, segment.item.slug, 1000);
    await orderIn(segment.id, segment.item.slug, 1000);
    await orderIn("2026-11-09.9", segment.item.slug, 1000);
    await orderIn(null, segment.item.slug, 1000);
    expect((await get("/broadcast")).html).toContain("<strong>2</strong> acquired this segment.");
  });

  it("runs the Midnight Auction at 30% off, and points to tomorrow's", async () => {
    const auction = segmentAt(AUCTION);
    const { html } = await get("/broadcast", deps(AUCTION));
    expect(html).toContain("<strong>On air</strong> · The Midnight Auction");
    expect(html).toContain(formatPrice(specialPriceCents(auction.item, "auction")));
    expect(html).toContain("30% off");
    expect(html).toContain("<strong>Ends at 12:00 AM Chicago time:</strong>");
    // The next segment is midnight's; the next auction is tomorrow night.
    expect(html).toContain("<strong>12:00 AM:</strong>");
    expect(html).toContain("<strong>11:00 PM, the Midnight Auction:</strong>");
  });

  it("doesn't repeat the auction when it's up next", async () => {
    const { html } = await get("/broadcast", deps(T("2026-11-10T04:30:00Z")));
    expect(html).toContain("<strong>11:00 PM:</strong>");
    expect(html).toContain("(the midnight auction)");
    expect(html).not.toContain(", the Midnight Auction:</strong>");
  });

  it("runs only our own scripts", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/broadcast`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.headers.get("Content-Security-Policy")).toBe(VAULT_CSP);
  });
});

describe("the ON AIR banner", () => {
  const segment = segmentAt(NOON);

  it("runs across the shop's pages", async () => {
    for (const path of ["/", "/items/alien-paperclip", "/dossier", "/vault", "/disclaimer"]) {
      const { html } = await get(path);
      expect(html).toContain('<p class="on-air-banner"> <strong>On air:</strong>');
      expect(html).toContain(
        `${segment.item.name}, ${formatPrice(specialPriceCents(segment.item, "rolling"))} (15% off)<span class="banner-detail"> until 3:00 PM Chicago time</span>.`,
      );
      expect(html).toContain('<a href="/broadcast">Watch the broadcast</a>');
    }
  });

  it("stays off the on-air exhibit's own page, whose buy box already says it", async () => {
    // The strip repeated the buy box there, and on a phone it pushed the buy
    // button off the first screen.
    const { html } = await get(`/items/${segment.item.slug}`);
    expect(html).not.toContain('class="on-air-banner"');
    expect(html).toContain("<strong>On air now.</strong> This price ends at 3:00 PM Chicago time.");
    // Every other exhibit's page still carries it.
    const other = CATALOG.find((item) => item.slug !== segment.item.slug);
    expect((await get(`/items/${other?.slug ?? ""}`)).html).toContain('class="on-air-banner"');
    // Sound still loads there for the sound-and-motion group: only the strip goes.
    const withSound = await get(`/items/${segment.item.slug}?fx=on`);
    expect(withSound.html).toContain('<script src="/assets/sound.js" defer></script>');
    expect(withSound.html).not.toContain('class="on-air-banner"');
  });

  it("stays off checkout, private, error and return pages", async () => {
    for (const path of ["/broadcast", "/checkout/alien-paperclip", "/thanks", "/nope"]) {
      expect((await get(path)).html).not.toContain('class="on-air-banner"');
    }
    expect((await get("/healthz")).html).toBe('{"ok":true}');
  });
});

describe("on-air prices across the shop", () => {
  const segment = segmentAt(NOON);
  const offAir = CATALOG.find((item) => item.slug !== segment.item.slug) ?? CATALOG[0];

  it("show on the on-air item's page and checkout, with the end time", async () => {
    for (const path of [`/items/${segment.item.slug}`, `/checkout/${segment.item.slug}`]) {
      const { html } = await get(path);
      expect(html).toContain(formatPrice(specialPriceCents(segment.item, "rolling")));
      expect(html).toContain(`(regularly ${formatPrice(segment.item.priceCents)})`);
      expect(html).toContain("This price ends at 3:00 PM Chicago time.");
    }
    const onAirPage = (await get(`/items/${segment.item.slug}`)).html;
    expect(onAirPage).toContain('<p class="on-air-tag"> <strong>On air</strong> ·');
    expect(onAirPage).toContain("Smuggler's Special Value · </span>15% off");
    expect(onAirPage).toContain(
      `<span class="phone-only">, regularly ${formatPrice(segment.item.priceCents)}</span>`,
    );
    // The buy button comes before the on-air note, so it stays on a phone's first screen.
    expect(onAirPage.indexOf("Acquire this exhibit")).toBeLessThan(
      onAirPage.indexOf("on-air-note"),
    );
    expect((await get(`/items/${offAir.slug}`)).html).toContain("<dt>Your price</dt>");
    expect((await get(`/items/${offAir.slug}`)).html).not.toContain("on-air-tag");
  });

  it("say so when the item is in the Midnight Auction", async () => {
    const auction = segmentAt(AUCTION);
    const { html } = await get(`/items/${auction.item.slug}`, deps(AUCTION));
    expect(html).toContain("<strong>On air now, in the Midnight Auction.</strong>");
    expect(html).toContain(formatPrice(specialPriceCents(auction.item, "auction")));
  });

  it("is what Stripe is asked to charge, hosted or embedded", async () => {
    const special = String(specialPriceCents(segment.item, "rolling"));
    await route(
      new Request(`${BASE}/checkout/${segment.item.slug}`, {
        method: "POST",
        headers: { Origin: BASE },
      }),
      deps(),
    );
    await route(
      new Request(`${BASE}/checkout/${segment.item.slug}/session`, {
        method: "POST",
        headers: { Origin: BASE },
      }),
      deps(),
    );
    expect(stripeForms.map((form) => form.get("line_items[0][price_data][unit_amount]"))).toEqual([
      special,
      special,
    ]);
    expect(stripeForms[0]?.get("metadata[segment]")).toBe(segment.id);
  });

  it("are recorded with their segment by the webhook", async () => {
    const event = {
      id: "evt_broadcast_1",
      type: "checkout.session.completed",
      created: NOON,
      data: {
        object: {
          id: "cs_test_onair",
          payment_status: "paid",
          amount_total: 42_415,
          currency: "usd",
          metadata: { slug: "alien-paperclip", segment: "2026-11-09.12" },
        },
      },
    };
    const payload = JSON.stringify(event);
    await route(
      new Request(`${BASE}${WEBHOOK_PATH}`, {
        method: "POST",
        headers: { "Stripe-Signature": await stripeSignatureHeader(payload, SECRET, NOON) },
        body: payload,
      }),
      deps(),
    );
    const row = await env.DB.prepare("SELECT segment FROM orders").first();
    expect(row).toEqual({ segment: "2026-11-09.12" });
  });
});

describe("the Broadcast in the Ledger", () => {
  it("splits exhibit sales on air and off, leaving out buy-backs", async () => {
    await orderIn("2026-11-09.12", "alien-paperclip", 42_415);
    await orderIn(null, "second-best-quill", 34_900);
    await orderIn(null, "streak-repair", 299);
    const ledger = await readLedger(env.DB, 30, NOON, "allegedly.example");
    expect(ledger.broadcast).toEqual({
      onAir: { orders: 1, revenueCents: 42_415 },
      offAir: { orders: 1, revenueCents: 34_900 },
    });
  });
});

describe("the countdown script", () => {
  it("is served first-party, ticks from the server's count, and reloads at zero", async () => {
    const response = await route(new Request(`${BASE}${COUNTDOWN_SCRIPT_PATH}`), deps());
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(await response.text()).toBe(COUNTDOWN_JS);
    expect(COUNTDOWN_JS).toContain('getAttribute("data-seconds-left")');
    expect(COUNTDOWN_JS).toContain("window.location.reload()");
    expect(COUNTDOWN_JS).not.toMatch(/eval\(|innerHTML|localStorage|https?:\/\//);
  });
});

describe("D1 schema (migrations/0010_orders_segment.sql)", () => {
  it("accepts segment ids and NULL, and nothing else", async () => {
    await orderIn("2026-11-09.auction", "alien-paperclip", 1);
    await orderIn(null, "alien-paperclip", 1);
    await expect(orderIn("tuesday", "alien-paperclip", 1)).rejects.toThrow(/CHECK/);
  });
});
