/**
 * The shop's stylesheet, served from /assets/site.css so the CSP can allow
 * `style-src 'self'` instead of inline styles.
 *
 * Colors meet WCAG 2.2 AA contrast in light and dark mode. Links are always
 * underlined and the call to action is labeled in words, so nothing relies on
 * color alone.
 */
import { ARCHIVIST_CSS } from "./archivist-art";
import { HOST_CSS } from "./host-art";
import { LOUPE_CSS } from "./loupe-art";
import { NICKEL_CSS } from "./nickel-art";
import { CALLERS_CSS } from "./callers";
import { STAGE_CSS } from "./stage";
import { TICKER_CSS } from "./ticker";
import { TRIXIE_CSS } from "./trixie-art";

export const SITE_CSS = `:root {
  color-scheme: light dark;
  --bg: #fbf7ef;
  --surface: #ffffff;
  --text: #1b1b1b;
  --muted: #4a4540;
  --accent: #7a1f1f;
  --on-accent: #fbf7ef;
  --rule: #d9cfbf;
  --focus: #0b57d0;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #16130f;
    --surface: #211d18;
    --text: #f3ede2;
    --muted: #cfc6b8;
    --accent: #f0b4a8;
    --on-accent: #16130f;
    --rule: #4a4238;
    --focus: #8ab4f8;
  }
}
*, *::before, *::after { box-sizing: border-box; }
html { font-size: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.125rem;
  line-height: 1.6;
}
img { display: block; max-width: 100%; height: auto; }
/* Text for phones only (the wide layout says it elsewhere) */
.phone-only { display: none; }
/* hidden always hides, even on elements styled with display (like .button) */
[hidden] { display: none !important; }
a { color: var(--accent); text-decoration: underline; text-underline-offset: 0.15em; }
a:focus-visible, summary:focus-visible, main:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
  border-radius: 2px;
}
main:focus { outline: none; }
.skip-link {
  position: absolute;
  left: 1rem;
  top: -10rem;
  padding: 0.5rem 1rem;
  background: var(--surface);
  color: var(--text);
  z-index: 10;
}
.skip-link:focus { top: 1rem; }
.wrap { max-width: 68rem; margin: 0 auto; padding: 0 1.25rem; }
.prose { max-width: 44rem; }
header.site, footer.site { border-color: var(--rule); border-style: solid; border-width: 0; }
header.site { border-bottom-width: 1px; padding: 1rem 0; }
header.site .wrap { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: baseline; justify-content: space-between; }
.brand { font-size: 1.25rem; font-weight: bold; color: var(--text); text-decoration: none; }
.brand:hover { text-decoration: underline; }
nav ul { list-style: none; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; margin: 0; padding: 0; }
main { padding: 2rem 0 3rem; }
h1, h2, h3 { line-height: 1.2; }
h1 { font-size: clamp(2rem, 5vw, 3rem); margin: 0 0 0.5rem; }
h2 { font-size: 1.6rem; margin: 2.5rem 0 0.75rem; }
h2.small { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 0.25rem; }
.kicker { font-variant: small-caps; letter-spacing: 0.05em; color: var(--muted); margin: 0; }
.tagline { font-size: 1.25rem; font-style: italic; color: var(--muted); }
.hook { font-size: 1.3rem; font-style: italic; margin: 0.25rem 0 1rem; }
.price { font-size: 1.6rem; font-weight: bold; margin: 0.25rem 0; }

/* Art */
figure.art { margin: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--rule); background: #151a23; }

/* Home intro */
.intro { margin-bottom: 1.5rem; }

/* Item page */
.exhibit { display: grid; gap: 1.5rem; align-items: start; }
.buybox { background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; padding: 1.25rem 1.5rem; }
dl.pricing { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; align-items: baseline; margin: 0 0 1rem; }
dl.pricing dt { color: var(--muted); }
dl.pricing dd { margin: 0; }
dl.pricing .anchor { font-style: italic; }
.acquire { margin: 0.5rem 0 0; }
.acquire .button { display: block; width: 100%; border: 0; font: inherit; font-weight: bold; cursor: pointer; text-align: center; }
/* Once Stripe's embedded form (with its own Pay button) is on the page, the fallback steps back. */
.checkout.embedded .acquire .button { background: transparent; color: var(--accent); border: 2px solid var(--accent); font-weight: normal; }
.secure-note { color: var(--muted); font-size: 0.9rem; text-align: center; margin: 0.4rem 0 0; }
.included { margin: 0; padding-left: 1.25rem; }

/* Buttons, and links styled as buttons, are labeled in words */
.button {
  display: inline-block;
  background: var(--accent);
  color: var(--on-accent);
  font-weight: bold;
  text-decoration: none;
  padding: 0.75rem 1.4rem;
  border-radius: 8px;
  min-height: 44px;
}
.button:hover { text-decoration: underline; }

details { margin: 0.5rem 0; }
summary { cursor: pointer; color: var(--accent); text-decoration: underline; padding: 0.25rem 0; }
.byline { color: var(--muted); font-style: italic; }
.share { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; }
.share a { display: inline-block; padding: 0.4rem 0; min-height: 44px; }

/* Cards */
.items { list-style: none; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
.card { background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
.card img { background: #151a23; }
.card-body { padding: 1rem 1.25rem 1.25rem; }
.card h3, .card h4 { margin: 0.25rem 0; font-size: 1.3rem; }
.card-body > :last-child { margin-bottom: 0; }

dl.specs { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
dl.specs dt { font-weight: bold; }
dl.specs dd { margin: 0; }
.certificate { border: 3px double var(--rule); padding: 1rem 1.5rem; border-radius: 8px; background: var(--surface); margin-top: 2rem; }
.certificate h2 { margin-top: 0.5rem; }
footer.site { border-top-width: 1px; padding: 1.5rem 0 2.5rem; color: var(--muted); font-size: 1rem; }

/* The dossier: sealed cards are dashed and say "Sealed" in words, never color alone */
.card.sealed { border-style: dashed; background: transparent; }
.badges { padding-left: 1.25rem; }

/* The vault: rarity and status are in words on every card, never color alone */
.lever .button { border: 0; font: inherit; font-weight: bold; cursor: pointer; }
.lever .button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.latest-pull:focus { outline: none; }
.latest-pull .vault-card { border-width: 3px; border-style: double; max-width: 44rem; }
.creak { font-style: italic; color: var(--muted); margin: 0 0 0.75rem; }
.latest-pull.opening .vault-card { animation: vault-open 900ms ease-out both; transform-origin: left center; }
@keyframes vault-open {
  from { transform: perspective(60rem) rotateY(-70deg); }
  to { transform: none; }
}
.vault-card h4, .vault .odds caption { margin: 1rem 0 0.25rem; }
table.odds { border-collapse: collapse; width: 100%; font-size: 1rem; }
table.odds caption { text-align: left; font-weight: 700; padding-bottom: 0.5rem; }
table.odds th, table.odds td { text-align: left; padding: 0.45rem 0.75rem 0.45rem 0; border-bottom: 1px solid var(--muted); }
table.odds .num { text-align: right; font-variant-numeric: tabular-nums; }

/* The Back-Room Broadcast (note 0009): "On air" is always written out, never color alone */
.on-air-banner { margin: 0; padding: 0.5rem 1.25rem; background: var(--accent); color: var(--on-accent); text-align: center; font-size: 1rem; }
.on-air-banner a { color: var(--on-accent); }
.on-air-banner a:focus-visible { outline: 3px solid var(--on-accent); outline-offset: 2px; }
.on-air-tag { display: inline-block; margin: 0; padding: 0.2rem 0.6rem; border: 2px solid var(--accent); border-radius: 4px; font-variant: small-caps; letter-spacing: 0.05em; }
.broadcast h1 { margin-top: 0.5rem; }
.broadcast .buybox h2 { margin: 0.25rem 0 0.75rem; font-size: 1.8rem; }
.regular { display: block; font-size: 1rem; font-weight: normal; color: var(--muted); }
.countdown .clock { font-variant-numeric: tabular-nums; font-weight: bold; }
.tally { font-size: 1rem; }
/* Acquisition pending (note 0010): said in words, with a dashed rule as a second cue */
.pending { margin: 0.25rem 0; font-variant: small-caps; letter-spacing: 0.05em; font-weight: bold; }
.pending-note { border-left: 4px dashed var(--muted); padding-left: 0.75rem; font-size: 1rem; }
.on-air-note { border-left: 4px solid var(--accent); padding-left: 0.75rem; font-size: 1rem; }
.patter p { font-size: 1.2rem; font-style: italic; }

/* The reel (design note 0008): rarity is always in the text too, never color alone */
.lever.pulling .button { animation: lever-pull 380ms ease-in; }
@keyframes lever-pull { 40% { transform: translateY(6px) scale(0.97); } 100% { transform: none; } }
.sound-toggle { font: inherit; font-size: 0.95rem; background: transparent; color: var(--text); border: 2px solid var(--muted); border-radius: 6px; padding: 0.35rem 0.75rem; min-height: 44px; margin: 0.5rem 0 0; cursor: pointer; }
.sound-toggle:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
header.site .sound-toggle { margin: 0; min-height: 44px; }
/* Tune in and the certificate stamp (note 0011, PR 2): state in words, motion optional */
button.button { border: 0; font: inherit; font-weight: bold; cursor: pointer; }
button.button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.tune-in { margin: 0 0 1rem; }
.tune-in[aria-pressed="true"] { background: transparent; color: var(--accent); border: 2px solid var(--accent); }
.patter p.speaking { border-left: 4px solid var(--accent); padding-left: 0.75rem; font-weight: bold; }
.certificate-moment { margin: 1.5rem 0; }
.stamp-mark:not(:empty) { display: inline-block; border: 4px double var(--accent); color: var(--accent); padding: 0.5rem 1rem; font-weight: bold; letter-spacing: 0.05em; transform: rotate(-3deg); }
.stamp-mark.stamping { animation: stamp-in 380ms cubic-bezier(.2,1.6,.4,1); }
@keyframes stamp-in { from { transform: rotate(-12deg) scale(2.2); opacity: 0; } to { transform: rotate(-3deg) scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .stamp-mark.stamping { animation: none; } }
/* "Case closed" (note 0011): said in words, with a rule as a second cue */
.case-closed:not(:empty) { border-left: 4px solid var(--accent); padding-left: 0.75rem; font-weight: bold; }
.reel-dialog { max-width: min(30rem, calc(100vw - 2rem)); width: 100%; border: 3px double var(--rule); border-radius: 12px; background: var(--surface); color: var(--text); padding: 1.25rem 1.5rem 1.5rem; text-align: center; }
.reel-dialog::backdrop { background: rgb(0 0 0 / 0.7); }
.reel-dialog h2 { margin: 0 0 1rem; font-size: 1.4rem; font-style: italic; }
.reel-window { border: 2px solid var(--muted); border-radius: 8px; padding: 1rem 0.5rem; min-height: 4.5rem; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.reel-name { margin: 0; font-size: 1.35rem; font-weight: bold; }
.reel-window.landed { animation: land-pop 300ms ease-out; }
.reel-window.rarity-uncommon { border-width: 3px; border-color: var(--accent); animation: land-pop 300ms ease-out, glint 900ms ease-out; }
.reel-window.rarity-rare { border: 4px double var(--accent); animation: land-pop 300ms ease-out, rare-flash 1400ms ease-out; }
@keyframes land-pop { 0% { transform: scale(0.92); } 60% { transform: scale(1.06); } 100% { transform: none; } }
@keyframes glint { 0% { box-shadow: 0 0 0 0 var(--accent); } 40% { box-shadow: 0 0 1.5rem 0.25rem var(--accent); } 100% { box-shadow: none; } }
@keyframes rare-flash {
  0% { box-shadow: 0 0 0 0 #e8b931; background: var(--surface); }
  15% { box-shadow: 0 0 3rem 1.5rem #e8b931; background: #fff4cf; color: #1b1b1b; }
  50% { box-shadow: 0 0 2rem 0.75rem #e8b931; }
  100% { box-shadow: none; background: var(--surface); }
}
.reel-result h3 { margin: 0.25rem 0; font-size: 1.4rem; }
.reel-window.new-card::after { content: "New"; position: absolute; top: 0.35rem; right: 0.5rem; font-size: 0.8rem; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); animation: land-pop 400ms ease-out; }
.reel-window { position: relative; }
.milestone { position: relative; margin: 1rem 0 0.5rem; padding: 0.75rem 1rem; border: 3px double var(--accent); border-radius: 8px; animation: land-pop 450ms ease-out; }
.milestone-title { margin: 0; font-size: 1.3rem; font-weight: bold; }
.milestone p:last-of-type { margin: 0.25rem 0 0; }
.confetti { position: absolute; left: 50%; top: 50%; width: 0; height: 0; pointer-events: none; }
.confetti-bit { position: absolute; width: 0.5rem; height: 0.8rem; border-radius: 2px; background: var(--accent); opacity: 0; animation: confetti 1100ms ease-out forwards; }
.confetti-bit:nth-child(3n) { background: #e8b931; }
.confetti-bit:nth-child(3n + 1) { background: var(--muted); }
@keyframes confetti {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg); }
  100% { opacity: 0; transform: translate(var(--x), var(--y)) rotate(var(--r)); }
}
.reel-result:empty { display: none; }
.reel-dialog .button { border: 0; font: inherit; font-weight: bold; cursor: pointer; margin-top: 0.5rem; }
.reel-dialog .button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }

/* Duty streak: the stakes are in words; the rule is a second cue, not the only one */
.streak-due { border-left: 4px solid var(--accent); padding-left: 0.75rem; }

.repair { border: 3px double var(--rule); border-radius: 8px; padding: 0.75rem 1rem; background: var(--surface); }

/* The Dispatch form: a visible label, a full-size field, a worded button */
.dispatch-form { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; align-items: end; margin: 1rem 0; }
.dispatch-form label { flex-basis: 100%; font-weight: bold; }
.dispatch-form input[type="email"] { flex: 1 1 16rem; min-height: 44px; padding: 0.5rem 0.75rem; font: inherit; color: var(--text); background: var(--surface); border: 2px solid var(--muted); border-radius: 6px; }
.dispatch-form input:focus-visible, .dispatch-form .button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.dispatch-form .button { border: 0; font: inherit; font-weight: bold; cursor: pointer; }
.notice { border-left: 4px solid var(--accent); padding: 0.5rem 1rem; background: var(--surface); }
.small-print { font-size: 0.95rem; color: var(--muted); }

/* The ledger (private dashboard): plain, scrollable tables */
.ledger .table-scroll { overflow-x: auto; margin: 0.75rem 0 2rem; }
.ledger .table-scroll:focus-visible { outline: 3px solid currentColor; outline-offset: 2px; }
.ledger table { border-collapse: collapse; min-width: 100%; font-size: 1rem; }
.ledger caption { text-align: left; font-weight: 700; padding-bottom: 0.5rem; }
.ledger th, .ledger td { text-align: left; padding: 0.45rem 0.75rem 0.45rem 0; border-bottom: 1px solid var(--muted); vertical-align: top; }
.ledger td.num, .ledger th.num { text-align: right; font-variant-numeric: tabular-nums; }
.ledger .period a[aria-current="page"] { font-weight: 700; text-decoration-thickness: 3px; }

/* Phones: keep the name, price and call to action on the first screen */
@media (max-width: 51.99rem) {
  .on-air-banner { font-size: 0.85rem; padding: 0.3rem 0.75rem; line-height: 1.35; }
  .banner-detail { display: none; }
  .buybox .on-air-tag { margin: 0 0 0.4rem; padding: 0.1rem 0.5rem; font-size: 0.85rem; font-variant: normal; letter-spacing: 0; }
  .buybox .regular, .wide-only { display: none; }
  .phone-only { display: inline; }
  header.site { padding: 0.5rem 0; }
  header.site .wrap { gap: 0.25rem 1rem; }
  .brand { font-size: 1.1rem; }
  header.site nav { font-size: 1rem; }
  header.site nav ul { gap: 0.25rem 1rem; }
  main { padding-top: 0.75rem; }
  .exhibit { gap: 0.75rem; }
  .exhibit figure.art img { aspect-ratio: 2 / 1; object-fit: cover; object-position: 50% 75%; }
  .buybox { padding: 0.85rem 1.1rem; }
  .buybox h1 { font-size: 1.75rem; margin-bottom: 0.35rem; }
  .buybox dl.pricing { margin-bottom: 0.6rem; }
  .buybox .hook { margin-top: 1rem; }
}
@media (min-width: 52rem) {
  .exhibit { grid-template-columns: 1.15fr 1fr; gap: 2rem; }
}
${HOST_CSS}${ARCHIVIST_CSS}${TRIXIE_CSS}${NICKEL_CSS}${LOUPE_CSS}${STAGE_CSS}${TICKER_CSS}${CALLERS_CSS}@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
