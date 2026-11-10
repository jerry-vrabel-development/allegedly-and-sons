import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { TOTAL_AWARDS } from "../src/core/dossier";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { pullLever, readVault, secureUint32 } from "../src/worker/vault";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
/** 2026-11-09 15:00 UTC. */
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const TOMORROW = NOW + 86_400;
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";

// Rolls: 0 draws the Left Sock (common), 99 the Moon's Receipt (rare).
const SOCK = 0;
const RECEIPT = 99;

async function pullsOf(visitor: string) {
  const { results } = await env.DB.prepare(
    "SELECT kind, card, day FROM vault_pulls WHERE visitor_id = ? ORDER BY id",
  )
    .bind(visitor)
    .all<{ kind: string; card: string; day: number }>();
  return results;
}

async function awardsOf(visitor: string): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT award FROM awards WHERE visitor_id = ? ORDER BY award",
  )
    .bind(visitor)
    .all<{ award: string }>();
  return results.map((row) => row.award);
}

function deps(visitorId: string | null, overrides: Partial<Deps> = {}): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    fetch: () => Promise.reject(new Error("no outside calls")),
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId,
    access: undefined,
    ...overrides,
  };
}

function pullRequest(headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}/vault/pull`, {
    method: "POST",
    headers: {
      Origin: BASE,
      Cookie: `__Host-vid=${A}`,
      "User-Agent": BROWSER,
      ...headers,
    },
  });
}

async function vaultHtml(visitorId: string | null, query = ""): Promise<string> {
  const response = await route(new Request(`${BASE}/vault${query}`), deps(visitorId));
  expect(response.status).toBe(200);
  return (await response.text()).replace(/\s+/g, " ");
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

describe("pulling the lever", () => {
  it("gives one free pull a day and puts the card in the dossier", async () => {
    const first = await pullLever(env.DB, A, NOW, RECEIPT);
    expect(first).toMatchObject({ ok: true, kind: "daily", card: { id: "the-moons-receipt" } });
    expect(await pullLever(env.DB, A, NOW + 60, SOCK)).toEqual({ ok: false });
    expect(await pullsOf(A)).toEqual([
      { kind: "daily", card: "the-moons-receipt", day: Math.floor(NOW / 86_400) },
    ]);
    expect(await awardsOf(A)).toEqual(["vault:the-moons-receipt"]);
    const { results } = await env.DB.prepare("SELECT codename FROM agents").all();
    expect(results).toHaveLength(1);
  });

  it("opens a new free pull at midnight UTC", async () => {
    await pullLever(env.DB, A, NOW, RECEIPT);
    const nextDay = await pullLever(env.DB, A, TOMORROW, SOCK);
    expect(nextDay).toMatchObject({ ok: true, kind: "daily" });
    expect(await awardsOf(A)).toEqual(["vault:left-sock-of-atlantis", "vault:the-moons-receipt"]);
  });

  it("keeps each agent's daily pull separate", async () => {
    await pullLever(env.DB, A, NOW, RECEIPT);
    expect(await pullLever(env.DB, B, NOW, SOCK)).toMatchObject({ ok: true, kind: "daily" });
  });

  it("allows only one free pull when the lever is pressed twice at once", async () => {
    const results = await Promise.all([
      pullLever(env.DB, A, NOW, RECEIPT),
      pullLever(env.DB, A, NOW, SOCK),
      pullLever(env.DB, A, NOW, SOCK),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(await pullsOf(A)).toHaveLength(1);
  });

  it("gives one bonus pull per bonus commendation, after the free one", async () => {
    await grantAwards(env.DB, A, ["first-contact", "town-crier"], NOW);
    expect(await pullLever(env.DB, A, NOW, SOCK)).toMatchObject({ kind: "daily" });
    expect(await pullLever(env.DB, A, NOW, SOCK)).toMatchObject({ ok: true, kind: "bonus" });
    expect(await pullLever(env.DB, A, NOW, RECEIPT)).toMatchObject({ ok: true, kind: "bonus" });
    expect(await pullLever(env.DB, A, NOW, RECEIPT)).toEqual({ ok: false });
    // Bonus pulls don't come back the next day; the free one does.
    expect(await pullLever(env.DB, A, TOMORROW, SOCK)).toMatchObject({ kind: "daily" });
    expect(await pullLever(env.DB, A, TOMORROW, SOCK)).toEqual({ ok: false });
  });

  it("never gives a pull for buying: Acquirer and exhibit cards earn none", async () => {
    await grantAwards(env.DB, A, ["acquirer", "card:alien-paperclip"], NOW);
    await pullLever(env.DB, A, NOW, SOCK);
    expect(await pullLever(env.DB, A, NOW, SOCK)).toEqual({ ok: false });
  });

  it("spends a bonus pull only once under concurrent presses", async () => {
    await grantAwards(env.DB, A, ["recruiter"], NOW);
    await pullLever(env.DB, A, NOW, SOCK);
    const results = await Promise.all([
      pullLever(env.DB, A, NOW, SOCK),
      pullLever(env.DB, A, NOW, SOCK),
      pullLever(env.DB, A, NOW, SOCK),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("mends a dossier grant that failed after an earlier pull", async () => {
    await pullLever(env.DB, A, NOW, RECEIPT);
    await env.DB.prepare("DELETE FROM awards").run();
    await pullLever(env.DB, A, TOMORROW, SOCK);
    expect(await awardsOf(A)).toEqual(["vault:left-sock-of-atlantis", "vault:the-moons-receipt"]);
  });

  it("draws from the secure generator", () => {
    const value = secureUint32();
    expect(Number.isInteger(value) && value >= 0 && value < 2 ** 32).toBe(true);
  });
});

describe("reading the vault", () => {
  it("shows a fresh agent a ready free pull and nothing pulled", async () => {
    for (const visitor of [A, null]) {
      const state = await readVault(env.DB, visitor, NOW);
      expect(state).toEqual({
        dailyReady: true,
        bonusLeft: 0,
        bonusEarned: 0,
        latest: undefined,
        owned: new Set(),
      });
    }
  });

  it("knows what's left, the latest pull, and duplicates", async () => {
    await grantAwards(env.DB, A, ["case-closed"], NOW);
    await pullLever(env.DB, A, NOW, RECEIPT);
    let state = await readVault(env.DB, A, NOW);
    expect(state).toMatchObject({ dailyReady: false, bonusLeft: 1, bonusEarned: 1 });
    expect(state.latest).toMatchObject({ kind: "daily", duplicate: false, pulledAt: NOW });
    expect(state.latest?.card.id).toBe("the-moons-receipt");

    await pullLever(env.DB, A, NOW + 1, RECEIPT);
    state = await readVault(env.DB, A, NOW + 1);
    expect(state).toMatchObject({ dailyReady: false, bonusLeft: 0 });
    expect(state.latest).toMatchObject({ kind: "bonus", duplicate: true });
    expect([...state.owned]).toEqual(["the-moons-receipt"]);
    expect((await readVault(env.DB, A, TOMORROW)).dailyReady).toBe(true);
  });

  it("skips a pulled card the vault no longer has", async () => {
    await pullLever(env.DB, A, NOW, SOCK);
    await env.DB.prepare("UPDATE vault_pulls SET card = 'retired-card'").run();
    expect((await readVault(env.DB, A, NOW)).latest).toBeUndefined();
  });
});

describe("POST /vault/pull", () => {
  it("pulls and sends the agent back to see what came out", async () => {
    const response = await route(pullRequest(), deps(A, { randomUint32: () => RECEIPT }));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/vault?opened=1#latest-pull");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await pullsOf(A)).toEqual([expect.objectContaining({ card: "the-moons-receipt" })]);
  });

  it("goes back to the vault without pulling when there are none left", async () => {
    await route(pullRequest(), deps(A));
    const again = await route(pullRequest(), deps(A));
    expect(again.headers.get("Location")).toBe("/vault");
    expect(await pullsOf(A)).toHaveLength(1);
  });

  it("refuses another site's form", async () => {
    const response = await route(pullRequest({ Origin: "https://evil.example" }), deps(A));
    expect(response.status).toBe(403);
    expect(await pullsOf(A)).toEqual([]);
  });

  it("accepts a same-site form with no Origin header", async () => {
    const request = pullRequest();
    request.headers.delete("Origin");
    expect((await route(request, deps(A))).status).toBe(303);
    expect(await pullsOf(A)).toHaveLength(1);
  });

  it("doesn't pull for a visitor without the cookie yet, or a bot", async () => {
    const noCookie = pullRequest();
    noCookie.headers.delete("Cookie");
    for (const [request, visitor] of [
      [noCookie, A],
      [pullRequest({ Cookie: `__Host-vid=${B}` }), A],
      [pullRequest({ "User-Agent": "Googlebot/2.1" }), A],
      [pullRequest(), null],
    ] as const) {
      const response = await route(request, deps(visitor));
      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe("/vault");
    }
    const { results } = await env.DB.prepare("SELECT * FROM vault_pulls").all();
    expect(results).toEqual([]);
  });

  it("draws with the secure generator by default", async () => {
    expect((await route(pullRequest(), deps(A))).status).toBe(303);
    expect(await pullsOf(A)).toHaveLength(1);
  });
});

describe("GET /vault", () => {
  it("offers a new agent their free pull, the posted odds, and sealed cards", async () => {
    const html = await vaultHtml(A);
    expect(html).toContain("<h1>The Vault</h1>");
    expect(html).toContain("Your free pull for today is ready.");
    expect(html).toContain('<form class="lever" method="post" action="/vault/pull">');
    expect(html).toContain("Vault card V-004 · Rare · Still in the vault");
    expect(html).toContain(
      '<th scope="row">The Moon&#39;s Receipt</th> <td>Rare</td> <td class="num">10%</td>',
    );
    expect(html).toContain("Nothing you buy earns a pull or changes the odds.");
    expect(html).toContain(
      "First Contact, Case Closed, Town Crier, Recruiter, Regular, Made, Fixer, Kingpin",
    );
    expect(html).toContain("You've earned 0 of 8.");
    expect(html).not.toContain("latest-pull");
    // Our own reel script only, and the reel's card names for it to spin through.
    expect(html).toContain('<script src="/assets/vault.js" defer></script>');
    expect(html).toContain(
      'data-reel="[&quot;The Left Sock of Atlantis&quot;,&quot;The Yeti&#39;s Library Card&quot;,&quot;A Jar of Pre-Owned Thunder&quot;,&quot;The Moon&#39;s Receipt&quot;]"',
    );
    expect(html).toContain('<meta name="robots" content="noindex" />');
  });

  it("shows the pull's result with its secret file, opening only right after a pull", async () => {
    await pullLever(env.DB, A, NOW, RECEIPT);
    const opened = await vaultHtml(A, "?opened=1");
    expect(opened).toContain('class="latest-pull opening"');
    expect(opened).toContain("The vault creaks open…");
    expect(opened).toContain("Vault card V-004 · Rare · New to your file");
    expect(opened).toContain("Line three reads “tides (assorted).”");
    expect(opened).toContain("Vault card V-004 · Rare · Collected");
    expect(opened).toContain("The lever is locked until tomorrow.");
    expect(opened).toContain("opens in 9 hours, at midnight UTC.");
    expect(opened).not.toContain('<form class="lever"');
    const later = await vaultHtml(A);
    expect(later).toContain('class="latest-pull"');
    expect(later).not.toContain("opening");
  });

  it("says when a pull was a duplicate, and offers bonus pulls", async () => {
    await grantAwards(env.DB, A, ["first-contact", "case-closed"], NOW);
    await pullLever(env.DB, A, NOW, SOCK);
    await pullLever(env.DB, A, NOW, SOCK);
    const html = await vaultHtml(A);
    expect(html).toContain("· Duplicate");
    expect(html).toContain("files it in triplicate");
    expect(html).toContain("You've used today's free pull.</strong> You also have 1 bonus pull.");
    expect(html).toContain('<form class="lever"');
    expect(html).toContain("You've earned 2 of 8.");
    await pullLever(env.DB, A, TOMORROW, RECEIPT);
    await env.DB.prepare("DELETE FROM vault_pulls WHERE kind = 'bonus'").run();
    const nextDay = await route(
      new Request(`${BASE}/vault`),
      deps(A, { nowSeconds: () => TOMORROW }),
    );
    const text = (await nextDay.text()).replace(/\s+/g, " ");
    expect(text).toContain("You've used today's free pull.</strong> You also have 2 bonus pulls.");
  });

  it("is linked from every page's header, and the Fine Print mentions pulls", async () => {
    const home = await (await route(new Request(`${BASE}/`), deps(A))).text();
    expect(home).toContain('<a href="/vault">The Vault</a>');
    const fine = (await (await route(new Request(`${BASE}/disclaimer`), deps(A))).text()).replace(
      /\s+/g,
      " ",
    );
    expect(fine).toContain("or pull the vault lever, we keep them and your pulls");
  });

  it("shows vault cards in the dossier", async () => {
    await pullLever(env.DB, A, NOW, RECEIPT);
    const response = await route(new Request(`${BASE}/dossier`), deps(A));
    const html = (await response.text()).replace(/\s+/g, " ");
    expect(html).toContain("<strong>The Moon&#39;s Receipt</strong> (collected)");
    expect(html).toContain(
      "<strong>The Left Sock of Atlantis</strong> (still in the vault): Common.",
    );
    expect(html).toContain(`1 of ${String(TOTAL_AWARDS)} commendations.`);
  });
});

describe("the vault in the Ledger", () => {
  it("counts pullers, pulls, bonus pulls, and agents who came back another day", async () => {
    const empty = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(empty.vault).toEqual({ pullers: 0, pulls: 0, bonusPulls: 0, returners: 0 });

    await grantAwards(env.DB, A, ["recruiter"], NOW);
    await pullLever(env.DB, A, NOW, SOCK);
    await pullLever(env.DB, A, NOW, SOCK);
    await pullLever(env.DB, A, TOMORROW, SOCK);
    await pullLever(env.DB, B, NOW, SOCK);
    const ledger = await readLedger(env.DB, 30, TOMORROW, "allegedly.example");
    expect(ledger.vault).toEqual({ pullers: 2, pulls: 4, bonusPulls: 1, returners: 1 });
  });
});

describe("D1 schema (migrations/0007_vault.sql)", () => {
  const insert = (values: Record<string, string | number>) => {
    const row = {
      visitor_id: A,
      day: 1,
      kind: "daily",
      card: "the-moons-receipt",
      pulled_at: NOW,
      ...values,
    };
    const names = Object.keys(row);
    return env.DB.prepare(
      `INSERT INTO vault_pulls (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
    )
      .bind(...Object.values(row))
      .run();
  };

  beforeEach(async () => {
    await grantAwards(env.DB, A, ["first-contact"], NOW);
  });

  it("allows one daily pull per agent per day, and any number of bonus pulls", async () => {
    await insert({});
    await expect(insert({})).rejects.toThrow(/UNIQUE/);
    await insert({ kind: "bonus" });
    await insert({ kind: "bonus" });
    await insert({ day: 2 });
  });

  it("rejects pulls from nobody, of no kind, or with no card", async () => {
    await expect(insert({ visitor_id: B })).rejects.toThrow(/FOREIGN KEY/);
    await expect(insert({ kind: "paid" })).rejects.toThrow(/CHECK/);
    await expect(insert({ card: "" })).rejects.toThrow(/CHECK/);
    await expect(insert({ day: -1 })).rejects.toThrow(/CHECK/);
  });
});
