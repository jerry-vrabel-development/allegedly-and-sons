/**
 * Plain http never reaches a page. Cloudflare already redirects at the edge
 * ("Always Use HTTPS"); this is the Worker's own backstop, so the shop stays
 * https-only even if that setting is ever switched off.
 *
 * The decision rests on Cloudflare's own `CF-Visitor` header, which says which
 * scheme the visitor really used. The request URL is not enough: under
 * `wrangler dev` the Worker sees the shop's hostname over http for every local
 * request, and redirecting those would loop. Local runs send no `CF-Visitor`,
 * so they are never redirected.
 */

/** True when Cloudflare reports that the visitor connected over plain http. */
function visitorUsedHttp(headers: Headers): boolean {
  try {
    const visitor: unknown = JSON.parse(headers.get("CF-Visitor") ?? "null");
    return (
      typeof visitor === "object" &&
      visitor !== null &&
      "scheme" in visitor &&
      visitor.scheme === "http"
    );
  } catch {
    return false;
  }
}

/** A redirect to the https address of the same page, or null when none is needed. */
export function httpsRedirect(url: URL, headers: Headers): Response | null {
  if (url.protocol !== "http:" || !visitorUsedHttp(headers)) {
    return null;
  }
  const secure = new URL(url);
  secure.protocol = "https:";
  // 308 keeps the method and body, so a stray http POST is not turned into a GET.
  return new Response(null, { status: 308, headers: { Location: secure.toString() } });
}
