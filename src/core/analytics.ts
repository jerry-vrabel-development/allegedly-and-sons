/**
 * Analytics events (design note 0001), as pure, shared rules.
 *
 * The point is sales: which items and stories get bites, where buyers come
 * from, and which shares and campaigns pay off. Every event is validated here
 * before it's stored; anything that doesn't fit the shape exactly is dropped,
 * never "cleaned up" and kept, so junk can't skew the numbers.
 *
 * Raw IP addresses and user agents are never stored: they don't help sell
 * anything, and a table of them is only a liability. The country comes from
 * Cloudflare instead.
 */

import { findItem } from "./catalog";
import { isNetwork, REF, type Network } from "./share";

/**
 * Every event the shop records. Purchases aren't here: the orders table,
 * written only by the verified Stripe webhook, is the purchase record.
 */
export const EVENT_NAMES = [
  "item_viewed",
  "lore_expanded",
  "share_clicked",
  "shared_visit",
  "checkout_started",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface AnalyticsEvent {
  readonly event: EventName;
  /** A slug from the catalog. Events about unknown items are dropped. */
  readonly itemSlug: string;
  /** Unix seconds. */
  readonly ts: number;
  /** The first-party visitor cookie's random id, or null when there isn't one yet. */
  readonly visitorId: string | null;
  /** The referring site's host name (no path or query), or null. */
  readonly referrerHost: string | null;
  /** Two-character country code from Cloudflare, or null. */
  readonly country: string | null;
  /** utm_source from the landing URL, normalized (see `utmValue`), or null. */
  readonly utmSource: string | null;
  /** utm_campaign from the landing URL, normalized, or null. */
  readonly utmCampaign: string | null;
  /** A share's ref code: set on share_clicked and shared_visit, null otherwise. */
  readonly ref: string | null;
  /** The network a share went to: set on share_clicked only, null otherwise. */
  readonly channel: Network | null;
}

/** A DNS host name: lowercase letters, digits, dots and hyphens, at most 253 characters. */
const HOST = /^(?=.{1,253}$)[a-z0-9-]+(\.[a-z0-9-]+)*$/;

/** A visitor id: 128 random bits as 32 lowercase hex characters. */
export const VISITOR_ID = /^[0-9a-f]{32}$/;
/** Cloudflare country codes: ISO 3166-1 alpha-2, plus XX (unknown) and T1 (Tor). */
const COUNTRY = /^[A-Z][A-Z0-9]$/;
/** A normalized UTM value: lowercase letters, digits, and . _ - + only. */
const UTM = /^[a-z0-9._+-]{1,100}$/;

/** `value` is null or a string matching `pattern`. */
function nullOr(value: unknown, pattern: RegExp): value is string | null {
  return value === null || (typeof value === "string" && pattern.test(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEventName(value: unknown): value is EventName {
  return typeof value === "string" && (EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Checks an event that arrived as `unknown` and returns it only if every field
 * is exactly right. Extra fields are ignored, never stored.
 */
export function parseEvent(value: unknown): AnalyticsEvent | undefined {
  if (!isRecord(value)) return undefined;
  const {
    event,
    itemSlug,
    ts,
    visitorId,
    referrerHost,
    country,
    utmSource,
    utmCampaign,
    ref,
    channel,
  } = value;
  if (!isEventName(event)) return undefined;
  if (typeof itemSlug !== "string" || findItem(itemSlug) === undefined) return undefined;
  if (typeof ts !== "number" || !Number.isSafeInteger(ts) || ts < 0) return undefined;
  if (
    !nullOr(visitorId, VISITOR_ID) ||
    !nullOr(referrerHost, HOST) ||
    !nullOr(country, COUNTRY) ||
    !nullOr(utmSource, UTM) ||
    !nullOr(utmCampaign, UTM)
  ) {
    return undefined;
  }
  // Share fields belong to share events only, so every row means one thing:
  // share_clicked has a ref and a channel, shared_visit a ref, the rest neither.
  let shareRef: string | null = null;
  if (event === "share_clicked" || event === "shared_visit") {
    if (typeof ref !== "string" || !REF.test(ref)) return undefined;
    shareRef = ref;
  } else if (ref !== null) {
    return undefined;
  }
  let shareChannel: Network | null = null;
  if (event === "share_clicked") {
    if (!isNetwork(channel)) return undefined;
    shareChannel = channel;
  } else if (channel !== null) {
    return undefined;
  }
  return {
    event,
    itemSlug,
    ts,
    visitorId,
    referrerHost,
    country,
    utmSource,
    utmCampaign,
    ref: shareRef,
    channel: shareChannel,
  };
}

/**
 * The host name from a Referer header, or null. Only http(s) URLs count. The
 * host is what we group by ("reddit.com sends buyers"); most sites only send
 * their origin anyway, so the path isn't kept.
 */
export function referrerHostFrom(referer: string | null): string | null {
  if (referer === null) return null;
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  return HOST.test(host) ? host : null;
}

/**
 * A UTM parameter, normalized so "Bluesky", " bluesky " and "bluesky" count as
 * one source: trimmed, lowercased, spaces become hyphens. Anything else odd
 * (other punctuation, over 100 characters) gives null rather than a guess.
 */
export function utmValue(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim().toLowerCase().replace(/\s+/g, "-");
  return UTM.test(value) ? value : null;
}

/** A Cloudflare country code, or null for anything that isn't one. */
export function countryFrom(raw: unknown): string | null {
  return typeof raw === "string" && COUNTRY.test(raw) ? raw : null;
}

/**
 * User agents that announce they're automated: search crawlers, link-preview
 * fetchers (Slack, Discord, Bluesky's card fetcher), HTTP libraries and headless
 * browsers. This only catches bots that say so, so the dashboard calls the
 * result "page views," not "people."
 */
const AUTOMATED =
  /bot|crawl|spider|slurp|preview|cardyb|facebookexternalhit|embedly|curl|wget|python|httpclient|okhttp|go-http|node-fetch|axios|headless|lighthouse|phantomjs/i;

/** True when a user agent is missing or says it's automated. */
export function isAutomated(userAgent: string | null): boolean {
  return userAgent === null || userAgent.trim() === "" || AUTOMATED.test(userAgent);
}

/**
 * True when the browser is only fetching the page ahead of time (link
 * prefetch, speculation rules, prerender). The visitor may never see it.
 */
export function isPrefetch(headers: Headers): boolean {
  const purpose = `${headers.get("Sec-Purpose") ?? ""} ${headers.get("Purpose") ?? ""} ${
    headers.get("X-Moz") ?? ""
  }`;
  return /prefetch|prerender/i.test(purpose);
}
