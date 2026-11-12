/**
 * The front page's stage (design note 0014): the Broadcast's set, at the top
 * of the page. The host leads; the item on air is an inset in the corner, with
 * a lower-third bar under them carrying its name, price, clock and the Acquire
 * button, the way a shopping channel frames a product.
 *
 * It reuses what /broadcast shows (on-air.ts) so the two never disagree, and
 * keeps the same lines (note 0009): every number is true, nothing is invented.
 * The host is a still drawing here; his motion arrives with the effects group.
 */

import { segmentAt, specialPriceCents } from "../core/broadcast";
import { formatPrice } from "../core/catalog";
import { checkoutPath } from "../core/checkout";
import { artPath, itemPathFor, TERMS_PATH } from "../core/paths";
import { HOST_ARTIST, hostArt } from "./host-art";
import { html, type SafeHtml } from "./html";
import { countdown, discount, segmentName, tallyText } from "./on-air";

/** The stage band: `soldThisSegment` is the real count of orders in this segment. */
export function stageBand(nowSeconds: number, soldThisSegment: number): SafeHtml {
  const segment = segmentAt(nowSeconds);
  const { item } = segment;
  const [pitch] = item.pitch;
  const price = formatPrice(specialPriceCents(item, segment.kind));
  const href = itemPathFor(item.slug);
  // prettier-ignore
  const hostFigure = html`<figure class="host-stage">${hostArt()}<figcaption>Sketch by ${HOST_ARTIST}.</figcaption></figure>`;

  return html`<section class="stage" aria-label="On air now">
    <div class="screen">
      <div class="set">
        ${hostFigure}
        <p class="says">“${pitch}”</p>
        <a class="inset" href="${href}" tabindex="-1" aria-hidden="true">
          <img src="${artPath(item.slug)}" alt="" width="800" height="600" decoding="async" />
          <span class="tag">Exhibit ${item.exhibit}</span>
        </a>
      </div>
      <div class="lower">
        <div class="lower-top">
          <p class="kick">On air · ${segmentName(segment)} · Smuggler's Special Value</p>
          <h2 class="name"><a href="${href}">${item.name}</a></h2>
          <p class="stage-price">
            ${price}
            <span class="regular"
              >(regularly ${formatPrice(item.priceCents)}, ${discount(segment)})</span
            >
          </p>
        </div>
        <div class="lower-buy">
          <a class="button" href="${checkoutPath(item)}" rel="nofollow" data-sound="kachunk"
            >Acquire it for ${price}</a
          >
          <p class="secure-note">
            The price holds once checkout starts, even if the segment ends while you pay.
            <a href="${TERMS_PATH}">Terms of sale</a>.
          </p>
        </div>
        <div class="lower-meta">
          ${countdown(segment, nowSeconds)}
          <p class="tally">${tallyText(soldThisSegment)}</p>
        </div>
      </div>
    </div>
  </section>`;
}

/**
 * The stage is a screen, so its colors are its own and the same in light and
 * dark. Text on it is the cream or gold below on near-black or oxblood: every
 * pair is well above 4.5:1. Nothing relies on color alone.
 */
export const STAGE_CSS = `
/* The front page's stage (note 0014) */
.intro { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 1.25rem; margin-bottom: 1rem; }
.intro .kicker { flex-basis: 100%; }
.intro h1 { font-size: clamp(1.75rem, 4vw, 2.25rem); margin: 0; }
.intro .tagline { font-size: 1.05rem; margin: 0; }
.stage { margin: 0 0 2.5rem; }
.stage .screen { overflow: hidden; border-radius: 12px; border: 2px solid #2a0c0c; background: #5e1717 repeating-linear-gradient(90deg, rgb(0 0 0 / 0.18) 0 12px, transparent 12px 74px); color: #f4efe4; }
.stage .set { position: relative; }
.stage .host-stage { max-width: 16rem; margin: 0 6% 0 auto; padding-top: 0.9rem; }
.stage .host-art { border-radius: 0; }
.stage .host-stage figcaption { margin: 0; padding: 0 0 0.4rem; text-align: center; color: #e9dfcc; }
.stage .says { position: absolute; left: 0.9rem; top: 0.9rem; max-width: min(15rem, 38%); margin: 0; padding: 0.6rem 0.8rem; background: #f4efe4; color: #2a0c0c; border-radius: 12px; font-style: italic; font-size: 0.95rem; }
.stage .inset { position: absolute; left: 0.9rem; bottom: 2rem; width: clamp(7rem, 24%, 11.5rem); background: #151a23; border: 3px solid #e8b53c; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgb(0 0 0 / 0.5); text-decoration: none; }
.stage .inset img { display: block; width: 100%; height: auto; }
.stage .inset .tag { display: block; padding: 0.2rem 0.5rem; font-size: 0.7rem; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; background: #e8b53c; color: #2a0c0c; }
.stage .lower { display: grid; gap: 0.1rem 1.25rem; grid-template-columns: minmax(0, 1fr) 15rem; grid-template-areas: "top buy" "meta buy"; align-items: center; padding: 0.7rem 1.1rem; background: #1b0a0a; border-top: 3px solid #e8b53c; }
.stage .lower-top { grid-area: top; }
.stage .lower-buy { grid-area: buy; }
.stage .lower-meta { grid-area: meta; }
.stage .lower p { margin: 0.15rem 0; }
.stage .kick { font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; color: #e8b53c; }
.stage .name { margin: 0.05rem 0; font-size: 1.3rem; }
.stage .name a, .stage .lower a { color: #f4efe4; }
.stage .stage-price { font-size: 1.45rem; font-weight: bold; }
.stage .regular { font-size: 0.85rem; font-weight: normal; color: #e9dfcc; }
.stage .lower-meta { display: flex; flex-wrap: wrap; gap: 0 1rem; }
.stage .countdown, .stage .tally { font-size: 0.92rem; color: #f4efe4; }
.stage .lower .button { display: block; text-align: center; padding: 0.75rem 1.2rem; font-weight: bold; background: #e8b53c; color: #2a0c0c; border-radius: 6px; text-decoration: none; }
.stage .lower .button:hover { text-decoration: underline; }
.stage .lower a:focus-visible { outline: 3px solid #ffffff; outline-offset: 3px; }
.stage .secure-note { font-size: 0.78rem; color: #e9dfcc; text-align: center; }
@media (max-width: 40rem) {
  .intro .tagline { display: none; }
  .intro h1 { font-size: 1.75rem; }
  .stage .says, .stage .kick { display: none; }
  .stage .host-stage { max-width: 10.5rem; padding-top: 0.6rem; margin-right: 0.75rem; }
  .stage .host-stage figcaption { font-size: 0.7rem; padding-bottom: 0.25rem; }
  .stage .inset { top: 0.7rem; bottom: auto; width: 6.2rem; }
  .stage .lower { grid-template-columns: minmax(0, 1fr); grid-template-areas: "top" "buy" "meta"; gap: 0.3rem; padding: 0.6rem 0.9rem 0.7rem; }
  .stage .name { font-size: 1.2rem; }
  .stage .stage-price { font-size: 1.3rem; }
}
`;
