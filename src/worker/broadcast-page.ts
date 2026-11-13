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
  chicagoTime,
  nextAuction,
  nextSegment,
  segmentAt,
  specialPriceCents,
} from "../core/broadcast";
import { formatPrice } from "../core/catalog";
import { checkoutPath } from "../core/checkout";
import { callersBlock } from "./callers";
import { HOST_ARTIST, hostArt } from "./host-art";
import { html, type SafeHtml } from "./html";
import { countdown, discount, segmentName, tallyText } from "./on-air";
import { itemPath, layout, type Page } from "./pages";
import {
  BROADCAST_PATH,
  COUNTDOWN_SCRIPT_PATH,
  TERMS_PATH,
  artPath,
  itemPathFor,
} from "../core/paths";

export function broadcastPage(nowSeconds: number, soldThisSegment: number): Page {
  const segment = segmentAt(nowSeconds);
  const { item } = segment;
  const next = nextSegment(nowSeconds);
  // During an auction, "next" means tomorrow night's.
  const auction = nextAuction(segment.kind === "auction" ? segment.endsAt : nowSeconds);
  const price = formatPrice(specialPriceCents(item, segment.kind));
  // prettier-ignore
  const regular = html`<span class="regular">(regularly ${formatPrice(item.priceCents)}, ${discount(segment)})</span>`;

  // data-host lets the effects script give him a pose; without it he's a still drawing.
  // prettier-ignore
  const hostFigure = html`<figure class="host-stage" data-host>${hostArt()}<figcaption>Sketch by ${HOST_ARTIST}.</figcaption></figure>`;

  return layout({
    title: "The Back-Room Broadcast",
    description: `On air now: ${item.name}, ${discount(segment)}.`,
    scripts: [COUNTDOWN_SCRIPT_PATH],
    // data-broadcast lets the sound module (note 0011) add "Tune in" for the fx group.
    body: html`<div class="broadcast" data-broadcast>
      <p class="on-air-tag"><strong>On air</strong> · ${segmentName(segment)}</p>
      <h1>The Back-Room Broadcast</h1>
      <div class="exhibit">
        <figure class="art">
          <img
            src="${artPath(item.slug)}"
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
          <p class="tally">${tallyText(soldThisSegment)}</p>
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
        <div class="host-row">
          ${hostFigure}
          <div class="host-lines">${item.pitch.map((line) => html`<p>“${line}”</p>`)}</div>
        </div>
      </section>

      ${callersBlock(segment, "callers-heading")}

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

/**
 * The ON AIR strip at the top of other pages, or undefined on the page of
 * the exhibit that's on air: its buy box already says so, with the price and
 * the deadline, and on a phone the strip pushed the buy button off the first
 * screen.
 */
export function onAirBanner(nowSeconds: number, pathname: string): SafeHtml | undefined {
  const segment = segmentAt(nowSeconds);
  if (pathname === itemPathFor(segment.item.slug)) return undefined;
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
