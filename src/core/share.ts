/**
 * Sharing an item (design note 0001, C3).
 *
 * Share buttons are plain links to our own /share/<item>/<network>. That route
 * records the share, mints a short random ref code, and redirects to the
 * network's own share page with a link back to the item carrying ?r=<ref>.
 * When someone opens that link, the visit is tied to the share. No embedded
 * widgets or third-party scripts.
 */

import { itemPathFor } from "./paths";
import { hexFrom } from "./hex";

/** The networks we offer, in the order shown. Also the allowed `channel` values. */
export const NETWORKS = ["bluesky", "x", "facebook", "reddit", "email"] as const;

export type Network = (typeof NETWORKS)[number];

const LABELS: Readonly<Record<Network, string>> = {
  bluesky: "Share on Bluesky",
  x: "Share on X",
  facebook: "Share on Facebook",
  reddit: "Share on Reddit",
  email: "Share by email",
};

export function isNetwork(value: unknown): value is Network {
  return typeof value === "string" && (NETWORKS as readonly string[]).includes(value);
}

/** Matches /share/<slug>/<network> and captures both. */
export const SHARE_PATH = /^\/share\/([a-z0-9-]+)\/([a-z]+)$/;

/** The item slug and (unchecked) network named by a /share path, or undefined if it isn't one. */
export function parseSharePath(pathname: string): { slug: string; network: string } | undefined {
  const match = SHARE_PATH.exec(pathname);
  if (match === null) return undefined;
  // Both groups always take part in a match, so they're always strings.
  const [, slug, network] = match as unknown as [string, string, string];
  return { slug, network };
}

export function sharePath(slug: string, network: Network): string {
  return `/share/${slug}/${network}`;
}

/** A share's ref code: 40 random bits as 10 lowercase hex characters. */
export const REF = /^[0-9a-f]{10}$/;

/** Bytes of randomness in a ref code. */
export const REF_BYTES = 5;

/** A ref code from random bytes (from crypto.getRandomValues). Pure, so tests can pin it. */
export function refFrom(bytes: Uint8Array): string {
  if (bytes.length !== REF_BYTES) {
    throw new RangeError(`a ref code needs ${String(REF_BYTES)} random bytes`);
  }
  return hexFrom(bytes);
}

/** The query parameter that carries a ref code on a shared link. */
export const REF_PARAM = "r";

/** The link a share sends people to: the item page, tagged with the share's ref. */
export function sharedItemUrl(origin: string, slug: string, ref: string): string {
  return `${origin}${itemPathFor(slug)}?${REF_PARAM}=${ref}`;
}

export interface ShareLink {
  /** Visible link text, e.g. "Share on Bluesky". */
  readonly label: string;
  /** Our own /share/<slug>/<network> route. */
  readonly href: string;
}

/** The share buttons for an item page. */
export function shareLinks(slug: string): readonly ShareLink[] {
  return NETWORKS.map((network) => ({ label: LABELS[network], href: sharePath(slug, network) }));
}

export interface ShareInput {
  /** Absolute URL to share (the item page with its ?r= ref). */
  readonly url: string;
  /** Short text to go with the link. */
  readonly text: string;
}

/** The network's own share page (or a mailto: link) for a URL and some text. */
export function shareTarget(network: Network, { url, text }: ShareInput): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  switch (network) {
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${t}%20${u}`;
    case "x":
      return `https://x.com/intent/post?text=${t}&url=${u}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "email":
      return `mailto:?subject=${t}&body=${u}`;
  }
}
