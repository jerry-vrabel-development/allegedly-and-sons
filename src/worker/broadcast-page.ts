/**
 * The Back-Room Broadcast (design note 0009): /broadcast, and the ON AIR
 * banner every other page carries. QVC from the black market: one item, a
 * host who won't stop talking, a special price and a real clock.
 *
 * Every number is true: the price comes off the real regular price, the
 * countdown is the segment's real end (a small first-party script ticks it
 * down and reloads at zero), and the tally counts real orders in this
 * segment.
 */

import {
  BROADCAST_PATH,
  chicagoTime,
  DISCOUNT_PERCENT,
  nextAuction,
  nextSegment,
  segmentAt,
  specialPriceCents,
  type Segment,
} from "../core/broadcast";
import { formatPrice } from "../core/catalog";
import { checkoutPath } from "../core/checkout";
import { describeWait } from "../core/vault";
import { html, type SafeHtml } from "./html";
import { itemPath, layout, TERMS_PATH } from "./pages";
import { COUNTDOWN_SCRIPT_PATH } from "./broadcast-script";

function segmentName(segment: Segment): string {
  return segment.kind === "auction" ? "The Midnight Auction" : "Rolling segment";
}

/** "15% off". */
function discount(segment: Segment): string {
  return `${String(DISCOUNT_PERCENT[segment.kind])}% off`;
}

/** The live countdown: words for everyone; the script turns it into a ticking clock. */
function countdown(segment: Segment, nowSeconds: number): SafeHtml {
  const secondsLeft = String(segment.endsAt - nowSeconds);
  // prettier-ignore
  const clock = html`<span class="clock" data-seconds-left="${secondsLeft}">${describeWait(segment.endsAt - nowSeconds)}</span>`;
  return html`<p class="countdown">
    <strong>Ends at ${chicagoTime(segment.endsAt)} Chicago time:</strong>
    ${clock} left.
  </p>`;
}

export function broadcastPage(nowSeconds: number, soldThisSegment: number): SafeHtml {
  const segment = segmentAt(nowSeconds);
  const { item } = segment;
  const next = nextSegment(nowSeconds);
  // During an auction, "next" means tomorrow night's.
  const auction = nextAuction(segment.kind === "auction" ? segment.endsAt : nowSeconds);
  const price = formatPrice(specialPriceCents(item, segment.kind));
  // prettier-ignore
  const regular = html`<span class="regular">(regularly ${formatPrice(item.priceCents)}, ${discount(segment)})</span>`;

  return layout({
    title: "The Back-Room Broadcast",
    description: `On air now: ${item.name}, ${discount(segment)}.`,
    scripts: [COUNTDOWN_SCRIPT_PATH],
    body: html`<div class="broadcast">
      <p class="on-air-tag"><strong>On air</strong> · ${segmentName(segment)}</p>
      <h1>The Back-Room Broadcast</h1>
      <div class="exhibit">
        <figure class="art">
          <img
            src="/assets/art/${item.slug}.svg"
            alt="${item.artAlt}"
            width="800"
            height="600"
            decoding="async"
          />
        </figure>
        <div class="buybox">
          <p class="kicker">Exhibit ${item.exhibit}</p>
          <h2><a href="${itemPath(item)}">${item.name}</a></h2>
          <dl class="pricing">
            <dt>Smuggler's Special Value</dt>
            <dd class="price">${price} ${regular}</dd>
          </dl>
          ${countdown(segment, nowSeconds)}
          <p class="tally">
            ${
              soldThisSegment === 0
                ? html`Nobody's moved on it yet this segment.`
                : html`<strong>${String(soldThisSegment)}</strong> acquired this segment.`
            }
          </p>
          <p class="acquire">
            <a class="button" href="${checkoutPath(item)}" rel="nofollow" data-sound="kachunk"
              >Acquire it for ${price}</a
            >
          </p>
          <p class="secure-note">
            The price holds once checkout starts, even if the segment ends while you pay. Secure
            checkout by Stripe. <a href="${TERMS_PATH}">Terms of sale</a>.
          </p>
        </div>
      </div>

      <section class="prose patter" aria-labelledby="host-heading">
        <h2 id="host-heading">The host</h2>
        ${item.pitch.map((line) => html`<p>“${line}”</p>`)}
      </section>

      <section class="prose" aria-labelledby="schedule-heading">
        <h2 id="schedule-heading">Coming up</h2>
        <ul>
          <li>
            <strong>${chicagoTime(next.startsAt)}:</strong> ${next.item.name}, ${discount(next)}
            (${segmentName(next).toLowerCase()}).
          </li>
          ${
            auction.id === next.id
              ? html``
              : html`<li>
                  <strong>${chicagoTime(auction.startsAt)}, the Midnight Auction:</strong>
                  ${auction.item.name}, ${discount(auction)}.
                </li>`
          }
        </ul>
        <p>
          A new item goes on air every three hours, around the clock, and the Midnight Auction runs
          from 11pm to midnight Chicago time with the deepest cut of the night.
        </p>
      </section>
    </div>`,
  });
}

/** The ON AIR strip at the top of other pages. */
export function onAirBanner(nowSeconds: number): SafeHtml {
  const segment = segmentAt(nowSeconds);
  // On phones the end time is dropped (the broadcast page has it) so the
  // banner stays short and the item page's buy button stays on screen.
  const price = formatPrice(specialPriceCents(segment.item, segment.kind));
  // prettier-ignore
  const detail = html`<span class="banner-detail"> until ${chicagoTime(segment.endsAt)} Chicago time</span>`;
  return html`<p class="on-air-banner">
    <strong>On air:</strong> ${segment.item.name}, ${price} (${discount(segment)})${detail}.
    <a href="${BROADCAST_PATH}">Watch the broadcast</a>
  </p>`;
}

/** Pages that never carry the banner: the broadcast itself, checkout, private and return pages. */
const NO_BANNER =
  /^\/(?:broadcast|checkout\/|bureau|thanks|streak\/restored|dispatch\/|vault\/pull)/;

/** Whether a page gets the ON AIR banner. */
export function wantsBanner(pathname: string): boolean {
  return !NO_BANNER.test(pathname);
}

/**
 * Adds the banner to an HTML page, just inside <body> after the skip link.
 * Our own layout always has that marker; anything else is left unchanged.
 */
export function withBanner(page: string, banner: SafeHtml): string {
  const marker = '<a class="skip-link" href="#main">Skip to content</a>';
  return page.replace(marker, `${marker}${banner.value}`);
}
