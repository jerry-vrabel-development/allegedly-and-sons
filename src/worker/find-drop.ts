/**
 * The hidden control for a find (design note 0018): a plain form with one
 * button, so it works with no script and by keyboard. The words on the button
 * say what it does; what makes it a find is only where it sits on the page.
 * For the "fx" group it sparkles when pressed (note 0011); the sound script
 * holds the form for a beat so it is heard before the page moves on.
 */

import { findById, findPathFor } from "../core/finds";
import { html, type SafeHtml } from "./html";

export function dropForm(id: string): SafeHtml {
  const find = findById(id);
  if (find === undefined) throw new Error(`No find called "${id}".`);
  return html`<form class="drop" method="post" action="${findPathFor(find.id)}">
    <button type="submit" data-sound="sparkle">${find.label}</button>
  </form>`;
}
