/**
 * The shop's stylesheet, served from /assets/site.css so the CSP can allow
 * `style-src 'self'` instead of inline styles.
 *
 * Colors meet WCAG 2.2 AA contrast in light and dark mode. Links are always
 * underlined, so they never rely on color alone.
 */
export const SITE_CSS = `:root {
  color-scheme: light dark;
  --bg: #fbf7ef;
  --surface: #ffffff;
  --text: #1b1b1b;
  --muted: #4a4540;
  --accent: #7a1f1f;
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
a { color: var(--accent); text-decoration: underline; text-underline-offset: 0.15em; }
a:focus-visible, button:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
  border-radius: 2px;
}
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
.wrap { max-width: 44rem; margin: 0 auto; padding: 0 1.25rem; }
header.site, footer.site { border-color: var(--rule); border-style: solid; border-width: 0; }
header.site { border-bottom-width: 1px; padding: 1rem 0; }
header.site .wrap { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: baseline; justify-content: space-between; }
.brand { font-size: 1.25rem; font-weight: bold; color: var(--text); text-decoration: none; }
.brand:hover { text-decoration: underline; }
nav ul { list-style: none; display: flex; gap: 1.25rem; margin: 0; padding: 0; }
main { padding: 2rem 0 3rem; }
h1, h2, h3 { line-height: 1.25; }
h1 { font-size: 2.25rem; margin: 0 0 0.5rem; }
.kicker { font-variant: small-caps; letter-spacing: 0.05em; color: var(--muted); margin: 0; }
.tagline { font-size: 1.25rem; font-style: italic; color: var(--muted); }
.price { font-size: 1.5rem; font-weight: bold; }
.status { color: var(--muted); }
.items { list-style: none; padding: 0; display: grid; gap: 1.25rem; }
.card { background: var(--surface); border: 1px solid var(--rule); border-radius: 6px; padding: 1.25rem; }
.card h3 { margin: 0.25rem 0; font-size: 1.4rem; }
.card > :last-child { margin-bottom: 0; }
.byline { color: var(--muted); font-style: italic; }
dl.specs { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
dl.specs dt { font-weight: bold; }
dl.specs dd { margin: 0; }
.certificate { border: 2px double var(--rule); padding: 1rem 1.25rem; border-radius: 6px; background: var(--surface); }
footer.site { border-top-width: 1px; padding: 1.5rem 0 2.5rem; color: var(--muted); font-size: 1rem; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
