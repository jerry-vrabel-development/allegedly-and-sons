/**
 * The first-party visitor cookie (design note 0001, C2).
 *
 * One cookie, set by our own Worker, holding a random id and nothing else. It
 * lets the shop recognize a returning visitor and follow one visitor's path
 * from a view to a share to a purchase. The id travels to Stripe as the
 * Checkout Session's client_reference_id, and the webhook stores it on the
 * order, which is what links a sale to the visits before it.
 */

import { VISITOR_ID } from "./analytics";
import { cookieValue } from "./cookies";
import { hexFrom } from "./hex";

/**
 * The `__Host-` prefix makes browsers refuse the cookie unless it's Secure,
 * has Path=/ and no Domain, so it can't be set by or leak to any other host.
 */
export const VISITOR_COOKIE = "__Host-vid";

/** One year, in seconds. Refreshed on every page load, so it's a year from the latest visit. */
export const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

/** Bytes of randomness in a visitor id (128 bits, 32 hex characters). */
export const VISITOR_ID_BYTES = 16;

/**
 * The visitor id from a Cookie header, or undefined when there's none or it's
 * malformed. A malformed id is treated as missing, so it gets replaced.
 */
export function visitorIdFromCookie(header: string | null): string | undefined {
  const value = cookieValue(header, VISITOR_COOKIE);
  return value !== undefined && VISITOR_ID.test(value) ? value : undefined;
}

/** A visitor id from random bytes (from crypto.getRandomValues). Pure, so tests can pin it. */
export function visitorIdFrom(bytes: Uint8Array): string {
  if (bytes.length !== VISITOR_ID_BYTES) {
    throw new RangeError(`a visitor id needs ${String(VISITOR_ID_BYTES)} random bytes`);
  }
  return hexFrom(bytes);
}

/**
 * The Set-Cookie value for a visitor id. HttpOnly: page scripts never need it.
 * SameSite=Lax: sent when someone follows a link to the shop (so a share's
 * visit is recognized), but not on cross-site posts.
 */
export function visitorCookie(id: string): string {
  return `${VISITOR_COOKIE}=${id}; Max-Age=${String(VISITOR_COOKIE_MAX_AGE)}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}
