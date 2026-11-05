/**
 * Share links for an item. Plain links to each network's own share page: no
 * embedded widgets, scripts or trackers, so sharing costs visitors no privacy.
 */

export interface ShareLink {
  /** Visible link text, e.g. "Share on Bluesky". */
  readonly label: string;
  readonly href: string;
}

export interface ShareInput {
  /** Absolute URL of the item page. */
  readonly url: string;
  /** Short text to go with the link. */
  readonly text: string;
}

export function shareLinks({ url, text }: ShareInput): readonly ShareLink[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { label: "Share on Bluesky", href: `https://bsky.app/intent/compose?text=${t}%20${u}` },
    { label: "Share on X", href: `https://x.com/intent/post?text=${t}&url=${u}` },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "Share on Reddit", href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { label: "Share by email", href: `mailto:?subject=${t}&body=${u}` },
  ];
}
