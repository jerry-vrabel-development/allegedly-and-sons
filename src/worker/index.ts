import { findItem } from "../core/catalog";
import { ART } from "./art";
import type { SafeHtml } from "./html";
import { disclaimerPage, homePage, itemPage, notFoundPage, STYLESHEET_PATH } from "./pages";
import { withSecurityHeaders } from "./security-headers";
import { SITE_CSS } from "./styles";

const TEXT = "text/plain; charset=utf-8";
const ITEM_PATH = /^\/items\/([a-z0-9-]+)$/;
const ART_PATH = /^\/assets\/art\/([a-z0-9-]+)\.svg$/;

/** Pages may change often while the shop is a prototype, so browsers revalidate. */
function page(body: SafeHtml, status = 200): Response {
  return new Response(body.value, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

/** Routes a request. Kept separate from `fetch` so it stays easy to test. */
export function route(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.\n", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Content-Type": TEXT },
    });
  }

  const { pathname, origin } = new URL(request.url);

  switch (pathname) {
    case "/":
      return page(homePage());
    case "/disclaimer":
      return page(disclaimerPage());
    case STYLESHEET_PATH:
      return new Response(SITE_CSS, {
        headers: {
          "Content-Type": "text/css; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    case "/healthz":
      return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const slug = ITEM_PATH.exec(pathname)?.[1];
  const item = slug === undefined ? undefined : findItem(slug);
  if (item) return page(itemPage(item, origin));

  const artSlug = ART_PATH.exec(pathname)?.[1];
  const svg = artSlug === undefined ? undefined : ART[artSlug];
  if (svg !== undefined) {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return page(notFoundPage(), 404);
}

export default {
  fetch(request): Response {
    return withSecurityHeaders(route(request));
  },
} satisfies ExportedHandler<Env>;
