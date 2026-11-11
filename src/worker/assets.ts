/**
 * The shop's static files: the stylesheet, our own scripts (scripts.ts) and
 * each exhibit's art. All public and cacheable; none carries a cookie.
 */

import { STYLESHEET_PATH } from "../core/paths";
import { ART } from "./art";
import { scriptResponse } from "./scripts";
import { SITE_CSS } from "./styles";

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
