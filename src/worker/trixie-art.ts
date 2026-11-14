/**
 * Trixie Parallax, the host's assistant (design note 0016): the drawing, the
 * names of its moving parts, and the styles that move them. One file, so
 * another artist's version can replace this one without touching the page.
 *
 * A glamorous orchid-skinned showgirl from a dimension where applause is the
 * currency: four graceful arms, a tall fan of plumes, long lashes, a sparkling
 * leotard and a smile that never moves. She presents whatever it is, here a
 * paperclip, as if it were a crown. Glamour and flirtation in costume, plumes
 * and attitude, and never explicit (0016). Speaking is not built yet.
 *
 * She is drawn still. While the host's figure carries a data-pose she sways,
 * her plumes breathe, she sweeps her presenting arm and winks; held still by
 * the "Motion" toggle, or without effects, she is a still drawing. Colors are
 * attributes, never inline styles, so the page's `style-src 'self'` policy
 * holds. Ids start "trixie-" so they can't collide with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew her. Until a partnered artist does, the Bureau. */
export const TRIXIE_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const TRIXIE_PARTS = ["trixie-sway", "trixie-plumage", "trixie-arm", "trixie-wink"] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
const STEEL = "#cfd3d6";
// Her own colour: orchid, from skin to plume tips.
const ORCHID = "#d9a8e6";
const ORCHID_SHADE = "#b985c9";
const ORCHID_DEEP = "#9a5cc0";

/** The fan: each plume is an ellipse turned about the base of the headdress. */
const PLUMES = [
  { angle: -78, colour: GOLD },
  { angle: -52, colour: OXBLOOD },
  { angle: -26, colour: ORCHID_DEEP },
  { angle: 0, colour: GOLD },
  { angle: 26, colour: ORCHID_DEEP },
  { angle: 52, colour: OXBLOOD },
  { angle: 78, colour: GOLD },
] as const;

/** The train: low plumes behind her legs, still. */
const TRAIN = [
  { x: 120, angle: -34, colour: OXBLOOD },
  { x: 150, angle: -16, colour: GOLD },
  { x: 250, angle: 16, colour: GOLD },
  { x: 280, angle: 34, colour: OXBLOOD },
] as const;

function plume(angle: number, colour: string): SafeHtml {
  return html`<g transform="rotate(${angle} 200 160)">
    <ellipse cx="200" cy="94" rx="19" ry="56" fill="${colour}" stroke="${INK}" stroke-width="3" />
    <ellipse cx="200" cy="62" rx="8" ry="12" fill="${CREAM}" stroke="${INK}" stroke-width="1.5" />
    <circle cx="200" cy="62" r="4" fill="${ORCHID_DEEP}" />
  </g>`;
}

export function trixieArt(): SafeHtml {
  return html`<svg
    class="trixie-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="trixie-title trixie-desc"
  >
    <title id="trixie-title">Trixie Parallax, the host's assistant</title>
    <desc id="trixie-desc">
      A glamorous orchid-skinned showgirl with four graceful arms and a tall fan of plumes, in a
      sparkling oxblood leotard, with long lashes and glossy lips. In one hand she holds a paperclip
      on a gold tray as though it were a crown, and she winks.
    </desc>
    <defs>
      <clipPath id="trixie-eye-clip"><ellipse cx="214" cy="178" rx="10" ry="8" /></clipPath>
    </defs>
    <rect width="400" height="500" fill="${STAGE}" />
    <path d="M176 0H224L350 466H50Z" fill="${GOLD}" opacity="0.1" />
    <g fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M44 70l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" />
      <path d="M340 112l3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
      <path d="M62 250l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
      <path d="M352 290l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
    </g>
    <g>
      ${TRAIN.map(
        (feather) =>
          html`<g transform="rotate(${feather.angle} ${feather.x} 462)">
            <ellipse
              cx="${feather.x}"
              cy="404"
              rx="15"
              ry="62"
              fill="${feather.colour}"
              stroke="${INK}"
              stroke-width="3"
            />
          </g>`,
      )}
    </g>
    <g class="trixie-sway">
      <g class="trixie-plumage">${PLUMES.map((feather) => plume(feather.angle, feather.colour))}</g>
      <path
        d="M168 286Q110 272 106 208Q104 176 116 154"
        fill="none"
        stroke="${INK}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path
        d="M168 286Q110 272 106 208Q104 176 116 154"
        fill="none"
        stroke="${ORCHID}"
        stroke-width="12"
        stroke-linecap="round"
      />
      <circle cx="117" cy="150" r="8" fill="${ORCHID}" stroke="${INK}" stroke-width="3" />
      <path
        d="M172 296Q132 322 176 350"
        fill="none"
        stroke="${INK}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path
        d="M172 296Q132 322 176 350"
        fill="none"
        stroke="${ORCHID}"
        stroke-width="12"
        stroke-linecap="round"
      />
      <circle cx="180" cy="352" r="8" fill="${ORCHID}" stroke="${INK}" stroke-width="3" />
      <path
        d="M228 296Q276 326 282 376"
        fill="none"
        stroke="${INK}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path
        d="M228 296Q276 326 282 376"
        fill="none"
        stroke="${ORCHID}"
        stroke-width="12"
        stroke-linecap="round"
      />
      <circle cx="283" cy="382" r="8" fill="${ORCHID}" stroke="${INK}" stroke-width="3" />
      <path
        d="M178 392L174 458L192 458L198 398Z"
        fill="${ORCHID}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M222 392L226 458L208 458L202 398Z"
        fill="${ORCHID}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M166 458H194L198 468H162Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M206 458H234L238 468H202Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M170 264Q200 286 230 264L226 304Q216 328 222 354L238 396Q200 412 162 396L178 354Q184 328 174 304Z"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M170 264Q200 286 230 264"
        fill="none"
        stroke="${GOLD}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <path d="M180 338Q200 346 220 338" fill="none" stroke="${GOLD}" stroke-width="4" />
      <path d="M164 394Q200 410 236 394" fill="none" stroke="${GOLD}" stroke-width="3" />
      <g fill="${GOLD}">
        <circle cx="190" cy="304" r="2.5" />
        <circle cx="206" cy="298" r="2" />
        <circle cx="198" cy="320" r="2.5" />
        <circle cx="212" cy="312" r="2" />
        <circle cx="188" cy="366" r="2.5" />
        <circle cx="208" cy="372" r="2" />
        <circle cx="198" cy="384" r="2.5" />
        <circle cx="216" cy="382" r="2" />
      </g>
      <rect
        x="191"
        y="212"
        width="18"
        height="54"
        fill="${ORCHID_SHADE}"
        stroke="${INK}"
        stroke-width="3"
      />
      <ellipse
        cx="200"
        cy="178"
        rx="35"
        ry="43"
        fill="${ORCHID}"
        stroke="${INK}"
        stroke-width="3"
      />
      <circle cx="165" cy="190" r="4" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
      <circle cx="235" cy="190" r="4" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
      <circle cx="178" cy="198" r="7" fill="${OXBLOOD}" opacity="0.3" />
      <circle cx="222" cy="198" r="7" fill="${OXBLOOD}" opacity="0.3" />
      <path
        d="M172 164Q186 154 198 162M202 162Q214 154 228 164"
        fill="none"
        stroke="${INK}"
        stroke-width="3"
        stroke-linecap="round"
      />
      <ellipse cx="186" cy="178" rx="10" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2.5" />
      <circle cx="187" cy="179" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
      <circle cx="187" cy="179" r="2.2" fill="${INK}" />
      <ellipse cx="214" cy="178" rx="10" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2.5" />
      <circle cx="213" cy="179" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
      <circle cx="213" cy="179" r="2.2" fill="${INK}" />
      <g clip-path="url(#trixie-eye-clip)">
        <rect class="trixie-wink" x="202" y="168" width="24" height="20" fill="${ORCHID}" />
      </g>
      <path
        d="M175 175L168 170M178 171L173 164M183 169L180 162M217 169L220 162M222 171L227 164M225 175L232 170"
        fill="none"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <path
        d="M200 184L198 194Q200 196 203 194"
        fill="none"
        stroke="${INK}"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path
        d="M186 208Q200 198 214 208Q200 222 186 208Z"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path d="M194 207Q200 204 206 207" fill="none" stroke="${CREAM}" stroke-width="1.8" />
      <circle cx="226" cy="196" r="1.8" fill="${INK}" />
      <path
        d="M166 142Q200 112 234 142L228 154Q200 130 172 154Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <circle cx="200" cy="130" r="5" fill="${OXBLOOD}" stroke="${INK}" stroke-width="2" />
      <g class="trixie-arm">
        <path
          d="M232 274Q296 262 300 196Q302 164 296 144"
          fill="none"
          stroke="${INK}"
          stroke-width="18"
          stroke-linecap="round"
        />
        <path
          d="M232 274Q296 262 300 196Q302 164 296 144"
          fill="none"
          stroke="${ORCHID}"
          stroke-width="12"
          stroke-linecap="round"
        />
        <circle cx="296" cy="140" r="8" fill="${ORCHID}" stroke="${INK}" stroke-width="3" />
        <ellipse
          cx="296"
          cy="130"
          rx="28"
          ry="6"
          fill="${GOLD}"
          stroke="${INK}"
          stroke-width="2.5"
        />
        <path
          d="M288 124V104a6 6 0 0 1 12 0v14a10 10 0 0 1-20 0v-12"
          fill="none"
          stroke="${STEEL}"
          stroke-width="3"
          stroke-linecap="round"
        />
        <path
          d="M272 94l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="${GOLD}"
          stroke="${INK}"
          stroke-width="1.5"
        />
        <path
          d="M322 100l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
          fill="${GOLD}"
          stroke="${INK}"
          stroke-width="1.5"
        />
      </g>
    </g>
    <rect x="0" y="468" width="400" height="32" fill="${LINING}" />
    <rect x="0" y="468" width="400" height="8" fill="${INK}" stroke="${GOLD}" stroke-width="2.5" />
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
      TRIXIE PARALLAX
    </text>
  </svg>`;
}

/**
 * Trixie's layout and motion, added to the shop's stylesheet. Nothing moves
 * unless the host's figure has a data-pose; the stylesheet's reduced-motion
 * rule stops the rest. She sits between the inset and the Archivist, so she
 * shows only where the stage is wide enough for all of them.
 */
export const TRIXIE_CSS = `/* Trixie Parallax (note 0016): still until the host has a pose */
.trixie-stage { display: none; position: absolute; right: calc(6% + 16.75rem + clamp(8rem, 21%, 11rem) + 0.25rem); bottom: 0; width: clamp(7rem, 16%, 9.5rem); margin: 0; }
@media (min-width: 56rem) { .trixie-stage { display: block; } }
.trixie-art { display: block; width: 100%; height: auto; }
.trixie-stage figcaption { margin: 0; padding: 0 0 0.4rem; text-align: center; font-size: 0.85rem; font-style: normal; color: #e9dfcc; }
.trixie-sway, .trixie-arm, .trixie-wink { transform-box: fill-box; }
.trixie-sway { transform-origin: 50% 100%; }
.trixie-plumage { transform-box: view-box; transform-origin: 200px 160px; }
.trixie-arm { transform-origin: 0% 100%; }
.trixie-wink { transform-origin: top center; transform: scaleY(0); }
.set:has([data-pose]) .trixie-sway { animation: trixie-sway 5.2s ease-in-out infinite; }
.set:has([data-pose]) .trixie-plumage { animation: trixie-breathe 3.6s ease-in-out infinite; }
.set:has([data-pose]) .trixie-arm { animation: trixie-present 6.4s ease-in-out infinite; }
.set:has([data-pose]) .trixie-wink { animation: trixie-wink 7.1s infinite; }
.set:has([data-pose="sold"]) .trixie-plumage { animation-name: trixie-flare; animation-duration: 1.4s; }
@keyframes trixie-sway { 0%, 100% { transform: rotate(-1.2deg); } 50% { transform: rotate(1.2deg); } }
@keyframes trixie-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes trixie-flare { 0%, 100% { transform: scale(1.1); } 50% { transform: scale(1.2); } }
@keyframes trixie-present { 0%, 35%, 100% { transform: rotate(0); } 50% { transform: rotate(7deg); } 70% { transform: rotate(-4deg); } }
@keyframes trixie-wink { 0%, 86%, 100% { transform: scaleY(0); } 89%, 94% { transform: scaleY(1); } }
`;
