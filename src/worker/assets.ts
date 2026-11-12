/**
 * The shop's static files: the stylesheet, our own scripts (scripts.ts) and
 * each exhibit's art and the link-preview card. All public and cacheable; none carries a cookie.
 */

import { SHARE_CARD_PATH, STYLESHEET_PATH } from "../core/paths";
import { ART } from "./art";
import { scriptResponse } from "./scripts";
import { SHARE_CARD_BASE64 } from "./share-card.generated";
import { SITE_CSS } from "./styles";

/** The link-preview card's JPEG bytes, decoded once when the Worker starts. */
const SHARE_CARD = Uint8Array.from(atob(SHARE_CARD_BASE64), (char) => char.charCodeAt(0));

const ART_PATH = /^\/assets\/art\/([a-z0-9-]+)\.svg$/;

/** The response for a static file's path, or undefined if it isn't one. */
export function assetResponse(pathname: string): Response | undefined {
  if (pathname === STYLESHEET_PATH) {
    return new Response(SITE_CSS, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }
  if (pathname === SHARE_CARD_PATH) {
    return new Response(SHARE_CARD, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
    });
  }
  const script = scriptResponse(pathname);
  if (script !== undefined) return script;

  const artSlug = ART_PATH.exec(pathname)?.[1];
  const svg = artSlug === undefined ? undefined : ART[artSlug];
  if (svg === undefined) return undefined;
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
