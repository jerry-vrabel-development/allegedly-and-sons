/**
 * Recording analytics events (design note 0001) in D1.
 *
 * Analytics must never break or slow a page. Events are written after the
 * response is sent (`waitUntil`), and a failed write is logged and dropped.
 * Log lines name the event only; the event itself is in D1.
 */

import type { Item } from "../core/catalog";
import {
  countryFrom,
  isAutomated,
  isPrefetch,
  parseEvent,
  referrerHostFrom,
  utmValue,
} from "../core/analytics";

export interface AnalyticsDeps {
  readonly db: D1Database;
  /** Current time, Unix seconds. Injected so tests control the clock. */
  readonly nowSeconds: () => number;
  /** Lets work finish after the response is sent (the Worker's ctx.waitUntil). */
  readonly waitUntil: (promise: Promise<unknown>) => void;
}

/**
 * Validates and stores one event. Returns whether it was stored. Never throws:
 * an invalid event is dropped and a database error is logged.
 */
export async function recordEvent(db: D1Database, candidate: unknown): Promise<boolean> {
  const event = parseEvent(candidate);
  if (event === undefined) {
    console.warn("analytics: dropped an invalid event");
    return false;
  }
  try {
    await db
      .prepare(
        `INSERT INTO analytics_events
           (event, item_slug, ts, visitor_id, referrer_host, country, utm_source, utm_campaign)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        event.event,
        event.itemSlug,
        event.ts,
        event.visitorId,
        event.referrerHost,
        event.country,
        event.utmSource,
        event.utmCampaign,
      )
      .run();
    return true;
  } catch {
    console.error(`analytics: could not record ${event.event}`);
    return false;
  }
}

/**
 * Whether a request for an item page counts as a view: a real GET (not HEAD),
 * not a prefetch or prerender, from a browser that doesn't say it's a bot.
 * The user agent is only read here, never stored.
 */
export function countsAsView(request: Request): boolean {
  return (
    request.method === "GET" &&
    !isPrefetch(request.headers) &&
    !isAutomated(request.headers.get("User-Agent"))
  );
}

/** Records `item_viewed` for an item page, after the response is sent. */
export function recordItemView(request: Request, item: Item, deps: AnalyticsDeps): void {
  if (!countsAsView(request)) return;
  const { searchParams } = new URL(request.url);
  deps.waitUntil(
    recordEvent(deps.db, {
      event: "item_viewed",
      itemSlug: item.slug,
      ts: deps.nowSeconds(),
      visitorId: null, // The visitor cookie arrives in the next PR.
      referrerHost: referrerHostFrom(request.headers.get("Referer")),
      country: countryFrom(request.cf?.country),
      utmSource: utmValue(searchParams.get("utm_source")),
      utmCampaign: utmValue(searchParams.get("utm_campaign")),
    }),
  );
}
