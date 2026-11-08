/**
 * Where a visit came from (design note 0001, ledger fixes).
 *
 * Only item pages record views, so a visitor who lands on the home page from
 * Reddit and then clicks an item would otherwise look like they came from our
 * own site. The landing cookie remembers what brought this visit in (the
 * outside site, or the campaign tags) until the browser closes, and item
 * views credit that instead. It holds a host name and campaign tags, nothing
 * about the person.
 */

import { isHostName, isUtmValue, referrerHostFrom, utmValue } from "./analytics";

export interface Landing {
  /** The outside site that sent the visit, or null. */
  readonly referrerHost: string | null;
  readonly utmSource: string | null;
  readonly utmCampaign: string | null;
}

/** A session cookie: no Max-Age, so it's gone when the browser closes. */
export const LANDING_COOKIE = "__Host-landing";

/** Separates the three parts; never valid in a host name or a UTM value. */
const SEPARATOR = "~";

/**
 * The source this request itself carries: campaign tags in the URL, or a
 * Referer from another site. Undefined for a click within our own site or a
 * visit with no referrer at all, which shouldn't replace what's remembered.
 */
export function landingFromRequest(
  url: URL,
  referer: string | null,
  ownHost: string,
): Landing | undefined {
  const host = referrerHostFrom(referer);
  const referrerHost = host === null || host === ownHost.toLowerCase() ? null : host;
  const utmSource = utmValue(url.searchParams.get("utm_source"));
  const utmCampaign = utmValue(url.searchParams.get("utm_campaign"));
  if (referrerHost === null && utmSource === null && utmCampaign === null) return undefined;
  return { referrerHost, utmSource, utmCampaign };
}

/** The Set-Cookie value that remembers a landing for the rest of the visit. */
export function landingCookie(landing: Landing): string {
  const value = [landing.referrerHost, landing.utmSource, landing.utmCampaign]
    .map((part) => part ?? "")
    .join(SEPARATOR);
  return `${LANDING_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax`;
}

/** The remembered landing from a Cookie header, or undefined if absent or malformed. */
export function landingFromCookie(header: string | null): Landing | undefined {
  if (header === null) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== LANDING_COOKIE) continue;
    const pieces = part
      .slice(separator + 1)
      .trim()
      .split(SEPARATOR);
    if (pieces.length !== 3) return undefined;
    const [host, source, campaign] = pieces as [string, string, string];
    if (host !== "" && !isHostName(host)) return undefined;
    if (source !== "" && !isUtmValue(source)) return undefined;
    if (campaign !== "" && !isUtmValue(campaign)) return undefined;
    if (host === "" && source === "" && campaign === "") return undefined;
    return {
      referrerHost: host === "" ? null : host,
      utmSource: source === "" ? null : source,
      utmCampaign: campaign === "" ? null : campaign,
    };
  }
  return undefined;
}
