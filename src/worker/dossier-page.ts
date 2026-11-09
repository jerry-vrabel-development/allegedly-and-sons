/**
 * The Agent Dossier page, /dossier (design note 0003, G1): the visitor's own
 * badges, cards and rank. Private to the visitor (their cookie decides whose
 * file it is), never indexed, no script.
 */

import { CATALOG } from "../core/catalog";
import { BADGES, cardId, rankFor, TOTAL_AWARDS } from "../core/dossier";
import { VAULT_CARDS, vaultAwardId } from "../core/vault";
import type { Agent } from "./dossier";
import { html, type SafeHtml } from "./html";
import { itemPath, layout } from "./pages";

export const DOSSIER_PATH = "/dossier";

function agentNumber(n: number): string {
  return String(n).padStart(4, "0");
}

export function dossierPage(agent: Agent | undefined): SafeHtml {
  const earned = new Set(agent?.awards.map((award) => award.id) ?? []);
  const count = earned.size;
  const { rank, next } = rankFor(count);

  const header =
    agent === undefined
      ? html`<p class="tagline">No file on you yet. Every agent starts somewhere.</p>
          <p>
            Open any exhibit's case file and the Bureau will issue you a number. Finish one, share
            one, or acquire one, and your commendations start piling up.
          </p>`
      : html`<p class="kicker">Agent No. ${agentNumber(agent.agentNumber)}</p>
          <p class="tagline">Codename: ${agent.codename}</p>
          <p>
            <strong>Rank: ${rank.title}.</strong> ${String(count)} of ${String(TOTAL_AWARDS)}
            commendations.
            ${
              next === undefined
                ? html`There is no higher rank. The Bureau salutes you.`
                : html`${String(next.at - count)} more for ${next.title}.`
            }
          </p>`;

  return layout({
    title: "Your Dossier",
    description: "Your Bureau file: badges, cards and rank.",
    noindex: true,
    body: html`<div class="prose dossier">
        <h1>Your Dossier</h1>
        ${header}
      </div>

      <section aria-labelledby="cards-heading">
        <h2 id="cards-heading">Exhibit cards</h2>
        <p>One for each exhibit. Read its case file to the end, or acquire it.</p>
        <ul class="items">
          ${CATALOG.map((item) =>
            earned.has(cardId(item.slug))
              ? html`<li class="card">
                  <img
                    src="/assets/art/${item.slug}.svg"
                    alt="${item.artAlt}"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                  />
                  <div class="card-body">
                    <p class="kicker">Card ${item.exhibit} · Collected</p>
                    <h3>${item.name}</h3>
                    <p>${item.tagline}</p>
                  </div>
                </li>`
              : html`<li class="card sealed">
                  <div class="card-body">
                    <p class="kicker">Card ${item.exhibit} · Sealed</p>
                    <h3><a href="${itemPath(item)}">${item.name}</a></h3>
                    <p>
                      Sealed. Finish this exhibit's case file, or acquire it, to break the seal.
                    </p>
                  </div>
                </li>`,
          )}
        </ul>
      </section>

      <section class="prose" aria-labelledby="vault-heading">
        <h2 id="vault-heading">Vault cards</h2>
        <p>Never for sale. One free pull a day at <a href="/vault">the Vault</a>.</p>
        <ul class="badges">
          ${VAULT_CARDS.map((card) =>
            earned.has(vaultAwardId(card.id))
              ? html`<li><strong>${card.name}</strong> (collected): ${card.summary}</li>`
              : html`<li><strong>${card.name}</strong> (still in the vault): ${card.rarity}.</li>`,
          )}
        </ul>
      </section>

      <section class="prose" aria-labelledby="badges-heading">
        <h2 id="badges-heading">Commendations</h2>
        <ul class="badges">
          ${BADGES.map((badge) =>
            earned.has(badge.id)
              ? html`<li><strong>${badge.name}</strong> (earned): ${badge.earned}</li>`
              : html`<li><strong>${badge.name}</strong> (locked): ${badge.hint}</li>`,
          )}
        </ul>
      </section>`,
  });
}
