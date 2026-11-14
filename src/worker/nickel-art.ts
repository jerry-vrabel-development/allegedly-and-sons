/**
 * Nickel, the wisecracking register robot (design note 0016): the drawing,
 * the names of its moving parts, and the styles that move them. One file, so
 * another artist's version can replace this one without touching the page.
 *
 * A brass cash-register robot from a dimension of nothing but transactions:
 * a bell on his head, two smug round eyes, a slot for a mouth that feeds out
 * a strip of ticker tape, spindly arms, a keypad chest whose little screen
 * reads HA, and a coin drawer in his belly that bangs open on a punchline. He
 * sits on two reels of tape. He is the only one who truly understands what
 * things cost, and he is not modelled on any existing character. Speaking is
 * not built yet: later his tape would carry the ticker's Lore lines.
 *
 * He is drawn still. While the host's figure carries a data-pose the bell
 * swings, the tape feeds, the arms fling wide and the drawer bangs; held
 * still by the "Motion" toggle, or without effects, he is a still drawing.
 * Colors are attributes, never inline styles, so the page's
 * `style-src 'self'` policy holds. Ids start "nickel-" so they can't collide
 * with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew him. Until a partnered artist does, the Bureau. */
export const NICKEL_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const NICKEL_PARTS = ["nickel-bell", "nickel-tape", "nickel-arm", "nickel-drawer"] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
// His own colour: brass.
const BRASS = "#cf9a45";
const BRASS_SHADE = "#a97429";

/** The keypad: three rows of four keys on his chest. */
const KEYS = [
  { x: 152, y: 262, colour: OXBLOOD },
  { x: 180, y: 262, colour: CREAM },
  { x: 208, y: 262, colour: OXBLOOD },
  { x: 236, y: 262, colour: CREAM },
  { x: 152, y: 284, colour: CREAM },
  { x: 180, y: 284, colour: OXBLOOD },
  { x: 208, y: 284, colour: CREAM },
  { x: 236, y: 284, colour: OXBLOOD },
  { x: 152, y: 306, colour: OXBLOOD },
  { x: 180, y: 306, colour: CREAM },
  { x: 208, y: 306, colour: OXBLOOD },
  { x: 236, y: 306, colour: CREAM },
] as const;

/** The coins on the open drawer. */
const COINS = [150, 200, 250] as const;

export function nickelArt(): SafeHtml {
  return html`<svg
    class="nickel-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="nickel-title nickel-desc"
  >
    <title id="nickel-title">Nickel, the register robot</title>
    <desc id="nickel-desc">
      A brass cash-register robot with a bell on his head and two smug round eyes. A strip of ticker
      tape feeds out of the slot that is his mouth. His keypad chest has a little screen that reads
      HA, a drawer of coins stands open in his belly, and he sits on two reels of tape with his
      spindly arms flung out.
    </desc>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L330 440H70Z" fill="${GOLD}" opacity="0.1" />
    <g fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M52 90l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" />
      <path d="M346 150l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      <path d="M50 300l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
    </g>
    <g>
      <circle cx="130" cy="432" r="36" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <circle cx="130" cy="432" r="22" fill="none" stroke="${LINING}" stroke-width="3" />
      <circle cx="130" cy="432" r="9" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" />
      <circle cx="270" cy="432" r="36" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <circle cx="270" cy="432" r="22" fill="none" stroke="${LINING}" stroke-width="3" />
      <circle cx="270" cy="432" r="9" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" />
    </g>
    <g>
      <path
        d="M168 358L164 404"
        fill="none"
        stroke="${INK}"
        stroke-width="16"
        stroke-linecap="round"
      />
      <path
        d="M168 358L164 404"
        fill="none"
        stroke="${BRASS_SHADE}"
        stroke-width="10"
        stroke-linecap="round"
      />
      <path
        d="M232 358L236 404"
        fill="none"
        stroke="${INK}"
        stroke-width="16"
        stroke-linecap="round"
      />
      <path
        d="M232 358L236 404"
        fill="none"
        stroke="${BRASS_SHADE}"
        stroke-width="10"
        stroke-linecap="round"
      />
      <rect
        x="148"
        y="398"
        width="34"
        height="12"
        rx="5"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="2.5"
      />
      <rect
        x="218"
        y="398"
        width="34"
        height="12"
        rx="5"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="2.5"
      />
    </g>
    <g class="nickel-arm nickel-arm-l">
      <path
        d="M124 234Q80 250 74 322"
        fill="none"
        stroke="${INK}"
        stroke-width="16"
        stroke-linecap="round"
      />
      <path
        d="M124 234Q80 250 74 322"
        fill="none"
        stroke="${BRASS_SHADE}"
        stroke-width="10"
        stroke-linecap="round"
      />
      <circle cx="73" cy="330" r="10" fill="${BRASS}" stroke="${INK}" stroke-width="3" />
      <path d="M66 336l-4 8M74 338l-1 9M81 335l3 8" stroke="${INK}" stroke-width="2.5" />
    </g>
    <g class="nickel-arm nickel-arm-r">
      <path
        d="M276 234Q320 250 326 322"
        fill="none"
        stroke="${INK}"
        stroke-width="16"
        stroke-linecap="round"
      />
      <path
        d="M276 234Q320 250 326 322"
        fill="none"
        stroke="${BRASS_SHADE}"
        stroke-width="10"
        stroke-linecap="round"
      />
      <circle cx="327" cy="330" r="10" fill="${BRASS}" stroke="${INK}" stroke-width="3" />
      <path d="M334 336l4 8M326 338l1 9M319 335l-3 8" stroke="${INK}" stroke-width="2.5" />
    </g>
    <rect
      x="118"
      y="192"
      width="164"
      height="170"
      rx="12"
      fill="${BRASS}"
      stroke="${INK}"
      stroke-width="3"
    />
    <rect
      x="138"
      y="204"
      width="124"
      height="34"
      rx="4"
      fill="${INK}"
      stroke="${GOLD}"
      stroke-width="2.5"
    />
    <text
      x="200"
      y="229"
      text-anchor="middle"
      font-family="ui-monospace, Menlo, Consolas, monospace"
      font-weight="700"
      font-size="22"
      fill="${CREAM}"
      letter-spacing="4"
    >
      HA
    </text>
    ${KEYS.map(
      (key) =>
        html`<circle
          cx="${key.x}"
          cy="${key.y}"
          r="8"
          fill="${key.colour}"
          stroke="${INK}"
          stroke-width="2.5"
        />`,
    )}
    <g class="nickel-drawer">
      <path
        d="M140 358L260 358L276 384L124 384Z"
        fill="${LINING}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      ${COINS.map(
        (x) =>
          html`<ellipse
            cx="${x}"
            cy="372"
            rx="11"
            ry="5"
            fill="${GOLD}"
            stroke="${INK}"
            stroke-width="2"
          />`,
      )}
      <rect
        x="140"
        y="336"
        width="120"
        height="22"
        rx="3"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="3"
      />
      <path d="M186 347H214" stroke="${INK}" stroke-width="4" stroke-linecap="round" />
    </g>
    <rect
      x="136"
      y="116"
      width="128"
      height="80"
      rx="12"
      fill="${BRASS}"
      stroke="${INK}"
      stroke-width="3"
    />
    <circle cx="146" cy="126" r="3" fill="${INK}" />
    <circle cx="254" cy="126" r="3" fill="${INK}" />
    <circle cx="172" cy="152" r="15" fill="#ffffff" stroke="${INK}" stroke-width="3" />
    <circle cx="228" cy="152" r="15" fill="#ffffff" stroke="${INK}" stroke-width="3" />
    <circle cx="176" cy="156" r="6" fill="${OXBLOOD}" />
    <circle cx="224" cy="156" r="6" fill="${OXBLOOD}" />
    <path
      d="M157 152A15 15 0 0 1 187 152Z"
      fill="${BRASS_SHADE}"
      stroke="${INK}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path
      d="M213 152A15 15 0 0 1 243 152Z"
      fill="${BRASS_SHADE}"
      stroke="${INK}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <rect x="172" y="178" width="56" height="9" rx="4.5" fill="${INK}" />
    <path
      d="M232 183q9 -1 13 -9"
      fill="none"
      stroke="${INK}"
      stroke-width="3"
      stroke-linecap="round"
    />
    <g class="nickel-tape">
      <path
        d="M200 186Q260 196 252 238Q246 268 292 270"
        fill="none"
        stroke="${INK}"
        stroke-width="14"
        stroke-linecap="round"
      />
      <path
        d="M200 186Q260 196 252 238Q246 268 292 270"
        fill="none"
        stroke="${CREAM}"
        stroke-width="9"
        stroke-linecap="round"
      />
      <path
        d="M200 186Q260 196 252 238Q246 268 292 270"
        fill="none"
        stroke="${LINING}"
        stroke-width="3"
        stroke-dasharray="3 7"
      />
    </g>
    <g class="nickel-bell">
      <path
        d="M176 118Q176 74 200 70Q224 74 224 118Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <rect
        x="170"
        y="114"
        width="60"
        height="10"
        rx="4"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="3"
      />
      <circle cx="200" cy="130" r="6" fill="${OXBLOOD}" stroke="${INK}" stroke-width="2" />
      <circle cx="200" cy="66" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2.5" />
    </g>
    <rect x="0" y="470" width="400" height="30" fill="${LINING}" />
    <rect x="0" y="470" width="400" height="8" fill="${INK}" stroke="${GOLD}" stroke-width="2.5" />
    <text
      x="200"
      y="494"
      text-anchor="middle"
      font-family="Georgia, serif"
      font-weight="700"
      font-size="14"
      fill="${CREAM}"
      letter-spacing="3"
    >
      NICKEL
    </text>
  </svg>`;
}

/**
 * Nickel's layout and motion, added to the shop's stylesheet. Nothing moves
 * unless the host's figure has a data-pose; the stylesheet's reduced-motion
 * rule stops the rest. He perches above Trixie, so he shows
 * only where the stage is wide enough for the whole cast.
 */
export const NICKEL_CSS = `/* Nickel (note 0016): still until the host has a pose */
.nickel-stage { display: none; position: absolute; top: 0.5rem; right: calc(6% + 16.75rem + clamp(8rem, 21%, 11rem) + 0.75rem); width: clamp(4.5rem, 9%, 5.5rem); margin: 0; }
@media (min-width: 56rem) { .nickel-stage { display: block; } }
.nickel-art { display: block; width: 100%; height: auto; }
.nickel-stage figcaption { margin: 0 -1.5rem; padding: 0.2rem 0 0; white-space: nowrap; text-align: center; font-size: 0.75rem; font-style: normal; color: #e9dfcc; }
.nickel-bell, .nickel-tape, .nickel-arm, .nickel-drawer { transform-box: fill-box; }
.nickel-bell { transform-origin: 50% 0%; }
.nickel-tape { transform-origin: 0% 0%; }
.nickel-arm-l { transform-origin: 100% 0%; --fling: 1; }
.nickel-arm-r { transform-origin: 0% 0%; --fling: -1; }
.nickel-drawer { transform-origin: 50% 0%; }
.set:has([data-pose]) .nickel-bell { animation: nickel-ring 2.4s ease-in-out infinite; }
.set:has([data-pose]) .nickel-tape { animation: nickel-feed 3.2s ease-in-out infinite; }
.set:has([data-pose]) .nickel-arm { animation: nickel-fling 4.2s ease-in-out infinite; }
.set:has([data-pose]) .nickel-drawer { animation: nickel-bang 5.4s ease-in-out infinite; }
.set:has([data-pose="sold"]) .nickel-bell { animation-duration: 0.5s; }
.set:has([data-pose="sold"]) .nickel-drawer { animation-duration: 1.2s; }
@keyframes nickel-ring { 0%, 55%, 100% { transform: rotate(0); } 62% { transform: rotate(-12deg); } 70% { transform: rotate(10deg); } 78% { transform: rotate(-6deg); } 86% { transform: rotate(3deg); } }
@keyframes nickel-feed { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12, 1.18); } }
@keyframes nickel-fling { 0%, 60%, 100% { transform: rotate(0); } 70%, 82% { transform: rotate(calc(var(--fling) * 28deg)); } }
@keyframes nickel-bang { 0%, 56% { transform: scaleY(0.3); } 62%, 80% { transform: scaleY(1.1); } 90%, 100% { transform: scaleY(0.3); } }
`;
