/**
 * Callers on the line (design note 0014): pure rules for which one-off
 * callers are on the Bureau's switchboard during a segment. The lines
 * themselves are in caller-lines.ts.
 *
 * Who is on the line depends only on the segment, so every visitor sees the
 * same callers for the same segment, the front page and /broadcast always
 * agree, and nothing here is random.
 *
 * Each segment has one caller about the exhibit on air and two from the open
 * line. The open line moves on by two every segment, so its callers come
 * round only after every other one has been on. An exhibit's own callers take
 * turns from one airing of the exhibit to its next.
 */

import type { Segment } from "./broadcast";
import { EXHIBIT_CALLERS, OPEN_LINE_CALLERS, type Caller } from "./caller-lines";

/** How many callers are on the line in a segment. */
export const CALLERS_PER_SEGMENT = 3;

/** Every caller on the switchboard: each exhibit's, then the open line's. */
export const ALL_CALLERS: readonly Caller[] = [
  ...Object.values(EXHIBIT_CALLERS).flat(),
  ...OPEN_LINE_CALLERS,
];

/** The caller whose turn it is: turns go round the list and start again. */
function pick(list: readonly [Caller, ...Caller[]], turn: number): Caller {
  // Rotate so the caller whose turn it is comes first (the list is never empty).
  const [caller] = [...list.slice(turn % list.length), ...list] as [Caller, ...Caller[]];
  return caller;
}

/**
 * The callers on the line during a segment, in the order they're shown: the
 * one with something to say about the exhibit on air first, then the open
 * line. An exhibit with no callers of its own gets a third open-line caller.
 */
export function callersFor(segment: Segment): readonly Caller[] {
  const { turn, airing } = segment;
  const openLine = [0, 1, 2].map((step) =>
    pick(OPEN_LINE_CALLERS, turn * (CALLERS_PER_SEGMENT - 1) + step),
  );
  const own = EXHIBIT_CALLERS[segment.item.slug];
  if (own === undefined) return openLine;
  return [pick(own, airing), ...openLine.slice(0, CALLERS_PER_SEGMENT - 1)];
}
