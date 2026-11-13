/**
 * The stage's ticker (design note 0014): pure rules for the lines that run
 * along the bottom of the front page's stage.
 *
 * Two kinds of line, which never mix:
 * - FACT: true statements about the show, worked out from the schedule and
 *   the catalog. Every number on the ticker is in one of these.
 * - LORE: the Bureau's wire (wire-lines.ts). No numbers, nothing that could
 *   pass for activity in the shop.
 *
 * Which lore lines run depends only on the segment, like the callers: every
 * visitor sees the same ticker for the same segment, and nothing is random.
 */

import {
  chicagoTime,
  DISCOUNT_PERCENT,
  nextAuction,
  nextSegment,
  segmentAt,
  type Segment,
} from "./broadcast";
import { AVAILABLE_ITEMS, CATALOG } from "./catalog";
import { WIRE_LINES } from "./wire-lines";

export type TickerKind = "fact" | "lore";

export interface TickerLine {
  readonly kind: TickerKind;
  readonly text: string;
}

/** How many lore lines run in a segment. */
export const LORE_PER_SEGMENT = 3;

function onAir(segment: Segment): string {
  return `${segment.item.name}, ${String(DISCOUNT_PERCENT[segment.kind])}% off`;
}

/**
 * The true lines: when this segment ends, what's next, tonight's auction
 * (unless it is what's next), and how big the collection is.
 */
export function factLines(nowSeconds: number): readonly string[] {
  const segment = segmentAt(nowSeconds);
  const next = nextSegment(nowSeconds);
  // During an auction, "the next auction" means tomorrow night's.
  const auction = nextAuction(segment.kind === "auction" ? segment.endsAt : nowSeconds);
  const lines = [
    `This segment ends at ${chicagoTime(segment.endsAt)} Chicago time.`,
    `On air next, at ${chicagoTime(next.startsAt)}: ${onAir(next)}.`,
  ];
  if (auction.id !== next.id) {
    lines.push(`The Midnight Auction, at ${chicagoTime(auction.startsAt)}: ${onAir(auction)}.`);
  }
  lines.push(
    `${String(CATALOG.length)} exhibits in the collection, ${String(AVAILABLE_ITEMS.length)} for sale now.`,
  );
  return lines;
}

/** The wire's lines for a segment: the wire moves on by three each segment. */
export function loreLines(segment: Segment): readonly string[] {
  const start = (segment.turn * LORE_PER_SEGMENT) % WIRE_LINES.length;
  // Twice over, so a run that passes the end of the wire carries on from its start.
  return [...WIRE_LINES, ...WIRE_LINES].slice(start, start + LORE_PER_SEGMENT);
}

/** The ticker at a moment: facts and lore taking turns, a fact first. */
export function tickerLines(nowSeconds: number): readonly TickerLine[] {
  const facts = factLines(nowSeconds);
  const lore = loreLines(segmentAt(nowSeconds));
  const lines: TickerLine[] = [];
  facts.forEach((text, index) => {
    lines.push({ kind: "fact", text });
    const wire = lore[index];
    if (wire !== undefined) lines.push({ kind: "lore", text: wire });
  });
  return lines;
}
