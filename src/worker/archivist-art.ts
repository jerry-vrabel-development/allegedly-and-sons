/**
 * The Archivist (design note 0016): the drawing, the names of its moving
 * parts, and the styles that move them. One file, so another artist's version
 * can replace this one without touching the page.
 *
 * A tall, narrow, grey-green clerk from the Stacks, a dimension with two
 * directions, alphabetical and chronological. Four arms (stamp, glasses, tea,
 * ledger) and three eyes in a column behind half-moon lenses. He states what
 * the object is, flatly, and he is always right. Speaking is not built yet:
 * he is only seen.
 *
 * He is drawn still. The page's host figure carries a data-pose once the
 * effects script is running; while it does, the Archivist stamps and turns a
 * page too (the stage's `:has([data-pose])`), and when the host is held still
 * with the "Motion" toggle, or the visitor has no effects, he is a still
 * drawing. Colors are attributes, never inline styles, so the page's
 * `style-src 'self'` policy holds. Ids start "archivist-" so they can't
 * collide with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew him. Until a partnered artist does, the Bureau. */
export const ARCHIVIST_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const ARCHIVIST_PARTS = [
  "archivist-stamp",
  "archivist-glasses",
  "archivist-eye",
  "archivist-page",
] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const OXBLOOD = "#7a1f1f";
const STAGE = "#2b1210";
const LINING = "#3a2418";
const STEEL = "#cfd3d6";
// His own colour: the grey-green of something that has lived indoors for ages.
const SAGE = "#9db0a1";
const SHADE = "#7c9183";

export function archivistArt(): SafeHtml {
  return html`<svg
    class="archivist-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="archivist-title archivist-desc"
  >
    <title id="archivist-title">The Archivist</title>
    <desc id="archivist-desc">
      A tall, narrow, grey-green clerk with four arms and three eyes in a column behind half-moon
      glasses, in a visor and sleeve garters. At his desk in front of shelves of archive boxes he
      adjusts his glasses, holds a cup of tea, turns a ledger page and stamps a sheet. A paperclip
      lies by the ledger.
    </desc>
    <defs>
      <clipPath id="archivist-eye-clip"><ellipse cx="200" cy="200" rx="15" ry="12" /></clipPath>
    </defs>
    <rect width="400" height="500" fill="${STAGE}" />
    <g fill="${LINING}" stroke="${INK}" stroke-width="2">
      <rect x="0" y="118" width="400" height="8" />
      <rect x="0" y="238" width="400" height="8" />
      <rect x="0" y="358" width="400" height="8" />
      <rect x="14" y="66" width="46" height="52" />
      <rect x="64" y="82" width="38" height="36" />
      <rect x="106" y="60" width="50" height="58" />
      <rect x="244" y="74" width="44" height="44" />
      <rect x="292" y="58" width="52" height="60" />
      <rect x="348" y="80" width="40" height="38" />
      <rect x="10" y="186" width="52" height="52" />
      <rect x="66" y="170" width="44" height="68" />
      <rect x="114" y="196" width="36" height="42" />
      <rect x="250" y="178" width="46" height="60" />
      <rect x="300" y="194" width="40" height="44" />
      <rect x="344" y="172" width="46" height="66" />
      <rect x="16" y="304" width="44" height="54" />
      <rect x="64" y="290" width="48" height="68" />
      <rect x="282" y="298" width="50" height="60" />
      <rect x="336" y="310" width="48" height="48" />
    </g>
    <g fill="${GOLD}" opacity="0.8">
      <rect x="24" y="96" width="26" height="8" />
      <rect x="72" y="100" width="22" height="7" />
      <rect x="116" y="94" width="30" height="8" />
      <rect x="252" y="96" width="26" height="8" />
      <rect x="302" y="92" width="32" height="8" />
      <rect x="354" y="98" width="24" height="7" />
      <rect x="18" y="216" width="32" height="8" />
      <rect x="72" y="214" width="30" height="8" />
      <rect x="120" y="222" width="22" height="7" />
      <rect x="258" y="212" width="30" height="8" />
      <rect x="306" y="220" width="26" height="7" />
      <rect x="352" y="210" width="30" height="8" />
      <rect x="24" y="334" width="28" height="8" />
      <rect x="72" y="332" width="32" height="8" />
      <rect x="290" y="336" width="34" height="8" />
      <rect x="344" y="338" width="30" height="8" />
    </g>
    <g class="archivist-glasses">
      <path
        d="M164 288Q108 274 116 214Q120 178 158 164"
        fill="none"
        stroke="${INK}"
        stroke-width="24"
        stroke-linecap="round"
      />
      <path
        d="M164 288Q108 274 116 214Q120 178 158 164"
        fill="none"
        stroke="${CREAM}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path d="M110 226L124 222" stroke="${OXBLOOD}" stroke-width="7" stroke-linecap="round" />
      <circle cx="166" cy="162" r="9" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
      <path d="M163 156l5 -3M164 162l6 -1" stroke="${INK}" stroke-width="1.5" fill="none" />
    </g>
    <g>
      <path
        d="M238 288Q292 274 288 236Q286 214 266 208"
        fill="none"
        stroke="${INK}"
        stroke-width="24"
        stroke-linecap="round"
      />
      <path
        d="M238 288Q292 274 288 236Q286 214 266 208"
        fill="none"
        stroke="${CREAM}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path d="M282 246L294 244" stroke="${OXBLOOD}" stroke-width="7" stroke-linecap="round" />
      <circle cx="262" cy="206" r="9" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
      <path
        d="M246 184h30v12a15 15 0 0 1-30 0Z"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path d="M276 188a7 7 0 0 1 0 12" fill="none" stroke="${INK}" stroke-width="2.5" />
      <ellipse cx="262" cy="214" rx="22" ry="5" fill="${GOLD}" stroke="${INK}" stroke-width="2" />
    </g>
    <path
      d="M164 306Q118 330 128 366"
      fill="none"
      stroke="${INK}"
      stroke-width="24"
      stroke-linecap="round"
    />
    <path
      d="M164 306Q118 330 128 366"
      fill="none"
      stroke="${CREAM}"
      stroke-width="18"
      stroke-linecap="round"
    />
    <path d="M124 330L136 336" stroke="${OXBLOOD}" stroke-width="7" stroke-linecap="round" />
    <g class="archivist-stamp">
      <path
        d="M238 306Q292 322 276 354"
        fill="none"
        stroke="${INK}"
        stroke-width="24"
        stroke-linecap="round"
      />
      <path
        d="M238 306Q292 322 276 354"
        fill="none"
        stroke="${CREAM}"
        stroke-width="18"
        stroke-linecap="round"
      />
      <path d="M268 322L282 330" stroke="${OXBLOOD}" stroke-width="7" stroke-linecap="round" />
      <rect
        x="268"
        y="338"
        width="16"
        height="12"
        rx="3"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2.5"
      />
      <circle cx="276" cy="358" r="9" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
      <rect
        x="262"
        y="366"
        width="28"
        height="9"
        rx="2"
        fill="${OXBLOOD}"
        stroke="${INK}"
        stroke-width="2.5"
      />
    </g>
    <rect x="188" y="236" width="24" height="34" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
    <path
      d="M156 268H244L254 376H146Z"
      fill="${CREAM}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M156 268L192 268L200 376H146Z" fill="${INK}" stroke="${INK}" stroke-width="2" />
    <path d="M244 268L208 268L200 376H254Z" fill="${INK}" stroke="${INK}" stroke-width="2" />
    <path
      d="M192 268L200 280L208 268L206 300L200 372L194 300Z"
      fill="${CREAM}"
      stroke="${INK}"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path d="M196 284H204L202 330H198Z" fill="${GOLD}" stroke="${INK}" stroke-width="1.5" />
    <circle cx="178" cy="318" r="3.5" fill="${GOLD}" />
    <circle cx="178" cy="344" r="3.5" fill="${GOLD}" />
    <circle cx="222" cy="318" r="3.5" fill="${GOLD}" />
    <circle cx="222" cy="344" r="3.5" fill="${GOLD}" />
    <rect
      x="162"
      y="62"
      width="76"
      height="188"
      rx="32"
      fill="${SAGE}"
      stroke="${INK}"
      stroke-width="3"
    />
    <path
      d="M150 96L250 96L264 112L136 112Z"
      fill="${OXBLOOD}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path d="M142 106H258" stroke="${GOLD}" stroke-width="2.5" fill="none" />
    <path
      d="M166 96Q166 64 200 64Q234 64 234 96Z"
      fill="${OXBLOOD}"
      stroke="${INK}"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <ellipse cx="200" cy="130" rx="15" ry="12" fill="#ffffff" stroke="${INK}" stroke-width="3" />
    <circle cx="200" cy="131" r="5" fill="${INK}" />
    <ellipse cx="200" cy="165" rx="15" ry="12" fill="#ffffff" stroke="${INK}" stroke-width="3" />
    <circle cx="200" cy="166" r="5" fill="${INK}" />
    <ellipse cx="200" cy="200" rx="15" ry="12" fill="#ffffff" stroke="${INK}" stroke-width="3" />
    <circle cx="200" cy="201" r="5" fill="${INK}" />
    <g clip-path="url(#archivist-eye-clip)">
      <rect class="archivist-eye" x="182" y="186" width="36" height="28" fill="${SAGE}" />
    </g>
    <g fill="${CREAM}" fill-opacity="0.35" stroke="${GOLD}" stroke-width="2.5">
      <path d="M181 130A19 19 0 0 0 219 130Z" />
      <path d="M181 165A19 19 0 0 0 219 165Z" />
      <path d="M181 200A19 19 0 0 0 219 200Z" />
    </g>
    <path d="M200 148V152M200 183V187" stroke="${GOLD}" stroke-width="2.5" fill="none" />
    <path d="M188 232H212" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" />
    <rect x="0" y="372" width="400" height="128" fill="${LINING}" />
    <rect x="0" y="372" width="400" height="22" fill="${INK}" stroke="${GOLD}" stroke-width="3" />
    <rect
      x="150"
      y="418"
      width="100"
      height="40"
      rx="4"
      fill="${STAGE}"
      stroke="${GOLD}"
      stroke-width="2.5"
    />
    <text
      x="200"
      y="445"
      text-anchor="middle"
      font-family="Georgia, serif"
      font-weight="700"
      font-size="18"
      fill="${CREAM}"
      letter-spacing="3"
    >
      IBID.
    </text>
    <path
      d="M82 376L146 370V394L82 400Z"
      fill="${CREAM}"
      stroke="${INK}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path d="M90 382H138M90 388H132" stroke="${LINING}" stroke-width="2" fill="none" />
    <path
      d="M146 370L208 376V400L146 394Z"
      fill="${CREAM}"
      stroke="${INK}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path
      class="archivist-page"
      d="M146 370L206 376V398L146 392Z"
      fill="#ffffff"
      stroke="${INK}"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path d="M154 380H196M154 386H190" stroke="${LINING}" stroke-width="2" fill="none" />
    <path
      d="M238 388L312 382L318 398L242 404Z"
      fill="${CREAM}"
      stroke="${INK}"
      stroke-width="2.5"
      stroke-linejoin="round"
    />
    <path
      d="M268 390L292 388L294 396L270 398Z"
      fill="none"
      stroke="${OXBLOOD}"
      stroke-width="2.5"
    />
    <path
      d="M326 376h18a5 5 0 0 1 5 5v10a5 5 0 0 1-10 0v-8a2 2 0 0 1 4 0v8"
      fill="none"
      stroke="${STEEL}"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>`;
}

/**
 * The Archivist's layout and motion, added to the shop's stylesheet. Nothing
 * moves unless the host's figure has a data-pose; the stylesheet's
 * reduced-motion rule stops the rest.
 */
export const ARCHIVIST_CSS = `/* The Archivist (note 0016): still until the host has a pose */
.archivist-stage { position: absolute; right: calc(6% + 16.75rem); bottom: 0; width: clamp(8rem, 21%, 11rem); margin: 0; }
.archivist-art { display: block; width: 100%; height: auto; }
.archivist-stage figcaption { margin: 0; padding: 0 0 0.4rem; text-align: center; font-size: 0.85rem; font-style: normal; color: #e9dfcc; }
.archivist-art * { transform-box: fill-box; }
.archivist-glasses { transform-origin: 100% 100%; }
.archivist-eye { transform-origin: top center; transform: scaleY(0); }
.archivist-page { transform-origin: left center; }
@media (max-width: 40rem) { .archivist-stage { right: auto; left: 0.75rem; bottom: 0.6rem; width: 5rem; } .archivist-stage figcaption { display: none; } }
.set:has([data-pose]) .archivist-stamp { animation: archivist-stamp 4.4s ease-in-out infinite; }
.set:has([data-pose]) .archivist-glasses { animation: archivist-glasses 6.5s ease-in-out infinite; }
.set:has([data-pose]) .archivist-eye { animation: archivist-blink 7.3s infinite; }
.set:has([data-pose]) .archivist-page { animation: archivist-page 5.2s ease-in-out infinite; }
.set:has([data-pose="sold"]) .archivist-stamp { animation-duration: 1.1s; }
@keyframes archivist-stamp { 0%, 40%, 100% { transform: translateY(0); } 50%, 60% { transform: translateY(-14px); } 66% { transform: translateY(0); } }
@keyframes archivist-glasses { 0%, 70%, 100% { transform: rotate(0); } 78% { transform: rotate(4deg); } 86% { transform: rotate(0); } }
@keyframes archivist-blink { 0%, 90%, 100% { transform: scaleY(0); } 93%, 96% { transform: scaleY(1); } }
@keyframes archivist-page { 0%, 40%, 100% { transform: scaleX(1); } 60% { transform: scaleX(0.05); } 80% { transform: scaleX(1); } }
`;
