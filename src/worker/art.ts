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

/** SVG artwork by item slug. */
export const ART: Readonly<Record<string, string>> = {
  "alien-paperclip": PAPERCLIP,
  "second-best-quill": QUILL,
  "viking-participation-trophy": TROPHY,
};

export function artPath(slug: string): string {
  return `/assets/art/${slug}.svg`;
}
