/**
 * Reading and setting the visitor cookie (src/core/visitor.ts has the rules).
 */

import {
  visitorCookie,
  visitorIdFrom,
  visitorIdFromCookie,
  VISITOR_ID_BYTES,
} from "../core/visitor";

/** This request's visitor id: the cookie's, or a fresh random one. */
export function visitorIdFor(request: Request): string {
  return (
    visitorIdFromCookie(request.headers.get("Cookie")) ??
    visitorIdFrom(crypto.getRandomValues(new Uint8Array(VISITOR_ID_BYTES)))
  );
}

/**
 * Whether a response may carry the visitor cookie: only HTML pages, and only
 * ones no shared cache may store. Static files (CSS, art) are public and
 * cacheable, so a cookie on them could be handed to other visitors; JSON,
 * redirects and webhook replies don't need it.
 */
export function mayCarryVisitorCookie(response: Response): boolean {
  const type = response.headers.get("Content-Type") ?? "";
  const cache = response.headers.get("Cache-Control") ?? "";
  return type.startsWith("text/html") && /\b(private|no-store)\b/.test(cache);
}

/**
 * Sets (or refreshes) the visitor cookie on a page, so it lasts a year from
 * the latest visit. Other responses are returned unchanged.
 */
export function withVisitorCookie(response: Response, visitorId: string): Response {
  if (!mayCarryVisitorCookie(response)) return response;
  const withCookie = new Response(response.body, response);
  withCookie.headers.append("Set-Cookie", visitorCookie(visitorId));
  return withCookie;
}
