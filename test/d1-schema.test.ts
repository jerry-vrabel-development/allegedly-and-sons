import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

const SESSION = "cs_test_a1";
const PAID_AT = 1762531200;

interface Column {
  readonly name: string;
  readonly type: string;
  readonly notnull: number;
  readonly pk: number;
}

async function columns(table: string): Promise<Column[]> {
  const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all<Column>();
  return results;
}

function insertOrder(values: Partial<Record<string, string | number | null>> = {}) {
  const row = {
    stripe_session_id: SESSION,
    payment_intent_id: "pi_test_a1",
    item_slug: "alien-paperclip",
    amount_cents: 99_900,
    paid_at: PAID_AT,
    ...values,
  };
  const names = Object.keys(row);
  return env.DB.prepare(
    `INSERT INTO orders (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
  )
    .bind(...Object.values(row))
    .run();
}

describe("D1 schema (migrations/0001_orders.sql)", () => {
  // Storage carries over between tests in a file, so each test starts empty.
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM orders"),
      env.DB.prepare("DELETE FROM stripe_events"),
    ]);
  });

  it("has the orders table from note 0004", async () => {
    expect((await columns("orders")).map((c) => [c.name, c.type, c.notnull, c.pk])).toEqual([
      ["stripe_session_id", "TEXT", 1, 1],
      ["payment_intent_id", "TEXT", 0, 0],
      ["item_slug", "TEXT", 1, 0],
      ["amount_cents", "INTEGER", 1, 0],
      ["status", "TEXT", 1, 0],
      ["paid_at", "INTEGER", 1, 0],
      ["shipped_at", "INTEGER", 0, 0],
      // Added by migrations/0003_orders_visitor.sql.
      ["visitor_id", "TEXT", 0, 0],
      // Added by migrations/0010_orders_segment.sql.
      ["segment", "TEXT", 0, 0],
    ]);
  });

  it("stores a well-formed visitor id on an order and rejects anything else", async () => {
    await insertOrder({ visitor_id: "0123456789abcdef0123456789abcdef" });
    for (const [i, bad] of ["abc", "z".repeat(32), "0123456789ABCDEF0123456789ABCDEF"].entries()) {
      await expect(
        insertOrder({ stripe_session_id: `cs_test_bad${String(i)}`, visitor_id: bad }),
      ).rejects.toThrow();
    }
  });

  it("has the processed-events table", async () => {
    expect((await columns("stripe_events")).map((c) => [c.name, c.type, c.notnull, c.pk])).toEqual([
      ["id", "TEXT", 1, 1],
      ["type", "TEXT", 1, 0],
      ["received_at", "INTEGER", 1, 0],
    ]);
  });

  it("stores nothing personal: no name, email, phone or address columns", async () => {
    for (const table of ["orders", "stripe_events"]) {
      for (const { name } of await columns(table)) {
        expect(name, `${table}.${name}`).not.toMatch(/name|email|phone|address|customer/i);
      }
    }
  });

  it("records an order as paid by default", async () => {
    await insertOrder();
    const row = await env.DB.prepare(
      "SELECT status, shipped_at FROM orders WHERE stripe_session_id = ?",
    )
      .bind(SESSION)
      .first();
    expect(row).toEqual({ status: "paid", shipped_at: null });
  });

  it("refuses a second order for the same Checkout Session", async () => {
    await insertOrder();
    await expect(insertOrder()).rejects.toThrow(/UNIQUE|PRIMARY KEY/);
  });

  it("refuses bad values, each for its own reason", async () => {
    const cases: [Partial<Record<string, string | number | null>>, RegExp][] = [
      [{ stripe_session_id: "not-a-session" }, /CHECK/],
      [{ payment_intent_id: "ch_wrong_kind" }, /CHECK/],
      [{ amount_cents: 0 }, /CHECK/],
      [{ amount_cents: -5 }, /CHECK/],
      // STRICT refuses text that isn't a clean number ("999" would be converted, by design).
      [{ amount_cents: "a lot" }, /cannot store TEXT value in INTEGER column/],
      [{ status: "lost-in-the-void" }, /CHECK/],
      [{ shipped_at: PAID_AT - 1 }, /CHECK/], // shipped before it was paid
      [{ item_slug: null }, /NOT NULL/],
    ];
    for (const [bad, reason] of cases) {
      await expect(insertOrder(bad), JSON.stringify(bad)).rejects.toThrow(reason);
    }
    const { count } = (await env.DB.prepare("SELECT COUNT(*) AS count FROM orders").first<{
      count: number;
    }>()) ?? { count: -1 };
    expect(count).toBe(0);
  });

  it("allows an order without a payment intent id (Stripe can omit it)", async () => {
    await expect(insertOrder({ payment_intent_id: null })).resolves.toBeDefined();
  });

  it("dedupes Stripe events: the same id twice records once", async () => {
    const record = () =>
      env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)")
        .bind("evt_test_1", "checkout.session.completed", PAID_AT)
        .run();
    expect((await record()).meta.changes).toBe(1);
    expect((await record()).meta.changes).toBe(0);
  });

  it("refuses an event id that isn't one", async () => {
    await expect(
      env.DB.prepare("INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)")
        .bind("cs_test_1", "x", PAID_AT)
        .run(),
    ).rejects.toThrow(/CHECK/);
  });

  it("lists unshipped orders through the fulfillment index", async () => {
    const { results } = await env.DB.prepare(
      "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE status = 'paid' ORDER BY paid_at",
    ).all<{ detail: string }>();
    expect(results.map((r) => r.detail).join(" ")).toContain("orders_by_status_and_paid_at");
  });
});
