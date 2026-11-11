/**
 * The small pieces every route handler shares: how a page, a JSON answer and
 * a redirect are sent, and the checks a form post gets before it's acted on.
 */

import { isAutomated } from "../core/analytics";
import { visitorIdFromCookie } from "../core/visitor";
import type { Deps } from "./deps";
import type { Chrome, Page } from "./pages";

export const TEXT = "text/plain; charset=utf-8";

/**
 * HTML pages are private: each one may carry this visitor's cookie, so no
 * shared cache may keep one and hand it to someone else. They also say
 * no-transform: nothing between us and the browser may rewrite them (for
 * example, Cloudflare can't inject a script), so the Fine Print's account of
 * what runs in your browser stays true.
 */
export const PAGE_CACHE = "private, max-age=0, must-revalidate, no-transform";

/** For pages about one buyer's checkout: never cached, never rewritten. */
export const PRIVATE_PAGE_CACHE = "no-store, no-transform";

/**
 * An HTML page on its way out. It keeps the laid-out page it was built from,
 * so the router can add a request's chrome (banner, sound) by rendering the
 * layout again, not by editing the HTML.
 */
export class PageResponse extends Response {
  readonly #page: Page;

  constructor(page: Page, status: number) {
    super(page.value, {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": PAGE_CACHE,
      },
    });
    this.#page = page;
  }

  /** This response, with its status and headers as they are now, and the chrome added. */
  withChrome(chrome: Chrome): Response {
    return new Response(this.#page.withChrome(chrome).value, this);
  }
}

/** Pages may change often while the shop is a prototype, so browsers revalidate. */
export function page(body: Page, status = 200): PageResponse {
  return new PageResponse(body, status);
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * A form post that came from our own pages. Browsers send Origin on form
 * posts; one with no Origin is allowed, as on checkout, since the cookie is
 * SameSite=Lax and isn't sent on cross-site posts anyway.
 */
export function fromOwnSite(request: Request): boolean {
  const sentFrom = request.headers.get("Origin");
  return sentFrom === null || sentFrom === new URL(request.url).origin;
}

export function forbidden(): Response {
  return new Response("Forbidden.\n", { status: 403, headers: { "Content-Type": TEXT } });
}

export function seeOther(location: string, setCookie?: string): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (setCookie !== undefined) headers.append("Set-Cookie", setCookie);
  return new Response(null, { status: 303, headers });
}

/**
 * The visitor id of a person who already has our cookie (a first visit sets
 * it), or undefined for a first visit or a bot. Actions that write anything
 * for a visitor need one.
 */
export function returningVisitor(request: Request, deps: Deps): string | undefined {
  const fromCookie = visitorIdFromCookie(request.headers.get("Cookie"));
  if (deps.visitorId === null || fromCookie !== deps.visitorId) return undefined;
  if (isAutomated(request.headers.get("User-Agent"))) return undefined;
  return deps.visitorId;
}

/** The largest form we'll read. Real ones are well under 400 bytes. */
const MAX_FORM_BYTES = 2048;

/** One field of a url-encoded form, or undefined. */
export async function formField(request: Request, name: string): Promise<string | undefined> {
  const text = await request.text();
  if (text.length > MAX_FORM_BYTES) return undefined;
  return new URLSearchParams(text).get(name) ?? undefined;
}
