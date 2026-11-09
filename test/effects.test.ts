import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { effectsOn, effectsVariant } from "../src/core/effects";
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
    expect(empty.effects).toEqual([
      { variant: "fx", pullers: 0, pulls: 0, returners: 0 },
      { variant: "plain", pullers: 0, pulls: 0, returners: 0 },
    ]);
    await pulls(FX, 2, 0); // two days: a returner
    await pulls(PLAIN, 0, 0); // one day, two pulls
    const ledger = await readLedger(env.DB, 30, NOW, "a.example");
    expect(ledger.effects).toEqual([
      { variant: "fx", pullers: 1, pulls: 2, returners: 1 },
      { variant: "plain", pullers: 1, pulls: 2, returners: 0 },
    ]);
    const html = ledgerPage(ledger, "jerry@example.com").value.replace(/\s+/g, " ");
    expect(html).toContain(
      '<th scope="row">Reel and sound</th> <td class="num">1</td> <td class="num"> 2.0 </td>',
    );
    expect(ledgerPage(empty, "jerry@example.com").value).toContain("–");
  });
});
