/**
 * Gerald, the Bureau's notary (design note 0016): the drawing, the names of
 * its moving parts, and the styles that move them. One file, so another
 * artist's version can replace this one without touching the page.
 *
 * A small, mild being of clear jelly in a tiny tie, from the dimension next
 * door (he commutes). The rubber stamp he uses is visible inside him between
 * uses. He witnesses the Bureau's certificates, and he is not a notary: the
 * shop's copy already says so, he has never claimed otherwise, and his plate
 * says it too. His drawing carries no number, so it never reads as a real
 * seal, a real signature or an official mark. Speaking is not built yet.
 *
 * He is drawn still. On the pages he visits the figure is the page's
 * `data-host`, so the sound script gives it a pose (and the "Motion" toggle)
 * exactly as it does for the host on the stage: while it has a data-pose he
 * wobbles, the stamp rises through him and comes down, and his tie
 * straightens. Held still by the toggle, or without effects, he is a still
 * drawing. Colors are attributes, never inline styles, so the page's
 * `style-src 'self'` policy holds. Ids start "gerald-" so they can't collide
 * with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew him. Until a partnered artist does, the Bureau. */
export const GERALD_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const GERALD_PARTS = ["gerald-wobble", "gerald-stamp", "gerald-tie"] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
// His own colour: clear aqua jelly.
const JELLY = "#8fe3d8";

/** Small bubbles trapped in the jelly: x, y and radius. */
const BUBBLES = [
  { x: 142, y: 384, r: 6 },
  { x: 262, y: 356, r: 4 },
  { x: 244, y: 218, r: 3 },
  { x: 130, y: 322, r: 3 },
] as const;

export function geraldArt(): SafeHtml {
  return html`<svg
    class="gerald-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="gerald-title gerald-desc"
  >
    <title id="gerald-title">Gerald, the Bureau's notary</title>
    <desc id="gerald-desc">
      A small, mild being of clear aqua jelly in a tiny oxblood tie, with two round eyes and a
      gentle smile. Small bubbles are trapped in the jelly, and a rubber stamp is visible inside his
      body. His plate says he is not a notary.
    </desc>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L350 450H50Z" fill="${GOLD}" opacity="0.1" />
    <g fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M58 110l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" />
      <path d="M344 190l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      <path d="M52 300l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
    </g>
    <ellipse cx="200" cy="452" rx="130" ry="10" fill="${INK}" opacity="0.55" />
    <g class="gerald-wobble">
      <g class="gerald-stamp">
        <rect
          x="188"
          y="340"
          width="24"
          height="40"
          rx="9"
          fill="${OXBLOOD}"
          stroke="${INK}"
          stroke-width="3"
        />
        <rect
          x="182"
          y="334"
          width="36"
          height="12"
          rx="6"
          fill="${GOLD}"
          stroke="${INK}"
          stroke-width="3"
        />
        <rect
          x="162"
          y="380"
          width="76"
          height="20"
          rx="5"
          fill="${LINING}"
          stroke="${INK}"
          stroke-width="3"
        />
        <rect
          x="168"
          y="400"
          width="64"
          height="10"
          rx="3"
          fill="${OXBLOOD}"
          stroke="${INK}"
          stroke-width="2.5"
        />
      </g>
      <path
        d="M88 438C82 300 120 196 200 192C280 196 318 300 312 438C260 456 140 456 88 438Z"
        fill="${JELLY}"
        opacity="0.46"
        stroke="${INK}"
        stroke-width="4"
        stroke-linejoin="round"
      />
      <path
        d="M126 252Q136 222 168 210"
        fill="none"
        stroke="#ffffff"
        stroke-width="8"
        stroke-linecap="round"
        opacity="0.75"
      />
      <path
        d="M110 300Q108 282 114 270"
        fill="none"
        stroke="#ffffff"
        stroke-width="5"
        stroke-linecap="round"
        opacity="0.6"
      />
      <g fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.7">
        ${BUBBLES.map((b) => html`<circle cx="${b.x}" cy="${b.y}" r="${b.r}" />`)}
      </g>
      <circle cx="172" cy="252" r="12" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <circle cx="228" cy="252" r="12" fill="${CREAM}" stroke="${INK}" stroke-width="3" />
      <circle cx="174" cy="254" r="5.5" fill="${INK}" />
      <circle cx="226" cy="254" r="5.5" fill="${INK}" />
      <path
        d="M158 238Q172 232 186 229M214 229Q228 232 242 238"
        fill="none"
        stroke="${INK}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path
        d="M188 278Q200 288 212 278"
        fill="none"
        stroke="${INK}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <g class="gerald-tie">
        <path
          d="M190 292h20l-4 12h-12Z"
          fill="${OXBLOOD}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M194 304h12l6 28l-12 9l-12 -9Z"
          fill="${OXBLOOD}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <circle cx="200" cy="316" r="3.5" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
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
      font-size="13"
      fill="${CREAM}"
      letter-spacing="3"
    >
      GERALD · NOT A NOTARY
    </text>
  </svg>`;
}

/**
 * Gerald on a page: the drawing in a figure, credited, and the page's one
 * `data-host` so the sound script poses it. Used inside an exhibit's Bureau
 * Certificate box, where the shop's copy already has him witnessing.
 */
export function geraldFigure(): SafeHtml {
  // prettier-ignore
  return html`<figure class="gerald-figure" data-host>${geraldArt()}<figcaption>Sketch by ${GERALD_ARTIST}.</figcaption></figure>`;
}

/**
 * Gerald's layout and motion, added to the shop's stylesheet. Nothing moves
 * unless the sound script has given the figure a data-pose, and the
 * stylesheet's reduced-motion rule stops the rest.
 */
export const GERALD_CSS = `/* Gerald (note 0016): still until the figure has a pose */
.certificate:has(> .gerald-figure) { display: flow-root; }
.gerald-figure { margin: 0 auto 0.75rem; width: 6.5rem; }
@media (min-width: 30rem) { .gerald-figure { float: right; margin: 0 0 0.5rem 1rem; } }
.gerald-art { display: block; width: 100%; height: auto; }
.gerald-figure figcaption { margin: 0; padding: 0.2rem 0 0; text-align: center; font-size: 0.7rem; font-style: normal; color: var(--muted); }
.gerald-wobble, .gerald-stamp, .gerald-tie { transform-box: fill-box; }
.gerald-wobble { transform-origin: 50% 100%; }
.gerald-stamp { transform-origin: 50% 100%; }
.gerald-tie { transform-origin: 50% 0%; }
.gerald-figure[data-pose] .gerald-wobble { animation: gerald-wobble 3.4s ease-in-out infinite; }
.gerald-figure[data-pose] .gerald-stamp { animation: gerald-stamp 4.8s ease-in-out infinite; }
.gerald-figure[data-pose] .gerald-tie { animation: gerald-tie 4.8s ease-in-out infinite; }
@keyframes gerald-wobble { 0%, 100% { transform: scale(1, 1); } 25% { transform: scale(1.05, 0.95); } 50% { transform: scale(0.96, 1.04); } 75% { transform: scale(1.03, 0.97); } }
@keyframes gerald-stamp { 0%, 55%, 100% { transform: translateY(0); } 25%, 40% { transform: translateY(-34px); } 48% { transform: translateY(4px); } }
@keyframes gerald-tie { 0%, 50%, 100% { transform: rotate(0); } 10% { transform: rotate(14deg); } 30% { transform: rotate(-8deg); } }
`;
