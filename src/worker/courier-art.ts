/**
 * The Courier (design note 0016): the drawing, the names of its moving parts,
 * and the styles that move them. One file, so another artist's version can
 * replace this one without touching the page.
 *
 * Never seen whole: it is drawn half out of a wormhole. A long coat, a high
 * collar with nothing visibly in it and a cap hovering above, a satchel on a
 * strap, an arm holding out a delivery slip that says very little, and legs
 * below the hem, with more of them than seems right. It delivers, nobody asks
 * it questions, and it has no name: asking is discouraged. It makes no promise
 * about shipping (the Fine Print says that plainly), so its drawing carries no
 * date, time or number. Speaking is not built, and the Courier never speaks.
 *
 * It is drawn still. On the pages it visits the figure is the page's
 * `data-host`, so the sound script gives it a pose (and the "Motion" toggle)
 * exactly as it does for the host on the stage: while it has a data-pose the
 * wormhole's rim turns, the satchel swings, the slip is held out and drawn
 * back, and the legs shuffle and draw up. Held still by the toggle, or without
 * effects, it is a still drawing. Colors are attributes, never inline styles,
 * so the page's `style-src 'self'` policy holds. Ids start "courier-" so they
 * can't collide with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew it. Until a partnered artist does, the Bureau. */
export const COURIER_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const COURIER_PARTS = [
  "courier-rim",
  "courier-satchel",
  "courier-slip",
  "courier-legs",
] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
// Its own colours: a coat of deep indigo, and the dark of the wormhole.
const COAT = "#3b3f8c";
const COAT_DEEP = "#262a63";
const VOID = "#0d0716";

/** The legs below the hem: five, where two would do. x at the hem, x at the foot, and its length. */
const LEGS = [
  { top: 138, foot: 120, drop: 66 },
  { top: 168, foot: 160, drop: 74 },
  { top: 200, foot: 204, drop: 62 },
  { top: 232, foot: 244, drop: 72 },
  { top: 262, foot: 284, drop: 64 },
] as const;

/** The coat's buttons, down the front below the belt. */
const BUTTONS = [274, 302, 330] as const;

/** The marks on the slip: it says very little. */
const SLIP_LINES = ["M312 218h30", "M312 232h22", "M312 246h28"] as const;

export function courierArt(): SafeHtml {
  return html`<svg
    class="courier-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="courier-title courier-desc"
  >
    <title id="courier-title">The Courier</title>
    <desc id="courier-desc">
      A long indigo coat rises out of a swirling wormhole. Its collar is turned up around nothing in
      particular, with a flat cap hovering above it. A satchel hangs from a strap at its hip, one
      arm holds out a small delivery slip with a few short lines on it, and five legs stand below
      the hem.
    </desc>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L360 440H40Z" fill="${GOLD}" opacity="0.1" />
    <g fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M50 100l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" />
      <path d="M350 330l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      <path d="M56 270l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
    </g>
    <ellipse cx="200" cy="412" rx="156" ry="50" fill="${VOID}" stroke="${INK}" stroke-width="4" />
    <ellipse
      cx="200"
      cy="412"
      rx="116"
      ry="32"
      fill="none"
      stroke="${COAT}"
      stroke-width="4"
      opacity="0.8"
    />
    <ellipse
      cx="200"
      cy="412"
      rx="70"
      ry="17"
      fill="none"
      stroke="${OXBLOOD}"
      stroke-width="4"
      opacity="0.9"
    />
    <g fill="${CREAM}">
      <circle cx="120" cy="404" r="2" />
      <circle cx="286" cy="420" r="2" />
      <circle cx="238" cy="398" r="1.5" />
      <circle cx="150" cy="428" r="1.5" />
    </g>
    <g class="courier-legs">
      ${LEGS.map(
        (leg) =>
          html`<g>
            <path
              d="M${leg.top} 344L${leg.foot} ${344 + leg.drop}"
              fill="none"
              stroke="${INK}"
              stroke-width="15"
              stroke-linecap="round"
            />
            <path
              d="M${leg.top} 344L${leg.foot} ${344 + leg.drop}"
              fill="none"
              stroke="${COAT_DEEP}"
              stroke-width="9"
              stroke-linecap="round"
            />
            <ellipse
              cx="${leg.foot}"
              cy="${348 + leg.drop}"
              rx="14"
              ry="7"
              fill="${CREAM}"
              stroke="${INK}"
              stroke-width="3"
            />
          </g>`,
      )}
    </g>
    <path
      d="M150 120Q200 100 250 120L286 348L114 348Z"
      fill="${COAT}"
      stroke="${INK}"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <path d="M200 134L200 348" fill="none" stroke="${INK}" stroke-width="3" />
    <path
      d="M114 348L286 348L290 358L110 358Z"
      fill="${COAT_DEEP}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    ${BUTTONS.map(
      (y) =>
        html`<circle cx="224" cy="${y}" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" />`,
    )}
    <rect
      x="130"
      y="236"
      width="140"
      height="14"
      fill="${OXBLOOD}"
      stroke="${INK}"
      stroke-width="3"
    />
    <rect
      x="188"
      y="232"
      width="24"
      height="22"
      rx="3"
      fill="${GOLD}"
      stroke="${INK}"
      stroke-width="3"
    />
    <path
      d="M252 128L128 300"
      fill="none"
      stroke="${INK}"
      stroke-width="12"
      stroke-linecap="round"
    />
    <path
      d="M252 128L128 300"
      fill="none"
      stroke="${LINING}"
      stroke-width="6"
      stroke-linecap="round"
    />
    <g class="courier-satchel">
      <path
        d="M128 300L116 318"
        fill="none"
        stroke="${LINING}"
        stroke-width="6"
        stroke-linecap="round"
      />
      <rect
        x="84"
        y="312"
        width="62"
        height="50"
        rx="6"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="3.5"
      />
      <path
        d="M84 322Q115 346 146 322"
        fill="${LINING}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <circle cx="115" cy="338" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" />
    </g>
    <path
      d="M150 120L134 168L170 140Z"
      fill="${COAT_DEEP}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M250 120L266 168L230 140Z"
      fill="${COAT_DEEP}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M154 112Q200 142 246 112L250 124Q200 156 150 124Z"
      fill="${VOID}"
      stroke="${INK}"
      stroke-width="3"
    />
    <path
      d="M152 94Q200 70 248 94L244 106Q200 92 156 106Z"
      fill="${COAT}"
      stroke="${INK}"
      stroke-width="3.5"
      stroke-linejoin="round"
    />
    <rect
      x="142"
      y="102"
      width="116"
      height="9"
      rx="4"
      fill="${COAT_DEEP}"
      stroke="${INK}"
      stroke-width="3"
    />
    <path
      d="M192 90l8 -9l8 9l-8 6Z"
      fill="${GOLD}"
      stroke="${INK}"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path
      d="M262 150Q300 166 318 206"
      fill="none"
      stroke="${INK}"
      stroke-width="18"
      stroke-linecap="round"
    />
    <path
      d="M262 150Q300 166 318 206"
      fill="none"
      stroke="${COAT}"
      stroke-width="12"
      stroke-linecap="round"
    />
    <g class="courier-slip">
      <rect
        x="304"
        y="208"
        width="46"
        height="58"
        rx="3"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="3"
      />
      <path d="M304 222H350" stroke="${OXBLOOD}" stroke-width="3" />
      <g stroke="${INK}" stroke-width="2.5" stroke-linecap="round" transform="translate(0 20)">
        ${SLIP_LINES.map((d) => html`<path d="${d}" />`)}
      </g>
      <circle cx="336" cy="254" r="6" fill="none" stroke="${OXBLOOD}" stroke-width="2.5" />
      <circle cx="310" cy="222" r="11" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <path d="M304 216Q310 212 316 216" fill="none" stroke="${INK}" stroke-width="2.5" />
    </g>
    <path
      d="M50 410Q200 470 350 410Q352 440 200 462Q48 440 50 410Z"
      fill="none"
      stroke="${INK}"
      stroke-width="8"
      stroke-linejoin="round"
    />
    <ellipse
      class="courier-rim"
      cx="200"
      cy="412"
      rx="156"
      ry="50"
      fill="none"
      stroke="${GOLD}"
      stroke-width="4"
      stroke-dasharray="14 10"
    />
    <rect x="0" y="470" width="400" height="30" fill="${LINING}" />
    <rect x="0" y="470" width="400" height="8" fill="${INK}" stroke="${GOLD}" stroke-width="2.5" />
    <text
      x="200"
      y="494"
      text-anchor="middle"
      font-family="Georgia, serif"
      font-weight="700"
      font-size="13"
      fill="${CREAM}"
      letter-spacing="3"
    >
      ASKING DISCOURAGED
    </text>
  </svg>`;
}

/**
 * The Courier on a page: the drawing in a figure, credited, and the page's one
 * `data-host` so the sound script poses it. Used by the pages the Courier
 * visits (the Dispatch "check your inbox" page and the thank-you page).
 */
export function courierFigure(): SafeHtml {
  // prettier-ignore
  return html`<figure class="courier-figure" data-host>${courierArt()}<figcaption>Sketch by ${COURIER_ARTIST}.</figcaption></figure>`;
}

/**
 * The Courier's layout and motion, added to the shop's stylesheet. Nothing
 * moves unless the sound script has given the figure a data-pose, and the
 * stylesheet's reduced-motion rule stops the rest.
 */
export const COURIER_CSS = `/* The Courier (note 0016): still until the figure has a pose */
.prose:has(> .courier-figure) { display: flow-root; }
.courier-figure { margin: 0 auto 1rem; width: min(10rem, 45%); }
@media (min-width: 40rem) { .courier-figure { float: right; margin: 0 0 1rem 1.5rem; width: 11rem; } }
.prose:has(> .courier-figure) .certificate-moment { clear: both; }
.courier-art { display: block; width: 100%; height: auto; }
.courier-figure figcaption { margin: 0; padding: 0.2rem 0 0; text-align: center; font-size: 0.75rem; font-style: normal; color: var(--muted); }
.courier-satchel, .courier-slip, .courier-legs { transform-box: fill-box; }
.courier-satchel { transform-origin: 50% 0%; }
.courier-slip { transform-origin: 0% 100%; }
.courier-legs { transform-origin: 50% 0%; }
.courier-figure[data-pose] .courier-rim { animation: courier-turn 5s linear infinite; }
.courier-figure[data-pose] .courier-satchel { animation: courier-swing 3.6s ease-in-out infinite; }
.courier-figure[data-pose] .courier-slip { animation: courier-offer 4.4s ease-in-out infinite; }
.courier-figure[data-pose] .courier-legs { animation: courier-draw 5.2s ease-in-out infinite; }
@keyframes courier-turn { to { stroke-dashoffset: -48; } }
@keyframes courier-swing { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
@keyframes courier-offer { 0%, 100% { transform: rotate(0); } 40%, 60% { transform: rotate(-12deg); } }
@keyframes courier-draw { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.82); } }
`;
