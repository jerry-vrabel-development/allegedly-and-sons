import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import worker, { route, type Deps } from "../src/worker/index";
import { grantAwards } from "../src/worker/dossier";
import { STRICT_CSP, VAULT_CSP } from "../src/worker/security-headers";
import { VAULT_JS } from "../src/worker/client-scripts.generated";
import { testEnv } from "./test-env";
import { VAULT_SCRIPT_PATH } from "../src/core/paths";
import { VAULT_CARDS } from "../src/core/vault";

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";

function deps(): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    fetch: () => Promise.reject(new Error("no outside calls")),
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId: A,
    access: undefined,
    randomUint32: () => 99, // The Moon's Receipt
  };
}

function pull(headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}/vault/pull`, {
    method: "POST",
    headers: {
      Origin: BASE,
      Cookie: `__Host-vid=${A}`,
      "User-Agent": BROWSER,
      Accept: "application/json",
      ...headers,
    },
  });
}

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

describe("the Vault script", () => {
  it("is served from our origin as JavaScript", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}${VAULT_SCRIPT_PATH}`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
    expect(await response.text()).toBe(VAULT_JS);
  });

  it("is allowed on the Vault, for our own origin and nobody else's", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}/vault`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.headers.get("Content-Security-Policy")).toBe(VAULT_CSP);
    // Scripts and requests: ours only. (form-action still allows Stripe's
    // checkout, for the buy-back form; that's a redirect, not a script.)
    const directives = new Map(
      VAULT_CSP.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1).join(" ")]),
    );
    expect(directives.get("script-src")).toBe("'self'");
    expect(directives.get("connect-src")).toBe("'self'");
    expect(directives.get("default-src")).toBe("'none'");
    expect(VAULT_CSP).not.toContain("unsafe");
  });

  // The reel's rules (the answer, the spin, the wording) are unit tested in
  // reel.test.ts and the whole thing is watched in real browsers (e2e); these
  // check the bundle itself.
  it("does nothing risky: no eval, no innerHTML, no other hosts, nothing stored", () => {
    expect(VAULT_JS).not.toMatch(
      /eval\(|new Function|innerHTML|outerHTML|document\.write|sessionStorage|localStorage|https?:\/\//,
    );
    expect(VAULT_JS).not.toMatch(/^\s*(import|export)\s/m);
  });

  it("carries only the reel: no catalog, no card secrets, nothing it doesn't use", () => {
    expect(VAULT_JS.length).toBeLessThan(10_000);
    for (const card of VAULT_CARDS) {
      expect(VAULT_JS).not.toContain(card.name);
      expect(VAULT_JS).not.toContain(card.secretFile);
    }
  });

  it("plays its sounds through the shop-wide module, and runs silently without it", () => {
    expect(VAULT_JS).toContain("if (window.BureauSound) window.BureauSound.play(name);");
    expect(VAULT_JS).not.toMatch(/AudioContext|createOscillator|sound-toggle/);
  });

  it("falls back to the plain form when it can't run, and never posts a pull twice", () => {
    expect(VAULT_JS).toContain('typeof fetch !== "function"');
    expect(VAULT_JS).toContain('.showModal !== "function"');
    expect(VAULT_JS).not.toContain("form.submit()");
    expect(VAULT_JS.match(/fetch\(form\.action/g)).toHaveLength(1);
  });
});

describe("POST /vault/pull for the script", () => {
  it("answers with the card, whether it's new, and what's left", async () => {
    await grantAwards(env.DB, A, ["first-contact"], NOW);
    const response = await route(pull(), deps());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      kind: "daily",
      card: {
        id: "the-moons-receipt",
        designation: "V-004",
        name: "The Moon's Receipt",
        rarity: "Rare",
        summary: "Proof of purchase. Returns not accepted.",
        secretFile: expect.stringContaining("tides (assorted)") as string,
      },
      duplicate: false,
      next: { dailyReady: false, bonusLeft: 1 },
      streakDays: 1,
      milestone: null,
    });
    const bonus = await (await route(pull(), deps())).json<Record<string, unknown>>();
    expect(bonus).toMatchObject({ kind: "bonus", duplicate: true, next: { bonusLeft: 0 } });
  });

  it("announces a streak milestone on the free pull that reaches it", async () => {
    await grantAwards(env.DB, A, ["first-contact"], NOW);
    const today = Math.floor(NOW / 86_400);
    await env.DB.batch(
      [2, 1].map((ago) =>
        env.DB.prepare(
          `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
           VALUES (?, ?, 'daily', 'left-sock-of-atlantis', ?)`,
        ).bind(A, today - ago, NOW - ago * 86_400),
      ),
    );
    const body = await (await route(pull(), deps())).json<Record<string, unknown>>();
    expect(body).toMatchObject({
      streakDays: 3,
      milestone: { days: 3, badge: "streak-regular", name: "Regular" },
      // first-contact and Regular: two bonus pulls.
      next: { bonusLeft: 2 },
    });
    // A bonus pull the same day celebrates nothing new.
    const bonus = await (await route(pull(), deps())).json<Record<string, unknown>>();
    expect(bonus).toMatchObject({ kind: "bonus", milestone: null });
  });

  it("says why, in JSON, when there's nothing to pull or no file yet", async () => {
    await route(pull(), deps());
    const none = await route(pull(), deps());
    expect(none.status).toBe(409);
    expect(await none.json()).toEqual({ ok: false, reason: "none-left" });
    const noFile = await route(pull({ Cookie: "" }), deps());
    expect(noFile.status).toBe(403);
    expect(await noFile.json()).toEqual({ ok: false, reason: "no-file" });
  });
});
