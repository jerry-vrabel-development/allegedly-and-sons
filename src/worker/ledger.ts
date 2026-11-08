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
import { describeRate, MIN_VISITORS_TO_RANK, wilson } from "../core/stats";
import { html, type SafeHtml } from "./html";
import { layout } from "./pages";

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

export interface Ledger {
  readonly period: Period;
  readonly items: readonly ItemRow[];
  readonly sources: readonly SourceRow[];
  readonly shares: readonly ShareRow[];
}

type Row = Record<string, unknown>;

const num = (value: unknown): number => (typeof value === "number" ? value : 0);

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
        `SELECT item_slug, COUNT(*) AS orders, SUM(amount_cents) AS revenue
         FROM orders WHERE paid_at >= ? GROUP BY item_slug`,
      )
      .bind(since),
    db
      .prepare(
        `SELECT
           CASE
             WHEN e.utm_source IS NOT NULL THEN e.utm_source
             WHEN e.referrer_host IS NULL THEN '(direct)'
             WHEN e.referrer_host = ? THEN '(this site)'
             ELSE e.referrer_host
           END AS source,
           COUNT(DISTINCT e.visitor_id) AS visitors,
           COUNT(DISTINCT o.visitor_id) AS buyers
         FROM analytics_events e
         LEFT JOIN orders o ON o.visitor_id = e.visitor_id AND o.paid_at >= e.ts
         WHERE e.event = 'item_viewed' AND e.ts >= ?
         GROUP BY source ORDER BY visitors DESC, source LIMIT 20`,
      )
      .bind(ownHost, since),
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
  ]);

  // A batch returns one result per statement, in order.
  const [items, orders, sources, shares] = results.map((result) => result.results) as [
    Row[],
    Row[],
    Row[],
    Row[],
  ];
  const byItem = new Map(items.map((row) => [row["item_slug"], row]));
  const ordersByItem = new Map(orders.map((row) => [row["item_slug"], row]));
  const sharesByChannel = new Map(shares.map((row) => [row["channel"], row]));

  return {
    period,
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
  const totalOrders = ledger.items.reduce((sum, row) => sum + row.orders, 0);
  const totalRevenue = ledger.items.reduce((sum, row) => sum + row.revenueCents, 0);

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
              <th scope="col">Bought</th>
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
                  <td>${describeRate(wilson(row.orders, row.visitors))}</td>
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
            Where visitors came from (campaign, else the site that sent them)
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
    </div>`,
  });
}
