import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import {
  effectsOn,
  effectsVariant,
  TARGET_PULLERS,
  TEST_DAYS,
  TEST_STARTED,
  TEST_WIDENED,
  testStatus,
} from "../src/core/effects";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";
import { ledgerPage, readLedger } from "../src/worker/ledger";

const FX = `${"a".repeat(31)}0`;
const PLAIN = `${"a".repeat(31)}1`;
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const DAY = 86_400;

describe("the effects split", () => {
  it("puts each agent in one group, half and half, by their id", () => {
    const digits = Array.from({ length: 16 }, (_, n) => n.toString(16));
    const groups = digits.map((d) => effectsVariant(`${"b".repeat(31)}${d}`));
    expect(groups.filter((g) => g === "fx")).toHaveLength(8);
    expect(effectsVariant(FX)).toBe("fx");
    expect(effectsVariant(PLAIN)).toBe("plain");
  });

  it("can be overridden for one view, and is plain without an id", () => {
    expect(effectsOn(PLAIN, "on")).toBe(true);
    expect(effectsOn(FX, "off")).toBe(false);
    expect(effectsOn(FX, null)).toBe(true);
    expect(effectsOn(PLAIN, "maybe")).toBe(false);
    expect(effectsOn(null, null)).toBe(false);
  });
});

describe("the Vault by group", () => {
  function deps(visitorId: string | null): Deps {
    return {
      stripeKey: undefined,
      webhookSecret: undefined,
      fetch: () => Promise.reject(new Error("no outside calls")),
      db: env.DB,
      nowSeconds: () => NOW,
      waitUntil: () => undefined,
      visitorId,
      access: undefined,
    };
  }
  const page = async (visitorId: string | null, query = "") =>
    (await route(new Request(`https://a.example/vault${query}`), deps(visitorId))).text();

  it("loads the reel only for the fx group (or ?fx=on), and the clock for everyone", async () => {
    expect(await page(FX)).toContain('<script src="/assets/vault.js" defer></script>');
    expect(await page(PLAIN)).not.toContain("/assets/vault.js");
    expect(await page(PLAIN)).toContain('<script src="/assets/countdown.js" defer></script>');
    expect(await page(PLAIN, "?fx=on")).toContain("/assets/vault.js");
    expect(await page(FX, "?fx=off")).not.toContain("/assets/vault.js");
  });
});

describe("the split in the Ledger", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM vault_pulls"),
      env.DB.prepare("DELETE FROM awards"),
      env.DB.prepare("DELETE FROM agents"),
    ]);
  });

  async function pulls(visitor: string, ...daysAgo: number[]) {
    await grantAwards(env.DB, visitor, ["first-contact"], NOW);
    await env.DB.batch(
      daysAgo.map((ago, i) =>
        env.DB.prepare(
          `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
           VALUES (?, ?, ?, 'left-sock-of-atlantis', ?)`,
        ).bind(visitor, Math.floor(NOW / DAY) - ago, i === 0 ? "daily" : "bonus", NOW - ago * DAY),
      ),
    );
  }

  it("compares pullers, pulls per agent and returns between the groups", async () => {
    const empty = await readLedger(env.DB, 30, NOW, "a.example");
    const none = { visitors: 0, opened: 0, finished: 0, sharers: 0, buyers: 0 };
    expect(empty.effects).toEqual([
      { variant: "fx", ...none, pullers: 0, pulls: 0, returners: 0 },
      { variant: "plain", ...none, pullers: 0, pulls: 0, returners: 0 },
    ]);
    await pulls(FX, 2, 0); // two days: a returner
    await pulls(PLAIN, 0, 0); // one day, two pulls
    const ledger = await readLedger(env.DB, 30, NOW, "a.example");
    expect(ledger.effects).toEqual([
      { variant: "fx", ...none, pullers: 1, pulls: 2, returners: 1 },
      { variant: "plain", ...none, pullers: 1, pulls: 2, returners: 0 },
    ]);
    const html = ledgerPage(ledger, "jerry@example.com").value.replace(/\s+/g, " ");
    expect(html).toContain('<th scope="row">Sound and motion</th> <td class="num">0</td>');
    expect(html).toContain('<td class="num">1</td> <td class="num"> 2.0 </td>');
    expect(ledgerPage(empty, "jerry@example.com").value).toContain("–");
  });
});

describe("the effects test across the shop (note 0011)", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM analytics_events"),
      env.DB.prepare("DELETE FROM orders"),
      env.DB.prepare("DELETE FROM vault_pulls"),
      env.DB.prepare("DELETE FROM awards"),
      env.DB.prepare("DELETE FROM agents"),
    ]);
  });

  async function event(visitor: string, name: string, readDepth: string | null = null) {
    await env.DB.prepare(
      `INSERT INTO analytics_events (ts, event, item_slug, visitor_id, read_depth, ref, channel)
       VALUES (?, ?, 'alien-paperclip', ?, ?, ?, ?)`,
    )
      .bind(
        NOW - 60,
        name,
        visitor,
        readDepth,
        name === "share_clicked" ? "0a1b2c3d4e" : null,
        name === "share_clicked" ? "reddit" : null,
      )
      .run();
  }

  it("counts visitors, readers, sharers and buyers by group", async () => {
    await event(FX, "item_viewed");
    await event(FX, "lore_expanded", "opened");
    await event(FX, "lore_expanded", "finished");
    await event(FX, "share_clicked");
    await event(PLAIN, "item_viewed");
    await event(PLAIN, "item_viewed"); // the same visitor twice counts once
    await env.DB.prepare(
      `INSERT INTO orders (stripe_session_id, payment_intent_id, item_slug, amount_cents, paid_at, visitor_id)
       VALUES ('cs_fx', 'pi_fx', 'alien-paperclip', 49900, ?, ?)`,
    )
      .bind(NOW - 30, FX)
      .run();
    const [fx, plain] = (await readLedger(env.DB, 30, NOW, "a.example")).effects;
    expect(fx).toMatchObject({ visitors: 1, opened: 1, finished: 1, sharers: 1, buyers: 1 });
    expect(plain).toMatchObject({ visitors: 1, opened: 0, finished: 0, sharers: 0, buyers: 0 });
  });

  it("counts the stopping rule's pullers since the test began, whatever the period", async () => {
    await grantAwards(env.DB, FX, ["first-contact"], NOW);
    await env.DB.prepare(
      `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
       VALUES (?, ?, 'daily', 'left-sock-of-atlantis', ?)`,
    )
      .bind(FX, Math.floor(TEST_STARTED / DAY), TEST_STARTED + 60)
      .run();
    const later = TEST_WIDENED + 10 * DAY;
    const ledger = await readLedger(env.DB, 7, later, "a.example");
    expect(ledger.effects[0]?.pullers).toBe(0); // outside the seven-day period
    expect(ledger.effectsTest).toEqual({
      day: 11,
      fxPullers: 1,
      plainPullers: 0,
      ended: undefined,
    });
    const html = ledgerPage(ledger, "jerry@example.com").value.replace(/\s+/g, " ");
    expect(html).toContain(`Day 11 of ${String(TEST_DAYS)}.`);
    expect(html).toContain("Clear differences so far: none yet.");
  });
});

describe("testStatus (note 0011's stopping rule)", () => {
  it("counts days from when shop-wide sound joined, within 1 to 30", () => {
    expect(testStatus(TEST_WIDENED - DAY, 0, 0).day).toBe(1);
    expect(testStatus(TEST_WIDENED, 0, 0).day).toBe(1);
    expect(testStatus(TEST_WIDENED + DAY, 0, 0).day).toBe(2);
    expect(testStatus(TEST_WIDENED + 90 * DAY, 0, 0).day).toBe(TEST_DAYS);
  });

  it("ends when both groups reach the target, or when the days run out", () => {
    expect(testStatus(TEST_WIDENED, TARGET_PULLERS, TARGET_PULLERS - 1).ended).toBeUndefined();
    expect(testStatus(TEST_WIDENED, TARGET_PULLERS, TARGET_PULLERS).ended).toBe("target");
    expect(testStatus(TEST_WIDENED + TEST_DAYS * DAY - 1, 0, 0).ended).toBeUndefined();
    expect(testStatus(TEST_WIDENED + TEST_DAYS * DAY, 0, 0).ended).toBe("time");
  });
});

describe("the effects test on the Ledger page", () => {
  async function page(
    effects: Parameters<typeof ledgerPage>[0]["effects"],
    ended?: "target" | "time",
  ) {
    const base = await readLedger(env.DB, 30, NOW, "a.example");
    const effectsTest = { day: 30, fxPullers: 200, plainPullers: 200, ended };
    return ledgerPage({ ...base, effects, effectsTest }, "jerry@example.com").value.replace(
      /\s+/g,
      " ",
    );
  }
  const row = (variant: "fx" | "plain", buyers: number) => ({
    variant,
    visitors: 400,
    opened: 200,
    finished: 100,
    sharers: 20,
    buyers,
    pullers: 200,
    pulls: 300,
    returners: 80,
  });

  it("names a clear difference, and which group is higher", async () => {
    const html = await page([row("fx", 80), row("plain", 20)]);
    expect(html).toContain("Clear differences so far: buying (Sound and motion is higher).");
    const plainWins = await page([row("fx", 20), row("plain", 80)]);
    expect(plainWins).toContain("Clear differences so far: buying (Plain is higher).");
  });

  it("says nothing is clear when the intervals overlap", async () => {
    expect(await page([row("fx", 22), row("plain", 20)])).toContain("none yet.");
  });

  it("says so in words when the stopping rule is met, and why", async () => {
    const target = await page([row("fx", 20), row("plain", 20)], "target");
    expect(target).toContain("<strong>The stopping rule is met.</strong> Both groups reached 200");
    const time = await page([row("fx", 20), row("plain", 20)], "time");
    expect(time).toContain(`${String(TEST_DAYS)} days have passed.`);
  });

  it("never calls a difference on too few trials", async () => {
    const small = (variant: "fx" | "plain", buyers: number) => ({
      ...row(variant, buyers),
      visitors: 40,
    });
    expect(await page([small("fx", 40), small("plain", 0)])).toContain("none yet.");
  });
});
