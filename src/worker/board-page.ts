/**
 * The Job Board, /board (design note 0020): what is on the block now, and
 * what is on its way. Every line is read from the catalog, so the board never
 * invents inventory: "on the block" is what can be bought, "on its way" is
 * what is pending, and neither is promised to anyone.
 *
 * The visitor's own tips show against each exhibit on its way: a file fills in
 * one tip at a time as they pull the Vault lever. Nothing here is a hold, a
 * reservation or a right to buy first.
 */

import { CATALOG, formatPrice } from "../core/catalog";
import { itemPathFor, VAULT_PATH } from "../core/paths";
import { tipAwardId, tipsAbout } from "../core/tips";
import { html, type SafeHtml } from "./html";
import { layout, type Page } from "./pages";
import { guestBoardLine } from "./guest";

function onTheBlock(): SafeHtml {
  return html`<ul class="items">
    ${CATALOG.filter((item) => item.status === "available").map(
      (item) =>
        html`<li class="card">
          <div class="card-body">
            <p class="kicker">Exhibit ${item.exhibit} · On the block</p>
            <h3><a href="${itemPathFor(item.slug)}">${item.name}</a></h3>
            <p>${item.tagline}</p>
            <p>${formatPrice(item.priceCents)}</p>
          </div>
        </li>`,
    )}
  </ul>`;
}

function onItsWay(held: ReadonlySet<string>): SafeHtml {
  return html`<ul class="items">
    ${CATALOG.filter((item) => item.status === "pending").map((item) => {
      const tips = tipsAbout(item.slug);
      const heard = tips.filter((tip) => held.has(tipAwardId(tip)));
      const progress = `Tips: ${String(heard.length)} of ${String(tips.length)}.`;
      return html`<li class="card">
        <div class="card-body">
          <p class="kicker">Exhibit ${item.exhibit} · On its way</p>
          <h3><a href="${itemPathFor(item.slug)}">${item.name}</a></h3>
          <p>${item.tagline}</p>
          ${guestBoardLine(item)}
          <p>
            <strong>${progress}</strong>${
              heard.length === tips.length ? html` File complete.` : html``
            }
          </p>
          ${
            heard.length === 0
              ? html`<p>No tips yet. Every pull of the Vault lever brings one.</p>`
              : html`<ul class="tips">
                  ${heard.map((tip) => html`<li><strong>${tip.contact}:</strong> ${tip.line}</li>`)}
                </ul>`
          }
        </div>
      </li>`;
    })}
  </ul>`;
}

/** `held` is every award the visitor has (empty for someone with no file yet). */
export function boardPage(held: ReadonlySet<string>): Page {
  return layout({
    title: "The Job Board",
    description: "What the Bureau has on the block, and what is on its way.",
    noindex: true,
    body: html`<div class="prose">
        <h1>The Job Board</h1>
        <p class="tagline">What the Bureau has on the block, and what is on its way.</p>
        <p>
          Everything here is read from the shop's own books. “On the block” can be bought now. “On
          its way” means a case file is open and there is nothing to buy yet. Each pull of the
          <a href="${VAULT_PATH}">Vault lever</a> brings a tip about one of them, and the tips you
          have been given show below. A tip is a clue, not a promise: it holds nothing for you and
          gives you no right to buy first.
        </p>
      </div>
      <section aria-labelledby="block-heading">
        <h2 id="block-heading">On the block</h2>
        ${onTheBlock()}
      </section>
      <section aria-labelledby="way-heading">
        <h2 id="way-heading">On its way</h2>
        ${onItsWay(held)}
      </section>`,
  });
}
