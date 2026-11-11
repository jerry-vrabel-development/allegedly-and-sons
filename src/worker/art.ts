/**
 * Illustrated "evidence photos" for each item, served as SVG from
 * /assets/art/<slug>.svg. Original artwork, placeholders until real product
 * photos exist. Presentation attributes only (no inline styles or scripts), so
 * the strict CSP never needs loosening for them.
 */

const W = 800;
const H = 600;

/** The shared evidence-board backdrop with a Bureau exhibit tag. */
function board(exhibit: string, scene: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${String(W)} ${String(H)}">
  <defs>
    <radialGradient id="spot" cx="50%" cy="45%" r="60%">
      <stop offset="0" stop-color="#3a4558"/>
      <stop offset="1" stop-color="#151a23"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#9fe8c6" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#9fe8c6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${String(W)}" height="${String(H)}" fill="url(#spot)"/>
  <rect width="${String(W)}" height="${String(H)}" fill="url(#grid)"/>
  ${scene}
  <g transform="translate(560 500) rotate(-4)">
    <rect width="200" height="64" rx="4" fill="#f4ead2"/>
    <circle cx="20" cy="32" r="7" fill="#151a23"/>
    <text x="40" y="28" font-family="Georgia, serif" font-size="15" fill="#5a1a1a" letter-spacing="2">EVIDENCE</text>
    <text x="40" y="50" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#1b1b1b">${exhibit}</text>
  </g>
</svg>`;
}

const PAPERCLIP = board(
  "AS-0001",
  `<ellipse cx="400" cy="320" rx="230" ry="200" fill="url(#glow)"/>
  <g transform="translate(560 120) rotate(-12)">
    <ellipse cx="0" cy="10" rx="70" ry="16" fill="#8b97ab"/>
    <ellipse cx="0" cy="0" rx="32" ry="20" fill="#c6d3e6"/>
    <circle cx="-40" cy="14" r="4" fill="#9fe8c6"/>
    <circle cx="0" cy="18" r="4" fill="#9fe8c6"/>
    <circle cx="40" cy="14" r="4" fill="#9fe8c6"/>
    <path d="M-20 26 L-60 120 L60 120 L20 26 Z" fill="#9fe8c6" fill-opacity="0.12"/>
  </g>
  <g transform="translate(400 330) rotate(-28)" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-40 -150 V110 A40 40 0 0 0 40 110 V-120 A28 28 0 0 0 -16 -120 V90 A16 16 0 0 0 16 90 V-90"
      stroke="#5f6b7d" stroke-width="16" transform="translate(5 6)"/>
    <path d="M-40 -150 V110 A40 40 0 0 0 40 110 V-120 A28 28 0 0 0 -16 -120 V90 A16 16 0 0 0 16 90 V-90"
      stroke="#e6edf7" stroke-width="12"/>
    <path d="M-40 -150 V110 A40 40 0 0 0 40 110"
      stroke="#ffffff" stroke-width="3" stroke-opacity="0.8" transform="translate(-3 0)"/>
  </g>
  <g fill="#ffffff">
    <circle cx="120" cy="90" r="2"/><circle cx="210" cy="160" r="1.5"/><circle cx="90" cy="300" r="1.5"/>
    <circle cx="700" cy="300" r="2"/><circle cx="650" cy="420" r="1.5"/><circle cx="300" cy="70" r="1.5"/>
  </g>`,
);

const QUILL = board(
  "AS-0002",
  `<ellipse cx="400" cy="330" rx="260" ry="190" fill="#f4ead2" fill-opacity="0.06"/>
  <path d="M250 450 C230 420 270 400 300 415 C340 430 330 470 290 475 C260 478 255 465 250 450 Z" fill="#0d1018"/>
  <circle cx="335" cy="470" r="9" fill="#0d1018"/>
  <circle cx="225" cy="430" r="6" fill="#0d1018"/>
  <g transform="translate(300 440) rotate(-38)">
    <path d="M0 0 L-6 -40 L6 -40 Z" fill="#b8b8c0"/>
    <path d="M0 -40 C-70 -120 -60 -260 10 -380 C40 -270 60 -150 0 -40 Z" fill="#f2ead8"/>
    <path d="M0 -40 C10 -150 8 -260 10 -380" fill="none" stroke="#c9b98f" stroke-width="4"/>
    <g stroke="#d9cbaa" stroke-width="2" fill="none">
      <path d="M4 -90 L-38 -120"/><path d="M5 -140 L-45 -175"/><path d="M6 -190 L-44 -230"/>
      <path d="M7 -240 L-36 -285"/><path d="M8 -290 L-20 -330"/>
      <path d="M5 -100 L36 -130"/><path d="M6 -160 L40 -195"/><path d="M7 -220 L36 -260"/>
    </g>
  </g>
  <g transform="translate(560 150) rotate(8)">
    <rect x="-70" y="-26" width="140" height="52" rx="6" fill="#151a23" stroke="#f4ead2" stroke-width="2"/>
    <text x="0" y="9" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f4ead2">No. 2</text>
  </g>`,
);

const TROPHY = board(
  "AS-0003",
  `<ellipse cx="400" cy="320" rx="230" ry="200" fill="#e0a95b" fill-opacity="0.12"/>
  <g transform="translate(400 300)">
    <path d="M-120 -40 C-180 -40 -180 40 -110 50" fill="none" stroke="#b07a35" stroke-width="16"/>
    <path d="M120 -40 C180 -40 180 40 110 50" fill="none" stroke="#b07a35" stroke-width="16"/>
    <path d="M-120 -80 H120 C120 40 70 100 0 100 C-70 100 -120 40 -120 -80 Z" fill="#d49a4a"/>
    <path d="M-95 -70 C-95 20 -60 80 -20 92" fill="none" stroke="#f5d29a" stroke-width="8" stroke-linecap="round"/>
    <rect x="-18" y="100" width="36" height="50" fill="#b07a35"/>
    <rect x="-80" y="150" width="160" height="34" rx="4" fill="#7c5221"/>
    <rect x="-110" y="184" width="220" height="24" rx="4" fill="#5e3d17"/>
    <path d="M-130 -80 H130" stroke="#b07a35" stroke-width="14" stroke-linecap="round"/>
    <path d="M-60 -95 C-110 -110 -140 -170 -120 -210 C-100 -170 -80 -140 -40 -110 Z" fill="#efe4cf"/>
    <path d="M60 -95 C110 -110 140 -170 120 -210 C100 -170 80 -140 40 -110 Z" fill="#efe4cf"/>
    <path d="M-70 -88 C-70 -130 70 -130 70 -88 Z" fill="#9a9aa2"/>
  </g>`,
);

const RUBBER_BAND = board(
  "AS-0004",
  `<circle cx="190" cy="300" r="78" fill="#b5462e"/>
  <path d="M140 270 C170 250 210 260 230 285" fill="none" stroke="#d9714f" stroke-width="10" stroke-linecap="round"/>
  <circle cx="225" cy="340" r="10" fill="#8e3420"/>
  <circle cx="160" cy="330" r="6" fill="#8e3420"/>
  <circle cx="610" cy="300" r="78" fill="#2f6fa8"/>
  <path d="M570 260 C600 250 630 270 640 300 C620 320 590 310 580 290 Z" fill="#5fa86b"/>
  <path d="M600 340 C620 335 640 345 645 360" fill="none" stroke="#5fa86b" stroke-width="12" stroke-linecap="round"/>
  <path d="M190 218 C330 250 470 250 610 218" fill="none" stroke="#e0503a" stroke-width="12" stroke-linecap="round"/>
  <path d="M190 382 C330 350 470 350 610 382" fill="none" stroke="#e0503a" stroke-width="12" stroke-linecap="round"/>
  <path d="M190 218 C330 250 470 250 610 218" fill="none" stroke="#ffb3a3" stroke-width="3" stroke-opacity="0.7" transform="translate(0 -4)"/>
  <g fill="#ffffff">
    <circle cx="100" cy="110" r="2"/><circle cx="330" cy="130" r="1.5"/><circle cx="480" cy="90" r="2"/>
    <circle cx="720" cy="140" r="1.5"/><circle cx="400" cy="470" r="1.5"/><circle cx="80" cy="480" r="2"/>
  </g>`,
);

const BUTTON = board(
  "AS-0005",
  `<path d="M0 470 C160 430 300 455 420 440 C560 425 680 450 800 430 V600 H0 Z" fill="#8f939b"/>
  <ellipse cx="180" cy="520" rx="46" ry="12" fill="#6f737b"/>
  <ellipse cx="520" cy="505" rx="30" ry="8" fill="#6f737b"/>
  <g transform="translate(640 120)">
    <circle r="54" fill="#2f6fa8"/>
    <path d="M-30 -20 C-10 -35 20 -25 25 0 C5 10 -20 5 -30 -20 Z" fill="#5fa86b"/>
    <path d="M-10 25 C5 20 25 30 28 40" fill="none" stroke="#5fa86b" stroke-width="10" stroke-linecap="round"/>
  </g>
  <ellipse cx="400" cy="300" rx="200" ry="180" fill="url(#glow)"/>
  <g transform="translate(400 290)">
    <circle r="120" fill="#e9e2cf"/>
    <circle r="120" fill="none" stroke="#c9bfa4" stroke-width="10"/>
    <circle r="92" fill="none" stroke="#d5ccb3" stroke-width="4"/>
    <circle cx="-30" cy="-30" r="14" fill="#151a23"/>
    <circle cx="30" cy="-30" r="14" fill="#151a23"/>
    <circle cx="-30" cy="30" r="14" fill="#151a23"/>
    <circle cx="30" cy="30" r="14" fill="#151a23"/>
    <path d="M-80 -60 A100 100 0 0 1 -20 -100" fill="none" stroke="#ffffff" stroke-width="6" stroke-opacity="0.7" stroke-linecap="round"/>
  </g>`,
);

const BUS_TOKEN = board(
  "AS-0006",
  `<ellipse cx="400" cy="300" rx="230" ry="200" fill="#e0a95b" fill-opacity="0.12"/>
  <g transform="translate(400 290)">
    <circle r="150" fill="#b58a3c"/>
    <circle r="138" fill="#d6aa55"/>
    <circle r="138" fill="none" stroke="#9b7430" stroke-width="4" stroke-dasharray="6 8"/>
    <circle r="62" fill="#9b7430"/>
    <circle r="54" fill="#f0d79a"/>
    <path d="M0 0 V-38" stroke="#5e3d17" stroke-width="6" stroke-linecap="round"/>
    <path d="M0 0 L26 14" stroke="#5e3d17" stroke-width="6" stroke-linecap="round"/>
    <circle r="6" fill="#5e3d17"/>
    <text y="-88" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#5e3d17" letter-spacing="3">ROUTE 88</text>
    <text y="92" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#5e3d17" letter-spacing="1">GOOD FOR ONE RIDE</text>
    <path d="M-110 -70 A130 130 0 0 1 -40 -125" fill="none" stroke="#fff3d0" stroke-width="6" stroke-opacity="0.7" stroke-linecap="round"/>
  </g>`,
);

const COMB = board(
  "AS-0007",
  `<path d="M0 430 C180 410 360 440 520 420 C640 405 720 420 800 410 V600 H0 Z" fill="#2a2018"/>
  <g transform="translate(560 300) rotate(12)" fill="#1b140e">
    <ellipse cx="0" cy="40" rx="60" ry="110"/>
    <ellipse cx="-42" cy="-90" rx="16" ry="20"/><ellipse cx="-12" cy="-104" rx="15" ry="19"/>
    <ellipse cx="20" cy="-102" rx="14" ry="18"/><ellipse cx="46" cy="-88" rx="13" ry="16"/>
    <ellipse cx="62" cy="-66" rx="11" ry="13"/>
  </g>
  <g transform="translate(330 330) rotate(-14)">
    <rect x="-150" y="-36" width="300" height="44" rx="10" fill="#8a5a2b"/>
    <rect x="-150" y="-36" width="300" height="12" rx="6" fill="#a97842"/>
    <g fill="#8a5a2b">
      ${Array.from({ length: 24 }, (_, i) => `<rect x="${String(-142 + i * 12)}" y="6" width="7" height="${String(i < 12 ? 64 : 48)}" rx="3"/>`).join("")}
    </g>
    <path d="M-60 10 C-40 60 -20 30 0 70" fill="none" stroke="#c9c9d1" stroke-width="2.5"/>
  </g>
  <g fill="#3d5a35">
    <path d="M60 430 L100 300 L140 430 Z"/><path d="M700 420 L735 320 L770 420 Z"/>
  </g>`,
);

const DUCK = board(
  "AS-0008",
  `<path d="M0 260 C120 230 220 250 300 240 C420 225 560 255 800 235 V260 H0 Z" fill="#1d2633"/>
  <rect y="260" width="800" height="340" fill="#16222e"/>
  <g fill="#0b1118">
    <path d="M560 360 C560 250 600 170 640 150 C670 140 690 160 680 180 C660 175 640 190 630 230 C620 280 625 330 640 360 Z"/>
    <path d="M660 365 C670 330 700 320 720 345 C730 355 735 362 740 365 Z"/>
  </g>
  <circle cx="662" cy="168" r="3" fill="#9fe8c6"/>
  <g stroke="#2c3d50" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M150 390 C200 380 250 400 300 390"/><path d="M480 420 C520 410 560 430 600 420"/>
    <path d="M520 370 C560 362 600 372 640 366"/>
  </g>
  <g transform="translate(300 380)">
    <ellipse cx="0" cy="20" rx="120" ry="18" fill="#0d1520" fill-opacity="0.7"/>
    <path d="M-110 0 C-110 -60 -40 -70 30 -55 C70 -50 100 -40 110 -10 C100 20 60 30 0 30 C-60 30 -110 25 -110 0 Z" fill="#f2c230"/>
    <circle cx="50" cy="-110" r="56" fill="#f2c230"/>
    <path d="M95 -110 L150 -100 L95 -88 Z" fill="#e8762a"/>
    <circle cx="65" cy="-125" r="8" fill="#151a23"/>
    <circle cx="68" cy="-128" r="2.5" fill="#ffffff"/>
    <path d="M-70 -30 C-40 -55 0 -50 20 -30" fill="none" stroke="#d9a51c" stroke-width="8" stroke-linecap="round"/>
    <path d="M20 -150 C35 -165 60 -160 70 -150" fill="none" stroke="#ffe27a" stroke-width="6" stroke-linecap="round"/>
  </g>`,
);

const NIGHT_LIGHT = board(
  "AS-0009",
  `<g fill="#0b0f16">
    <path d="M400 110 C330 120 200 140 90 250 C170 240 240 250 300 290 C320 230 360 200 400 200 C440 200 480 230 500 290 C560 250 630 240 710 250 C600 140 470 120 400 110 Z"/>
    <ellipse cx="400" cy="230" rx="60" ry="110"/>
    <circle cx="400" cy="150" r="42"/>
  </g>
  <circle cx="384" cy="150" r="9" fill="#e0302a"/>
  <circle cx="416" cy="150" r="9" fill="#e0302a"/>
  <circle cx="384" cy="150" r="18" fill="#e0302a" fill-opacity="0.2"/>
  <circle cx="416" cy="150" r="18" fill="#e0302a" fill-opacity="0.2"/>
  <ellipse cx="400" cy="410" rx="170" ry="120" fill="#ffcf6b" fill-opacity="0.18"/>
  <ellipse cx="400" cy="410" rx="90" ry="65" fill="#ffcf6b" fill-opacity="0.2"/>
  <g transform="translate(400 430)">
    <path d="M-70 0 H70 V50 C70 62 60 70 48 70 H-48 C-60 70 -70 62 -70 50 Z" fill="#e9e2cf"/>
    <ellipse cx="0" cy="0" rx="70" ry="14" fill="#f5efe0"/>
    <path d="M0 -60 C18 -35 18 -15 0 -5 C-18 -15 -18 -35 0 -60 Z" fill="#ffcf6b"/>
    <path d="M0 -42 C8 -28 8 -17 0 -11 C-8 -17 -8 -28 0 -42 Z" fill="#fff4d0"/>
  </g>`,
);

const SPARE_CHANGE = board(
  "AS-0010",
  `<g transform="translate(400 330)">
    <path d="M-260 -20 C-250 -120 250 -130 260 -20 C270 90 -270 100 -260 -20 Z" fill="#e8e2f0"/>
    <path d="M-200 -60 C-100 -90 100 -95 200 -60" fill="none" stroke="#cfc7dd" stroke-width="6" stroke-linecap="round"/>
    <g transform="translate(-90 0)">
      <circle r="50" fill="#b07a35"/><circle r="40" fill="#d49a4a"/>
      <circle r="40" fill="none" stroke="#9b6a2a" stroke-width="3" stroke-dasharray="4 5"/>
    </g>
    <g transform="translate(20 -30)">
      <circle r="42" fill="#8f939b"/><circle r="33" fill="#c3c8d1"/>
      <path d="M-16 -8 H16 M-12 4 H12" stroke="#8f939b" stroke-width="4" stroke-linecap="round"/>
    </g>
    <g transform="translate(110 20)">
      <circle r="36" fill="#9a6b3a"/><circle r="28" fill="#c08a52"/>
    </g>
    <g transform="translate(-10 50)">
      <path d="M-22 -20 C-22 -34 22 -34 22 -20 C22 -4 16 10 12 24 C10 30 4 30 2 22 L0 12 L-2 22 C-4 30 -10 30 -12 24 C-16 10 -22 -4 -22 -20 Z" fill="#ffffff" stroke="#cfc7dd" stroke-width="2"/>
    </g>
  </g>
  <g fill="#f4ead2">
    <path d="M150 140 l6 16 l16 6 l-16 6 l-6 16 l-6 -16 l-16 -6 l16 -6 Z"/>
    <path d="M640 120 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5 Z"/>
    <path d="M680 420 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z"/>
    <circle cx="220" cy="470" r="3"/><circle cx="560" cy="180" r="2.5"/>
  </g>`,
);

const BOTTLE_CAP = board(
  "AS-0011",
  `<rect width="800" height="600" fill="#0e2a3a" fill-opacity="0.75"/>
  <path d="M0 470 C200 440 400 470 600 450 C700 440 760 450 800 445 V600 H0 Z" fill="#c9b48a" fill-opacity="0.35"/>
  <g fill="#3d5266">
    <rect x="80" y="230" width="44" height="230"/><rect x="66" y="215" width="72" height="20"/>
    <rect x="170" y="290" width="44" height="170" transform="rotate(8 192 460)"/>
    <rect x="620" y="250" width="44" height="210"/><rect x="606" y="235" width="72" height="20"/>
    <path d="M560 460 L700 460 L690 440 L570 440 Z"/>
  </g>
  <g fill="none" stroke="#9fd3e8" stroke-opacity="0.6" stroke-width="3">
    <circle cx="400" cy="250" r="9"/><circle cx="410" cy="200" r="7"/><circle cx="398" cy="155" r="6"/>
    <circle cx="406" cy="115" r="5"/><circle cx="401" cy="80" r="4"/>
  </g>
  <g transform="translate(400 380)">
    <ellipse cx="0" cy="48" rx="120" ry="18" fill="#0a1a24" fill-opacity="0.6"/>
    <path d="${Array.from({ length: 21 }, (_, i) => {
      const a = (i / 21) * Math.PI * 2;
      const r = i % 2 === 0 ? 110 : 96;
      return `${i === 0 ? "M" : "L"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r * 0.42).toFixed(1)}`;
    }).join(" ")} Z" fill="#b8bec8"/>
    <ellipse cx="0" cy="-6" rx="84" ry="34" fill="#d9dee6"/>
    <ellipse cx="0" cy="-6" rx="84" ry="34" fill="none" stroke="#9aa1ad" stroke-width="3"/>
    <path d="M-50 -20 C-20 -36 30 -34 50 -20" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity="0.7" stroke-linecap="round"/>
  </g>`,
);

const COASTER = board(
  "AS-0012",
  `<g transform="translate(400 300)">
    <circle r="190" fill="#7a5a3a" fill-opacity="0.35"/>
    <circle r="170" fill="#c9a26b"/>
    <circle r="170" fill="none" stroke="#a9824f" stroke-width="6"/>
    <g fill="#a9824f">
      <circle cx="-90" cy="-60" r="3"/><circle cx="60" cy="90" r="3"/><circle cx="110" cy="-40" r="2.5"/>
      <circle cx="-40" cy="120" r="2.5"/><circle cx="20" cy="-130" r="3"/>
    </g>
    <g stroke="#4a3220" stroke-width="4" stroke-linecap="round" fill="none" transform="translate(30 4) scale(1.3)">
      <path d="M-110 -70 h14 m10 0 v-14 m12 14 h14 m10 -14 l10 14 m12 0 h14 m10 0 v-14 m12 14 h14 m10 -14 l10 14 m12 0 h14"/>
      <path d="M-120 -10 c6 -14 14 -14 18 0 m14 0 c6 -14 14 -14 18 0 m14 0 v-14 m14 14 c6 -14 14 -14 18 0 m14 0 v-14 m14 14 c6 -14 14 -14 18 0 m14 0 v-14"/>
      <path d="M-110 50 l8 -12 l8 12 m14 -12 v12 m14 -12 l8 12 l8 -12 m14 12 h14 m10 -12 l8 12 l8 -12 m14 0 v12 m14 -12 l8 12"/>
    </g>
    <path d="M-150 -40 H150 M-160 30 H160" stroke="#a9824f" stroke-width="3"/>
    <circle cx="40" cy="20" r="120" fill="none" stroke="#6b4a2a" stroke-width="8" stroke-opacity="0.35"/>
  </g>`,
);

const PHARAOH_KEY = board(
  "AS-0013",
  `<path d="M0 420 C200 400 400 430 600 410 C700 400 760 410 800 405 V600 H0 Z" fill="#c9a26b"/>
  <path d="M520 410 L620 250 L720 410 Z" fill="#a9824f"/>
  <path d="M620 250 L720 410 L660 410 Z" fill="#8a6a3f"/>
  <path d="M150 120 A40 40 0 1 0 200 170 A32 32 0 1 1 150 120 Z" fill="#f4ead2"/>
  <g transform="translate(330 420) rotate(-18)">
    <ellipse cx="0" cy="30" rx="170" ry="14" fill="#7a5a3a" fill-opacity="0.5"/>
    <circle cx="-110" cy="0" r="52" fill="none" stroke="#b58a3c" stroke-width="18"/>
    <circle cx="-110" cy="0" r="18" fill="#b58a3c"/>
    <rect x="-62" y="-10" width="210" height="20" rx="6" fill="#b58a3c"/>
    <rect x="100" y="10" width="16" height="34" fill="#b58a3c"/>
    <rect x="128" y="10" width="16" height="24" fill="#b58a3c"/>
    <path d="M-60 -6 H140" stroke="#e6c27a" stroke-width="4" stroke-linecap="round"/>
  </g>`,
);

const DODO_FEATHER = board(
  "AS-0014",
  `<g transform="translate(400 320) rotate(-6)">
    <rect x="-210" y="-120" width="420" height="250" rx="4" fill="#f4ead2"/>
    <path d="M-210 -120 L0 20 L210 -120" fill="none" stroke="#d9cfbf" stroke-width="4"/>
    <g stroke="#9a8f80" stroke-width="3" stroke-linecap="round">
      <path d="M-160 60 H40"/><path d="M-160 85 H90"/><path d="M-160 110 H-20"/>
    </g>
    <circle cx="140" cy="70" r="34" fill="#7a1f1f"/>
    <circle cx="140" cy="70" r="24" fill="none" stroke="#5a1414" stroke-width="3"/>
    <path d="M128 70 h24 M140 58 v24" stroke="#5a1414" stroke-width="3"/>
  </g>
  <g transform="translate(330 300) rotate(-35)">
    <path d="M0 140 L0 -170" stroke="#5c5248" stroke-width="5" stroke-linecap="round"/>
    <path d="M0 110 C-60 60 -70 -80 0 -170 C60 -90 55 50 0 110 Z" fill="#8b8178"/>
    <path d="M0 110 C-30 40 -36 -80 0 -170" fill="none" stroke="#a89e94" stroke-width="3"/>
    <g stroke="#6f665d" stroke-width="2" fill="none">
      <path d="M0 60 L-40 30"/><path d="M0 10 L-46 -20"/><path d="M0 -40 L-40 -75"/><path d="M0 -90 L-26 -125"/>
      <path d="M0 40 L36 10"/><path d="M0 -10 L40 -45"/><path d="M0 -60 L32 -95"/>
    </g>
  </g>`,
);

const THIMBLE = board(
  "AS-0015",
  `<g transform="translate(400 380)">
    <ellipse cx="0" cy="40" rx="230" ry="60" fill="#5a1a2a"/>
    <ellipse cx="0" cy="24" rx="230" ry="60" fill="#7a2338"/>
    <path d="M-200 10 C-120 -20 120 -20 200 10" fill="none" stroke="#9a3a50" stroke-width="6" stroke-linecap="round"/>
    <circle cx="-210" cy="40" r="12" fill="#d4a94a"/><circle cx="210" cy="40" r="12" fill="#d4a94a"/>
  </g>
  <g transform="translate(400 300)">
    <path d="M-56 70 L-46 -40 C-44 -84 44 -84 46 -40 L56 70 Z" fill="#c3c8d1"/>
    <ellipse cx="0" cy="70" rx="56" ry="14" fill="#a3a9b4"/>
    <g fill="#8f939b">
      ${Array.from({ length: 5 }, (_, row) =>
        Array.from(
          { length: 6 },
          (_, col) =>
            `<circle cx="${String(-30 + col * 12)}" cy="${String(-40 + row * 18)}" r="3"/>`,
        ).join(""),
      ).join("")}
    </g>
    <path d="M-38 -30 C-40 10 -40 40 -42 60" fill="none" stroke="#ffffff" stroke-width="5" stroke-opacity="0.6" stroke-linecap="round"/>
  </g>
  <g transform="translate(560 210)">
    <path d="M-50 30 L-60 -20 L-25 5 L0 -35 L25 5 L60 -20 L50 30 Z" fill="#d4a94a"/>
    <rect x="-50" y="30" width="100" height="16" fill="#b58a3c"/>
    <circle cx="0" cy="-35" r="7" fill="#e0302a"/><circle cx="-60" cy="-20" r="5" fill="#9fe8c6"/><circle cx="60" cy="-20" r="5" fill="#9fe8c6"/>
  </g>
  <g transform="translate(230 250) rotate(-30)">
    <path d="M0 -90 V80" stroke="#c3c8d1" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="0" cy="-78" rx="3" ry="8" fill="#151a23"/>
    <path d="M0 -78 C40 -60 -30 -20 30 20 C70 50 10 80 40 110" fill="none" stroke="#e0302a" stroke-width="3"/>
  </g>`,
);

const PEBBLE = board(
  "AS-0016",
  `<path d="M0 420 C200 400 400 430 600 410 C700 400 760 410 800 405 V600 H0 Z" fill="#3f5a35"/>
  <g fill="#4f6d43">
    <path d="M60 430 l6 -24 l6 24 Z"/><path d="M120 440 l5 -20 l5 20 Z"/><path d="M700 425 l6 -22 l6 22 Z"/>
  </g>
  <path d="M430 420 C420 300 460 200 560 190 C680 180 740 280 730 420 Z" fill="#7d7f86"/>
  <path d="M460 400 C455 300 490 230 560 222" fill="none" stroke="#9a9ca3" stroke-width="10" stroke-linecap="round"/>
  <rect x="566" y="180" width="18" height="40" rx="3" fill="#1b1f27"/>
  <g transform="translate(300 410)">
    <ellipse cx="0" cy="20" rx="80" ry="12" fill="#26361f"/>
    <ellipse cx="0" cy="0" rx="74" ry="44" fill="#9a9ca3"/>
    <ellipse cx="-14" cy="-12" rx="40" ry="18" fill="#b5b7bd"/>
    <rect x="-3" y="-30" width="6" height="12" rx="1" fill="#1b1f27"/>
  </g>
  <path d="M340 340 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" fill="#f4ead2"/>`,
);

const STAMP = board(
  "AS-0017",
  `<g transform="translate(400 440) rotate(-4)">
    <rect x="-210" y="-60" width="420" height="140" rx="3" fill="#f4ead2"/>
    <g transform="rotate(-6)">
      <rect x="-150" y="-30" width="300" height="70" rx="6" fill="none" stroke="#7a1f1f" stroke-width="7"/>
      <text x="0" y="18" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#7a1f1f" letter-spacing="3">APPROVED</text>
    </g>
  </g>
  <ellipse cx="400" cy="230" rx="170" ry="150" fill="#9fe8c6" fill-opacity="0.12"/>
  <g transform="translate(400 210)">
    <ellipse cx="0" cy="-110" rx="44" ry="40" fill="#8a5a2b"/>
    <rect x="-18" y="-80" width="36" height="80" fill="#8a5a2b"/>
    <rect x="-80" y="0" width="160" height="34" rx="4" fill="#6b4421"/>
    <rect x="-84" y="34" width="168" height="18" rx="2" fill="#2a2a2e"/>
    <path d="M-30 -130 C-20 -142 0 -146 14 -140" fill="none" stroke="#b07a45" stroke-width="6" stroke-linecap="round"/>
  </g>
  <g fill="none" stroke="#9fe8c6" stroke-opacity="0.5" stroke-width="3" stroke-linecap="round">
    <path d="M280 150 C260 180 270 220 250 250"/><path d="M520 150 C540 180 530 220 550 250"/>
  </g>`,
);

const PICK = board(
  "AS-0018",
  `<rect width="800" height="600" fill="#0e2a3a" fill-opacity="0.7"/>
  <g fill="none" stroke="#2f6fa8" stroke-opacity="0.5" stroke-width="4">
    <path d="M400 330 m-60 0 a60 30 0 1 0 120 0 a60 30 0 1 0 -120 0"/>
    <path d="M400 330 m-130 0 a130 65 0 1 0 260 0 a130 65 0 1 0 -260 0"/>
    <path d="M400 330 m-210 0 a210 105 0 1 0 420 0 a210 105 0 1 0 -420 0"/>
  </g>
  <g fill="#5a7b94" fill-opacity="0.7">
    <path d="M180 300 l20 -6 l-8 22 Z"/><path d="M600 380 l18 4 l-14 16 Z"/>
    <path d="M520 250 l14 -4 l-6 16 Z"/><path d="M260 410 l16 2 l-10 14 Z"/>
  </g>
  <g transform="translate(400 250) rotate(-12)">
    <path d="M0 110 C-30 70 -86 -10 -76 -60 C-66 -100 66 -100 76 -60 C86 -10 30 70 0 110 Z" fill="#e0503a"/>
    <path d="M0 110 C-30 70 -86 -10 -76 -60 C-66 -100 66 -100 76 -60 C86 -10 30 70 0 110 Z" fill="none" stroke="#b5392a" stroke-width="5"/>
    <path d="M-52 -64 C-30 -80 20 -80 40 -70" fill="none" stroke="#ffb3a3" stroke-width="6" stroke-linecap="round"/>
  </g>`,
);

const MARBLE = board(
  "AS-0019",
  `<path d="M0 400 H800 V600 H0 Z" fill="#4a4a50"/>
  <ellipse cx="400" cy="470" rx="300" ry="80" fill="none" stroke="#e8e6e0" stroke-width="5" stroke-dasharray="14 10"/>
  <circle cx="610" cy="460" r="22" fill="#2f6fa8"/>
  <circle cx="604" cy="454" r="6" fill="#ffffff" fill-opacity="0.6"/>
  <g transform="translate(400 300)">
    <ellipse cx="0" cy="150" rx="90" ry="16" fill="#26262a" fill-opacity="0.7"/>
    <circle r="130" fill="#9fe8c6" fill-opacity="0.35"/>
    <circle r="130" fill="none" stroke="#9fe8c6" stroke-opacity="0.8" stroke-width="4"/>
    <path d="M-90 20 C-60 -80 60 -80 70 0 C80 70 -20 90 -40 30 C-55 -10 10 -30 20 10" fill="none" stroke="#e0503a" stroke-width="16" stroke-linecap="round"/>
    <path d="M-90 20 C-60 -80 60 -80 70 0" fill="none" stroke="#f2c230" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="-50" cy="-70" rx="34" ry="18" fill="#ffffff" fill-opacity="0.55" transform="rotate(-30 -50 -70)"/>
  </g>`,
);

const FORTUNE = board(
  "AS-0020",
  `<g transform="translate(300 330)">
    <path d="M-120 40 C-130 -40 -60 -90 0 -60 C10 -20 -10 30 -40 60 C-70 80 -110 70 -120 40 Z" fill="#d9a65a"/>
    <path d="M-110 30 C-110 -30 -60 -70 -10 -50" fill="none" stroke="#f0c98a" stroke-width="8" stroke-linecap="round"/>
    <path d="M10 -40 C70 -60 120 -20 110 40 C80 60 40 50 20 20 Z" fill="#c9954a"/>
  </g>
  <g transform="translate(470 300) rotate(-8)">
    <rect x="-40" y="-26" width="300" height="70" rx="2" fill="#f7f3ea"/>
    <g stroke="#3d3a36" stroke-width="2" stroke-linecap="round">
      ${Array.from({ length: 6 }, (_, row) => `<path d="M-28 ${String(-16 + row * 11)} H${String(210 - (row % 3) * 18)}" stroke-dasharray="${String(3 + (row % 2))} 2"/>`).join("")}
    </g>
  </g>
  <g fill="#f4ead2">
    <path d="M610 160 l5 12 l12 5 l-12 5 l-5 12 l-5 -12 l-12 -5 l12 -5 Z"/>
    <circle cx="160" cy="160" r="2.5"/><circle cx="680" cy="470" r="2"/>
  </g>`,
);

/** SVG artwork by item slug. Every catalog item has one (a test checks). */
export const ART: Readonly<Record<string, string>> = {
  "alien-paperclip": PAPERCLIP,
  "second-best-quill": QUILL,
  "viking-participation-trophy": TROPHY,
  "martian-rubber-band": RUBBER_BAND,
  "moonwalkers-spare-button": BUTTON,
  "time-travelers-bus-token": BUS_TOKEN,
  "bigfoots-lost-comb": COMB,
  "loch-ness-bath-duck": DUCK,
  "mothmans-night-light": NIGHT_LIGHT,
  "tooth-fairys-spare-change": SPARE_CHANGE,
  "atlantean-bottle-cap": BOTTLE_CAP,
  "rosetta-coaster": COASTER,
  "pharaohs-spare-key": PHARAOH_KEY,
  "last-dodos-feather": DODO_FEATHER,
  "emperors-lost-thimble": THIMBLE,
  "king-arthurs-lesser-pebble": PEBBLE,
  "haunted-rubber-stamp": STAMP,
  "bermuda-triangle-guitar-pick": PICK,
  "marble-of-infinite-regret": MARBLE,
  "prototype-fortune-cookie-fortune": FORTUNE,
};
