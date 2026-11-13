/**
 * The Back-Room Broadcast (design note 0009): pure rules for what's on air.
 *
 * QVC from the black market. One item on air at a time at a "Smuggler's
 * Special Value":
 * - Rolling segments: every 3 hours on Chicago's clock (midnight, 3am, …,
 *   9pm), 15% off.
 * - The Midnight Auction: 11pm to midnight Chicago time, 30% off. It takes
 *   the last two hours' place: the 9pm segment runs 9 to 11.
 *
 * Every number is true (note 0003, the law-and-money lines): segments end
 * when they say they do (daylight saving included), the special price comes
 * off the real regular price, and the price is locked when checkout starts.
 */

import { AVAILABLE_ITEMS, type Item } from "./catalog";

/** The shop's clock. Segments follow Chicago's wall clock, DST and all. */
export const BROADCAST_TIME_ZONE = "America/Chicago";

/** Rolling segments start at these Chicago hours. */
export const ROLLING_START_HOURS = [0, 3, 6, 9, 12, 15, 18, 21] as const;
/** The Midnight Auction runs from this Chicago hour to midnight. */
export const AUCTION_START_HOUR = 23;

/** Segments in a Chicago day: the rolling ones and the Midnight Auction. */
const SEGMENTS_PER_DAY = ROLLING_START_HOURS.length + 1;

/** Percent off the regular price. */
export const DISCOUNT_PERCENT = { rolling: 15, auction: 30 } as const;

export type SegmentKind = keyof typeof DISCOUNT_PERCENT;

export interface Segment {
  readonly kind: SegmentKind;
  /** Stable id, e.g. "2026-11-09.21" or "2026-11-09.auction" (Chicago date). */
  readonly id: string;
  /**
   * Its place in the run of all segments: one more than the segment before
   * it, across midnight too. The open line's callers turn on it (note 0014).
   */
  readonly turn: number;
  /**
   * How many times this item has been on air before, with today's lineup.
   * The item's own callers take turns on it.
   */
  readonly airing: number;
  readonly item: Item;
  /** Unix seconds. */
  readonly startsAt: number;
  readonly endsAt: number;
}

const SEGMENT_ID = /^\d{4}-\d{2}-\d{2}\.(?:\d{1,2}|auction)$/;

/** Whether a string is a segment id (as it comes back from Stripe metadata). */
export function isSegmentId(value: unknown): value is string {
  return typeof value === "string" && SEGMENT_ID.test(value);
}

interface WallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
}

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: BROADCAST_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** Chicago's wall clock at a Unix time, to the second. */
function wallClockAt(seconds: number): WallClock & { minute: number; second: number } {
  const parts = new Map(
    PARTS.formatToParts(new Date(seconds * 1000)).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: Number(parts.get("year")),
    month: Number(parts.get("month")),
    day: Number(parts.get("day")),
    hour: Number(parts.get("hour")),
    minute: Number(parts.get("minute")),
    second: Number(parts.get("second")),
  };
}

/** Seconds Chicago is behind UTC at a moment (5 or 6 hours). */
function offsetAt(seconds: number): number {
  const w = wallClockAt(seconds);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) / 1000;
  return seconds - asUtc;
}

/**
 * The Unix time of a Chicago wall-clock hour. Hours past 23 roll into the
 * next day. On the night clocks change, the answer follows the clock: a
 * segment that spans the change is an hour shorter or longer, and its
 * countdown says so.
 */
export function chicagoHourToUnix(year: number, month: number, day: number, hour: number): number {
  const naive = Date.UTC(year, month - 1, day, hour) / 1000;
  // Guess with the offset at the naive time, then correct once with the
  // offset at the guess (enough for a one-hour DST shift).
  const guess = naive + offsetAt(naive);
  return naive + offsetAt(guess);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Which of the items for sale a slot features: slots rotate through them
 * (never an acquisition-pending one, note 0010), and each day starts one item
 * further along, so the lineup (and the Midnight Auction's item) changes from
 * day to day whatever the catalog's size.
 */
function itemIndexForSlot(dayNumber: number, slot: number): number {
  return (dayNumber + slot) % AVAILABLE_ITEMS.length;
}

/** The item a slot features. */
function itemForSlot(dayNumber: number, slot: number): Item {
  const turn = itemIndexForSlot(dayNumber, slot);
  // Rotate so the slot's item comes first (there's always one for sale).
  const [item] = [...AVAILABLE_ITEMS.slice(turn), ...AVAILABLE_ITEMS] as [Item, ...Item[]];
  return item;
}

/** How many of a day's slots before `beforeSlot` feature the item at `itemIndex`. */
function airingsInDay(dayNumber: number, itemIndex: number, beforeSlot: number): number {
  let count = 0;
  for (let slot = 0; slot < beforeSlot; slot += 1) {
    if (itemIndexForSlot(dayNumber, slot) === itemIndex) count += 1;
  }
  return count;
}

/**
 * How many times a slot's item has been on air before that slot. Over as
 * many days as there are items for sale, every item gets each slot once, so
 * whole rounds are counted at once and only the days since the last round
 * are walked.
 */
function airingsBefore(dayNumber: number, slot: number): number {
  const itemIndex = itemIndexForSlot(dayNumber, slot);
  const roundLength = AVAILABLE_ITEMS.length;
  const roundStart = dayNumber - (dayNumber % roundLength);
  let count = Math.floor(dayNumber / roundLength) * SEGMENTS_PER_DAY;
  for (let day = roundStart; day < dayNumber; day += 1) {
    count += airingsInDay(day, itemIndex, SEGMENTS_PER_DAY);
  }
  return count + airingsInDay(dayNumber, itemIndex, slot);
}

/** What's on air at a moment. There's always something. */
export function segmentAt(nowSeconds: number): Segment {
  const w = wallClockAt(nowSeconds);
  const date = `${String(w.year)}-${pad(w.month)}-${pad(w.day)}`;
  const dayNumber = Math.floor(Date.UTC(w.year, w.month - 1, w.day) / 86_400_000);
  const at = (hour: number) => chicagoHourToUnix(w.year, w.month, w.day, hour);

  if (w.hour >= AUCTION_START_HOUR) {
    return {
      kind: "auction",
      id: `${date}.auction`,
      turn: dayNumber * SEGMENTS_PER_DAY + ROLLING_START_HOURS.length,
      airing: airingsBefore(dayNumber, ROLLING_START_HOURS.length),
      item: itemForSlot(dayNumber, ROLLING_START_HOURS.length),
      startsAt: at(AUCTION_START_HOUR),
      endsAt: at(24),
    };
  }
  const slot = Math.floor(w.hour / 3);
  const start = slot * 3;
  return {
    kind: "rolling",
    id: `${date}.${String(start)}`,
    turn: dayNumber * SEGMENTS_PER_DAY + slot,
    airing: airingsBefore(dayNumber, slot),
    item: itemForSlot(dayNumber, slot),
    startsAt: at(start),
    endsAt: at(Math.min(start + 3, AUCTION_START_HOUR)),
  };
}

/** The segment after the one on air at `nowSeconds`. */
export function nextSegment(nowSeconds: number): Segment {
  return segmentAt(segmentAt(nowSeconds).endsAt);
}

/** The next Midnight Auction: tonight's, or tomorrow's once tonight's is over. */
export function nextAuction(nowSeconds: number): Segment {
  let segment = segmentAt(nowSeconds);
  while (segment.kind !== "auction" || segment.endsAt <= nowSeconds) {
    segment = segmentAt(segment.endsAt);
  }
  return segment;
}

/** The special price, in whole cents (rounded to the nearest cent). */
export function specialPriceCents(item: Item, kind: SegmentKind): number {
  return Math.round((item.priceCents * (100 - DISCOUNT_PERCENT[kind])) / 100);
}

/** What an item costs right now: on air, or its regular price. */
export interface Offer {
  readonly priceCents: number;
  readonly regularCents: number;
  /** The segment it's on air in, if it is. */
  readonly segment: Segment | undefined;
}

export function offerFor(item: Item, nowSeconds: number): Offer {
  const segment = segmentAt(nowSeconds);
  if (segment.item.slug !== item.slug) {
    return { priceCents: item.priceCents, regularCents: item.priceCents, segment: undefined };
  }
  return {
    priceCents: specialPriceCents(item, segment.kind),
    regularCents: item.priceCents,
    segment,
  };
}

/** "3:00 PM", on Chicago's clock. */
export function chicagoTime(seconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BROADCAST_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(seconds * 1000));
}
