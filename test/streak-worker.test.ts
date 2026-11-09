import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { grantAwards } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { readStreak } from "../src/worker/streak";
import { pullLever, readVault } from "../src/worker/vault";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const DAY = 86_400;
/** 2026-11-09 15:00 UTC: 9 hours before the next free pull. */
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const TODAY = Math.floor(NOW / DAY);

/** Records free pulls for `visitor` on these vault days (relative to today). */
async function pulledOn(visitor: string, ...daysAgo: number[]): Promise<void> {
  await grantAwards(env.DB, visitor, ["first-contact"], NOW);
  await env.DB.batch(
    daysAgo.map((ago) =>
      env.DB.prepare(
        `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
         VALUES (?, ?, 'daily', 'left-sock-of-atlantis', ?)`,
      ).bind(visitor, TODAY - ago, NOW - ago * DAY),
    ),
  );
}

function deps(visitorId: string | null, now = NOW): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    fetch: () => Promise.reject(new Error("no outside calls")),
    db: env.DB,
    nowSeconds: () => now,
    waitUntil: () => undefined,
    visitorId,
    access: undefined,
  };
}

async function html(path: string, visitor: string | null): Promise<string> {
  const response = await route(new Request(`${BASE}${path}`), deps(visitor));
  return (await response.text()).replace(/\s+/g, " ");
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

describe("streaks from the lever", () => {
  it("count only free pulls, one per day", async () => {
    await pulledOn(A, 1);
    await pullLever(env.DB, A, NOW, 0); // today's free pull
    await pullLever(env.DB, A, NOW, 0); // a bonus pull (first-contact): no extra day
    expect(await readStreak(env.DB, A, NOW)).toMatchObject({ status: "safe", days: 2 });
  });

  it("grant a milestone badge, and its bonus pull, the moment it's reached", async () => {
    await pulledOn(A, 2, 1);
    await pullLever(env.DB, A, NOW, 0);
    const { results } = await env.DB.prepare(
      "SELECT award FROM awards WHERE visitor_id = ? AND award LIKE 'streak-%'",
    )
      .bind(A)
      .all<{ award: string }>();
    expect(results.map((row) => row.award)).toEqual(["streak-regular"]);
    // first-contact and streak-regular: two bonus pulls.
    expect((await readVault(env.DB, A, NOW)).bonusLeft).toBe(2);
  });

  it("have none for a visitor without a cookie", async () => {
    expect((await readStreak(env.DB, null, NOW)).status).toBe("none");
  });
});

describe("the streak panel", () => {
  it("explains streaks to someone who hasn't started one", async () => {
    const page = await html("/vault", A);
    expect(page).toContain('<h2 id="streak-heading">Duty streak</h2>');
    expect(page).toContain("milestones at 3, 7, 14, 30 days each earn a badge and a bonus pull");
    expect(page).not.toContain("Pull the lever before it's gone");
  });

  it("names the stakes and the real time left when today's pull is owed", async () => {
    await pulledOn(A, 4, 3, 2, 1);
    for (const path of ["/vault", "/dossier"]) {
      const page = await html(path, A);
      expect(page).toContain(
        "<strong>Your 4-day streak dies at midnight UTC: 9 hours left.</strong> Walk away now and it dies with you.",
      );
      expect(page).toContain("Freezes held: 0 of 2.");
      expect(page).toContain("3 more days to Made.");
    }
    expect(await html("/dossier", A)).toContain(
      `<a class="button" href="/vault">Pull the lever before it's gone</a>`,
    );
    expect(await html("/vault", A)).not.toContain("Pull the lever before it's gone");
  });

  it("says when freezes covered missed days", async () => {
    await pulledOn(A, ...Array.from({ length: 14 }, (_, i) => i + 3)); // 14 days, then 2 missed
    expect(await html("/vault", A)).toContain("You missed 2 days. Freezes covered for you.");
    await env.DB.prepare("DELETE FROM vault_pulls WHERE day = ?")
      .bind(TODAY - 3)
      .run();
    await pulledOn(A, 2); // 13 days, then 1 missed: one freeze covers it
    expect(await html("/vault", A)).toContain("You missed yesterday. A freeze covered for you.");
  });

  it("celebrates a milestone on the day it's reached", async () => {
    await pulledOn(A, 2, 1, 0);
    const page = await html("/vault", A);
    expect(page).toContain("Duty streak: 3 days.</strong> Safe until midnight UTC.");
    expect(page).toContain("<strong>Day 3: you're Regular.</strong> A bonus pull is yours.");
    expect(page).toContain("4 more days to Made.");
  });

  it("salutes an agent past every milestone", async () => {
    await pulledOn(A, ...Array.from({ length: 31 }, (_, i) => i));
    expect(await html("/vault", A)).toContain("Every milestone taken.");
  });

  it("says plainly when a streak is dead", async () => {
    await pulledOn(A, 5, 4, 3);
    const page = await html("/dossier", A);
    expect(page).toContain("<strong>Your 3-day streak is dead.</strong> Nobody held the line.");
    expect(page).toContain("Pull the lever before it's gone");
  });

  it("uses singular words for one day", async () => {
    await pulledOn(A, 1);
    expect(await html("/vault", A)).toContain("Your 1-day streak dies at midnight UTC");
  });
});

describe("streaks in the Ledger", () => {
  it("shows alive, safe, dead and lengths", async () => {
    await pulledOn(A, 2, 1, 0);
    await pulledOn(B, 6, 5);
    const ledger = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(ledger.streaks).toEqual({
      alive: 1,
      safe: 1,
      byLength: [0, 1, 0, 0, 0],
      dead: 1,
      longest: 3,
      freezesSpent: 0,
    });
  });
});
