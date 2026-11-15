/**
 * What an agent sees after pressing a hidden control (design note 0018): the
 * contact they just met, in their own words, with a way back and a way to the
 * Book of Contacts. Private to the visitor and never indexed.
 */

import type { Find } from "../core/finds";
import { DOSSIER_CONTACTS_PATH } from "../core/paths";
import { html } from "./html";
import { layout, type Page } from "./pages";

export function findPage(find: Find): Page {
  return layout({
    title: "You found something",
    description: "A contact of the Bureau, found.",
    noindex: true,
    body: html`<div class="prose find">
      <h1>You found something</h1>
      <p class="kicker">Contact: ${find.contact}</p>
      <p class="tagline">${find.role}</p>
      <p>${find.reaction}</p>
      <p>
        Added to your <a href="${DOSSIER_CONTACTS_PATH}">Book of Contacts</a>. The Bureau counts it
        toward your rank.
      </p>
      <p><a href="${find.from}">Back to ${find.fromName}</a></p>
    </div>`,
  });
}
