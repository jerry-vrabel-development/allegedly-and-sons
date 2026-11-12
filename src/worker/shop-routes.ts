/**
 * The public shop's own routes beyond its pages: share buttons, story-read
 * beacons and the Back-Room Broadcast.
 */

import { isAutomated, parseReadBeacon } from "../core/analytics";
import { segmentAt } from "../core/broadcast";
import { findItem } from "../core/catalog";
import { isNetwork, REF_BYTES, refFrom, sharedItemUrl, shareTarget } from "../core/share";
import { recordShareClicked, recordStoryRead } from "./analytics";
import { broadcastPage } from "./broadcast-page";
import type { Deps } from "./deps";
import { page } from "./http";
import { homePage, notFoundPage } from "./pages";

/**
 * A share button: GET /share/<slug>/<network>. Mints a ref code, records the
 * share, and sends the visitor on to the network's share page (or their mail
 * app) with a link back to the item that carries the ref. Never cached: every
 * press gets its own ref.
 */
export function shareRedirect(
  request: Request,
  slug: string,
  network: string,
  origin: string,
  deps: Deps,
): Response {
  const item = findItem(slug);
  if (item === undefined || !isNetwork(network)) return page(notFoundPage(), 404);
  const ref = refFrom(crypto.getRandomValues(new Uint8Array(REF_BYTES)));
  recordShareClicked(request, item, network, ref, deps);
  const location = shareTarget(network, {
    url: sharedItemUrl(origin, item.slug, ref),
    text: `${item.name}: ${item.tagline}`,
  });
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

/** The largest story beacon we'll read. Real ones are under 100 bytes. */
const MAX_BEACON_BYTES = 1024;

/**
 * Story reads from the item page's script: POST /events with
 * {"item": "<slug>", "depth": "opened" | "finished"}. Only our own pages may
 * send them (Origin must be ours), bots are ignored, and repeats and floods
 * are dropped (see recordStoryRead). Answers 204 whether or not a row was
 * written, so a sender learns nothing from it.
 */
export async function storyRead(request: Request, deps: Deps): Promise<Response> {
  const { origin } = new URL(request.url);
  if (request.headers.get("Origin") !== origin) return new Response(null, { status: 403 });
  const text = await request.text();
  if (text.length > MAX_BEACON_BYTES) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const beacon = parseReadBeacon(body);
  if (beacon === undefined) return new Response(null, { status: 400 });
  if (!isAutomated(request.headers.get("User-Agent"))) {
    await recordStoryRead(request, beacon, deps);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

/** The real count of orders placed in the segment that is on air at `now`. */
async function soldThisSegment(deps: Deps, now: number): Promise<number> {
  const { results } = await deps.db
    .prepare("SELECT COUNT(*) AS sold FROM orders WHERE segment = ?")
    .bind(segmentAt(now).id)
    .all<{ sold: number }>();
  const [row] = results as [{ sold: number }];
  return row.sold;
}

/** The broadcast page, with the real count of orders in this segment. */
export async function broadcast(deps: Deps): Promise<Response> {
  const now = deps.nowSeconds();
  return page(broadcastPage(now, await soldThisSegment(deps, now)));
}

/** The front page: the stage shows what is on air now, with the same real count. */
export async function home(deps: Deps): Promise<Response> {
  const now = deps.nowSeconds();
  return page(homePage(now, await soldThisSegment(deps, now)));
}
