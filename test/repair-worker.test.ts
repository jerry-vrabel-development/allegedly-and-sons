import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { readStreak } from "../src/worker/streak";
import { WEBHOOK_PATH } from "../src/worker/webhook";
import { stripeSignatureHeader } from "./stripe-test-signing";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const DAY = 86_400;
/** 2026-11-09 15:00 UTC. */
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const TODAY = Math.floor(NOW / DAY);
const SECRET = "whsec_test_repairs";
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_repair";

let stripeCalls: { url: string; body: string }[];

function deps(overrides: Partial<Deps> = {}): Deps {
  return {
    stripeKey: "sk_test_fake",
    webhookSecret: SECRET,
    fetch: (input, init) => {
      const body = init?.body;
      stripeCalls.push({
        url: input instanceof Request ? input.url : input.toString(),
        body: body instanceof URLSearchParams ? body.toString() : "",
      });
      return Promise.resolve(Response.json({ id: "cs_test_repair", url: CHECKOUT_URL }));
    },
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId: A,
    access: undefined,
    ...overrides,
  };
}

/** Free pulls for agent A on these days (relative to today). */
async function pulledOn(...daysAgo: number[]): Promise<void> {
  await grantAwards(env.DB, A, ["first-contact"], NOW);
  await env.DB.batch(
    daysAgo.map((ago) =>
      env.DB.prepare(
        `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
         VALUES (?, ?, 'daily', 'left-sock-of-atlantis', ?)`,
      ).bind(A, TODAY - ago, NOW - ago * DAY),
    ),
  );
}

function buyBack(headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}/streak/repair`, {
    method: "POST",
    headers: { Origin: BASE, Cookie: `__Host-vid=${A}`, "User-Agent": BROWSER, ...headers },
  });
}

/** Delivers a signed checkout.session.completed for a repair. */
async function paid(session: Record<string, unknown> = {}, created = NOW, d: Deps = deps()) {
  const event = {
    id: `evt_${String(Math.random()).slice(2)}`,
    type: "checkout.session.completed",
    created,
    data: {
      object: {
        id: "cs_test_repair",
        payment_status: "paid",
        amount_total: 299,
        currency: "usd",
        payment_intent: "pi_test_repair",
        metadata: { slug: "streak-repair" },
        client_reference_id: A,
        ...session,
      },
    },
  };
  const payload = JSON.stringify(event);
  return route(
    new Request(`${BASE}${WEBHOOK_PATH}`, {
      method: "POST",
      headers: { "Stripe-Signature": await stripeSignatureHeader(payload, SECRET, NOW) },
      body: payload,
    }),
    d,
  );
}

async function page(path: string, d: Deps = deps()): Promise<string> {
  return (await (await route(new Request(`${BASE}${path}`), d)).text()).replace(/\s+/g, " ");
}

beforeEach(async () => {
  stripeCalls = [];
  await env.DB.batch([
    env.DB.prepare("DELETE FROM streak_repairs"),
    env.DB.prepare("DELETE FROM orders"),
    env.DB.prepare("DELETE FROM stripe_events"),
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the offer", () => {
  it("appears on the Vault and dossier with its price and real deadline", async () => {
    await pulledOn(6, 5, 4, 3, 2); // missed yesterday: died today
    for (const path of ["/vault", "/dossier"]) {
      const html = await page(path);
      expect(html).toContain("<strong>Your 5-day streak is dead.</strong> Nobody held the line.");
      expect(html).toContain("Bring your 5-day streak back for $2.99.");
      expect(html).toContain("The offer ends at midnight UTC tomorrow: 33 hours left.");
      expect(html).toContain('<form class="lever" method="post" action="/streak/repair">');
      expect(html).toContain("Restore my streak for $2.99</button>");
      expect(html).toContain("It's digital, so it can't be refunded once applied.");
      expect(html).not.toContain("Start a new one today.");
    }
  });

  it("says 'tonight' on the offer's last day", async () => {
    await pulledOn(7, 6, 5, 4, 3); // died yesterday: the window closes tonight
    const html = await page("/vault");
    expect(html).toContain("The offer ends at midnight UTC tonight: 9 hours left.");
    expect(html).not.toContain("midnight UTC tomorrow");
  });

  it("stays after today's pull, beside the new streak", async () => {
    await pulledOn(6, 5, 4, 3, 2, 0); // missed yesterday, already pulled today
    for (const path of ["/vault", "/dossier"]) {
      const html = await page(path);
      expect(html).toContain("<strong>Duty streak: 1 day.</strong>");
      expect(html).toContain("<strong>Your 5-day streak is still dead.</strong>");
      expect(html).toContain("Bring your 5-day streak back for $2.99.");
      expect(html).toContain("Restore my streak for $2.99</button>");
      expect(html).toContain("today's pull then counts as the next day");
      expect(html).not.toContain("today's pull is still yours to make");
    }
  });

  it("is gone once the window closes, or without checkout configured", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    const twoDaysOn = deps({ nowSeconds: () => NOW + 2 * DAY });
    expect(await page("/vault", twoDaysOn)).not.toContain("Grease the Clerk");
    expect(await page("/vault", twoDaysOn)).toContain("Start a new one today.");
    expect(await page("/vault", deps({ stripeKey: undefined }))).not.toContain("Grease the Clerk");
  });
});

describe("POST /streak/repair", () => {
  it("starts a $2.99 Stripe checkout for a streak that can be bought back", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    const response = await route(buyBack(), deps());
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(CHECKOUT_URL);
    expect(stripeCalls).toHaveLength(1);
    const form = new URLSearchParams(stripeCalls[0]?.body);
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("299");
    expect(form.get("client_reference_id")).toBe(A);
    expect(form.get("metadata[slug]")).toBe("streak-repair");
    expect(form.get("payment_intent_data[description]")).toBe("Grease the Clerk (5-day streak)");
  });

  it("starts checkout for the dead streak even after today's pull", async () => {
    await pulledOn(6, 5, 4, 3, 2, 0);
    const response = await route(buyBack(), deps());
    expect(response.headers.get("Location")).toBe(CHECKOUT_URL);
    const form = new URLSearchParams(stripeCalls[0]?.body);
    expect(form.get("payment_intent_data[description]")).toBe("Grease the Clerk (5-day streak)");
  });

  it("sends anything else back to the Vault without calling Stripe", async () => {
    await pulledOn(1); // alive: nothing to buy back
    expect((await route(buyBack(), deps())).headers.get("Location")).toBe("/vault");
    expect((await route(buyBack({ Cookie: "" }), deps())).headers.get("Location")).toBe("/vault");
    expect((await route(buyBack(), deps({ stripeKey: undefined }))).headers.get("Location")).toBe(
      "/vault",
    );
    expect(stripeCalls).toEqual([]);
    expect((await route(buyBack({ Origin: "https://evil.example" }), deps())).status).toBe(403);
  });

  it("says so, and charges nothing, when Stripe can't start checkout", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = deps({ fetch: () => Promise.resolve(new Response("no", { status: 500 })) });
    const response = await route(buyBack(), failing);
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("Nothing was charged.");
    expect(error).toHaveBeenCalledWith("repair checkout failed: stripe status 500");
  });
});

describe("the webhook", () => {
  it("records the order and restores the streak in one go", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    expect((await readStreak(env.DB, A, NOW)).status).toBe("none");
    expect((await paid()).status).toBe(200);
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "due", days: 5 });
    const { results } = await env.DB.prepare("SELECT * FROM streak_repairs").all();
    expect(results).toEqual([
      expect.objectContaining({ visitor_id: A, from_day: TODAY - 1, to_day: TODAY - 1 }),
    ]);
    const order = await env.DB.prepare("SELECT item_slug, amount_cents FROM orders").first();
    expect(order).toEqual({ item_slug: "streak-repair", amount_cents: 299 });
  });

  it("bridges both missed days when paid the day after it died", async () => {
    await pulledOn(7, 6, 5, 4, 3); // missed two days ago and yesterday
    await paid({}, NOW);
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "due", days: 5 });
  });

  it("restores the streak when the agent pulled today before paying", async () => {
    await pulledOn(6, 5, 4, 3, 2, 0);
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "safe", days: 1 });
    await paid();
    const { results } = await env.DB.prepare("SELECT from_day, to_day FROM streak_repairs").all();
    expect(results).toEqual([{ from_day: TODAY - 1, to_day: TODAY - 1 }]);
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "safe", days: 6, lost: 0 });
  });

  it("grants a milestone the restored streak reached with today's pull", async () => {
    // Six days, a missed day, then today's pull: restored, today is day 7.
    await pulledOn(7, 6, 5, 4, 3, 2, 0);
    await paid();
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "safe", days: 7 });
    const { results } = await env.DB.prepare("SELECT award FROM awards ORDER BY award").all<{
      award: string;
    }>();
    expect(results.map((row) => row.award)).toEqual([
      "first-contact",
      "streak-made",
      "streak-regular",
    ]);
    expect(await page("/vault")).toContain("<strong>Day 7: you're Made.</strong>");
  });

  it("keeps the repair when the milestone grant fails, and says so in the log", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await pulledOn(7, 6, 5, 4, 3, 2, 0);
    // The webhook's own batch succeeds; every read or write after it fails.
    let batches = 0;
    const db = new Proxy(env.DB, {
      get(target, prop, receiver) {
        if (prop === "batch") {
          return (statements: D1PreparedStatement[]) => {
            batches += 1;
            return batches === 1
              ? target.batch(statements)
              : Promise.reject(new Error("D1 hiccup"));
          };
        }
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    expect((await paid({}, NOW, deps({ db }))).status).toBe(200);
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "safe", days: 7 });
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/: milestone grant failed$/));
  });

  it("logs a paid buy-back that restored nothing as a refund owed", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    await pulledOn(1, 0); // alive: there is nothing to restore
    await paid({ id: "cs_test_nothing" });
    expect(error).toHaveBeenCalledWith(
      expect.stringMatching(
        /^webhook checkout\.session\.completed evt_\d+: repair cs_test_nothing restored nothing, refund owed$/,
      ),
    );
    // Redelivered, it isn't reported twice, and a repair that worked isn't reported at all.
    error.mockClear();
    await env.DB.prepare("DELETE FROM vault_pulls").run();
    await pulledOn(6, 5, 4, 3, 2);
    await paid({ id: "cs_test_fine" });
    expect(error).not.toHaveBeenCalled();
  });

  it("never awards Acquirer or a card for a buy-back", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    await paid();
    const { results } = await env.DB.prepare("SELECT award FROM awards").all<{ award: string }>();
    expect(results.map((row) => row.award)).toEqual(["first-contact"]);
  });

  it("keeps the order but bridges nothing when there's no gap, no file, or too long a gap", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await pulledOn(0);
    await paid({ id: "cs_test_no_gap" });
    await paid({ id: "cs_test_no_file", client_reference_id: null });
    const { results } = await env.DB.prepare("SELECT * FROM streak_repairs").all();
    expect(results).toEqual([]);
    await env.DB.prepare("DELETE FROM vault_pulls").run();
    await pulledOn(20);
    await paid({ id: "cs_test_too_long" });
    expect((await env.DB.prepare("SELECT * FROM streak_repairs").all()).results).toEqual([]);
    const orders = await env.DB.prepare("SELECT COUNT(*) AS n FROM orders").first<{ n: number }>();
    expect(orders?.n).toBe(3);
  });

  it("applies a redelivered event once", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    await paid();
    await paid();
    const { results } = await env.DB.prepare("SELECT * FROM streak_repairs").all();
    expect(results).toHaveLength(1);
  });
});

describe("GET /streak/restored", () => {
  function lookup(session: Record<string, unknown> | Response) {
    return deps({
      fetch: () => Promise.resolve(session instanceof Response ? session : Response.json(session)),
    });
  }
  const ID = "?session_id=cs_test_repair";

  it("says the streak is restored only once the repair is on file", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    await paid();
    const restored = await page(
      `/streak/restored${ID}`,
      lookup({ status: "complete", payment_status: "paid" }),
    );
    expect(restored).toContain("<h1>The clerk has been greased</h1>");
    expect(restored).toContain("Your streak is restored.");
    expect(restored).toContain("that pull is still yours to make before midnight UTC");
  });

  it("says the streak is on its way while the webhook hasn't landed", async () => {
    const pending = await page(
      `/streak/restored${ID}`,
      lookup({ status: "complete", payment_status: "paid" }),
    );
    expect(pending).toContain("<h1>The clerk has been paid</h1>");
    expect(pending).toContain("Payment confirmed");
    expect(pending).not.toContain("Your streak is restored.");
    expect(pending).toContain('href="mailto:bureau@allegedlyandsons.com"');
  });

  it("says a refund is owed when the payment landed and restored nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await pulledOn(1, 0); // alive: nothing to restore
    await paid();
    const owed = await page(
      `/streak/restored${ID}`,
      lookup({ status: "complete", payment_status: "paid" }),
    );
    expect(owed).toContain("<h1>Paid, but nothing was restored</h1>");
    expect(owed).toContain("you are owed a refund");
    expect(owed).toContain('href="mailto:bureau@allegedlyandsons.com"');
    expect(owed).toContain("cs_test_repair");
    expect(owed).not.toContain("Your streak is restored.");
  });

  it("says what Stripe confirms about an unpaid session, and nothing more", async () => {
    expect(
      await page(`/streak/restored${ID}`, lookup({ status: "complete", payment_status: "unpaid" })),
    ).toContain("<h1>Payment processing</h1>");
    expect(
      await page(`/streak/restored${ID}`, lookup({ status: "expired", payment_status: "unpaid" })),
    ).toContain("nothing was charged and nothing changed");
  });

  it("claims nothing without a real session to check", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const [path, d] of [
      ["/streak/restored", deps()],
      ["/streak/restored?session_id=nope", deps()],
      [`/streak/restored${ID}`, deps({ stripeKey: undefined })],
      [`/streak/restored${ID}`, lookup(new Response("down", { status: 503 }))],
    ] as const) {
      const response = await route(new Request(`${BASE}${path}`), d);
      expect(response.headers.get("Cache-Control")).toBe("no-store, no-transform");
      expect(await response.text()).toContain("We couldn't check this payment just now.");
    }
    expect(error).toHaveBeenCalledWith("repair return page: stripe status 503");
  });
});

describe("buy-backs in the Ledger", () => {
  it("counts them, and their revenue goes into total sales", async () => {
    await pulledOn(6, 5, 4, 3, 2);
    await paid();
    const ledger = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(ledger.repairs).toEqual({ count: 1, revenueCents: 299 });
    expect(ledger.streaks.alive).toBe(1);
  });
});

describe("D1 schema (migrations/0009_streak_repairs.sql)", () => {
  const insert = (values: Record<string, string | number>) => {
    const row = {
      stripe_session_id: "cs_test_x",
      visitor_id: A,
      from_day: 10,
      to_day: 11,
      repaired_at: NOW,
      ...values,
    };
    const names = Object.keys(row);
    return env.DB.prepare(
      `INSERT INTO streak_repairs (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
    )
      .bind(...Object.values(row))
      .run();
  };

  it("keeps one repair per session and only short, forward ranges", async () => {
    await insert({});
    await expect(insert({})).rejects.toThrow(/UNIQUE/);
    await expect(insert({ stripe_session_id: "pi_x" })).rejects.toThrow(/CHECK/);
    await expect(insert({ stripe_session_id: "cs_test_b", to_day: 9 })).rejects.toThrow(/CHECK/);
    await expect(insert({ stripe_session_id: "cs_test_c", to_day: 20 })).rejects.toThrow(/CHECK/);
  });
});
