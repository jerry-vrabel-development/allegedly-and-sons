/**
 * Recording analytics events (design note 0001) in D1.
 *
 * Analytics must never break or slow a page. Events are written after the
 * response is sent (`waitUntil`), and a failed write is logged and dropped.
 * Log lines name the event only; the event itself is in D1.
 */

import type { Item } from "../core/catalog";
import { landingFromCookie, landingFromRequest } from "../core/landing";
import { grantForEvent } from "./dossier";
import { REF, REF_PARAM, type Network } from "../core/share";
import {
  countryFrom,
  type ReadBeacon,
  isAutomated,
  isPrefetch,
  parseEvent,
  referrerHostFrom,
} from "../core/analytics";

export interface AnalyticsDeps {
  readonly db: D1Database;
  /** Current time, Unix seconds. Injected so tests control the clock. */
  readonly nowSeconds: () => number;
  /** Lets work finish after the response is sent (the Worker's ctx.waitUntil). */
  readonly waitUntil: (promise: Promise<unknown>) => void;
  /** The visitor cookie's id for this request (existing or just minted), or null. */
  readonly visitorId: string | null;
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
           (event, item_slug, ts, visitor_id, referrer_host, country, utm_source, utm_campaign,
            ref, channel, read_depth)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        event.ref,
        event.channel,
        event.readDepth,
      )
      .run();
  } catch {
    console.error(`analytics: could not record ${event.event}`);
    return false;
  }
  // Badges and cards: granted only from events we recorded ourselves.
  try {
    await grantForEvent(db, event);
  } catch {
    console.error(`dossier: could not grant for ${event.event}`);
  }
  return true;
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

/**
 * Records `checkout_started` once Stripe has given us a Checkout Session, after
 * the response is sent. Called only on success, so failed attempts don't count.
 */
export function recordCheckoutStarted(request: Request, item: Item, deps: AnalyticsDeps): void {
  deps.waitUntil(
    recordEvent(deps.db, {
      event: "checkout_started",
      itemSlug: item.slug,
      ts: deps.nowSeconds(),
      visitorId: deps.visitorId,
      referrerHost: null,
      country: countryFrom(request.cf?.country),
      utmSource: null,
      utmCampaign: null,
      ref: null,
      channel: null,
      readDepth: null,
    }),
  );
}

/** Records `item_viewed` for an item page, after the response is sent. */
export function recordItemView(request: Request, item: Item, deps: AnalyticsDeps): void {
  if (!countsAsView(request)) return;
  const url = new URL(request.url);
  const { searchParams } = url;
  // Credit what brought this visit in: this request's own outside source, or
  // the one remembered from where the visit landed (see core/landing.ts).
  const landing =
    landingFromRequest(url, request.headers.get("Referer"), url.hostname) ??
    landingFromCookie(request.headers.get("Cookie"));
  deps.waitUntil(
    recordEvent(deps.db, {
      event: "item_viewed",
      itemSlug: item.slug,
      ts: deps.nowSeconds(),
      visitorId: deps.visitorId,
      referrerHost: landing?.referrerHost ?? null,
      country: countryFrom(request.cf?.country),
      utmSource: landing?.utmSource ?? null,
      utmCampaign: landing?.utmCampaign ?? null,
      ref: null,
      channel: null,
      readDepth: null,
    }),
  );
  // Arrived through a shared link: tie the visit to that share.
  const ref = searchParams.get(REF_PARAM);
  if (ref !== null && REF.test(ref)) {
    deps.waitUntil(
      recordEvent(deps.db, {
        event: "shared_visit",
        itemSlug: item.slug,
        ts: deps.nowSeconds(),
        visitorId: deps.visitorId,
        referrerHost: referrerHostFrom(request.headers.get("Referer")),
        country: countryFrom(request.cf?.country),
        utmSource: null,
        utmCampaign: null,
        ref,
        channel: null,
        readDepth: null,
      }),
    );
  }
}

/**
 * Records share_clicked for a share button press, after the response is sent.
 * Only real browser GETs count (link-preview bots fetch share links too).
 */
export function recordShareClicked(
  request: Request,
  item: Item,
  network: Network,
  ref: string,
  deps: AnalyticsDeps,
): void {
  if (!countsAsView(request)) return;
  deps.waitUntil(
    recordEvent(deps.db, {
      event: "share_clicked",
      itemSlug: item.slug,
      ts: deps.nowSeconds(),
      visitorId: deps.visitorId,
      referrerHost: null,
      country: countryFrom(request.cf?.country),
      utmSource: null,
      utmCampaign: null,
      ref,
      channel: network,
      readDepth: null,
    }),
  );
}

/** How long a repeat of the same read (visitor, item, depth) is ignored, in seconds. */
export const READ_DEDUPE_SECONDS = 30 * 60;

/** The most story reads one visitor may record per hour; the rest are dropped. */
export const READS_PER_VISITOR_PER_HOUR = 60;

/**
 * Records a story read from the item page's script, unless it's a repeat of
 * one this visitor recorded in the last half hour, or the visitor is over the
 * hourly limit. Repeats and floods are dropped quietly: they'd only inflate
 * the numbers. Returns whether a row was written.
 */
export async function recordStoryRead(
  request: Request,
  beacon: ReadBeacon,
  deps: AnalyticsDeps,
): Promise<boolean> {
  const now = deps.nowSeconds();
  if (deps.visitorId !== null) {
    const recent = await deps.db
      .prepare(
        `SELECT
           COUNT(*) AS hour,
           SUM(item_slug = ? AND read_depth = ? AND ts > ?) AS repeats
         FROM analytics_events
         WHERE visitor_id = ? AND event = 'lore_expanded' AND ts > ?`,
      )
      .bind(beacon.itemSlug, beacon.depth, now - READ_DEDUPE_SECONDS, deps.visitorId, now - 3600)
      .first<{ hour: number; repeats: number | null }>();
    if (
      recent !== null &&
      ((recent.repeats ?? 0) > 0 || recent.hour >= READS_PER_VISITOR_PER_HOUR)
    ) {
      return false;
    }
  }
  return recordEvent(deps.db, {
    event: "lore_expanded",
    itemSlug: beacon.itemSlug,
    ts: now,
    visitorId: deps.visitorId,
    referrerHost: null,
    country: countryFrom(request.cf?.country),
    utmSource: null,
    utmCampaign: null,
    ref: null,
    channel: null,
    readDepth: beacon.depth,
  });
}
