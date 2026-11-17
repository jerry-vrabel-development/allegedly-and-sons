/**
 * A guest on the page (design note 0022): the "Who's asking" section on the
 * exhibit a guest arrives with, and their line on its Job Board card.
 */

import type { Item } from "../core/catalog";
import { guestFor, type Guest } from "../core/guests";
import { html, type SafeHtml } from "./html";
import { siltFigure } from "./silt-art";

/** Each guest's drawing, by guest id. A test checks every guest has one. */
export const GUEST_FIGURES: Readonly<Record<string, () => SafeHtml>> = {
  "silt-prenderby": siltFigure,
};

/** A guest's drawing. Every guest has one, so a missing one is a mistake in the data. */
export function guestFigure(guest: Guest): SafeHtml {
  const draw = GUEST_FIGURES[guest.id];
  if (draw === undefined) throw new Error(`No drawing for guest "${guest.id}".`);
  return draw();
}

/** The exhibit page's "Who's asking" section, or nothing when no guest arrives with it. */
export function guestSection(item: Item): SafeHtml {
  const guest = guestFor(item.slug);
  if (guest === undefined) return html``;
  return html`<section class="guest" aria-labelledby="guest-heading">
    <h2 id="guest-heading">Who’s asking</h2>
    ${guestFigure(guest)}
    <p class="kicker">A guest of the show</p>
    <h3>${guest.name}</h3>
    <p>${guest.role}</p>
    ${guest.lines.map((line) => html`<p class="guest-line">“${line}”</p>`)}
    <p>
      <strong>Plainly:</strong> ${guest.name} is a character in the story, who holds nothing, sells
      nothing and doesn’t speak for the shop. The price and terms on this page are the Bureau’s.
    </p>
  </section>`;
}

/** The guest's line on the exhibit's Job Board card, or nothing. */
export function guestBoardLine(item: Item): SafeHtml {
  const guest = guestFor(item.slug);
  return guest === undefined
    ? html``
    : html`<p class="guest-board"><strong>Who’s asking:</strong> ${guest.board}</p>`;
}
