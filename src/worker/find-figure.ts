/**
 * The sketch of the contact a find introduces (design note 0018), for the
 * found page: the same drawing the cast has everywhere else, credited, and
 * the page's one `data-host`, so the sound script gives it a pose and the
 * Motion toggle holds it still. The stage characters (Ibid, Nickel, Trixie)
 * move when something inside a `.set` has a pose, so every figure is wrapped
 * in one; outside the front-page stage that class carries no style of its own.
 */

import { archivistArt, ARCHIVIST_ARTIST } from "./archivist-art";
import { courierFigure } from "./courier-art";
import { geraldFigure } from "./gerald-art";
import { html, type SafeHtml } from "./html";
import { loupeArt, LOUPE_ARTIST } from "./loupe-art";
import { nickelArt, NICKEL_ARTIST } from "./nickel-art";
import { trixieArt, TRIXIE_ARTIST } from "./trixie-art";

const FIGURES: ReadonlyMap<string, () => SafeHtml> = new Map([
  [
    "loose-brick",
    // prettier-ignore
    () => html`<figure class="loupe-figure" data-host>${loupeArt()}<figcaption>Sketch by ${LOUPE_ARTIST}.</figcaption></figure>`,
  ],
  ["parcel", courierFigure],
  [
    "misfiled-card",
    // prettier-ignore
    () => html`<figure class="archivist-figure" data-host>${archivistArt()}<figcaption>Sketch by ${ARCHIVIST_ARTIST}.</figcaption></figure>`,
  ],
  ["lost-stamp", geraldFigure],
  [
    "ticker-tape",
    // prettier-ignore
    () => html`<figure class="nickel-figure" data-host>${nickelArt()}<figcaption>Sketch by ${NICKEL_ARTIST}.</figcaption></figure>`,
  ],
  [
    "fallen-feather",
    // prettier-ignore
    () => html`<figure class="trixie-figure" data-host>${trixieArt()}<figcaption>Sketch by ${TRIXIE_ARTIST}.</figcaption></figure>`,
  ],
]);

/** The contact's sketch for the find `id`. */
export function findFigure(id: string): SafeHtml {
  const draw = FIGURES.get(id);
  if (draw === undefined) throw new Error(`No sketch for the find "${id}".`);
  return html`<div class="set">${draw()}</div>`;
}
