/**
 * Loupe, the Appraiser (design note 0016): the drawing, the names of its
 * moving parts, and the styles that move them. One file, so another artist's
 * version can replace this one without touching the page.
 *
 * One large eye afloat, with a jeweller's loupe on a hinged arm, two small
 * gloved hands holding a gem, and a very small waistcoat. It runs the Vault,
 * values what can't be valued, and talks in ranges. It never states a price
 * or a value in money, and its drawing carries no number. Speaking is not
 * built yet.
 *
 * It is drawn still. On the Vault page the figure is the page's `data-host`,
 * so the sound script gives it a pose (and the "Motion" toggle) exactly as it
 * does for the host on the stage: while it has a data-pose the loupe swings
 * in and out, the pupil narrows, the hands turn the gem and the whole figure
 * bobs. Held still by the toggle, or without effects, it is a still drawing.
 * Colors are attributes, never inline styles, so the page's
 * `style-src 'self'` policy holds. Ids start "loupe-" so they can't collide
 * with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew it. Until a partnered artist does, the Bureau. */
export const LOUPE_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const LOUPE_PARTS = [
  "loupe-bob",
  "loupe-lens",
  "loupe-pupil",
  "loupe-hand",
  "loupe-gem",
] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
// Its own colour: jade.
const JADE = "#2f8f6f";
const JADE_DEEP = "#1d5c47";

/** Faint red veins across the eyeball, as short strokes from the rim in. */
const VEINS = [
  "M104 200q22 6 34 -2",
  "M110 238q24 -2 36 8",
  "M296 196q-22 8 -34 0",
  "M292 242q-24 -4 -36 8",
  "M170 130q6 18 16 22",
] as const;

/** The waistcoat's buttons. */
const BUTTONS = [330, 348, 366] as const;

export function loupeArt(): SafeHtml {
  return html`<svg
    class="loupe-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="loupe-title loupe-desc"
  >
    <title id="loupe-title">Loupe, the Appraiser</title>
    <desc id="loupe-desc">
      A single enormous eye floats in the air with a heavy lid half lowered and a jade-green iris. A
      jeweller's loupe on a hinged arm is swung in front of it. Below the eye, two small gloved
      hands hold a cut gem, and a very small waistcoat with gold buttons hangs under it.
    </desc>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L350 450H50Z" fill="${GOLD}" opacity="0.1" />
    <g fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M52 84l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" />
      <path d="M348 330l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      <path d="M54 290l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
    </g>
    <ellipse cx="200" cy="452" rx="92" ry="10" fill="${INK}" opacity="0.55" />
    <g class="loupe-bob">
      <g>
        <path
          d="M140 316L260 316L246 392Q200 410 154 392Z"
          fill="${OXBLOOD}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M172 316L200 352L228 316"
          fill="${CREAM}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        ${BUTTONS.map(
          (y) =>
            html`<circle
              cx="200"
              cy="${y}"
              r="4.5"
              fill="${GOLD}"
              stroke="${INK}"
              stroke-width="2"
            />`,
        )}
        <path
          d="M234 340Q248 352 242 368"
          fill="none"
          stroke="${GOLD}"
          stroke-width="2.5"
          stroke-linecap="round"
        />
        <circle cx="242" cy="371" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2" />
      </g>
      <ellipse
        cx="200"
        cy="206"
        rx="112"
        ry="98"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="4"
      />
      <g fill="none" stroke="${OXBLOOD}" stroke-width="2" stroke-linecap="round" opacity="0.7">
        ${VEINS.map((d) => html`<path d="${d}" />`)}
      </g>
      <circle cx="206" cy="212" r="52" fill="${JADE}" stroke="${INK}" stroke-width="3.5" />
      <circle cx="206" cy="212" r="38" fill="none" stroke="${JADE_DEEP}" stroke-width="5" />
      <circle class="loupe-pupil" cx="206" cy="212" r="22" fill="${INK}" />
      <circle cx="194" cy="198" r="7" fill="#ffffff" />
      <path
        d="M90 206Q96 112 200 110Q304 112 310 206Q300 172 200 168Q100 172 90 206Z"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M96 190Q200 150 304 190"
        fill="none"
        stroke="${LINING}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <g stroke="${INK}" stroke-width="4" stroke-linecap="round">
        <path d="M132 142l-10 -16" />
        <path d="M170 122l-4 -18" />
        <path d="M214 118l2 -18" />
        <path d="M258 128l8 -16" />
        <path d="M290 150l14 -12" />
      </g>
      <g class="loupe-lens">
        <path
          d="M254 224Q312 196 330 118"
          fill="none"
          stroke="${INK}"
          stroke-width="9"
          stroke-linecap="round"
        />
        <path
          d="M254 224Q312 196 330 118"
          fill="none"
          stroke="${GOLD}"
          stroke-width="4"
          stroke-linecap="round"
        />
        <circle cx="330" cy="114" r="8" fill="${GOLD}" stroke="${INK}" stroke-width="3" />
        <circle cx="228" cy="226" r="40" fill="#cfeaf0" opacity="0.4" />
        <circle cx="228" cy="226" r="40" fill="none" stroke="${INK}" stroke-width="11" />
        <circle cx="228" cy="226" r="40" fill="none" stroke="${GOLD}" stroke-width="6" />
        <path
          d="M208 212Q216 202 230 202"
          fill="none"
          stroke="#ffffff"
          stroke-width="4"
          stroke-linecap="round"
        />
      </g>
      <g class="loupe-hand loupe-hand-l">
        <path
          d="M142 330Q118 342 118 372"
          fill="none"
          stroke="${INK}"
          stroke-width="9"
          stroke-linecap="round"
        />
        <path
          d="M142 330Q118 342 118 372"
          fill="none"
          stroke="${CREAM}"
          stroke-width="4"
          stroke-linecap="round"
        />
        <circle cx="118" cy="380" r="12" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
        <path d="M110 388l-3 7M118 391l0 8M126 388l3 7" stroke="${INK}" stroke-width="2.5" />
      </g>
      <g class="loupe-hand loupe-hand-r">
        <path
          d="M258 330Q282 342 282 372"
          fill="none"
          stroke="${INK}"
          stroke-width="9"
          stroke-linecap="round"
        />
        <path
          d="M258 330Q282 342 282 372"
          fill="none"
          stroke="${CREAM}"
          stroke-width="4"
          stroke-linecap="round"
        />
        <circle cx="282" cy="380" r="12" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
        <path d="M274 388l-3 7M282 391l0 8M290 388l3 7" stroke="${INK}" stroke-width="2.5" />
      </g>
      <g class="loupe-gem">
        <path
          d="M265 362l12 -10l14 4l8 12l-10 12l-14 -2Z"
          fill="${JADE}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M277 352l6 14l-4 14M291 356l-8 10l-14 -2"
          fill="none"
          stroke="${CREAM}"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </g>
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
      LOUPE
    </text>
  </svg>`;
}

/**
 * Loupe's layout and motion, added to the shop's stylesheet. It is the Vault
 * page's `data-host`: nothing moves unless the sound script has given the
 * figure a data-pose, and the stylesheet's reduced-motion rule stops the rest.
 */
export const LOUPE_CSS = `/* Loupe (note 0016): still until the figure has a pose */
.prose.vault { display: flow-root; }
.loupe-figure { margin: 0 auto 1rem; width: min(10rem, 45%); }
@media (min-width: 40rem) { .loupe-figure { float: right; margin: 0 0 1rem 1.5rem; width: 11rem; } }
.loupe-art { display: block; width: 100%; height: auto; }
.loupe-figure figcaption { margin: 0; padding: 0.2rem 0 0; text-align: center; font-size: 0.75rem; font-style: normal; color: var(--muted); }
.loupe-bob, .loupe-lens, .loupe-pupil, .loupe-hand, .loupe-gem { transform-box: fill-box; }
.loupe-bob { transform-origin: 50% 50%; }
.loupe-lens { transform-origin: 100% 0%; }
.loupe-pupil { transform-origin: 50% 50%; }
.loupe-hand-l { transform-origin: 50% 0%; --turn: 1; }
.loupe-hand-r { transform-origin: 50% 0%; --turn: -1; }
.loupe-gem { transform-origin: 50% 50%; }
.loupe-figure[data-pose] .loupe-bob { animation: loupe-bob 5s ease-in-out infinite; }
.loupe-figure[data-pose] .loupe-lens { animation: loupe-swing 6s ease-in-out infinite; }
.loupe-figure[data-pose] .loupe-pupil { animation: loupe-narrow 6s ease-in-out infinite; }
.loupe-figure[data-pose] .loupe-hand { animation: loupe-turn 4s ease-in-out infinite; }
.loupe-figure[data-pose] .loupe-gem { animation: loupe-flip 4s ease-in-out infinite; }
@keyframes loupe-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes loupe-swing { 0%, 100% { transform: rotate(0); } 35%, 60% { transform: rotate(48deg); } }
@keyframes loupe-narrow { 0%, 20%, 100% { transform: scale(1); } 45%, 60% { transform: scale(0.5); } }
@keyframes loupe-turn { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(calc(var(--turn) * 14deg)); } }
@keyframes loupe-flip { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-22deg); } }
`;
