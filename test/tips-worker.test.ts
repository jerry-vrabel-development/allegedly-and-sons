import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { TOTAL_AWARDS } from "../src/core/dossier";
import { inboundTips, tipAwardId, tipsAbout, type Tip } from "../src/core/tips";
import { grantAwards } from "../src/worker/dossier";
import { escapeHtml } from "../src/worker/html";
import { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { tipBlock } from "../src/worker/tip-block";
import { pullLever, readVault } from "../src/worker/vault";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const NOW = Date.UTC(2026, 10, 16, 15) / 1000;
const TIPS = inboundTips();

/** The nth inbound tip; a missing one is a mistake in the test. */
function tipAt(index: number): Tip {
  const tip = TIPS[index];
  if (tip === undefined) throw new Error(`No inbound tip number ${String(index)}.`);
  return tip;
}
const PENDING = CATALOG.filter((item) => item.status === "pending");

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

async function text(path: string, visitorId: string | null = A): Promise<string> {
  const response = await route(new Request(`${BASE}${path}`), deps(visitorId));
  expect(response.status).toBe(200);
  return (await response.text()).replace(/\s+/g, " ");
}

async function tipsOf(visitor: string): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT award FROM awards WHERE visitor_id = ? AND award LIKE 'tip:%' ORDER BY award",
  )
    .bind(visitor)
    .all<{ award: string }>();
  return results.map((row) => row.award);
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

describe("a tip on every pull", () => {
  it("records the tip the pull carried, and numbers the pull", async () => {
    await pullLever(env.DB, A, NOW, 0);
    const { latest } = await readVault(env.DB, A, NOW);
    expect(latest?.number).toBe(1);
    expect(await tipsOf(A)).toEqual([tipAwardId(tipAt(0))]);
  });

  it("hands out the next tip on the next pull, and never takes one back", async () => {
    await grantAwards(env.DB, A, ["case-closed"], NOW);
    await pullLever(env.DB, A, NOW, 0);
    await pullLever(env.DB, A, NOW + 1, 0);
    expect((await readVault(env.DB, A, NOW + 1)).latest?.number).toBe(2);
    expect(await tipsOf(A)).toEqual([tipAt(0), tipAt(1)].map(tipAwardId).sort());
  });

  it("gives a refused pull no tip", async () => {
    await pullLever(env.DB, A, NOW, 0);
    expect((await pullLever(env.DB, A, NOW + 1, 0)).ok).toBe(false);
    expect(await tipsOf(A)).toHaveLength(1);
  });

  it("changes nothing about the odds, the cards or the bonus pulls", async () => {
    await pullLever(env.DB, A, NOW, 0);
    const state = await readVault(env.DB, A, NOW);
    expect(state).toMatchObject({ dailyReady: false, bonusLeft: 0, bonusEarned: 0 });
    expect([...state.owned]).toHaveLength(1);
  });

  it("shows under the latest pull, in the contact's words, about an exhibit on its way", async () => {
    await pullLever(env.DB, A, NOW, 0);
    const first = tipAt(0);
    const page = await text("/vault");
    expect(page).toContain("<h4>A tip</h4>");
    expect(page).toContain(escapeHtml(first.line));
    expect(page).toContain(`${first.contact}, about <a href="/items/${first.exhibit}">`);
    expect(page).toContain("A tip is a clue, not a promise.");
    expect(page).toContain('<a href="/board">Job Board</a>');
  });

  it("is not on the Vault until there has been a pull", async () => {
    expect(await text("/vault")).not.toContain("<h4>A tip</h4>");
  });

  it("says so, with a way on, when nothing is on its way", () => {
    const words = tipBlock(undefined).value.replace(/\s+/g, " ");
    expect(words).toContain("No exhibit is on its way right now, so this pull has no tip.");
    expect(words).toContain('<a href="/board">Job Board</a>');
  });
});

describe("the Job Board", () => {
  it("lists what can be bought, and what is on its way, read from the catalog", async () => {
    const page = await text("/board", null);
    expect(page).toContain("<h1>The Job Board</h1>");
    for (const item of CATALOG) {
      expect(page, item.slug).toContain(
        `<a href="/items/${item.slug}">${escapeHtml(item.name)}</a>`,
      );
    }
    expect(page.match(/· On the block</g)).toHaveLength(CATALOG.length - PENDING.length);
    expect(page.match(/· On its way</g)).toHaveLength(PENDING.length);
  });

  it("gives nothing away to someone with no file: no tips yet", async () => {
    const page = await text("/board", null);
    expect(page.match(/No tips yet\./g)).toHaveLength(PENDING.length);
    expect(page).not.toContain("File complete.");
    for (const item of PENDING) {
      expect(page, item.slug).toContain(`Tips: 0 of ${String(tipsAbout(item.slug).length)}.`);
    }
    expect(page.match(/Tips: 0 of \d+\./g)).toHaveLength(PENDING.length);
  });

  it("says plainly that a tip holds nothing and gives no right to buy first", async () => {
    expect(await text("/board", null)).toContain(
      "A tip is a clue, not a promise: it holds nothing for you and gives you no right to buy first.",
    );
  });

  it("shows the tips this agent has been told, and not another agent's", async () => {
    const [first, second] = [tipAt(0), tipAt(1)];
    await grantAwards(env.DB, A, [tipAwardId(tipAt(0))], NOW);
    await grantAwards(env.DB, B, [tipAwardId(tipAt(1))], NOW);
    const page = await text("/board", A);
    expect(page).toContain(`<strong>${first.contact}:</strong> ${escapeHtml(first.line)}`);
    expect(page).not.toContain(escapeHtml(second.line));
    expect(page).toContain("Tips: 1 of 2.");
    expect(page.match(/No tips yet\./g)).toHaveLength(PENDING.length - 1);
  });

  it("marks a file complete once every tip about the exhibit has been told", async () => {
    const all = TIPS.filter((tip) => tip.exhibit === PENDING[0]?.slug).map(tipAwardId);
    await grantAwards(env.DB, A, all, NOW);
    const page = await text("/board", A);
    expect(page).toContain("Tips: 2 of 2.</strong> File complete.");
    expect(page.match(/File complete\./g)).toHaveLength(1);
  });

  it("is kept out of search, in robots.txt and in its own page", async () => {
    const response = await route(new Request(`${BASE}/robots.txt`), deps(null));
    expect(await response.text()).toContain("Disallow: /board");
    expect(await text("/board", null)).toContain('<meta name="robots" content="noindex');
  });

  it("is linked from every page's footer", async () => {
    expect(await text("/", A)).toContain('<a href="/board">The Job Board</a>');
  });
});

describe("tips and rank", () => {
  it("are not counted: a tip is a record of what you were told, not a reward", async () => {
    await grantAwards(env.DB, A, [tipAwardId(tipAt(0))], NOW);
    expect(await text("/dossier")).toContain(`0 of ${String(TOTAL_AWARDS)} commendations.`);
  });
});

describe("the ledger's tip count", () => {
  it("counts agents given a tip and the tips, within the period", async () => {
    await grantAwards(
      env.DB,
      A,
      [tipAwardId(tipAt(0)), tipAwardId(tipAt(1)), "first-contact"],
      NOW,
    );
    await grantAwards(env.DB, B, [tipAwardId(tipAt(0))], NOW - 10 * 86_400);
    const week = await readLedger(env.DB, 7, NOW, "allegedly.example");
    expect(week.tips).toEqual({ told: 1, tips: 2 });
    const all = await readLedger(env.DB, 0, NOW, "allegedly.example");
    expect(all.tips).toEqual({ told: 2, tips: 3 });
  });
});
