/**
 * Callers on the line (design note 0014): the Bureau's switchboard, shown
 * under the front page's stage and on /broadcast. Three one-off callers ring
 * in each segment, and the host answers each of them.
 *
 * The lines (notes 0009 and 0014): callers are lore, and the block says so in
 * words, with a dashed tag as a second cue, never by color alone. They are
 * characters, never customers, and nothing here is a number, so nothing here
 * can be mistaken for the real tally beside it.
 */

import type { Segment } from "../core/broadcast";
import { callersFor } from "../core/callers";
import { html, type SafeHtml } from "./html";

/** The switchboard for a segment. `headingId` must be unique on the page. */
export function callersBlock(segment: Segment, headingId: string): SafeHtml {
  return html`<section class="callers" aria-labelledby="${headingId}">
    <h2 id="${headingId}">Callers on the line</h2>
    <p class="wire-note">
      <span class="lore-tag">Lore</span> From the Bureau's switchboard. Every caller is a character,
      not a customer.
    </p>
    <ul class="caller-list">
      ${callersFor(segment).map(
        (caller) =>
          html`<li class="caller">
            <p class="caller-who"><strong>${caller.name}</strong>, calling from ${caller.from}</p>
            <p class="caller-says">“${caller.says}”</p>
            <p class="caller-answer"><strong>The host:</strong> “${caller.answer}”</p>
          </li>`,
      )}
    </ul>
  </section>`;
}

/** Plain cards in the page's own colors (light and dark), three across on a wide screen. */
export const CALLERS_CSS = `
/* Callers on the line (note 0014): lore is tagged in words and with a dashed border */
.callers { margin: 0 0 2.5rem; }
.callers h2 { margin-bottom: 0.25rem; }
.wire-note { margin: 0 0 1rem; font-size: 1rem; color: var(--muted); }
.lore-tag { display: inline-block; margin-right: 0.35rem; padding: 0 0.45rem; border: 2px dashed var(--muted); border-radius: 4px; font-variant: small-caps; font-weight: bold; letter-spacing: 0.05em; color: var(--text); }
.caller-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
.caller { background: var(--surface); border: 1px solid var(--rule); border-radius: 10px; padding: 0.9rem 1.1rem; }
.caller p { margin: 0 0 0.5rem; }
.caller p:last-child { margin-bottom: 0; }
.caller-who { font-size: 1rem; color: var(--muted); }
.caller-who strong { color: var(--text); }
.caller-says { font-size: 1.1rem; font-style: italic; }
.caller-answer { border-left: 4px solid var(--accent); padding-left: 0.75rem; }
@media (min-width: 52rem) {
  .caller-list { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
`;
