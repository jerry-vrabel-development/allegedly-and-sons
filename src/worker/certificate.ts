/**
 * A buyer's Bureau Certificate on screen, with Gerald's stamps (design note
 * 0021): the tips they were told about the exhibit before they acquired it.
 * Used on the paid return page and in the Dossier's Certificates section.
 *
 * No figure here: both pages already have their one `data-host` (or none
 * wanted), and Gerald is drawn on the exhibit page's certificate box. Each
 * stamp says "Witnessed" in words, so nothing rests on color or tilt.
 */

import type { Item } from "../core/catalog";
import type { Stamp } from "../core/certificate";
import { html, type SafeHtml } from "./html";

/** Heading level, so the block sits correctly in either page's outline. */
type Level = "h2" | "h3";

function heading(level: Level, id: string, text: string): SafeHtml {
  return level === "h2" ? html`<h2 id="${id}">${text}</h2>` : html`<h3 id="${id}">${text}</h3>`;
}

/** `key` makes the heading's id unique where one exhibit can appear twice (the packing page). */
export function certificateBlock(
  item: Item,
  stamps: readonly Stamp[],
  level: Level,
  key: string = item.slug,
): SafeHtml {
  const id = `certificate-${key}`;
  return html`<section class="certificate" aria-labelledby="${id}">
    ${heading(level, id, `Bureau Certificate No. ${item.exhibit}`)}
    <p>${item.name}. <strong>Authenticity:</strong> Allegedly.</p>
    ${
      stamps.length === 0
        ? html`<p>No finds on file for this exhibit, so Gerald had nothing to stamp.</p>`
        : html`<p>
              Finds on file, stamped by Gerald: what your contacts told you about this exhibit
              before it was yours.
            </p>
            <ul class="stamps">
              ${stamps.map(
                (tip) =>
                  html`<li>
                    <span class="stamp">Witnessed</span> <strong>${tip.contact}</strong>:
                    “${tip.line}”
                  </li>`,
              )}
            </ul>
            <p class="stamp-note">Gerald is not a notary.</p>`
    }
  </section>`;
}
