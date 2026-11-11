/**
 * The Bureau's Ledger: the private analytics dashboard at /bureau/ledger
 * (design note 0001, C5). Locked behind Cloudflare Access, which the Worker
 * also verifies (see access.ts).
 *
 * This file reads the numbers; ledger-page.ts lays them out. They come
 * straight from the raw events and orders: at the shop's traffic that's
 * milliseconds, and there's no second copy of the numbers to drift (rollups
 * wait until it isn't).
 */

import { CATALOG } from "../core/catalog";
import { FX_SQL, TEST_STARTED, testStatus, type TestStatus } from "../core/effects";
import { REPAIR_SLUG } from "../core/repair";
import { NETWORKS, type Network } from "../core/share";
import type { StreakSummary } from "../core/streak";
import { dispatchCountsQuery, type DispatchCounts } from "./dispatch";
import { readStreakSummary } from "./streak";

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
  /**
   * Visitors who viewed any exhibit in the period, each counted once. Not the
   * sum of the items' visitors: one visitor often views several exhibits.
   */
  readonly visitors: number;
  readonly items: readonly ItemRow[];
  readonly sources: readonly SourceRow[];
  readonly shares: readonly ShareRow[];
}

/** A row as D1 hands it back: nothing about it is trusted until read. */
type Row = Record<string, unknown>;

/** A count or a sum from a row. SUM over no rows is NULL, which reads as 0. */
const num = (value: unknown): number => (typeof value === "number" ? value : 0);

/**
 * The only row of an aggregate with no GROUP BY, which always returns exactly
 * one. (Were there none, this is an empty row, and every number reads as 0.)
 */
const one = (rows: readonly Row[]): Row => ({ ...rows[0] });

/** Which test group a row's visitor is in (note 0008), as a SQL column. */
const VARIANT_SQL = `CASE WHEN ${FX_SQL} THEN 'fx' ELSE 'plain' END AS variant`;

const byKey = (rows: readonly Row[], key: string): Map<unknown, Row> =>
  new Map(rows.map((row) => [row[key], row]));

/**
 * Runs named statements as one batch and hands back each one's rows under its
 * name, so nothing depends on the order they were written in.
 */
async function batchByName<Name extends string>(
  db: D1Database,
  statements: Record<Name, D1PreparedStatement>,
): Promise<Record<Name, Row[]>> {
  const names = Object.keys(statements) as Name[];
  const results = await db.batch<Row>(names.map((name) => statements[name]));
  // A batch returns one result per statement, in order.
  return Object.fromEntries(
    results.map((result, index) => [String(names[index]), result.results]),
  ) as Record<Name, Row[]>;
}

/** Every query the Ledger runs, by name, for events and orders since `since`. */
function ledgerQueries(db: D1Database, since: number, ownHost: string) {
  return {
    /** Each exhibit's funnel, from the raw events. */
    itemEvents: db
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
    /** Each exhibit's sales, and how many of its visitors bought it. */
    itemOrders: db
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
    /** Where visitors first came from, and how many later bought. */
    sources: db
      .prepare(
        // Each visitor counts once, by the source of their first item view in
        // the period (first touch). Rows from before the visitor cookie have
        // no visitor to follow, so they're left out here. "Later bought" means
        // an exhibit: a streak buy-back isn't a purchase the source earned.
        `WITH firsts AS (
           SELECT visitor_id, ts, utm_source, referrer_host,
             ROW_NUMBER() OVER (PARTITION BY visitor_id ORDER BY ts, id) AS n
           FROM analytics_events
           WHERE event = 'item_viewed' AND ts >= ?1 AND visitor_id IS NOT NULL
         )
         SELECT
           CASE
             WHEN f.utm_source IS NOT NULL THEN f.utm_source
             WHEN f.referrer_host IS NULL THEN '(direct)'
             WHEN f.referrer_host = ?2 THEN '(this site)'
             ELSE f.referrer_host
           END AS source,
           COUNT(DISTINCT f.visitor_id) AS visitors,
           COUNT(DISTINCT o.visitor_id) AS buyers
         FROM firsts f
         LEFT JOIN orders o
           ON o.visitor_id = f.visitor_id AND o.paid_at >= f.ts AND o.item_slug != ?3
         WHERE f.n = 1
         GROUP BY source ORDER BY visitors DESC, source LIMIT 20`,
      )
      .bind(since, ownHost, REPAIR_SLUG),
    /** Shares by network, the visits they brought and the orders that followed. */
    shares: db
      .prepare(
        // A sharer opening their own link isn't a return visit, and a streak
        // buy-back isn't a sale the share brought in.
        `SELECT s.channel,
           COUNT(DISTINCT s.ref) AS shares,
           COUNT(DISTINCT v.id) AS visits,
           COUNT(DISTINCT o.stripe_session_id) AS orders
         FROM analytics_events s
         LEFT JOIN analytics_events v
           ON v.event = 'shared_visit' AND v.ref = s.ref
          AND (v.visitor_id IS NULL OR s.visitor_id IS NULL OR v.visitor_id != s.visitor_id)
         LEFT JOIN orders o
           ON o.visitor_id = v.visitor_id AND o.paid_at >= v.ts AND o.item_slug != ?2
         WHERE s.event = 'share_clicked' AND s.ts >= ?1
         GROUP BY s.channel`,
      )
      .bind(since, REPAIR_SLUG),
    /** The Vault lever: who pulled, how often, and who came back. One row. */
    vault: db
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
    /** Dispatch registrations and emails. One row. */
    dispatch: dispatchCountsQuery(db, since),
    /** Streak buy-backs. One row. */
    repairs: db
      .prepare(
        `SELECT COUNT(*) AS count, SUM(amount_cents) AS revenue FROM orders
         WHERE item_slug = ? AND paid_at >= ?`,
      )
      .bind(REPAIR_SLUG, since),
    /** Exhibit sales on and off air. One row. */
    broadcast: db
      .prepare(
        `SELECT
           SUM(segment IS NOT NULL) AS on_orders,
           SUM(CASE WHEN segment IS NOT NULL THEN amount_cents ELSE 0 END) AS on_revenue,
           SUM(segment IS NULL) AS off_orders,
           SUM(CASE WHEN segment IS NULL THEN amount_cents ELSE 0 END) AS off_revenue
         FROM orders WHERE paid_at >= ? AND item_slug != ?`,
      )
      .bind(since, REPAIR_SLUG),
    /** Vault pulls by test group. */
    effectsPulls: db
      .prepare(
        `SELECT ${VARIANT_SQL},
           COUNT(DISTINCT visitor_id) AS pullers,
           COUNT(*) AS pulls,
           COUNT(DISTINCT CASE WHEN visitor_id IN (
             SELECT visitor_id FROM vault_pulls WHERE pulled_at >= ?1
             GROUP BY visitor_id HAVING COUNT(DISTINCT day) > 1
           ) THEN visitor_id END) AS returners
         FROM vault_pulls WHERE pulled_at >= ?1 GROUP BY variant`,
      )
      .bind(since),
    /** Reading and sharing by test group. */
    effectsEvents: db
      .prepare(
        `SELECT ${VARIANT_SQL},
           COUNT(DISTINCT CASE WHEN event = 'item_viewed' THEN visitor_id END) AS visitors,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'opened' THEN visitor_id END) AS opened,
           COUNT(DISTINCT CASE WHEN event = 'lore_expanded' AND read_depth = 'finished' THEN visitor_id END) AS finished,
           COUNT(DISTINCT CASE WHEN event = 'share_clicked' THEN visitor_id END) AS sharers
         FROM analytics_events WHERE ts >= ? AND visitor_id IS NOT NULL GROUP BY variant`,
      )
      .bind(since),
    /** Buyers by test group. */
    effectsBuyers: db
      .prepare(
        `SELECT ${VARIANT_SQL},
           COUNT(DISTINCT visitor_id) AS buyers
         FROM orders WHERE paid_at >= ? AND visitor_id IS NOT NULL AND item_slug != ?
         GROUP BY variant`,
      )
      .bind(since, REPAIR_SLUG),
    /** The stopping rule: pullers by group since the test began, whatever the period. */
    testPullers: db
      .prepare(
        `SELECT ${VARIANT_SQL},
           COUNT(DISTINCT visitor_id) AS pullers
         FROM vault_pulls WHERE pulled_at >= ? GROUP BY variant`,
      )
      .bind(TEST_STARTED),
    /** Everyone who viewed any exhibit, each counted once. One row. */
    visitors: db
      .prepare(
        // Each visitor once across all exhibits, for the headline. Rows from
        // before the visitor cookie have no visitor id and aren't counted,
        // the same as in each item's own count.
        `SELECT COUNT(DISTINCT visitor_id) AS visitors FROM analytics_events
         WHERE event = 'item_viewed' AND ts >= ?`,
      )
      .bind(since),
  };
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
  const rows = await batchByName(db, ledgerQueries(db, since, ownHost));
  const streaks = await readStreakSummary(db, nowSeconds);

  const vault = one(rows.vault);
  const dispatch = one(rows.dispatch);
  const repairs = one(rows.repairs);
  const broadcast = one(rows.broadcast);
  const pullsByVariant = byKey(rows.effectsPulls, "variant");
  const eventsByVariant = byKey(rows.effectsEvents, "variant");
  const buyersByVariant = byKey(rows.effectsBuyers, "variant");
  const testPullersByVariant = byKey(rows.testPullers, "variant");
  const eventsByItem = byKey(rows.itemEvents, "item_slug");
  const ordersByItem = byKey(rows.itemOrders, "item_slug");
  const sharesByChannel = byKey(rows.shares, "channel");

  return {
    period,
    streaks,
    visitors: num(one(rows.visitors)["visitors"]),
    repairs: { count: num(repairs["count"]), revenueCents: num(repairs["revenue"]) },
    effectsTest: testStatus(
      nowSeconds,
      num(testPullersByVariant.get("fx")?.["pullers"]),
      num(testPullersByVariant.get("plain")?.["pullers"]),
    ),
    effects: (["fx", "plain"] as const).map((variant) => {
      const row = pullsByVariant.get(variant);
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
      onAir: { orders: num(broadcast["on_orders"]), revenueCents: num(broadcast["on_revenue"]) },
      offAir: { orders: num(broadcast["off_orders"]), revenueCents: num(broadcast["off_revenue"]) },
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
      const row = eventsByItem.get(item.slug);
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
    sources: rows.sources.map((row) => ({
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
