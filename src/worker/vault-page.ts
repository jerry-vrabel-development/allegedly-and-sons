/**
 * The Vault page, /vault (design note 0003, G2). The lever is a plain form
 * that posts to /vault/pull and comes back here, so it works without script.
 * A countdown script ticks the clocks, and for the effects group the Vault's
 * own script plays the reel in place (note 0008). Odds are posted on the
 * page. Results say exactly what was drawn: no near misses, no teasing
 * what you almost got. The opening animation is CSS only, and reduced motion
 * turns it off; the words "The vault creaks open" carry it either way.
 */

import { BADGES } from "../core/dossier";
import {
  BONUS_BADGES,
  describeWait,
  nextDailyAt,
  oddsLabel,
  VAULT_CARDS,
  type VaultCard,
} from "../core/vault";
import { html, type SafeHtml } from "./html";
import { layout } from "./pages";
import type { VaultState } from "./vault";
import type { Streak } from "../core/streak";
import { streakPanel } from "./streak-panel";
import {
  COUNTDOWN_SCRIPT_PATH,
  DOSSIER_PATH,
  VAULT_PULL_PATH,
  VAULT_SCRIPT_PATH,
} from "../core/paths";

const BONUS_IDS: readonly string[] = BONUS_BADGES;
const BONUS_NAMES = BADGES.filter((badge) => BONUS_IDS.includes(badge.id))
  .map((badge) => badge.name)
  .join(", ");

function cardBody(card: VaultCard, status: string): SafeHtml {
  return html`<p class="kicker">Vault card ${card.designation} · ${card.rarity} · ${status}</p>
    <h3>${card.name}</h3>
    <p>${card.summary}</p>`;
}

function leverStatus(state: VaultState, nowSeconds: number): SafeHtml {
  const wait = describeWait(nextDailyAt(nowSeconds) - nowSeconds);
  const bonus =
    state.bonusLeft === 0
      ? html``
      : html` You also have ${String(state.bonusLeft)} bonus
        ${state.bonusLeft === 1 ? "pull" : "pulls"}.`;
  const lever = html`<form class="lever" method="post" action="${VAULT_PULL_PATH}">
    <button class="button" type="submit">Pull the lever</button>
  </form>`;

  if (state.dailyReady) {
    return html`<p><strong>Your free pull for today is ready.</strong>${bonus}</p>
      ${lever}`;
  }
  if (state.bonusLeft > 0) {
    return html`<p>
        <strong>You've used today's free pull.</strong>${bonus} The next free pull opens in ${wait},
        at midnight UTC.
      </p>
      ${lever}`;
  }
  return html`<p>
    <strong>The lever is locked until tomorrow.</strong> Your next free pull opens in ${wait}, at
    midnight UTC.
  </p>`;
}

function latestPull(state: VaultState, opened: boolean): SafeHtml {
  const latest = state.latest;
  if (latest === undefined) return html``;
  const { card } = latest;
  return html`<section
    id="latest-pull"
    class="latest-pull${opened ? " opening" : ""}"
    aria-labelledby="latest-heading"
    tabindex="-1"
  >
    <h2 id="latest-heading">Your latest pull</h2>
    <p class="creak">The vault creaks open…</p>
    <div class="card vault-card">
      <div class="card-body">
        ${cardBody(card, latest.duplicate ? "Duplicate" : "New to your file")}
        ${
          latest.duplicate
            ? html`<p>
                Already in your file. The Bureau stamps it “Duplicate” and files it in triplicate.
              </p>`
            : html``
        }
        <h4>Secret file</h4>
        <p>${card.secretFile}</p>
      </div>
    </div>
  </section>`;
}

export function vaultPage(
  state: VaultState,
  streak: Streak,
  nowSeconds: number,
  opened: boolean,
  repairOpen: boolean,
  effects: boolean,
): SafeHtml {
  return layout({
    title: "The Vault",
    description: "One free pull a day. Vault cards are never for sale.",
    noindex: true,
    // The reel only for the "fx" group (note 0008, PR 3); the clock for everyone.
    scripts: effects ? [VAULT_SCRIPT_PATH, COUNTDOWN_SCRIPT_PATH] : [COUNTDOWN_SCRIPT_PATH],
    body: html`<div
        class="prose vault"
        data-reel="${JSON.stringify(VAULT_CARDS.map((card) => card.name))}"
      >
        <h1>The Vault</h1>
        <p class="tagline">Some relics are never for sale. They are only ever found.</p>
        <p>
          Once a day, the Bureau lets each agent pull the vault lever. Out comes a vault card: never
          in the shop, never for sale, and each with a secret file. Pulls are always free.
        </p>
        ${leverStatus(state, nowSeconds)}
      </div>

      ${streakPanel(streak, nowSeconds, true, repairOpen)} ${latestPull(state, opened)}

      <section aria-labelledby="vault-cards-heading">
        <h2 id="vault-cards-heading">Vault cards</h2>
        <ul class="items">
          ${VAULT_CARDS.map((card) =>
            state.owned.has(card.id)
              ? html`<li class="card vault-card">
                  <div class="card-body">
                    ${cardBody(card, "Collected")}
                    <h4>Secret file</h4>
                    <p>${card.secretFile}</p>
                  </div>
                </li>`
              : html`<li class="card sealed">
                  <div class="card-body">
                    ${cardBody(card, "Still in the vault")}
                    <p>Its secret file stays sealed until you pull it.</p>
                  </div>
                </li>`,
          )}
        </ul>
      </section>

      <section class="prose" aria-labelledby="odds-heading">
        <h2 id="odds-heading">The odds, posted</h2>
        <table class="odds">
          <caption>
            Every pull draws one card at these odds
          </caption>
          <thead>
            <tr>
              <th scope="col">Card</th>
              <th scope="col">Rarity</th>
              <th scope="col" class="num">Chance</th>
            </tr>
          </thead>
          <tbody>
            ${VAULT_CARDS.map(
              (card) =>
                html`<tr>
                  <th scope="row">${card.name}</th>
                  <td>${card.rarity}</td>
                  <td class="num">${oddsLabel(card)}</td>
                </tr>`,
            )}
          </tbody>
        </table>
        <p>
          The Bureau's own server draws every pull with a secure random number, at exactly these
          odds, and shows you exactly what came out. You can pull a card you already have.
        </p>
        <h2>Bonus pulls</h2>
        <p>
          Each of these commendations earns one bonus pull, once: ${BONUS_NAMES}. You've earned
          ${String(state.bonusEarned)} of ${String(BONUS_BADGES.length)}.
          <strong>Nothing you buy earns a pull or changes the odds.</strong>
        </p>
        <p>
          Your vault cards also count toward your rank in
          <a href="${DOSSIER_PATH}">your dossier</a>.
        </p>
      </section>`,
  });
}
