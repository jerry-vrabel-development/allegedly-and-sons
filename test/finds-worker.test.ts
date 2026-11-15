import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { TOTAL_AWARDS } from "../src/core/dossier";
import { FINDS, findAwardId, findById } from "../src/core/finds";
import { grantAwards } from "../src/worker/dossier";
import { escapeHtml } from "../src/worker/html";
import { route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const NOW = Date.UTC(2026, 10, 15, 15) / 1000;
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";

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

function press(id: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}/find/${id}`, {
    method: "POST",
    headers: { Origin: BASE, Cookie: `__Host-vid=${A}`, "User-Agent": BROWSER, ...headers },
  });
}

async function awardsOf(visitor: string): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT award FROM awards WHERE visitor_id = ? ORDER BY award",
  )
    .bind(visitor)
    .all<{ award: string }>();
  return results.map((row) => row.award);
}

async function text(path: string, visitorId: string | null = A): Promise<string> {
  const response = await route(new Request(`${BASE}${path}`), deps(visitorId));
  expect(response.status).toBe(200);
  return (await response.text()).replace(/\s+/g, " ");
}

beforeEach(async () => {
  await env.DB.batch([env.DB.prepare("DELETE FROM awards"), env.DB.prepare("DELETE FROM agents")]);
});

describe("POST /find/<id>", () => {
  it("records the find, opens the dossier and sends the agent to see who they met", async () => {
    const response = await route(press("loose-brick"), deps(A));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/find/loose-brick");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await awardsOf(A)).toEqual(["find:loose-brick"]);
    const agent = await env.DB.prepare("SELECT agent_number FROM agents WHERE visitor_id = ?")
      .bind(A)
      .first();
    expect(agent).not.toBeNull();
  });

  it("is idempotent: pressing it again changes nothing", async () => {
    await route(press("parcel"), deps(A));
    const first = await env.DB.prepare("SELECT earned_at FROM awards").first<{
      earned_at: number;
    }>();
    const again = await route(press("parcel"), { ...deps(A), nowSeconds: () => NOW + 500 });
    expect(again.status).toBe(303);
    expect(await awardsOf(A)).toEqual(["find:parcel"]);
    expect(
      (await env.DB.prepare("SELECT earned_at FROM awards").first<{ earned_at: number }>())
        ?.earned_at,
    ).toBe(first?.earned_at);
  });

  it("records nothing for a first visit, and sends them back where they were", async () => {
    const response = await route(press("loose-brick", { Cookie: "" }), deps(null));
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/vault");
    expect(
      (await env.DB.prepare("SELECT COUNT(*) AS n FROM awards").first<{ n: number }>())?.n,
    ).toBe(0);
  });

  it("records nothing for a cookie that isn't this visitor's, or for a bot", async () => {
    const mismatched = await route(press("parcel"), deps(B));
    expect(mismatched.headers.get("Location")).toBe("/disclaimer");
    const bot = await route(press("parcel", { "User-Agent": "Googlebot/2.1" }), deps(A));
    expect(bot.headers.get("Location")).toBe("/disclaimer");
    expect(await awardsOf(A)).toEqual([]);
    expect(await awardsOf(B)).toEqual([]);
  });

  it("refuses a post from another site", async () => {
    const response = await route(press("parcel", { Origin: "https://evil.example" }), deps(A));
    expect(response.status).toBe(403);
    expect(await awardsOf(A)).toEqual([]);
  });

  it("is not found for a find that doesn't exist", async () => {
    const response = await route(press("loupe"), deps(A));
    expect(response.status).toBe(404);
    expect(await awardsOf(A)).toEqual([]);
  });
});

describe("GET /find/<id>", () => {
  it("shows who you met, in their words, once you've found them", async () => {
    await grantAwards(env.DB, A, [findAwardId("loose-brick")], NOW);
    const page = await text("/find/loose-brick");
    const find = findById("loose-brick");
    expect(find).toBeDefined();
    expect(page).toContain("You found something");
    expect(page).toContain("Contact: Loupe");
    expect(page).toContain(escapeHtml(find?.reaction ?? ""));
    expect(page).toContain('<a href="/dossier#contacts">Book of Contacts</a>');
    expect(page).toContain('<a href="/vault">Back to the Vault</a>');
    expect(page).toContain('<meta name="robots" content="noindex"');
  });

  it("is not found until you've found it, and for unknown finds", async () => {
    for (const [path, visitor] of [
      ["/find/loose-brick", A],
      ["/find/loose-brick", null],
      ["/find/loupe", A],
    ] as const) {
      const response = await route(new Request(`${BASE}${path}`), deps(visitor));
      expect(response.status).toBe(404);
    }
    await grantAwards(env.DB, A, [findAwardId("parcel")], NOW);
    const other = await route(new Request(`${BASE}/find/loose-brick`), deps(A));
    expect(other.status).toBe(404);
  });
});

describe("where the finds hide", () => {
  const PLACES = [
    ["loose-brick", "/vault"],
    ["parcel", "/disclaimer"],
    ["misfiled-card", "/dossier"],
    ["lost-stamp", "/disclaimer"],
    ["ticker-tape", "/broadcast"],
    ["fallen-feather", "/"],
  ] as const;

  it("hides every find on one page, as a plain form with no script", async () => {
    expect(PLACES.map(([id]) => id).sort()).toEqual(FINDS.map((find) => find.id).sort());
    for (const [id, path] of PLACES) {
      const page = await text(path);
      const here = PLACES.filter(([, other]) => other === path).length;
      expect(page.match(/class="drop"/g)).toHaveLength(here);
      expect(page).toContain(`action="/find/${id}"`);
      expect(page).toContain(`>${findById(id)?.label ?? ""}</button>`);
    }
  });

  it("sends each find's reader back to the page it hides on", () => {
    const back = Object.fromEntries(FINDS.map((find) => [find.id, find.from]));
    expect(back).toEqual({
      "loose-brick": "/vault",
      parcel: "/disclaimer",
      "misfiled-card": "/dossier",
      "lost-stamp": "/disclaimer",
      "ticker-tape": "/broadcast",
      "fallen-feather": "/",
    });
  });
});

describe("the Book of Contacts", () => {
  it("shows an unmet contact as a hint, and says so in words", async () => {
    const page = await text("/dossier");
    expect(page).toContain("Book of Contacts");
    expect(page.match(/Unmet contact<\/strong> \(not yet found\)/g)).toHaveLength(FINDS.length);
    for (const find of FINDS) expect(page).toContain(escapeHtml(find.hint));
    expect(page).not.toContain("(met)");
  });

  it("shows a met contact by name, and counts the find toward rank", async () => {
    await grantAwards(env.DB, A, [findAwardId("misfiled-card")], NOW);
    const page = await text("/dossier");
    expect(page).toContain("<strong>Ibid</strong> (met)");
    expect(page.match(/Unmet contact<\/strong>/g)).toHaveLength(FINDS.length - 1);
    expect(page).not.toContain(escapeHtml(findById("misfiled-card")?.hint ?? ""));
    expect(page).toContain(`1 of ${String(TOTAL_AWARDS)} commendations.`);
  });
});

describe("the ledger's hunt row", () => {
  it("counts agents who found something and the finds, within the period", async () => {
    await grantAwards(env.DB, A, ["find:parcel", "find:loose-brick", "first-contact"], NOW);
    await grantAwards(env.DB, B, ["find:parcel"], NOW - 10 * 86_400);
    const week = await readLedger(env.DB, 7, NOW, "allegedly.example");
    expect(week.finds).toEqual({ finders: 1, finds: 2 });
    const all = await readLedger(env.DB, 0, NOW, "allegedly.example");
    expect(all.finds).toEqual({ finders: 2, finds: 3 });
  });
});
