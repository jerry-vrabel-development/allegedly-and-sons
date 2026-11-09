/**
 * The Bureau Dispatch in D1 (design note 0007): one-time links, confirmed
 * registrations, recovery and unsubscribing. Addresses are never logged.
 */

import { codenameFor } from "../core/dossier";
import {
  confirmEmail,
  DISPATCH_CONFIRM_PATH,
  DISPATCH_RECOVER_PATH,
  DISPATCH_UNSUBSCRIBE_PATH,
  hexFrom,
  LIMITS,
  recoverEmail,
  TOKEN,
  TOKEN_BYTES,
  TOKEN_LIFETIME,
  UNSUBSCRIBE_BYTES,
  UNSUBSCRIBE_TOKEN,
  type OutgoingEmail,
  type TokenPurpose,
} from "../core/dispatch";

export interface Registration {
  readonly email: string;
  readonly status: "confirmed" | "unsubscribed";
}

/** SHA-256 of a token, as hex: the only form a token is stored in. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return hexFrom(new Uint8Array(digest));
}

function randomHex(bytes: number): string {
  return hexFrom(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** A visitor's registration, if they've confirmed one. */
export async function readRegistration(
  db: D1Database,
  visitorId: string | null,
): Promise<Registration | undefined> {
  if (visitorId === null) return undefined;
  const row = await db
    .prepare("SELECT email, status FROM dispatch_agents WHERE visitor_id = ?")
    .bind(visitorId)
    .first<{ email: string; status: string }>();
  if (row === null) return undefined;
  return { email: row.email, status: row.status === "unsubscribed" ? "unsubscribed" : "confirmed" };
}

export type LinkRequest =
  | { readonly outcome: "sent"; readonly purpose: TokenPurpose; readonly email: OutgoingEmail }
  | { readonly outcome: "already" | "limited" };

/**
 * Someone typed `email` into the form on `requester`'s browser. Decides what
 * to send: a confirmation link for a new address (or the requester's own
 * unsubscribed one), a recovery link if the address belongs to another file,
 * or nothing (already registered here, or over a limit). The caller sends
 * the email after responding, and always shows the same page.
 */
export async function requestLink(
  db: D1Database,
  input: {
    readonly email: string;
    readonly requester: string;
    readonly nowSeconds: number;
    readonly origin: string;
    readonly postalAddress: string;
  },
): Promise<LinkRequest> {
  const { email, requester, nowSeconds: now } = input;
  const results = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM dispatch_tokens WHERE email = ?1 AND created_at > ?3) AS by_email,
           (SELECT COUNT(*) FROM dispatch_tokens WHERE requested_by = ?2 AND created_at > ?4) AS by_browser,
           (SELECT COUNT(*) FROM dispatch_tokens WHERE created_at > ?3) AS today`,
      )
      .bind(email, requester, now - 86_400, now - 3_600),
    db
      .prepare("SELECT visitor_id, status, unsubscribe_token FROM dispatch_agents WHERE email = ?")
      .bind(email),
  ]);
  const [[counts], [owner]] = results.map((result) => result.results) as [
    [Record<string, unknown>],
    [Record<string, unknown>?],
  ];
  if (
    Number(counts["by_email"]) >= LIMITS.perEmailPerDay ||
    Number(counts["by_browser"]) >= LIMITS.perBrowserPerHour ||
    Number(counts["today"]) >= LIMITS.perDay
  ) {
    return { outcome: "limited" };
  }

  const registered =
    owner === undefined
      ? undefined
      : {
          visitorId: String(owner["visitor_id"]),
          confirmed: owner["status"] === "confirmed",
          unsubscribeToken: String(owner["unsubscribe_token"]),
        };
  if (registered?.visitorId === requester && registered.confirmed) return { outcome: "already" };

  // The address belongs to another file: offer to bring that file here.
  const recover = registered !== undefined && registered.visitorId !== requester;
  const purpose: TokenPurpose = recover ? "recover" : "confirm";
  const token = randomHex(TOKEN_BYTES);
  await db
    .prepare(
      `INSERT INTO dispatch_tokens
         (token_hash, purpose, visitor_id, requested_by, email, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      await sha256Hex(token),
      purpose,
      recover ? registered.visitorId : requester,
      requester,
      email,
      now,
      now + TOKEN_LIFETIME[purpose],
    )
    .run();

  if (!recover) {
    const link = `${input.origin}${DISPATCH_CONFIRM_PATH}?t=${token}`;
    return { outcome: "sent", purpose, email: confirmEmail(email, link, input.postalAddress) };
  }
  const link = `${input.origin}${DISPATCH_RECOVER_PATH}?t=${token}`;
  const unsubscribeUrl = `${input.origin}${DISPATCH_UNSUBSCRIBE_PATH}?u=${registered.unsubscribeToken}`;
  return {
    outcome: "sent",
    purpose,
    email: recoverEmail(email, link, input.postalAddress, unsubscribeUrl),
  };
}

/**
 * Uses a one-time link: marks it used, if it's real, unused, unexpired and
 * for this purpose, in one statement, so it can't be used twice.
 */
async function useToken(
  db: D1Database,
  token: string,
  purpose: TokenPurpose,
  now: number,
): Promise<{ visitorId: string; email: string } | undefined> {
  if (!TOKEN.test(token)) return undefined;
  const row = await db
    .prepare(
      `UPDATE dispatch_tokens SET used_at = ?1
       WHERE token_hash = ?2 AND purpose = ?3 AND used_at IS NULL AND expires_at > ?1
       RETURNING visitor_id, email`,
    )
    .bind(now, await sha256Hex(token), purpose)
    .first<{ visitor_id: string; email: string }>();
  return row === null ? undefined : { visitorId: row.visitor_id, email: row.email };
}

/** Whose file a used link opens, and whether it was a recovery. */
export interface Opened {
  readonly visitorId: string;
  readonly recovered: boolean;
}

/**
 * Confirms a registration from its link. If the address was registered to
 * another file in the meantime, opens that file instead (a recovery).
 */
export async function confirmRegistration(
  db: D1Database,
  token: string,
  now: number,
): Promise<Opened | undefined> {
  const used = await useToken(db, token, "confirm", now);
  if (used === undefined) return undefined;
  const owner = await db
    .prepare("SELECT visitor_id FROM dispatch_agents WHERE email = ?")
    .bind(used.email)
    .first<{ visitor_id: string }>();
  if (owner !== null && owner.visitor_id !== used.visitorId) {
    return { visitorId: owner.visitor_id, recovered: true };
  }
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO agents (visitor_id, codename, created_at) VALUES (?, ?, ?)")
      .bind(used.visitorId, codenameFor(used.visitorId), now),
    db
      .prepare(
        `INSERT INTO dispatch_agents
           (visitor_id, email, status, confirmed_at, unsubscribed_at, unsubscribe_token)
         VALUES (?, ?, 'confirmed', ?, NULL, ?)
         ON CONFLICT (visitor_id) DO UPDATE SET
           email = excluded.email, status = 'confirmed',
           confirmed_at = excluded.confirmed_at, unsubscribed_at = NULL`,
      )
      .bind(used.visitorId, used.email, now, randomHex(UNSUBSCRIBE_BYTES)),
  ]);
  return { visitorId: used.visitorId, recovered: false };
}

/** Opens a registered file from a recovery link. */
export async function recoverFile(
  db: D1Database,
  token: string,
  now: number,
): Promise<Opened | undefined> {
  const used = await useToken(db, token, "recover", now);
  return used === undefined ? undefined : { visitorId: used.visitorId, recovered: true };
}

/** Unsubscribes the registration with this token. Returns whether one changed. */
export async function unsubscribe(db: D1Database, token: string, now: number): Promise<boolean> {
  if (!UNSUBSCRIBE_TOKEN.test(token)) return false;
  const result = await db
    .prepare(
      `UPDATE dispatch_agents SET status = 'unsubscribed', unsubscribed_at = ?
       WHERE unsubscribe_token = ? AND status = 'confirmed'`,
    )
    .bind(now, token)
    .run();
  return result.meta.changes > 0;
}

/** Counts for the Ledger. Never addresses. */
export interface DispatchCounts {
  /** Registered and receiving mail, right now. */
  readonly registered: number;
  /** Unsubscribed, right now. */
  readonly unsubscribed: number;
  /** Confirmation links used in the period. */
  readonly confirmations: number;
  /** Recovery links used in the period. */
  readonly recoveries: number;
}

export function dispatchCountsQuery(db: D1Database, since: number): D1PreparedStatement {
  return db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM dispatch_agents WHERE status = 'confirmed') AS registered,
         (SELECT COUNT(*) FROM dispatch_agents WHERE status = 'unsubscribed') AS unsubscribed,
         (SELECT COUNT(*) FROM dispatch_tokens
           WHERE purpose = 'confirm' AND used_at IS NOT NULL AND used_at >= ?1) AS confirmations,
         (SELECT COUNT(*) FROM dispatch_tokens
           WHERE purpose = 'recover' AND used_at IS NOT NULL AND used_at >= ?1) AS recoveries`,
    )
    .bind(since);
}
