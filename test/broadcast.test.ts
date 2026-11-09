import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  chicagoHourToUnix,
  chicagoTime,
  isSegmentId,
  nextAuction,
  nextSegment,
  offerFor,
  segmentAt,
  specialPriceCents,
} from "../src/core/broadcast";
import { CATALOG, findItem } from "../src/core/catalog";
import { checkoutSessionForm, embeddedCheckoutSessionForm } from "../src/core/checkout";
import { orderFromCompletedSession } from "../src/core/orders";

const T = (iso: string) => Date.parse(iso) / 1000;
/** 12:30pm Chicago (CST), Monday 2026-11-09. */
const NOON = T("2026-11-09T18:30:00Z");

describe("the schedule", () => {
  it("runs 3-hour rolling segments on Chicago's clock", () => {
    const segment = segmentAt(NOON);
    expect(segment).toMatchObject({
      kind: "rolling",
      id: "2026-11-09.12",
      startsAt: T("2026-11-09T18:00:00Z"),
      endsAt: T("2026-11-09T21:00:00Z"),
    });
    expect(chicagoTime(segment.endsAt)).toBe("3:00 PM");
  });

  it("runs the Midnight Auction from 11pm to midnight, cutting the 9pm segment to two hours", () => {
    expect(segmentAt(T("2026-11-10T04:59:59Z"))).toMatchObject({
      kind: "rolling",
      id: "2026-11-09.21",
      endsAt: T("2026-11-10T05:00:00Z"),
    });
    expect(segmentAt(T("2026-11-10T05:00:00Z"))).toMatchObject({
      kind: "auction",
      id: "2026-11-09.auction",
      startsAt: T("2026-11-10T05:00:00Z"),
      endsAt: T("2026-11-10T06:00:00Z"),
    });
    expect(segmentAt(T("2026-11-10T06:00:00Z")).id).toBe("2026-11-10.0");
  });

  it("follows the clock on the nights it changes", () => {
    // Clocks spring forward at 2am on 2026-03-08: the midnight segment is 2 hours.
    const spring = segmentAt(T("2026-03-08T07:00:00Z"));
    expect(spring.endsAt - spring.startsAt).toBe(2 * 3600);
    // And fall back at 2am on 2026-11-01: it's 4 hours.
    const fall = segmentAt(T("2026-11-01T06:30:00Z"));
    expect(fall.endsAt - fall.startsAt).toBe(4 * 3600);
    expect(chicagoHourToUnix(2026, 7, 4, 12)).toBe(T("2026-07-04T17:00:00Z")); // CDT
    expect(chicagoHourToUnix(2026, 12, 31, 24)).toBe(T("2027-01-01T06:00:00Z")); // rolls over
  });

  it("is always on air, segment after segment, with no gaps or overlaps", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: T("2026-01-01T00:00:00Z"), max: T("2028-12-31T00:00:00Z") }),
        (t) => {
          const segment = segmentAt(t);
          expect(segment.startsAt).toBeLessThanOrEqual(t);
          expect(segment.endsAt).toBeGreaterThan(t);
          expect(nextSegment(t).startsAt).toBe(segment.endsAt);
          expect(isSegmentId(segment.id)).toBe(true);
        },
      ),
    );
  });

  it("changes the lineup from day to day", () => {
    const auctions = [0, 1, 2].map(
      (d) => segmentAt(T("2026-11-10T05:30:00Z") + d * 86_400).item.slug,
    );
    expect(new Set(auctions).size).toBe(3);
    const today = [0, 3, 6].map((h) => segmentAt(T("2026-11-09T06:30:00Z") + h * 3600).item.slug);
    expect(new Set(today).size).toBe(3);
  });

  it("knows the next Midnight Auction, tonight's or tomorrow's", () => {
    expect(nextAuction(NOON).id).toBe("2026-11-09.auction");
    expect(nextAuction(T("2026-11-10T05:30:00Z")).id).toBe("2026-11-09.auction");
    expect(nextAuction(T("2026-11-10T06:00:00Z")).id).toBe("2026-11-10.auction");
  });

  it("recognizes its own segment ids, and nothing else", () => {
    for (const id of ["2026-11-09.0", "2026-11-09.21", "2026-11-09.auction"]) {
      expect(isSegmentId(id)).toBe(true);
    }
    for (const bad of [undefined, 7, "", "auction", "2026-11-09", "2026-11-09.fake", "x.12"]) {
      expect(isSegmentId(bad)).toBe(false);
    }
  });
});

describe("prices", () => {
  const paperclip = CATALOG[0];

  it("take 15% off on air and 30% in the Midnight Auction, to the cent", () => {
    expect(specialPriceCents(paperclip, "rolling")).toBe(42_415); // $499.00 → $424.15
    expect(specialPriceCents(paperclip, "auction")).toBe(34_930); // → $349.30
  });

  it("are special only for the item on air", () => {
    const segment = segmentAt(NOON);
    const onAir = offerFor(segment.item, NOON);
    expect(onAir).toEqual({
      priceCents: specialPriceCents(segment.item, "rolling"),
      regularCents: segment.item.priceCents,
      segment,
    });
    const other = CATALOG.find((item) => item.slug !== segment.item.slug) ?? paperclip;
    expect(offerFor(other, NOON)).toEqual({
      priceCents: other.priceCents,
      regularCents: other.priceCents,
      segment: undefined,
    });
  });

  it("go to Stripe locked in, tagged with the segment, hosted or embedded", () => {
    const { item } = segmentAt(NOON);
    const offer = offerFor(item, NOON);
    for (const form of [
      checkoutSessionForm(item, "https://shop.example", null, offer),
      embeddedCheckoutSessionForm(item, "https://shop.example", null, offer),
    ]) {
      expect(form.get("line_items[0][price_data][unit_amount]")).toBe(String(offer.priceCents));
      expect(form.get("metadata[segment]")).toBe("2026-11-09.12");
      expect(form.get("payment_intent_data[metadata][segment]")).toBe("2026-11-09.12");
    }
    const regular = checkoutSessionForm(paperclip, "https://shop.example");
    expect(regular.get("line_items[0][price_data][unit_amount]")).toBe("49900");
    expect(regular.has("metadata[segment]")).toBe(false);
  });

  it("come back on the order with the segment that sold it", () => {
    const session = (segment: unknown) => ({
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 42_415,
      currency: "usd",
      metadata: { slug: "alien-paperclip", segment },
    });
    expect(orderFromCompletedSession(session("2026-11-09.12"), 1)).toMatchObject({
      order: { segment: "2026-11-09.12", amountCents: 42_415 },
    });
    expect(orderFromCompletedSession(session("not-a-segment"), 1)).toMatchObject({
      order: { segment: null },
    });
  });

  it("every item has a host pitch, and none of it quotes a price", () => {
    for (const item of CATALOG) {
      expect(item.pitch.length).toBeGreaterThanOrEqual(3);
      for (const line of item.pitch) expect(line).not.toMatch(/\$|\d+%|percent/);
    }
    expect(findItem("alien-paperclip")?.pitch[0]).toContain("space");
  });
});
