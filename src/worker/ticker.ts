/**
 * The stage's ticker (design note 0014): a thin strip along the bottom of the
 * front page's stage, with true lines about the show and the Bureau's wire.
 *
 * The two kinds never mix, and each line says which it is in words, with a
 * shape as a second cue (a solid tag for FACT, a dashed one for LORE), never
 * by color alone.
 *
 * It is a plain list that scrolls sideways, for everyone. The effects
 * group's script (src/client/entries/sound.ts) makes it crawl, and the
 * header's "Motion" toggle stops it; under reduced motion it never starts.
 * Every line is always in the page as text.
 */

import { tickerLines, type TickerKind } from "../core/ticker";
import { html, type SafeHtml } from "./html";

const TAG: Record<TickerKind, string> = { fact: "Fact", lore: "Lore" };

/** The ticker strip. `data-ticker` lets the effects script make it crawl. */
export function tickerStrip(nowSeconds: number): SafeHtml {
  // tabindex makes the strip reachable by keyboard, so it can be scrolled without a mouse.
  // prettier-ignore
  return html`<div class="ticker" data-ticker role="region" aria-label="The ticker: facts about the show, and lore from the Bureau's wire" tabindex="0">
    <ul class="ticker-lines">
      ${tickerLines(nowSeconds).map(
        (line) => html`<li><span class="tick-tag tick-${line.kind}">${TAG[line.kind]}</span> ${line.text}</li>`,
      )}
    </ul>
  </div>`;
}

/** On the stage's own colors: cream on near-black, well above 4.5:1. */
export const TICKER_CSS = `
/* The stage's ticker (note 0014): FACT has a solid tag, LORE a dashed one, and both say so in words */
.ticker { display: flex; overflow-x: auto; background: #120606; border-top: 1px solid #e8b53c; color: #f4efe4; font-size: 0.9rem; white-space: nowrap; }
.ticker:focus-visible { outline: 3px solid #ffffff; outline-offset: -3px; }
.ticker-lines { display: flex; flex: none; gap: 2.25rem; list-style: none; margin: 0; padding: 0.45rem 1.1rem; }
.tick-tag { display: inline-block; margin-right: 0.3rem; padding: 0 0.4rem; border-radius: 3px; font-size: 0.72rem; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; }
.tick-fact { border: 2px solid #e8b53c; background: #e8b53c; color: #2a0c0c; }
.tick-lore { border: 2px dashed #f4efe4; color: #f4efe4; }
.ticker[data-rolling] { overflow-x: hidden; }
.ticker[data-rolling] .ticker-lines { animation: ticker-crawl 70s linear infinite; }
.ticker[data-rolling]:hover .ticker-lines, .ticker[data-rolling]:focus .ticker-lines { animation-play-state: paused; }
@keyframes ticker-crawl { from { transform: translateX(0); } to { transform: translateX(-100%); } }
`;
