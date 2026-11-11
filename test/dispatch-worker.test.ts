import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OutgoingEmail } from "../src/core/dispatch";
import { grantAwards } from "../src/worker/dossier";
import { readRegistration, sha256Hex, unsubscribe } from "../src/worker/dispatch";
import { emailSender, postalAddressFrom, route, type Deps } from "../src/worker/index";
import { readLedger } from "../src/worker/ledger";
import { SOUND_SCRIPT_PATH } from "../src/core/paths";

const SOUND_TAG = `<script src="${SOUND_SCRIPT_PATH}" defer></script>`;

const BASE = "https://allegedly.example";
const A = "a".repeat(32);
const B = "b".repeat(32);
const NOW = Date.UTC(2026, 10, 9, 15) / 1000;
const BROWSER = "Mozilla/5.0 (X11; Linux x86_64) Firefox/140.0";
const ADDRESS = "PO Box 1, Chicago, IL 60626";
const JERRY = "jerry@example.com";

let sent: OutgoingEmail[];
let pending: Promise<unknown>[];
let clock: number;

function deps(visitorId: string | null, overrides: Partial<Deps> = {}): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    fetch: () => Promise.reject(new Error("no outside calls")),
    db: env.DB,
    nowSeconds: () => clock,
    waitUntil: (promise) => {
      pending.push(promise);
    },
    visitorId,
    access: undefined,
    postalAddress: ADDRESS,
    sendEmail: (email) => {
      sent.push(email);
      return Promise.resolve();
    },
    ...overrides,
  };
}

function post(
  path: string,
  body: string,
  visitor: string | null,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE,
      "User-Agent": BROWSER,
      ...(visitor === null ? {} : { Cookie: `__Host-vid=${visitor}` }),
      ...headers,
    },
  });
}

/** Registers `email` from `visitor`'s browser and waits for the email to go out. */
async function register(visitor: string, email: string, extra: Partial<Deps> = {}) {
  const response = await route(
    post("/dispatch", `email=${encodeURIComponent(email)}`, visitor),
    deps(visitor, extra),
  );
  await Promise.all(pending);
  return response;
}

/** The token in the last email's link to `path`. */
function tokenIn(email: OutgoingEmail | undefined, path: string): string {
  const match = new RegExp(`${path}\\?t=([0-9a-f]{64})`).exec(email?.text ?? "");
  if (match?.[1] === undefined) throw new Error(`no ${path} link in the email`);
  return match[1];
}

function unsubscribeTokenIn(email: OutgoingEmail | undefined): string {
  const match = /\/dispatch\/unsubscribe\?u=([0-9a-f]{32})/.exec(email?.text ?? "");
  if (match?.[1] === undefined) throw new Error("no unsubscribe link in the email");
  return match[1];
}

async function useLink(kind: "confirm" | "recover", token: string, visitor: string) {
  return route(post(`/dispatch/${kind}`, `t=${token}`, visitor), deps(visitor));
}

async function text(response: Response): Promise<string> {
  return (await response.text()).replace(/\s+/g, " ");
}

async function dossier(visitor: string, query = "", extra: Partial<Deps> = {}) {
  return text(await route(new Request(`${BASE}/dossier${query}`), deps(visitor, extra)));
}

beforeEach(async () => {
  sent = [];
  pending = [];
  clock = NOW;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM dispatch_tokens"),
    env.DB.prepare("DELETE FROM dispatch_agents"),
    env.DB.prepare("DELETE FROM vault_pulls"),
    env.DB.prepare("DELETE FROM awards"),
    env.DB.prepare("DELETE FROM agents"),
  ]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registering", () => {
  it("sends a confirmation link and stores nothing as registered until it's used", async () => {
    const response = await register(A, " Jerry@Example.com ");
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/dispatch/sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(JERRY);
    expect(sent[0]?.subject).toBe("Confirm your registration with the Bureau");
    expect(sent[0]?.text).toContain(ADDRESS);
    expect(await readRegistration(env.DB, A)).toBeUndefined();

    // Only the token's hash is stored.
    const token = tokenIn(sent[0], "/dispatch/confirm");
    const { results } = await env.DB.prepare("SELECT * FROM dispatch_tokens").all();
    expect(results).toHaveLength(1);
    expect(results[0]?.["token_hash"]).toBe(await sha256Hex(token));
    expect(JSON.stringify(results)).not.toContain(token);
  });

  it("opens the confirm link as a page with a button, and only the button confirms", async () => {
    await register(A, JERRY);
    const token = tokenIn(sent[0], "/dispatch/confirm");
    const landing = await route(new Request(`${BASE}/dispatch/confirm?t=${token}`), deps(A));
    expect(landing.status).toBe(200);
    expect(landing.headers.get("Cache-Control")).toBe("no-store, no-transform");
    const html = await text(landing);
    expect(html).toContain('<form class="dispatch-form" method="post" action="/dispatch/confirm">');
    expect(html).toContain(`<input type="hidden" name="t" value="${token}" />`);
    expect(html).toContain("Confirm my registration");
    expect(await readRegistration(env.DB, A)).toBeUndefined();

    const confirmed = await useLink("confirm", token, A);
    expect(confirmed.status).toBe(303);
    expect(confirmed.headers.get("Location")).toBe("/dossier?dispatch=confirmed#dispatch");
    expect(confirmed.headers.get("Set-Cookie")).toContain(`__Host-vid=${A};`);
    expect(await readRegistration(env.DB, A)).toEqual({ email: JERRY, status: "confirmed" });
    const agent = await env.DB.prepare("SELECT codename FROM agents WHERE visitor_id = ?")
      .bind(A)
      .first();
    expect(agent).not.toBeNull();
  });

  it("uses each link once, for its own purpose, before it expires", async () => {
    await register(A, JERRY);
    const token = tokenIn(sent[0], "/dispatch/confirm");
    expect((await useLink("recover", token, A)).status).toBe(410);
    clock = NOW + 86_400;
    expect((await useLink("confirm", token, A)).status).toBe(410);
    clock = NOW + 86_399;
    expect((await useLink("confirm", token, A)).status).toBe(303);
    const again = await useLink("confirm", token, A);
    expect(again.status).toBe(410);
    expect(await text(again)).toContain("That link has expired");
    expect((await useLink("confirm", "not-a-token", A)).status).toBe(410);
  });

  it("shows the expired page for a malformed link", async () => {
    for (const path of [
      "/dispatch/confirm?t=nope",
      "/dispatch/recover",
      "/dispatch/unsubscribe?u=1",
    ]) {
      const response = await route(new Request(`${BASE}${path}`), deps(A));
      expect(response.status).toBe(404);
      expect(await text(response)).toContain("That link has expired");
    }
  });

  it("confirms on another device too, and the file follows the link", async () => {
    await register(A, JERRY);
    const response = await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), B);
    expect(response.headers.get("Set-Cookie")).toContain(`__Host-vid=${A};`);
  });

  it("sends nothing new to an agent already registered with that address", async () => {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    const again = await register(A, JERRY);
    expect(again.headers.get("Location")).toBe("/dispatch/sent");
    expect(sent).toHaveLength(1);
  });

  it("changes an agent's address only once the new one is confirmed", async () => {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    await register(A, "new@example.com");
    expect(await readRegistration(env.DB, A)).toEqual({ email: JERRY, status: "confirmed" });
    await useLink("confirm", tokenIn(sent[1], "/dispatch/confirm"), A);
    expect(await readRegistration(env.DB, A)).toEqual({
      email: "new@example.com",
      status: "confirmed",
    });
  });

  it("turns a confirm into a recovery if someone else confirmed the address first", async () => {
    await register(A, JERRY);
    await register(B, JERRY);
    await useLink("confirm", tokenIn(sent[1], "/dispatch/confirm"), B);
    const late = await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    expect(late.headers.get("Location")).toBe("/dossier?dispatch=recovered#dispatch");
    expect(late.headers.get("Set-Cookie")).toContain(`__Host-vid=${B};`);
    expect(await readRegistration(env.DB, A)).toBeUndefined();
  });

  it("asks again, without sending, when the address isn't one", async () => {
    for (const body of ["email=not-an-address", "nothing=here", `email=${"a".repeat(3000)}`]) {
      const response = await route(post("/dispatch", body, A), deps(A));
      expect(response.headers.get("Location")).toBe("/dossier?dispatch=invalid#dispatch");
    }
    expect(sent).toEqual([]);
    expect(await dossier(A, "?dispatch=invalid")).toContain(
      "That doesn&#39;t look like an email address. Try again?",
    );
  });

  it("does nothing for a first visit, a bot, or another site's form", async () => {
    const firstVisit = post("/dispatch", `email=${JERRY}`, null);
    expect((await route(firstVisit, deps(A))).headers.get("Location")).toBe("/dossier#dispatch");
    const bot = post("/dispatch", `email=${JERRY}`, A, { "User-Agent": "Googlebot/2.1" });
    expect((await route(bot, deps(A))).headers.get("Location")).toBe("/dossier#dispatch");
    const crossSite = post("/dispatch", `email=${JERRY}`, A, { Origin: "https://evil.example" });
    expect((await route(crossSite, deps(A))).status).toBe(403);
    const crossConfirm = post("/dispatch/confirm", "t=x", A, { Origin: "https://evil.example" });
    expect((await route(crossConfirm, deps(A))).status).toBe(403);
    await Promise.all(pending);
    expect(sent).toEqual([]);
  });

  it("stays closed, sending and saving nothing, without a postal address or email binding", async () => {
    for (const closed of [{ postalAddress: undefined }, { sendEmail: undefined }]) {
      const response = await route(post("/dispatch", `email=${JERRY}`, A), deps(A, closed));
      expect(response.status).toBe(503);
      expect(await text(response)).toContain("Registration opens soon");
      expect(await dossier(A, "", closed)).toContain("Registration opens soon.");
    }
    expect(sent).toEqual([]);
    const { results } = await env.DB.prepare("SELECT * FROM dispatch_tokens").all();
    expect(results).toEqual([]);
  });

  it("logs a failed send by its code, never the address, and still answers the same", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failing = (code?: string) => ({
      sendEmail: () =>
        Promise.reject(
          code === undefined ? new Error(JERRY) : Object.assign(new Error(JERRY), { code }),
        ),
    });
    const response = await register(A, JERRY, failing("E_RECIPIENT_SUPPRESSED"));
    expect(response.headers.get("Location")).toBe("/dispatch/sent");
    await register(A, "other@example.com", failing());
    expect(error.mock.calls).toEqual([
      ["dispatch: could not send a confirm email (E_RECIPIENT_SUPPRESSED)"],
      ["dispatch: could not send a confirm email (unknown)"],
    ]);
  });
});

describe("recovering a file on another device", () => {
  async function registered(): Promise<string> {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    sent = [];
    return JERRY;
  }

  it("sends a recovery link when the address belongs to another file", async () => {
    await registered();
    await grantAwards(env.DB, A, ["case-closed"], NOW);
    const response = await register(B, JERRY);
    expect(response.headers.get("Location")).toBe("/dispatch/sent");
    expect(sent[0]?.subject).toBe("Your Bureau file, on a new device");
    expect(sent[0]?.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    const token = tokenIn(sent[0], "/dispatch/recover");
    const landing = await text(
      await route(new Request(`${BASE}/dispatch/recover?t=${token}`), deps(B)),
    );
    expect(landing).toContain("Open my file here");

    const opened = await useLink("recover", token, B);
    expect(opened.headers.get("Location")).toBe("/dossier?dispatch=recovered#dispatch");
    expect(opened.headers.get("Set-Cookie")).toContain(`__Host-vid=${A};`);
    expect(await dossier(A, "?dispatch=recovered")).toContain("Your file is open on this device.");
    expect((await useLink("recover", token, B)).status).toBe(410);
  });

  it("expires a recovery link after an hour", async () => {
    await registered();
    await register(B, JERRY);
    clock = NOW + 3_600;
    expect((await useLink("recover", tokenIn(sent[0], "/dispatch/recover"), B)).status).toBe(410);
  });
});

describe("limits", () => {
  it("sends at most 3 links a day to one address", async () => {
    for (const visitor of [A, B, "c".repeat(32), "d".repeat(32)]) await register(visitor, JERRY);
    expect(sent).toHaveLength(3);
    clock = NOW + 86_401;
    await register(A, JERRY);
    expect(sent).toHaveLength(4);
  });

  it("sends at most 3 links an hour from one browser", async () => {
    for (const n of [1, 2, 3, 4]) {
      const response = await register(A, `agent${String(n)}@example.com`);
      expect(response.headers.get("Location")).toBe("/dispatch/sent");
    }
    expect(sent).toHaveLength(3);
  });

  it("sends at most 500 links a day overall", async () => {
    const insert = env.DB.prepare(
      `INSERT INTO dispatch_tokens
         (token_hash, purpose, visitor_id, requested_by, email, created_at, expires_at)
       VALUES (?, 'confirm', ?, ?, ?, ?, ?)`,
    );
    await env.DB.batch(
      Array.from({ length: 500 }, (_, n) =>
        insert.bind(
          n.toString(16).padStart(64, "0"),
          B,
          B,
          `x${String(n)}@example.com`,
          NOW - 60,
          NOW + 3_600,
        ),
      ),
    );
    await register(A, JERRY);
    expect(sent).toEqual([]);
  });
});

describe("unsubscribing", () => {
  async function registeredToken(): Promise<string> {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    await register(B, JERRY);
    return unsubscribeTokenIn(sent[1]);
  }

  it("shows a button, and unsubscribes when it's pressed", async () => {
    const token = await registeredToken();
    const landing = await route(new Request(`${BASE}/dispatch/unsubscribe?u=${token}`), deps(B));
    const html = await text(landing);
    expect(html).toContain(`<input type="hidden" name="u" value="${token}" />`);
    expect(html).toContain(">Unsubscribe</button>");
    expect((await readRegistration(env.DB, A))?.status).toBe("confirmed");

    const done = await route(post("/dispatch/unsubscribe", `u=${token}`, B), deps(B));
    expect(done.status).toBe(200);
    expect(await text(done)).toContain("The Bureau won't send you mail any more.");
    expect(await readRegistration(env.DB, A)).toEqual({ email: JERRY, status: "unsubscribed" });
    expect(await dossier(A)).toContain("You've unsubscribed from Bureau mail.");
  });

  it("accepts a mail app's one-click POST, with no cookie or Origin", async () => {
    const token = await registeredToken();
    const oneClick = new Request(`${BASE}/dispatch/unsubscribe?u=${token}`, {
      method: "POST",
      body: "List-Unsubscribe=One-Click",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    expect((await route(oneClick, deps(null))).status).toBe(200);
    expect((await readRegistration(env.DB, A))?.status).toBe("unsubscribed");
  });

  it("refuses a malformed token, and is harmless to repeat", async () => {
    const bad = await route(post("/dispatch/unsubscribe", "u=nope", null), deps(null));
    expect(bad.status).toBe(404);
    const token = await registeredToken();
    for (let i = 0; i < 2; i++) {
      expect(
        (await route(post("/dispatch/unsubscribe", `u=${token}`, null), deps(null))).status,
      ).toBe(200);
    }
  });

  it("lets an unsubscribed agent register again, with a fresh confirmation", async () => {
    const token = await registeredToken();
    await route(post("/dispatch/unsubscribe", `u=${token}`, null), deps(null));
    sent = [];
    await register(A, JERRY);
    expect(sent[0]?.subject).toBe("Confirm your registration with the Bureau");
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    expect(await readRegistration(env.DB, A)).toEqual({ email: JERRY, status: "confirmed" });
    const row = await env.DB.prepare(
      "SELECT unsubscribed_at, unsubscribe_token FROM dispatch_agents",
    ).first<{ unsubscribed_at: number | null; unsubscribe_token: string }>();
    expect(row).toEqual({ unsubscribed_at: null, unsubscribe_token: token });
  });
});

describe("the dossier's Dispatch section", () => {
  it("invites an agent to register, with a labeled field and no script", async () => {
    const html = await dossier(A);
    expect(html).toContain('<h2 id="dispatch-heading">The Bureau Dispatch</h2>');
    expect(html).toContain('<label for="dispatch-email">Your email</label>');
    expect(html).toContain('autocomplete="email"');
    expect(html).toContain("Register with the Bureau</button>");
    // Only the shop-wide sound script (note 0011; A is in the "fx" group).
    expect(html.replace(SOUND_TAG, "")).not.toContain("<script");
  });

  it("shows a registered agent their masked address and the notice once", async () => {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    const html = await dossier(A, "?dispatch=confirmed");
    expect(html).toContain('role="status"');
    expect(html).toContain("Registration confirmed. Welcome to the Bureau, agent.");
    expect(html).toContain("Registered as <strong>j•••@example.com</strong>.");
    expect(html).toContain("<summary>Use a different address</summary>");
    expect(html).not.toContain(JERRY);
    expect(await dossier(A, "?dispatch=bogus")).not.toContain('role="status"');
  });

  it("says where to check after the form", async () => {
    const html = await text(await route(new Request(`${BASE}/dispatch/sent`), deps(A)));
    expect(html).toContain("<h1>Check your inbox</h1>");
    expect(html).toContain('<meta name="robots" content="noindex" />');
  });

  it("is described in the Fine Print", async () => {
    const html = await text(await route(new Request(`${BASE}/disclaimer`), deps(A)));
    expect(html).toContain("<h3>Correspondence</h3>");
    expect(html).toContain("We never sell it, share it, or put it in our analytics.");
  });
});

describe("the Dispatch in the Ledger", () => {
  it("counts registrations and links used, never addresses", async () => {
    await register(A, JERRY);
    await useLink("confirm", tokenIn(sent[0], "/dispatch/confirm"), A);
    await register(B, JERRY);
    await useLink("recover", tokenIn(sent[1], "/dispatch/recover"), B);
    await register(B, "b@example.com");
    await useLink("confirm", tokenIn(sent[2], "/dispatch/confirm"), B);
    const token = unsubscribeTokenIn(sent[1]);
    await route(post("/dispatch/unsubscribe", `u=${token}`, null), deps(null));
    const ledger = await readLedger(env.DB, 30, NOW, "allegedly.example");
    expect(ledger.dispatch).toEqual({
      registered: 1,
      unsubscribed: 1,
      confirmations: 2,
      recoveries: 1,
    });
    expect(JSON.stringify(ledger)).not.toContain("@");
  });
});

describe("wiring", () => {
  it("sends from the Dispatch address with replies to the Bureau", async () => {
    const calls: unknown[] = [];
    const send = emailSender({
      send: (message: unknown) => {
        calls.push(message);
        return Promise.resolve({ messageId: "m1" });
      },
    });
    await send?.({ to: JERRY, subject: "s", text: "t" });
    await send?.({ to: JERRY, subject: "s", text: "t", headers: { "List-Id": "x" } });
    expect(calls).toEqual([
      {
        from: { email: "dispatch@allegedlyandsons.com", name: "The Bureau Dispatch" },
        replyTo: "bureau@allegedlyandsons.com",
        to: JERRY,
        subject: "s",
        text: "t",
      },
      expect.objectContaining({ headers: { "List-Id": "x" } }),
    ]);
    expect(emailSender(undefined)).toBeUndefined();
  });

  it("reads the postal address, treating blank as unset", () => {
    expect(postalAddressFrom({ DISPATCH_POSTAL_ADDRESS: ` ${ADDRESS} ` })).toBe(ADDRESS);
    expect(postalAddressFrom({ DISPATCH_POSTAL_ADDRESS: " " })).toBeUndefined();
    expect(postalAddressFrom({})).toBeUndefined();
  });

  it("treats a missing link token as expired", async () => {
    expect((await route(post("/dispatch/confirm", "", A), deps(A))).status).toBe(410);
    expect((await route(post("/dispatch/unsubscribe", "", null), deps(null))).status).toBe(404);
    expect(await unsubscribe(env.DB, "not-a-token", NOW)).toBe(false);
  });

  it("has no registration for a visitor without a cookie", async () => {
    expect(await readRegistration(env.DB, null)).toBeUndefined();
  });
});

describe("D1 schema (migrations/0008_dispatch.sql)", () => {
  const insert = (values: Record<string, string | number | null>) => {
    const row = {
      visitor_id: A,
      email: JERRY,
      status: "confirmed",
      confirmed_at: NOW,
      unsubscribe_token: "0".repeat(32),
      ...values,
    };
    const names = Object.keys(row);
    return env.DB.prepare(
      `INSERT INTO dispatch_agents (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`,
    )
      .bind(...Object.values(row))
      .run();
  };

  beforeEach(async () => {
    await grantAwards(env.DB, A, ["first-contact"], NOW);
    await grantAwards(env.DB, B, ["first-contact"], NOW);
  });

  it("keeps one address per file and one file per address", async () => {
    await insert({});
    await expect(insert({ unsubscribe_token: "1".repeat(32) })).rejects.toThrow(/UNIQUE/);
    await expect(insert({ visitor_id: B, unsubscribe_token: "1".repeat(32) })).rejects.toThrow(
      /UNIQUE/,
    );
  });

  it("rejects mixed-case or malformed addresses, unknown statuses and odd tokens", async () => {
    await expect(insert({ email: "Jerry@example.com" })).rejects.toThrow(/CHECK/);
    await expect(insert({ email: "nobody" })).rejects.toThrow(/CHECK/);
    await expect(insert({ status: "pending" })).rejects.toThrow(/CHECK/);
    await expect(insert({ unsubscribe_token: "short" })).rejects.toThrow(/CHECK/);
    await expect(insert({ visitor_id: "c".repeat(32) })).rejects.toThrow(/FOREIGN KEY/);
  });
});
