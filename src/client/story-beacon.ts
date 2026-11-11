/**
 * The story script's side of the read beacon (design note 0001, C4). The
 * Worker's side is parseReadBeacon in core/analytics.ts; a test sends what
 * this builds through that parser, so the two can't drift apart.
 */

import type { ReadDepth } from "../core/analytics";

/** The body of a read beacon: a plain string, sent as text/plain. */
export function readBeaconBody(item: string, depth: ReadDepth): string {
  return JSON.stringify({ item, depth });
}

/** Remembers which depths were sent, so each goes at most once per page view. */
export function oncePerDepth(send: (depth: ReadDepth) => void): {
  readonly send: (depth: ReadDepth) => void;
  readonly sent: (depth: ReadDepth) => boolean;
} {
  const done = new Set<ReadDepth>();
  return {
    send: (depth) => {
      if (done.has(depth)) return;
      done.add(depth);
      send(depth);
    },
    sent: (depth) => done.has(depth),
  };
}
