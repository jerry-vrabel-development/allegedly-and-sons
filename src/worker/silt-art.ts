/**
 * Silt Prenderby, the first guest (design note 0022): the drawing, the names
 * of its moving parts, and the styles that move them. One file, so another
 * artist's version can replace this one without touching the page.
 *
 * A crab-shaped deep-sea salvage broker from a trench two dimensions down.
 * His shell is a striped broker's suit from the eyes down, with lapels and a
 * tie. A tiny bowler sits between two eyestalks that never look at the same
 * thing. One claw is raised and empty; the other is clamped for good on an
 * invoice that itemises the bubbles. The invoice is to the Bureau, and carries
 * words only: no number, no currency, no price.
 *
 * Drawn still. On his exhibit's page Gerald is the page's `data-host`, so
 * Silt's figure isn't one and he never moves there. His parts are named and
 * styled anyway, so a page that gives him the data-host can pose him: then
 * the claw snaps, the invoice flutters and the eyes look about. Colors are
 * attributes, never inline styles, so the page's `style-src 'self'` policy
 * holds. Ids start "silt-" so they can't collide with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew it. Until a partnered artist does, the Bureau. */
export const SILT_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const SILT_PARTS = ["silt-claw", "silt-receipt", "silt-eyes"] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
// His own colour: deep-trench coral, and the suit he wears over it.
const CORAL = "#d4572e";
const CORAL_DEEP = "#9c3a1c";
const SUIT = "#27324a";
const SUIT_DEEP = "#19213a";

/** Three walking legs a side: where each leaves the shell, bends, and meets the sea floor. */
const LEGS = [
  { from: [118, 262], knee: [76, 300], foot: [62, 424] },
  { from: [126, 282], knee: [96, 330], foot: [100, 426] },
  { from: [140, 298], knee: [124, 352], foot: [140, 428] },
  { from: [282, 262], knee: [324, 300], foot: [338, 424] },
  { from: [274, 282], knee: [304, 330], foot: [300, 426] },
  { from: [260, 298], knee: [276, 352], foot: [260, 428] },
] as const;

/** The suit's pinstripes: x positions, clipped to the shell. */
const STRIPES = [112, 128, 144, 160, 176, 224, 240, 256, 272, 288] as const;

/** The invoice's items: a bubble, then a line where a figure would be. No figures. */
const ITEMS = [76, 90, 104, 118] as const;

/** Bubbles rising behind him. */
const BUBBLES = [
  [64, 120, 7],
  [84, 82, 4],
  [52, 52, 5],
  [356, 300, 6],
  [372, 262, 4],
  [96, 190, 3],
] as const;

export function siltArt(): SafeHtml {
  return html`<svg
    class="silt-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="silt-title silt-desc"
  >
    <title id="silt-title">Silt Prenderby</title>
    <desc id="silt-desc">
      A coral crab-shaped broker on the sea floor. Below his eyes his shell is a dark striped suit,
      with lapels and an oxblood tie. Two eyes on stalks look in different directions, with a tiny
      bowler hat between them, and a sly grin under them. One claw is raised and empty. The other is
      clamped on a long invoice that lists bubbles, one to a line. Six legs stand on the sand, and
      bubbles rise behind him.
    </desc>
    <defs>
      <clipPath id="silt-shell">
        <ellipse cx="200" cy="246" rx="104" ry="64" />
      </clipPath>
    </defs>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L360 440H40Z" fill="${GOLD}" opacity="0.1" />
    <g fill="none" stroke="${CREAM}" stroke-width="2" opacity="0.55">
      ${BUBBLES.map(([cx, cy, r]) => html`<circle cx="${cx}" cy="${cy}" r="${r}" />`)}
    </g>
    <path
      d="M0 418Q100 404 200 416Q300 428 400 412V470H0Z"
      fill="${LINING}"
      stroke="${INK}"
      stroke-width="3"
    />
    <g fill="${CORAL_DEEP}" opacity="0.6">
      <circle cx="40" cy="444" r="3" />
      <circle cx="176" cy="452" r="2.5" />
      <circle cx="318" cy="446" r="3" />
    </g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      ${LEGS.map(
        (leg) =>
          html`<g>
            <path
              d="M${leg.from[0]} ${leg.from[1]}L${leg.knee[0]} ${leg.knee[1]}L${leg.foot[0]} ${leg.foot[1]}"
              stroke="${INK}"
              stroke-width="16"
            />
            <path
              d="M${leg.from[0]} ${leg.from[1]}L${leg.knee[0]} ${leg.knee[1]}L${leg.foot[0]} ${leg.foot[1]}"
              stroke="${CORAL}"
              stroke-width="10"
            />
          </g>`,
      )}
    </g>
    <path
      d="M112 240L72 196"
      fill="none"
      stroke="${INK}"
      stroke-width="20"
      stroke-linecap="round"
    />
    <path
      d="M112 240L72 196"
      fill="none"
      stroke="${CORAL}"
      stroke-width="13"
      stroke-linecap="round"
    />
    <path
      d="M72 196Q40 176 50 140Q74 150 80 176Q92 150 78 124Q110 140 96 184Z"
      fill="${CORAL}"
      stroke="${INK}"
      stroke-width="4"
      stroke-linejoin="round"
    />
    <ellipse cx="200" cy="246" rx="104" ry="64" fill="${CORAL}" stroke="${INK}" stroke-width="4" />
    <g clip-path="url(#silt-shell)">
      <rect x="90" y="226" width="220" height="100" fill="${SUIT}" />
      <g stroke="${CREAM}" stroke-width="1.5" opacity="0.45">
        ${STRIPES.map((x) => html`<path d="M${x} 226V320" />`)}
      </g>
      <path d="M90 226H310" stroke="${INK}" stroke-width="4" />
      <path d="M180 226L200 300L220 226Z" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <path
        d="M180 226L162 226L200 310Z"
        fill="${SUIT_DEEP}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M220 226L238 226L200 310Z"
        fill="${SUIT_DEEP}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M194 232H206L210 280L200 294L190 280Z"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
    </g>
    <ellipse cx="200" cy="246" rx="104" ry="64" fill="none" stroke="${INK}" stroke-width="4" />
    <path
      d="M178 206Q200 220 222 206"
      fill="none"
      stroke="${INK}"
      stroke-width="3.5"
      stroke-linecap="round"
    />
    <path d="M218 206l6 -4" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" />
    <g class="silt-eyes">
      <path
        d="M180 188L152 116"
        fill="none"
        stroke="${INK}"
        stroke-width="11"
        stroke-linecap="round"
      />
      <path
        d="M180 188L152 116"
        fill="none"
        stroke="${CORAL}"
        stroke-width="6"
        stroke-linecap="round"
      />
      <path
        d="M220 188L254 106"
        fill="none"
        stroke="${INK}"
        stroke-width="11"
        stroke-linecap="round"
      />
      <path
        d="M220 188L254 106"
        fill="none"
        stroke="${CORAL}"
        stroke-width="6"
        stroke-linecap="round"
      />
      <circle cx="150" cy="108" r="17" fill="${CREAM}" stroke="${INK}" stroke-width="3.5" />
      <circle cx="141" cy="104" r="7" fill="${INK}" />
      <circle cx="256" cy="98" r="17" fill="${CREAM}" stroke="${INK}" stroke-width="3.5" />
      <circle cx="263" cy="92" r="7" fill="${INK}" />
    </g>
    <path
      d="M170 188Q170 140 200 140Q230 140 230 188Z"
      fill="${INK}"
      stroke="${INK}"
      stroke-width="2"
    />
    <rect x="171" y="172" width="58" height="7" fill="${GOLD}" />
    <ellipse cx="200" cy="188" rx="44" ry="7" fill="${INK}" />
    <path
      d="M288 240L328 196"
      fill="none"
      stroke="${INK}"
      stroke-width="20"
      stroke-linecap="round"
    />
    <path
      d="M288 240L328 196"
      fill="none"
      stroke="${CORAL}"
      stroke-width="13"
      stroke-linecap="round"
    />
    <g class="silt-receipt">
      <path
        d="M306 26H370V150L362 144L354 150L346 144L338 150L330 144L322 150L314 144L306 150Z"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <text
        x="338"
        y="48"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-weight="700"
        font-size="12"
        fill="${OXBLOOD}"
        letter-spacing="1"
      >
        INVOICE
      </text>
      <path d="M314 58H362" stroke="${INK}" stroke-width="2" />
      <g fill="none" stroke="${INK}" stroke-width="2">
        ${ITEMS.map(
          (y) =>
            html`<circle cx="318" cy="${y - 4}" r="4" /><path
                d="M328 ${y - 4}H362"
                stroke-dasharray="3 3"
              />`,
        )}
      </g>
      <text
        x="338"
        y="138"
        text-anchor="middle"
        font-family="Georgia, serif"
        font-size="9"
        fill="${INK}"
      >
        BUBBLES
      </text>
    </g>
    <g class="silt-claw">
      <path
        d="M328 196Q356 186 360 154L340 146Q334 170 318 178Z"
        fill="${CORAL}"
        stroke="${INK}"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M328 196Q312 172 322 146L338 148Q332 168 336 184Z"
        fill="${CORAL_DEEP}"
        stroke="${INK}"
        stroke-width="4"
        stroke-linejoin="round"
      />
    </g>
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
      ALL BUBBLES ITEMISED
    </text>
  </svg>`;
}

/**
 * Silt on his exhibit's page: the drawing in a figure, credited. Not a
 * `data-host` (Gerald is that page's), so he is a still drawing there.
 */
export function siltFigure(): SafeHtml {
  // prettier-ignore
  return html`<figure class="silt-figure">${siltArt()}<figcaption>Sketch by ${SILT_ARTIST}.</figcaption></figure>`;
}

/**
 * Silt's layout and motion, added to the shop's stylesheet. Nothing moves
 * unless a page makes him its data-host and the sound script poses him, and
 * the stylesheet's reduced-motion rule stops the rest.
 */
export const SILT_CSS = `/* Silt Prenderby (note 0022): still until the figure has a pose */
.guest:has(.silt-figure) { display: flow-root; }
.silt-figure { margin: 0 auto 1rem; width: min(11rem, 50%); }
@media (min-width: 40rem) { .silt-figure { float: right; margin: 0 0 1rem 1.5rem; width: 12rem; } }
.silt-art { display: block; width: 100%; height: auto; }
.silt-figure figcaption { margin: 0; padding: 0.2rem 0 0; text-align: center; font-size: 0.75rem; font-style: normal; color: var(--muted); }
.silt-claw, .silt-receipt, .silt-eyes { transform-box: fill-box; }
.silt-claw { transform-origin: 0% 100%; }
.silt-receipt { transform-origin: 50% 100%; }
.silt-eyes { transform-origin: 50% 100%; }
.silt-figure[data-pose] .silt-claw { animation: silt-snap 2.8s ease-in-out infinite; }
.silt-figure[data-pose] .silt-receipt { animation: silt-flutter 3.6s ease-in-out infinite; }
.silt-figure[data-pose] .silt-eyes { animation: silt-look 5s ease-in-out infinite; }
@keyframes silt-snap { 0%, 70%, 100% { transform: rotate(0); } 78% { transform: rotate(-10deg); } 86% { transform: rotate(4deg); } }
@keyframes silt-flutter { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(3deg); } }
@keyframes silt-look { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(-5deg); } 60% { transform: rotate(5deg); } }
`;
