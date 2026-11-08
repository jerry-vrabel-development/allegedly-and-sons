/**
 * The shop's stylesheet, served from /assets/site.css so the CSP can allow
 * `style-src 'self'` instead of inline styles.
 *
 * Colors meet WCAG 2.2 AA contrast in light and dark mode. Links are always
 * underlined and the call to action is labeled in words, so nothing relies on
 * color alone.
 */
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

/* Home hero */
.intro { margin-bottom: 1.5rem; }
.hero { display: grid; gap: 1.5rem; align-items: center; background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; padding: 1.25rem; }
.hero h2 { font-size: clamp(1.8rem, 4vw, 2.4rem); margin: 0.25rem 0; }

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
.card h3 { margin: 0.25rem 0; font-size: 1.3rem; }
.card-body > :last-child { margin-bottom: 0; }

dl.specs { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
dl.specs dt { font-weight: bold; }
dl.specs dd { margin: 0; }
.certificate { border: 3px double var(--rule); padding: 1rem 1.5rem; border-radius: 8px; background: var(--surface); margin-top: 2rem; }
.certificate h2 { margin-top: 0.5rem; }
footer.site { border-top-width: 1px; padding: 1.5rem 0 2.5rem; color: var(--muted); font-size: 1rem; }

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
  header.site { padding: 0.6rem 0; }
  main { padding-top: 1rem; }
  .exhibit { gap: 1rem; }
  .exhibit figure.art img { aspect-ratio: 3 / 2; object-fit: cover; object-position: 50% 100%; }
  .buybox { padding: 1rem 1.25rem; }
  .buybox h1 { font-size: 1.9rem; }
  .buybox .hook { margin-top: 1rem; }
}
@media (min-width: 52rem) {
  .hero { grid-template-columns: 1.2fr 1fr; padding: 1.75rem; }
  .exhibit { grid-template-columns: 1.15fr 1fr; gap: 2rem; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
