/**
 * Plain http never reaches a page. Cloudflare already redirects at the edge
 * ("Always Use HTTPS"); this is the Worker's own backstop, so the shop stays
 * https-only even if that setting is ever switched off.
 *
 * Local addresses are left alone, because `wrangler dev` and the browser tests
 * run on http://localhost.
 */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** A redirect to the https address of the same page, or null when none is needed. */
export function httpsRedirect(url: URL): Response | null {
  if (url.protocol !== "http:" || LOCAL_HOSTS.has(url.hostname)) {
    return null;
  }
  const secure = new URL(url);
  secure.protocol = "https:";
  // 308 keeps the method and body, so a stray http POST is not turned into a GET.
  return new Response(null, { status: 308, headers: { Location: secure.toString() } });
}
