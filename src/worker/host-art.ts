/**
 * The Back-Room Broadcast's host (design note 0013): the drawing, the names
 * of its moving parts, and the styles that move them. One file, so another
 * artist's version can replace this one without touching the page.
 *
 * A game-show pitchman in a loud coat who is, allegedly, human. The tells:
 * sideways pupils, lids that close from the sides, a few teeth too many, and
 * what the pompadour hides. The reveal is kept for the "sold" pose.
 *
 * He is drawn still. The effects script (src/client/entries/sound.ts) gives
 * the figure a data-pose ("waiting", "pitching", "sold") and the motion
 * starts; visitors without it, and anyone who prefers reduced motion, see a
 * still drawing. Colors are attributes, never inline styles, so the page's
 * `style-src 'self'` policy holds. Ids start "host-" so they can't collide
 * with the page's.
 */

import { html, type SafeHtml } from "./html";

/** Who drew him. Until a partnered artist does, the Bureau. */
export const HOST_ARTIST = "The Bureau";

/**
 * The parts that move, named the same way in any redraw so the motion below
 * keeps working: each is a class on a shape or group in the drawing.
 */
export const HOST_PARTS = [
  "host-bob",
  "host-hair",
  "host-antennae",
  "host-brow-l",
  "host-brow-r",
  "host-pupil",
  "host-lid-l",
  "host-lid-r",
  "host-jaw",
  "host-arm",
  "host-wares",
  "host-lamp",
  "host-sparkles",
] as const;

// The stage is artwork: the same colors in light and dark mode.
const INK = "#1c110d";
const CREAM = "#fbf7ef";
const GOLD = "#e8b931";
const COAT = "#7a1f1f";
const CHECK = "#a8433a";
const SKIN = "#d9d59c";
const SHADE = "#b9b67c";
const STEEL = "#cfd3d6";
const CURTAIN = "#5e1717";
const FOLD = "#4a1111";
const STAGE = "#2b1210";
const LINING = "#3a2418";
const HAIR_SHINE = "#6b4a3a";

export function hostArt(): SafeHtml {
  return html`<svg
    class="host-art"
    viewBox="0 0 400 500"
    role="img"
    aria-labelledby="host-title host-desc"
  >
    <title id="host-title">The Broadcast's host</title>
    <desc id="host-desc">
      A grinning salesman with a tall pompadour, a checked oxblood coat and a microphone. He holds
      his coat open to show a paperclip, a sock and a receipt hanging inside.
    </desc>
    <defs>
      <pattern id="host-check" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="${COAT}" />
        <path d="M0 6H22M6 0V22" stroke="${CHECK}" stroke-width="2.5" fill="none" />
        <path d="M0 15H22M15 0V22" stroke="${GOLD}" stroke-width="0.8" opacity="0.6" fill="none" />
      </pattern>
      <clipPath id="host-eye-l"><ellipse cx="174" cy="182" rx="16" ry="13" /></clipPath>
      <clipPath id="host-eye-r"><ellipse cx="226" cy="182" rx="16" ry="13" /></clipPath>
    </defs>
    <rect width="400" height="500" fill="${CURTAIN}" />
    <g fill="${FOLD}">
      <rect x="30" width="14" height="500" />
      <rect x="92" width="10" height="500" />
      <rect x="150" width="16" height="500" />
      <rect x="232" width="12" height="500" />
      <rect x="296" width="16" height="500" />
      <rect x="356" width="10" height="500" />
    </g>
    <path d="M0 0H400V46Q350 78 300 46Q250 78 200 46Q150 78 100 46Q50 78 0 46Z" fill="${STAGE}" />
    <path
      d="M0 46Q50 78 100 46Q150 78 200 46Q250 78 300 46Q350 78 400 46"
      fill="none"
      stroke="${GOLD}"
      stroke-width="3"
    />
    <rect
      x="286"
      y="92"
      width="96"
      height="38"
      rx="6"
      fill="${INK}"
      stroke="${GOLD}"
      stroke-width="2"
    />
    <circle class="host-lamp" cx="304" cy="111" r="7" fill="#ff5a4a" />
    <text
      x="318"
      y="117"
      font-family="ui-monospace, Menlo, Consolas, monospace"
      font-weight="600"
      font-size="15"
      fill="${CREAM}"
      letter-spacing="1"
    >
      ON AIR
    </text>
    <g class="host-bob">
      <path
        d="M288 300L378 314L366 420L298 420Z"
        fill="${LINING}"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path d="M378 314L366 420" stroke="${GOLD}" stroke-width="4" fill="none" />
      <g class="host-wares">
        <path d="M312 322V338" stroke="${CREAM}" stroke-width="1.5" fill="none" />
        <path
          d="M306 340h10a5 5 0 0 1 5 5v28a7 7 0 0 1-14 0v-22a4 4 0 0 1 8 0v20"
          fill="none"
          stroke="${STEEL}"
          stroke-width="3"
          stroke-linecap="round"
        />
      </g>
      <g class="host-wares host-wares-2">
        <path d="M338 326V342" stroke="${CREAM}" stroke-width="1.5" fill="none" />
        <path
          d="M331 342h14v22l10 8v8h-18l-6-8Z"
          fill="${CREAM}"
          stroke="${INK}"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path d="M331 348h14" stroke="${CHECK}" stroke-width="2.5" fill="none" />
      </g>
      <g class="host-wares host-wares-3">
        <path d="M359 330V344" stroke="${CREAM}" stroke-width="1.5" fill="none" />
        <path
          d="M352 344h14v40l-3.5-3-3.5 3-3.5-3-3.5 3Z"
          fill="#ffffff"
          stroke="${INK}"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
        <path
          d="M355 352h8M355 358h8M355 364h5"
          stroke="${HAIR_SHINE}"
          stroke-width="1.5"
          fill="none"
        />
      </g>
      <path
        d="M98 430L110 302Q120 268 166 262L234 262Q280 268 290 302L302 430Z"
        fill="url(#host-check)"
        stroke="${INK}"
        stroke-width="3"
        stroke-linejoin="round"
      />
      <path
        d="M170 262L230 262L200 344Z"
        fill="${CREAM}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M166 262L200 344L146 326Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <path
        d="M234 262L200 344L254 326Z"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle cx="200" cy="366" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2" />
      <circle cx="200" cy="392" r="5" fill="${GOLD}" stroke="${INK}" stroke-width="2" />
      <path
        d="M282 308Q330 286 368 316"
        fill="none"
        stroke="${INK}"
        stroke-width="40"
        stroke-linecap="round"
      />
      <path
        d="M282 308Q330 286 368 316"
        fill="none"
        stroke="${COAT}"
        stroke-width="34"
        stroke-linecap="round"
      />
      <circle cx="372" cy="318" r="14" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
      <path d="M364 312q8 3 15 0M363 320q9 3 17 0" stroke="${INK}" stroke-width="2" fill="none" />
      <rect
        x="184"
        y="236"
        width="32"
        height="32"
        fill="${SHADE}"
        stroke="${INK}"
        stroke-width="3"
      />
      <path d="M200 272L172 258V288Z" fill="${INK}" />
      <path d="M200 272L228 258V288Z" fill="${INK}" />
      <rect
        x="193"
        y="264"
        width="14"
        height="16"
        rx="3"
        fill="${GOLD}"
        stroke="${INK}"
        stroke-width="2"
      />
      <ellipse cx="138" cy="186" rx="9" ry="14" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
      <ellipse cx="262" cy="186" rx="9" ry="14" fill="${SHADE}" stroke="${INK}" stroke-width="3" />
      <rect
        x="140"
        y="108"
        width="120"
        height="140"
        rx="40"
        fill="${SKIN}"
        stroke="${INK}"
        stroke-width="3"
      />
      <g class="host-hair">
        <path
          d="M130 158Q112 96 168 78Q222 54 268 90Q292 112 270 160Q266 126 236 122Q190 116 152 134Q136 142 130 158Z"
          fill="${INK}"
          stroke="${INK}"
          stroke-width="3"
          stroke-linejoin="round"
        />
        <path
          d="M150 112Q190 78 248 96"
          fill="none"
          stroke="${HAIR_SHINE}"
          stroke-width="5"
          stroke-linecap="round"
        />
        <path
          d="M160 124Q196 100 240 110"
          fill="none"
          stroke="${HAIR_SHINE}"
          stroke-width="3"
          stroke-linecap="round"
        />
      </g>
      <g class="host-antennae">
        <path
          d="M182 112Q172 92 174 76"
          fill="none"
          stroke="${INK}"
          stroke-width="7"
          stroke-linecap="round"
        />
        <path
          d="M182 112Q172 92 174 76"
          fill="none"
          stroke="${SKIN}"
          stroke-width="3"
          stroke-linecap="round"
        />
        <circle cx="174" cy="72" r="8" fill="${GOLD}" stroke="${INK}" stroke-width="3" />
        <path
          d="M218 112Q228 92 226 76"
          fill="none"
          stroke="${INK}"
          stroke-width="7"
          stroke-linecap="round"
        />
        <path
          d="M218 112Q228 92 226 76"
          fill="none"
          stroke="${SKIN}"
          stroke-width="3"
          stroke-linecap="round"
        />
        <circle cx="226" cy="72" r="8" fill="${GOLD}" stroke="${INK}" stroke-width="3" />
      </g>
      <rect class="host-brow-l" x="156" y="156" width="34" height="9" rx="4.5" fill="${INK}" />
      <rect class="host-brow-r" x="210" y="156" width="34" height="9" rx="4.5" fill="${INK}" />
      <ellipse cx="174" cy="182" rx="16" ry="13" fill="#ffffff" stroke="${INK}" stroke-width="3" />
      <ellipse cx="226" cy="182" rx="16" ry="13" fill="#ffffff" stroke="${INK}" stroke-width="3" />
      <rect class="host-pupil" x="165" y="178" width="18" height="8" rx="4" fill="${INK}" />
      <rect class="host-pupil" x="217" y="178" width="18" height="8" rx="4" fill="${INK}" />
      <g clip-path="url(#host-eye-l)" fill="${SHADE}">
        <rect class="host-lid-l" x="158" y="169" width="16.5" height="26" />
        <rect class="host-lid-r" x="173.5" y="169" width="16.5" height="26" />
      </g>
      <g clip-path="url(#host-eye-r)" fill="${SHADE}">
        <rect class="host-lid-l" x="210" y="169" width="16.5" height="26" />
        <rect class="host-lid-r" x="225.5" y="169" width="16.5" height="26" />
      </g>
      <path
        d="M200 186V202H192"
        fill="none"
        stroke="${INK}"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M170 213Q200 204 230 213"
        fill="none"
        stroke="${INK}"
        stroke-width="4.5"
        stroke-linecap="round"
      />
      <rect
        class="host-jaw"
        x="166"
        y="226"
        width="68"
        height="4"
        rx="2"
        fill="${FOLD}"
        stroke="${INK}"
        stroke-width="3"
      />
      <rect
        x="164"
        y="218"
        width="72"
        height="13"
        rx="6"
        fill="#ffffff"
        stroke="${INK}"
        stroke-width="3"
      />
      <path
        d="M171 219V230M178 219V230M185 219V230M192 219V230M199 219V230M206 219V230M213 219V230M220 219V230M227 219V230"
        stroke="${INK}"
        stroke-width="1.5"
        fill="none"
      />
      <g class="host-arm">
        <path
          d="M120 322Q78 300 112 252"
          fill="none"
          stroke="${INK}"
          stroke-width="40"
          stroke-linecap="round"
        />
        <path
          d="M120 322Q78 300 112 252"
          fill="none"
          stroke="${COAT}"
          stroke-width="34"
          stroke-linecap="round"
        />
        <path d="M108 262L140 232" stroke="${INK}" stroke-width="11" stroke-linecap="round" />
        <circle cx="146" cy="226" r="14" fill="${STEEL}" stroke="${INK}" stroke-width="3" />
        <path
          d="M136 220h20M134 226h24M136 232h20"
          stroke="${INK}"
          stroke-width="1.5"
          fill="none"
        />
        <circle cx="112" cy="254" r="15" fill="${SKIN}" stroke="${INK}" stroke-width="3" />
        <path
          d="M103 248q9 4 18 1M102 257q10 4 19 1"
          stroke="${INK}"
          stroke-width="2"
          fill="none"
        />
      </g>
    </g>
    <g class="host-sparkles" fill="${GOLD}" stroke="${INK}" stroke-width="1.5">
      <path d="M96 96l5 13 13 5-13 5-5 13-5-13-13-5 13-5Z" />
      <path d="M318 168l4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
      <path d="M70 186l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
      <path d="M262 62l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" />
    </g>
    <rect x="56" y="410" width="288" height="90" fill="${INK}" />
    <rect
      x="48"
      y="400"
      width="304"
      height="14"
      rx="3"
      fill="${GOLD}"
      stroke="${INK}"
      stroke-width="3"
    />
    <rect
      x="92"
      y="430"
      width="216"
      height="50"
      rx="4"
      fill="none"
      stroke="${GOLD}"
      stroke-width="2"
    />
    <text
      x="200"
      y="452"
      text-anchor="middle"
      font-family="Georgia, serif"
      font-weight="700"
      font-size="15"
      fill="${CREAM}"
      letter-spacing="2"
    >
      ALLEGEDLY &amp; SONS
    </text>
    <text
      x="200"
      y="470"
      text-anchor="middle"
      font-family="Georgia, serif"
      font-style="italic"
      font-size="12"
      fill="${GOLD}"
    >
      The Back-Room Broadcast
    </text>
  </svg>`;
}

/**
 * The host's layout and motion, added to the shop's stylesheet. Nothing moves
 * without a data-pose; the stylesheet's reduced-motion rule stops the rest.
 */
export const HOST_CSS = `/* The Broadcast's host (design note 0013): still until the effects script sets data-pose */
.host-row { display: grid; grid-template-columns: minmax(0, 15rem) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
.host-stage { margin: 0; }
.host-art { display: block; width: 100%; height: auto; border-radius: 10px; }
.host-stage figcaption { margin-top: 0.4rem; font-size: 0.85rem; font-style: normal; color: var(--muted); }
@media (max-width: 40rem) { .host-row { grid-template-columns: minmax(0, 1fr); } .host-stage { max-width: 15rem; } }
.host-art * { transform-box: fill-box; }
.host-bob { transform-origin: center; }
.host-lamp { opacity: 1; }
.host-wares { transform-origin: top center; }
.host-jaw { transform-origin: top center; }
.host-arm { transform-origin: 80% 90%; }
.host-lid-l { transform-origin: left center; transform: scaleX(0); }
.host-lid-r { transform-origin: right center; transform: scaleX(0); }
.host-hair { transform-origin: 30% 100%; transition: transform 260ms cubic-bezier(0.3, 1.6, 0.5, 1); }
.host-antennae { transform-origin: bottom center; transform: scaleY(0.2); opacity: 0; transition: transform 320ms cubic-bezier(0.3, 1.8, 0.5, 1) 80ms, opacity 60ms linear 80ms; }
.host-sparkles { opacity: 0; transform-origin: center; }
.host-brow-l, .host-brow-r, .host-pupil { transform-origin: center; transition: transform 200ms; }
.host-brow-l { transform: rotate(-6deg); }
.host-brow-r { transform: rotate(6deg); }
[data-pose] .host-bob { animation: host-bob 3.2s ease-in-out infinite; }
[data-pose] .host-lid-l, [data-pose] .host-lid-r { animation: host-blink 5.5s infinite; }
[data-pose] .host-wares { animation: host-sway 4s ease-in-out infinite; }
[data-pose] .host-wares-2 { animation-delay: -1.3s; }
[data-pose] .host-wares-3 { animation-delay: -2.4s; }
[data-pose="pitching"] .host-jaw { animation: host-talk 0.34s steps(2, jump-none) infinite; }
[data-pose="pitching"] .host-arm { animation: host-gesture 1.4s ease-in-out infinite; }
[data-pose="pitching"] .host-brow-l { animation: host-waggle 1.4s ease-in-out infinite; }
[data-pose="pitching"] .host-brow-r { animation: host-waggle 1.4s ease-in-out infinite reverse; }
[data-pose="pitching"] .host-lamp, [data-pose="sold"] .host-lamp { animation: host-glow 1.2s ease-in-out infinite; }
[data-pose="sold"] .host-hair { transform: translateY(-34px) rotate(-12deg); }
[data-pose="sold"] .host-antennae { transform: none; opacity: 1; animation: host-boing 0.9s ease-in-out 400ms infinite; }
[data-pose="sold"] .host-jaw { transform: scaleY(4.2); }
[data-pose="sold"] .host-brow-l { transform: translateY(-8px) rotate(-8deg); }
[data-pose="sold"] .host-brow-r { transform: translateY(-8px) rotate(8deg); }
[data-pose="sold"] .host-pupil { transform: scale(0.7); }
[data-pose="sold"] .host-sparkles { opacity: 1; animation: host-twinkle 0.7s steps(2, jump-none) infinite; }
[data-pose="sold"] .host-lid-l, [data-pose="sold"] .host-lid-r { animation-name: none; }
@keyframes host-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(3px); } }
@keyframes host-blink { 0%, 92%, 100% { transform: scaleX(0); } 95%, 97% { transform: scaleX(1); } }
@keyframes host-sway { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes host-talk { 0% { transform: scaleY(1); } 100% { transform: scaleY(3.5); } }
@keyframes host-gesture { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-7deg); } }
@keyframes host-waggle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes host-glow { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
@keyframes host-boing { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
@keyframes host-twinkle { 0% { transform: scale(1); } 100% { transform: scale(0.8); } }
@media (prefers-reduced-motion: reduce) {
  [data-pose="pitching"] .host-jaw { transform: scaleY(3.5); }
}
`;
