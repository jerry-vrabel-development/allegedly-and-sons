/**
 * What search engines read first: robots.txt says where not to go, and the
 * sitemap lists every page worth indexing. Both are built from the catalog and
 * the path constants, so a new exhibit appears in the sitemap with no edit here.
 *
 * Addresses use the origin the request came in on, as item pages' canonical
 * links do, so the files are right on any host the shop is served from.
 */

import { CATALOG } from "../core/catalog";
import {
  BROADCAST_PATH,
  BUREAU_PATH,
  CHECKOUT_PREFIX,
  DISCLAIMER_PATH,
  DISPATCH_PATH,
  DOSSIER_PATH,
  EVENTS_PATH,
  HOME_PATH,
  SHARE_PREFIX,
  SITEMAP_PATH,
  STREAK_PREFIX,
  THANKS_PATH,
  VAULT_PATH,
  WEBHOOK_PATH,
  itemPathFor,
} from "../core/paths";
import { escapeHtml } from "./html";

/**
 * Where crawlers are asked not to go: the private ledger and personal pages,
 * checkout, share links (which record a click), form posts and the webhook.
 * None of them is a page a search result should lead to.
 */
export const DISALLOWED: readonly string[] = [
  BUREAU_PATH,
  DOSSIER_PATH,
  VAULT_PATH,
  THANKS_PATH,
  DISPATCH_PATH,
  EVENTS_PATH,
  WEBHOOK_PATH,
  CHECKOUT_PREFIX,
  SHARE_PREFIX,
  STREAK_PREFIX,
];

/** The text of robots.txt: everything is open except the paths above. */
export function robotsTxt(origin: string): string {
  const lines = [
    "User-agent: *",
    ...DISALLOWED.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${origin}${SITEMAP_PATH}`,
    "",
  ];
  return lines.join("\n");
}

/** The pages worth indexing: the front door, the Broadcast, the Fine Print, every exhibit. */
export function sitemapPaths(): readonly string[] {
  return [
    HOME_PATH,
    BROADCAST_PATH,
    DISCLAIMER_PATH,
    ...CATALOG.map((item) => itemPathFor(item.slug)),
  ];
}

/** The text of sitemap.xml, in the sitemaps.org format. */
export function sitemapXml(origin: string): string {
  const urls = sitemapPaths().map(
    (path) => `  <url><loc>${escapeHtml(`${origin}${path}`)}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

const CACHE = "public, max-age=3600";

export function robotsResponse(origin: string): Response {
  return new Response(robotsTxt(origin), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": CACHE },
  });
}

export function sitemapResponse(origin: string): Response {
  return new Response(sitemapXml(origin), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": CACHE },
  });
}
