/**
 * The pieces of "what's on air" that more than one page shows: the Broadcast
 * page and the front page's stage (design notes 0009 and 0014). They live here
 * so the two can never say different things about the same segment.
 *
 * Every number is true: the countdown is the segment's real end, and the tally
 * counts real orders in it.
 */

import { chicagoTime, DISCOUNT_PERCENT, type Segment } from "../core/broadcast";
import { describeWait } from "../core/vault";
import { html, type SafeHtml } from "./html";

export function segmentName(segment: Segment): string {
  return segment.kind === "auction" ? "The Midnight Auction" : "Rolling segment";
}

/** "15% off". */
export function discount(segment: Segment): string {
  return `${String(DISCOUNT_PERCENT[segment.kind])}% off`;
}

/** The live countdown: words for everyone; the script turns it into a ticking clock. */
export function countdown(segment: Segment, nowSeconds: number): SafeHtml {
  const secondsLeft = String(segment.endsAt - nowSeconds);
  // prettier-ignore
  const clock = html`<span class="clock" data-seconds-left="${secondsLeft}">${describeWait(segment.endsAt - nowSeconds)}</span>`;
  return html`<p class="countdown">
    <strong>Ends at ${chicagoTime(segment.endsAt)} Chicago time:</strong>
    ${clock} left.
  </p>`;
}

/** The real count of orders in this segment, in words. */
export function tallyText(sold: number): SafeHtml {
  return sold === 0
    ? html`Nobody's moved on it yet this segment.`
    : html`<strong>${String(sold)}</strong> acquired this segment.`;
}
