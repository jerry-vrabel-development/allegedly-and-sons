/**
 * The Ledger's page: the numbers from ledger.ts, laid out. Plain
 * server-rendered HTML, no script. Rates come with their uncertainty, in
 * words, and never as color alone.
 */

import { formatPrice } from "../core/catalog";
import { TARGET_PULLERS, TEST_DAYS, type TestStatus } from "../core/effects";
import { LEDGER_PATH } from "../core/paths";
import { clearlyDifferent, describeRate, MIN_VISITORS_TO_RANK, wilson } from "../core/stats";
import { STREAK_BUCKETS } from "../core/streak";
import { html, type SafeHtml } from "./html";
import { PERIODS, type EffectsRow, type Ledger, type Period } from "./ledger";
import { layout, type Page } from "./pages";

function groupName(variant: "fx" | "plain"): string {
  return variant === "fx" ? "Sound and motion" : "Plain";
}

/** Where the stopping rule stands (note 0011), in words. */
function effectsTestStatus(status: TestStatus): SafeHtml {
  const progress = html`Agents who pulled since the test began:
    <strong>${String(status.fxPullers)}</strong> with sound and motion and
    <strong>${String(status.plainPullers)}</strong> plain, of ${String(TARGET_PULLERS)} each.`;
  if (status.ended === undefined) {
    return html`<p>Day ${String(status.day)} of ${String(TEST_DAYS)}. ${progress}</p>`;
  }
  const why =
    status.ended === "target"
      ? `Both groups reached ${String(TARGET_PULLERS)} agents who pulled.`
      : `${String(TEST_DAYS)} days have passed.`;
  return html`<p>
    <strong>The stopping rule is met.</strong> ${why} ${progress} Time to decide: ship a clear
    winner to everyone, and if there's none, give everyone the effects (note 0011).
  </p>`;
}

/**
 * The measures where the groups clearly differ, in words: both have enough
 * trials to mean something (as the table's "too few to say"), and their 95%
 * intervals don't overlap.
 */
function effectsDifferences(rows: readonly EffectsRow[]): SafeHtml {
  const [fx, plain] = rows as readonly [EffectsRow, EffectsRow];
  const measures: readonly [string, (row: EffectsRow) => [number, number]][] = [
    ["opening a case file", (row) => [row.opened, row.visitors]],
    ["finishing it", (row) => [row.finished, row.opened]],
    ["sharing", (row) => [row.sharers, row.visitors]],
    ["buying", (row) => [row.buyers, row.visitors]],
    ["coming back to the Vault", (row) => [row.returners, row.pullers]],
  ];
  const clear = measures.flatMap(([name, of]) => {
    const a = wilson(...of(fx));
    const b = wilson(...of(plain));
    if (a === undefined || b === undefined) return [];
    if (Math.min(a.trials, b.trials) < MIN_VISITORS_TO_RANK || !clearlyDifferent(a, b)) return [];
    return [`${name} (${a.rate > b.rate ? groupName("fx") : groupName("plain")} is higher)`];
  });
  return clear.length === 0
    ? html`<p>Clear differences so far: none yet.</p>`
    : html`<p>Clear differences so far: ${clear.join("; ")}.</p>`;
}

function periodLabel(period: Period): string {
  return period === 0 ? "All time" : `Last ${String(period)} days`;
}

/** A table that scrolls sideways on its own on a phone, reachable by keyboard. */
function scrollTable(label: string, table: SafeHtml): SafeHtml {
  return html`<div class="table-scroll" role="region" aria-label="${label}" tabindex="0">
    ${table}
  </div>`;
}

export function ledgerPage(ledger: Ledger, email: string): Page {
  // Sales include bought-back streaks, not just exhibits.
  const totalOrders = ledger.items.reduce((sum, row) => sum + row.orders, ledger.repairs.count);
  const totalRevenue = ledger.items.reduce(
    (sum, row) => sum + row.revenueCents,
    ledger.repairs.revenueCents,
  );

  return layout({
    title: "The Ledger",
    description: "Private: the Bureau's numbers.",
    noindex: true,
    body: html`<div class="ledger">
      <h1>The Ledger</h1>
      <p class="tagline">For the Bureau's eyes only. Signed in as ${email}.</p>

      <nav class="period" aria-label="Period">
        <p>
          ${PERIODS.map(
            (period, index) =>
              html`${index === 0 ? html`` : html` · `}<a
                  href="${LEDGER_PATH}?days=${String(period)}"
                  ${period === ledger.period ? html`aria-current="page"` : html``}
                  >${periodLabel(period)}</a
                >`,
          )}
        </p>
      </nav>

      <h2>${periodLabel(ledger.period)}</h2>
      <p>
        <strong>${String(ledger.visitors)}</strong> visitors ·
        <strong>${String(totalOrders)}</strong> orders ·
        <strong>${formatPrice(totalRevenue)}</strong> in sales
      </p>
      <p>
        Rates show the share, a 95% range, and how many it's out of. Under
        ${String(MIN_VISITORS_TO_RANK)}, they show raw counts: too few to say.
      </p>

      ${scrollTable(
        "Items",
        html`<table>
          <caption>
            Each item: does the lore land, and does it sell?
          </caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" class="num">Visitors</th>
              <th scope="col">Opened the case file</th>
              <th scope="col">Finished it (of openers)</th>
              <th scope="col">Started checkout</th>
              <th scope="col">Bought (visitors who did)</th>
              <th scope="col" class="num">Shares</th>
              <th scope="col" class="num">Visits from shares</th>
              <th scope="col" class="num">Sales</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.items.map(
              (row) =>
                html`<tr>
                  <th scope="row">${row.name}</th>
                  <td class="num">${String(row.visitors)}</td>
                  <td>${describeRate(wilson(row.opened, row.visitors))}</td>
                  <td>${describeRate(wilson(row.finished, row.opened))}</td>
                  <td>${describeRate(wilson(row.checkouts, row.visitors))}</td>
                  <td>${describeRate(wilson(row.buyers, row.visitors))}</td>
                  <td class="num">${String(row.shares)}</td>
                  <td class="num">${String(row.sharedVisits)}</td>
                  <td class="num">${formatPrice(row.revenueCents)}</td>
                </tr>`,
            )}
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "Where visitors came from",
        html`<table>
          <caption>
            Where visitors came from (by their first visit: campaign, else the site that sent them)
          </caption>
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col" class="num">Visitors</th>
              <th scope="col" class="num">Later bought</th>
            </tr>
          </thead>
          <tbody>
            ${
              ledger.sources.length === 0
                ? html`<tr>
                    <td colspan="3">No visits yet.</td>
                  </tr>`
                : ledger.sources.map(
                    (row) =>
                      html`<tr>
                        <th scope="row">${row.source}</th>
                        <td class="num">${String(row.visitors)}</td>
                        <td class="num">${String(row.buyers)}</td>
                      </tr>`,
                  )
            }
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "Shares by network",
        html`<table>
          <caption>
            Shares by network (visits exclude the sharer's own)
          </caption>
          <thead>
            <tr>
              <th scope="col">Network</th>
              <th scope="col" class="num">Shares</th>
              <th scope="col" class="num">Visits back</th>
              <th scope="col" class="num">Orders from those visitors</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.shares.map(
              (row) =>
                html`<tr>
                  <th scope="row">${row.channel}</th>
                  <td class="num">${String(row.shares)}</td>
                  <td class="num">${String(row.visits)}</td>
                  <td class="num">${String(row.orders)}</td>
                </tr>`,
            )}
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "The Vault",
        html`<table>
          <caption>
            The Vault: does the daily pull bring agents back?
          </caption>
          <thead>
            <tr>
              <th scope="col" class="num">Agents who pulled</th>
              <th scope="col" class="num">Pulls</th>
              <th scope="col" class="num">Bonus pulls</th>
              <th scope="col">Came back another day (of pullers)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">${String(ledger.vault.pullers)}</td>
              <td class="num">${String(ledger.vault.pulls)}</td>
              <td class="num">${String(ledger.vault.bonusPulls)}</td>
              <td>${describeRate(wilson(ledger.vault.returners, ledger.vault.pullers))}</td>
            </tr>
          </tbody>
        </table>`,
      )}
      <section class="prose" aria-labelledby="effects-test-heading">
        <h2 id="effects-test-heading">The effects test</h2>
        ${effectsTestStatus(ledger.effectsTest)} ${effectsDifferences(ledger.effects)}
      </section>
      ${scrollTable(
        "The effects test, by group",
        html`<table>
          <caption>
            The shop with sound and motion (half of agents) and without, in this period: rates are
            of visitors who viewed an exhibit, except finished (of openers) and came back (of
            pullers)
          </caption>
          <thead>
            <tr>
              <th scope="col">Group</th>
              <th scope="col" class="num">Visitors</th>
              <th scope="col">Opened a case file</th>
              <th scope="col">Finished it (of openers)</th>
              <th scope="col">Shared</th>
              <th scope="col">Bought</th>
              <th scope="col" class="num">Agents who pulled</th>
              <th scope="col" class="num">Pulls per agent</th>
              <th scope="col">Came back another day (of pullers)</th>
            </tr>
          </thead>
          <tbody>
            ${ledger.effects.map(
              (row) =>
                html`<tr>
                  <th scope="row">${groupName(row.variant)}</th>
                  <td class="num">${String(row.visitors)}</td>
                  <td>${describeRate(wilson(row.opened, row.visitors))}</td>
                  <td>${describeRate(wilson(row.finished, row.opened))}</td>
                  <td>${describeRate(wilson(row.sharers, row.visitors))}</td>
                  <td>${describeRate(wilson(row.buyers, row.visitors))}</td>
                  <td class="num">${String(row.pullers)}</td>
                  <td class="num">
                    ${row.pullers === 0 ? "–" : (row.pulls / row.pullers).toFixed(1)}
                  </td>
                  <td>${describeRate(wilson(row.returners, row.pullers))}</td>
                </tr>`,
            )}
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "The Back-Room Broadcast",
        html`<table>
          <caption>
            The Back-Room Broadcast: exhibit sales on air (in a segment, at the special price) and
            off air
          </caption>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col" class="num">Orders</th>
              <th scope="col" class="num">Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">On air</th>
              <td class="num">${String(ledger.broadcast.onAir.orders)}</td>
              <td class="num">${formatPrice(ledger.broadcast.onAir.revenueCents)}</td>
            </tr>
            <tr>
              <th scope="row">Off air</th>
              <td class="num">${String(ledger.broadcast.offAir.orders)}</td>
              <td class="num">${formatPrice(ledger.broadcast.offAir.revenueCents)}</td>
            </tr>
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "Duty streaks",
        html`<table>
          <caption>
            Duty streaks right now: ${String(ledger.streaks.alive)} alive
            (${String(ledger.streaks.safe)} already pulled today), ${String(ledger.streaks.dead)}
            dead, longest ever ${String(ledger.streaks.longest)} days,
            ${String(ledger.streaks.freezesSpent)} freezes spent. Bought back in the period:
            ${String(ledger.repairs.count)} (${formatPrice(ledger.repairs.revenueCents)})
          </caption>
          <thead>
            <tr>
              ${STREAK_BUCKETS.map((bucket) => html`<th scope="col" class="num">${bucket.label}</th>`)}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${ledger.streaks.byLength.map((count) => html`<td class="num">${String(count)}</td>`)}
            </tr>
          </tbody>
        </table>`,
      )}
      ${scrollTable(
        "The Bureau Dispatch",
        html`<table>
          <caption>
            The Bureau Dispatch (registered and unsubscribed are right now; links used are in the
            period)
          </caption>
          <thead>
            <tr>
              <th scope="col" class="num">Registered</th>
              <th scope="col" class="num">Unsubscribed</th>
              <th scope="col" class="num">Confirmations</th>
              <th scope="col" class="num">Files opened on another device</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="num">${String(ledger.dispatch.registered)}</td>
              <td class="num">${String(ledger.dispatch.unsubscribed)}</td>
              <td class="num">${String(ledger.dispatch.confirmations)}</td>
              <td class="num">${String(ledger.dispatch.recoveries)}</td>
            </tr>
          </tbody>
        </table>`,
      )}
    </div>`,
  });
}
