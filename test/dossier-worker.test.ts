import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordEvent } from "../src/worker/analytics";
import { grantAwards, readDossier } from "../src/worker/dossier";
import { route, type Deps } from "../src/worker/index";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const NOW = 1762531200;

const event = (overrides: Record<string, unknown>) => ({
  event: "item_viewed",
  itemSlug: "alien-paperclip",
  ts: NOW,
  visitorId: A,
  referrerHost: null,
  country: null,
  utmSource: null,
  utmCampaign: null,
  ref: null,
  channel: null,
  readDepth: null,
  ...overrides,
});

async function awardsOf(visitor: string): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT award FROM awards WHERE visitor_id = ? ORDER BY award",
  )
    .bind(visitor)
    .all<{ award: string }>();
  return results.map((row) => row.award);
}

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

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
    env.DB.prepare("DELETE FROM analytics_events"),
  ]);
});

describe("granting from recorded events", () => {
  it("opens a dossier on the first award and fills it as events arrive", async () => {
    await recordEvent(env.DB, event({ event: "lore_expanded", readDepth: "opened" }));
    await recordEvent(env.DB, event({ event: "lore_expanded", readDepth: "finished" }));
    await recordEvent(env.DB, event({ event: "share_clicked", ref: "0a1b2c3d4e", channel: "x" }));
    expect(await awardsOf(A)).toEqual([
      "card:alien-paperclip",
      "case-closed",
      "first-contact",
      "town-crier",
    ]);
    const dossier = await readDossier(env.DB, A);
    expect(dossier?.codename).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(dossier?.awards).toHaveLength(4);
  });

  it("never awards anything twice", async () => {
    for (let i = 0; i < 3; i++) {
      await recordEvent(env.DB, event({ event: "lore_expanded", readDepth: "finished" }));
    }
    expect(await awardsOf(A)).toEqual(["card:alien-paperclip", "case-closed"]);
  });

  it("gives the sharer Recruiter when someone else arrives through their share", async () => {
    await recordEvent(
      env.DB,
      event({ event: "share_clicked", ref: "0a1b2c3d4e", channel: "reddit" }),
    );
    await recordEvent(env.DB, event({ event: "shared_visit", ref: "0a1b2c3d4e", visitorId: B }));
    expect(await awardsOf(A)).toEqual(["recruiter", "town-crier"]);
    expect(await awardsOf(B)).toEqual([]);
  });

  it("doesn't let a sharer recruit themselves", async () => {
    await recordEvent(
      env.DB,
      event({ event: "share_clicked", ref: "0a1b2c3d4e", channel: "reddit" }),
    );
    await recordEvent(env.DB, event({ event: "shared_visit", ref: "0a1b2c3d4e" }));
    expect(await awardsOf(A)).toEqual(["town-crier"]);
  });

  it("credits nobody for a share it can't find, or a visitor without a cookie", async () => {
    await recordEvent(env.DB, event({ event: "shared_visit", ref: "ffffffffff", visitorId: B }));
    await recordEvent(
      env.DB,
      event({ event: "lore_expanded", readDepth: "opened", visitorId: null }),
    );
    const { results } = await env.DB.prepare("SELECT * FROM agents").all();
    expect(results).toEqual([]);
  });

  it("keeps the event even if granting fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const db = new Proxy(env.DB, {
      get(target, prop, receiver) {
        if (prop === "batch") return () => Promise.reject(new Error("D1 hiccup"));
        const value: unknown = Reflect.get(target, prop, receiver);
        return typeof value === "function"
          ? (value as (...a: unknown[]) => unknown).bind(target)
          : value;
      },
    });
    const stored = await recordEvent(db, event({ event: "lore_expanded", readDepth: "opened" }));
    expect(stored).toBe(true);
    expect(error).toHaveBeenCalledWith("dossier: could not grant for lore_expanded");
    error.mockRestore();
  });

  it("ignores unknown award ids", async () => {
    await grantAwards(env.DB, A, ["admin", "card:xenoclip"], NOW);
    expect(await readDossier(env.DB, A)).toBeUndefined();
  });
});

describe("GET /dossier", () => {
  async function page(visitorId: string | null): Promise<string> {
    const response = await route(new Request(`${BASE}/dossier`), deps(visitorId));
    expect(response.status).toBe(200);
    return (await response.text()).replace(/\s+/g, " ");
  }

  it("welcomes a visitor with no file yet, and shows what there is to earn", async () => {
    const html = await page(A);
    expect(html).toContain("No file on you yet.");
    expect(html).toContain("<strong>Recruiter</strong> (locked): Bring someone in.");
    expect(html).toContain("Card AS-0001 · Sealed");
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain("<script");
  });

  it("shows an agent their number, codename, rank, cards and badges", async () => {
    await recordEvent(env.DB, event({ event: "lore_expanded", readDepth: "finished" }));
    const html = await page(A);
    expect(html).toMatch(/Agent No\. 000\d/);
    expect(html).toMatch(/Codename: [A-Z][a-z]+ [A-Z][a-z]+/);
    expect(html).toContain("<strong>Rank: Junior Field Agent.</strong> 2 of 8 commendations.");
    expect(html).toContain("1 more for Field Agent.");
    expect(html).toContain("Card AS-0001 · Collected");
    expect(html).toContain("Card AS-0002 · Sealed");
    expect(html).toContain("<strong>Case Closed</strong> (earned)");
  });

  it("salutes an agent who has everything", async () => {
    await grantAwards(
      env.DB,
      A,
      [
        "first-contact",
        "case-closed",
        "town-crier",
        "recruiter",
        "acquirer",
        "card:alien-paperclip",
        "card:second-best-quill",
        "card:viking-participation-trophy",
      ],
      NOW,
    );
    const html = await page(A);
    expect(html).toContain("Rank: Director of Improbable Acquisitions.");
    expect(html).toContain("There is no higher rank.");
  });

  it("shows nobody's file without a visitor id", async () => {
    expect(await page(null)).toContain("No file on you yet.");
  });
});
