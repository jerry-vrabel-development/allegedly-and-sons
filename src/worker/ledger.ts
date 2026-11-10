/**
 * The Bureau's Ledger: the private analytics dashboard at /bureau/ledger
 * (design note 0001, C5). Locked behind Cloudflare Access, which the Worker
 * also verifies (see access.ts).
 *
 * Plain server-rendered HTML, no script. Numbers come straight from the raw
 * events and orders: at the shop's traffic that's milliseconds, and there's
 * no second copy of the numbers to drift (rollups wait until it isn't).
 */

import { CATALOG, formatPrice } from "../core/catalog";
import { NETWORKS, type Network } from "../core/share";
import { clearlyDifferent, describeRate, MIN_VISITORS_TO_RANK, wilson } from "../core/stats";
import { html, type SafeHtml } from "./html";
import { layout } from "./pages";
import { dispatchCountsQuery, type DispatchCounts } from "./dispatch";
import { STREAK_BUCKETS, type StreakSummary } from "../core/streak";
import { readStreakSummary } from "./streak";
import { REPAIR_SLUG } from "../core/repair";
import {
  FX_SQL,
  TARGET_PULLERS,
  TEST_DAYS,
  TEST_STARTED,
  testStatus,
  type TestStatus,
} from "../core/effects";

export const LEDGER_PATH = "/bureau/ledger";

/** The periods the ledger can show, in days (0 = everything). */
export const PERIODS = [7, 30, 90, 0] as const;
export type Period = (typeof PERIODS)[number];

/** The period asked for in ?days=, defaulting to 30. */
export function periodFrom(url: URL): Period {
  // No ?days= must mean the default, not Number(null), which is 0 ("all time").
  const raw = url.searchParams.get("days");
  const days = raw === null || raw === "" ? NaN : Number(raw);
  return (PERIODS as readonly number[]).includes(days) ? (days as Period) : 30;
}

export interface ItemRow {
  readonly slug: string;
  readonly name: string;
  readonly visitors: number;
  readonly views: number;
  readonly opened: number;
  readonly finished: number;
  readonly shares: number;
  readonly sharedVisits: number;
  readonly checkouts: number;
  /** Visitors of this item who bought it: what "Bought" rates against visitors. */
  readonly buyers: number;
  /** Every paid order for the item in the period, attributed or not (sales). */
  readonly orders: number;
  readonly revenueCents: number;
}

export interface SourceRow {
  readonly source: string;
  readonly visitors: number;
  readonly buyers: number;
}

export interface ShareRow {
  readonly channel: Network;
  readonly shares: number;
  readonly visits: number;
  readonly orders: number;
}

/** The vault lever (note 0003, G2): does the daily pull bring agents back? */
export interface VaultRow {
  readonly pullers: number;
  readonly pulls: number;
  readonly bonusPulls: number;
  /** Agents who pulled on more than one day in the period. */
  readonly returners: number;
}

export interface EffectsRow {
  readonly variant: "fx" | "plain";
  /** Visitors who viewed an exhibit, and of them: opened, finished, shared, bought (note 0011). */
  readonly visitors: number;
  readonly opened: number;
  readonly finished: number;
  readonly sharers: number;
  readonly buyers: number;
  readonly pullers: number;
  readonly pulls: number;
  /** Pullers who pulled on more than one day in the period. */
  readonly returners: number;
}

export interface Ledger {
  readonly period: Period;
  readonly vault: VaultRow;
  readonly dispatch: DispatchCounts;
  /** Duty streaks right now (not by period: a streak is about today). */
  readonly streaks: StreakSummary;
  /** Exhibit sales in the period, on air (in a broadcast segment) and off (note 0009). */
  readonly broadcast: {
    readonly onAir: { readonly orders: number; readonly revenueCents: number };
    readonly offAir: { readonly orders: number; readonly revenueCents: number };
  };
  /** The shop with and without sound and motion (notes 0008 and 0011), in the period. */
  readonly effects: readonly EffectsRow[];
  /** The stopping rule, counted since the test began, whatever the period. */
  readonly effectsTest: TestStatus;
  /** Streaks bought back in the period ("Grease the Clerk"). */
  readonly repairs: { readonly count: number; readonly revenueCents: number };
  readonly items: readonly ItemRow[];
  readonly sources: readonly SourceRow[];
  readonly shares: readonly ShareRow[];
}

type Row = Record<string, unknown>;

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

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

/**
 * Gathers the ledger's numbers for events since `since` (Unix seconds).
 * `ownHost` is the shop's host, so internal clicks show as "(this site)".
 */
export async function readLedger(
  db: D1Database,
  period: Period,
  nowSeconds: number,
  ownHost: string,
): Promise<Ledger> {
  const since = period === 0 ? 0 : nowSeconds - period * 86_400;

  const results = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT item_slug,
           COUNT(DISTINCT CASE WHEN event = 'item_viewed' THEN visitor_id END) AS visitors,
           SUM(event = 'item_viewed') AS views,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'opened' THEN visitor_id END) AS opened,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'finished' THEN visitor_id END) AS finished,
           SUM(event = 'share_clicked') AS shares,
           SUM(event = 'shared_visit') AS shared_visits,
           COUNT(DISTINCT CASE WHEN event = 'checkout_started' THEN visitor_id END) AS checkouts
         FROM analytics_events WHERE ts >= ? GROUP BY item_slug`,
      )
      .bind(since),
    db
      .prepare(
        // Sales count every paid order; buyers only visitors who viewed the
        // item in the period and then bought it, so "Bought" never mixes in
        // orders from before the visitor cookie (or with none).
        `SELECT o.item_slug,
           COUNT(*) AS orders,
           SUM(o.amount_cents) AS revenue,
           COUNT(DISTINCT CASE WHEN EXISTS (
             SELECT 1 FROM analytics_events e
             WHERE e.event = 'item_viewed' AND e.item_slug = o.item_slug
               AND e.visitor_id = o.visitor_id AND e.ts >= ? AND e.ts <= o.paid_at
           ) THEN o.visitor_id END) AS buyers
         FROM orders o WHERE o.paid_at >= ? GROUP BY o.item_slug`,
      )
      .bind(since, since),
    db
      .prepare(
        // Each visitor counts once, by the source of their first item view in
        // the period (first touch). Rows from before the visitor cookie have
        // no visitor to follow, so they're left out here.
        `WITH firsts AS (
           SELECT visitor_id, ts, utm_source, referrer_host,
             ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts, id) AS n
           FROM analytics_events
           WHERE event = 'item_viewed' AND ts >= ? AND visitor_id IS NOT NULL
         )
         SELECT
           CASE
             WHEN f.utm_source IS NOT NULL THEN f.utm_source
             WHEN f.referrer_host IS NULL THEN '(direct)'
             WHEN f.referrer_host = ? THEN '(this site)'
             ELSE f.referrer_host
           END AS source,
           COUNT(DISTINCT f.visitor_id) AS visitors,
           COUNT(DISTINCT o.visitor_id) AS buyers
         FROM firsts f
         LEFT JOIN orders o ON o.visitor_id = f.visitor_id AND o.paid_at >= f.ts
         WHERE f.n = 1
         GROUP BY source ORDER BY visitors DESC, source LIMIT 20`,
      )
      .bind(since, ownHost),
    db
      .prepare(
        // A sharer opening their own link isn't a return visit.
        `SELECT s.channel,
           COUNT(DISTINCT s.ref) AS shares,
           COUNT(DISTINCT v.id) AS visits,
           COUNT(DISTINCT o.stripe_session_id) AS orders
         FROM analytics_events s
         LEFT JOIN analytics_events v
           ON v.event = 'shared_visit' AND v.ref = s.ref
          AND (v.visitor_id IS NULL OR s.visitor_id IS NULL OR v.visitor_id != s.visitor_id)
         LEFT JOIN orders o ON o.visitor_id = v.visitor_id AND o.paid_at >= v.ts
         WHERE s.event = 'share_clicked' AND s.ts >= ?
         GROUP BY s.channel`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT COUNT(DISTINCT visitor_id) AS pullers,
           COUNT(*) AS pulls,
           SUM(kind = 'bonus') AS bonus_pulls,
           (SELECT COUNT(*) FROM (
              SELECT visitor_id FROM vault_pulls WHERE pulled_at >= ?1
              GROUP BY visitor_id HAVING COUNT(DISTINCT day) > 1
            )) AS returners
         FROM vault_pulls WHERE pulled_at >= ?1`,
      )
      .bind(since),
    dispatchCountsQuery(db, since),
    db
      .prepare(
        `SELECT COUNT(*) AS count, SUM(amount_cents) AS revenue FROM orders
         WHERE item_slug = ? AND paid_at >= ?`,
      )
      .bind(REPAIR_SLUG, since),
    db
      .prepare(
        `SELECT
           SUM(segment IS NOT NULL) AS on_orders,
           SUM(CASE WHEN segment IS NOT NULL THEN amount_cents ELSE 0 END) AS on_revenue,
           SUM(segment IS NULL) AS off_orders,
           SUM(CASE WHEN segment IS NULL THEN amount_cents ELSE 0 END) AS off_revenue
         FROM orders WHERE paid_at >= ? AND item_slug != ?`,
      )
      .bind(since, REPAIR_SLUG),
    db
      .prepare(
        `SELECT CASE WHEN ${FX_SQL} THEN 'fx' ELSE 'plain' END AS variant,
           COUNT(DISTINCT visitor_id) AS pullers,
           COUNT(*) AS pulls,
           COUNT(DISTINCT CASE WHEN visitor_id IN (
             SELECT visitor_id FROM vault_pulls WHERE pulled_at >= ?1
             GROUP BY visitor_id HAVING COUNT(DISTINCT day) > 1
           ) THEN visitor_id END) AS returners
         FROM vault_pulls WHERE pulled_at >= ?1 GROUP BY variant`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT CASE WHEN ${FX_SQL} THEN 'fx' ELSE 'plain' END AS variant,
           COUNT(DISTINCT CASE WHEN event = 'item_viewed' THEN visitor_id END) AS visitors,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'opened' THEN visitor_id END) AS opened,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'finished' THEN visitor_id END) AS finished,
           COUNT(DISTINCT CASE WHEN event = 'share_clicked' THEN visitor_id END) AS sharers
         FROM analytics_events WHERE ts >= ? AND visitor_id IS NOT NULL GROUP BY variant`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT CASE WHEN ${FX_SQL} THEN 'fx' ELSE 'plain' END AS variant,
           COUNT(DISTINCT visitor_id) AS buyers
         FROM orders WHERE paid_at >= ? AND visitor_id IS NOT NULL AND item_slug != ?
         GROUP BY variant`,
      )
      .bind(since, REPAIR_SLUG),
    db
      .prepare(
        `SELECT CASE WHEN ${FX_SQL} THEN 'fx' ELSE 'plain' END AS variant,
           COUNT(DISTINCT visitor_id) AS pullers
         FROM vault_pulls WHERE pulled_at >= ? GROUP BY variant`,
      )
      .bind(TEST_STARTED),
  ]);

  // A batch returns one result per statement, in order.
  const streaks = await readStreakSummary(db, nowSeconds);
  const [
    items,
    orders,
    sources,
    shares,
    [vault],
    [dispatch],
    [repairs],
    [onAir],
    effects,
    effectsEvents,
    effectsBuyers,
    testPullers,
  ] = results.map((result) => result.results) as [
    Row[],
    Row[],
    Row[],
    Row[],
    [Row],
    [Row],
    [Row],
    [Row],
    Row[],
    Row[],
    Row[],
    Row[],
  ];
  const byVariant = (rows: Row[]) => new Map(rows.map((row) => [row["variant"], row]));
  const effectsByVariant = byVariant(effects);
  const eventsByVariant = byVariant(effectsEvents);
  const buyersByVariant = byVariant(effectsBuyers);
  const pullersByVariant = byVariant(testPullers);
  const byItem = new Map(items.map((row) => [row["item_slug"], row]));
  const ordersByItem = new Map(orders.map((row) => [row["item_slug"], row]));
  const sharesByChannel = new Map(shares.map((row) => [row["channel"], row]));

  return {
    period,
    streaks,
    repairs: { count: num(repairs["count"]), revenueCents: num(repairs["revenue"]) },
    effectsTest: testStatus(
      nowSeconds,
      num(pullersByVariant.get("fx")?.["pullers"]),
      num(pullersByVariant.get("plain")?.["pullers"]),
    ),
    effects: (["fx", "plain"] as const).map((variant) => {
      const row = effectsByVariant.get(variant);
      const events = eventsByVariant.get(variant);
      return {
        variant,
        visitors: num(events?.["visitors"]),
        opened: num(events?.["opened"]),
        finished: num(events?.["finished"]),
        sharers: num(events?.["sharers"]),
        buyers: num(buyersByVariant.get(variant)?.["buyers"]),
        pullers: num(row?.["pullers"]),
        pulls: num(row?.["pulls"]),
        returners: num(row?.["returners"]),
      };
    }),
    broadcast: {
      onAir: { orders: num(onAir["on_orders"]), revenueCents: num(onAir["on_revenue"]) },
      offAir: { orders: num(onAir["off_orders"]), revenueCents: num(onAir["off_revenue"]) },
    },
    vault: {
      pullers: num(vault["pullers"]),
      pulls: num(vault["pulls"]),
      bonusPulls: num(vault["bonus_pulls"]),
      returners: num(vault["returners"]),
    },
    dispatch: {
      registered: num(dispatch["registered"]),
      unsubscribed: num(dispatch["unsubscribed"]),
      confirmations: num(dispatch["confirmations"]),
      recoveries: num(dispatch["recoveries"]),
    },
    items: CATALOG.map((item) => {
      const row = byItem.get(item.slug);
      const sold = ordersByItem.get(item.slug);
      return {
        slug: item.slug,
        name: item.name,
        visitors: num(row?.["visitors"]),
        views: num(row?.["views"]),
        opened: num(row?.["opened"]),
        finished: num(row?.["finished"]),
        shares: num(row?.["shares"]),
        sharedVisits: num(row?.["shared_visits"]),
        checkouts: num(row?.["checkouts"]),
        buyers: num(sold?.["buyers"]),
        orders: num(sold?.["orders"]),
        revenueCents: num(sold?.["revenue"]),
      };
    }),
    sources: sources.map((row) => ({
      source: String(row["source"]),
      visitors: num(row["visitors"]),
      buyers: num(row["buyers"]),
    })),
    shares: NETWORKS.map((channel) => {
      const row = sharesByChannel.get(channel);
      return {
        channel,
        shares: num(row?.["shares"]),
        visits: num(row?.["visits"]),
        orders: num(row?.["orders"]),
      };
    }),
  };
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

export function ledgerPage(ledger: Ledger, email: string): SafeHtml {
  const totalVisitors = ledger.items.reduce((sum, row) => sum + row.visitors, 0);
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
        <strong>${String(totalVisitors)}</strong> visitors ·
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
