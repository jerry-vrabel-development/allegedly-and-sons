/**
 * Gerald's stamps on the paper certificate (design note 0021, part 2): copied
 * onto an order when the webhook records it, and read back for packing.
 */

import type { Stamp } from "../core/certificate";
import { findItem, type Item } from "../core/catalog";
import { REPAIR_SLUG } from "../core/repair";
import { tipAwardId, tipsAbout } from "../core/tips";

/**
 * The statement that copies a buyer's stamps onto a just-recorded order, for
 * the webhook's batch (after the order's insert). It stamps the tips about the
 * exhibit that the order's visitor held at or before the order's paid_at, as
 * worded now, so a late or redelivered webhook stamps the same thing. Undefined
 * when nobody wrote tips about the exhibit, so there's nothing to copy.
 */
export function snapshotStamps(
  db: D1Database,
  sessionId: string,
  exhibit: string,
): D1PreparedStatement | undefined {
  const tips = tipsAbout(exhibit);
  if (tips.length === 0) return undefined;
  return db
    .prepare(
      `WITH tips (award, n, contact, line) AS (VALUES ${tips.map(() => "(?, ?, ?, ?)").join(", ")})
       INSERT OR IGNORE INTO order_stamps (stripe_session_id, award, n, contact, line)
       SELECT o.stripe_session_id, tips.award, tips.n, tips.contact, tips.line
       FROM orders o
       JOIN awards a ON a.visitor_id = o.visitor_id AND a.earned_at <= o.paid_at
       JOIN tips ON tips.award = a.award
       WHERE o.stripe_session_id = ?`,
    )
    .bind(...tips.flatMap((tip) => [tipAwardId(tip), tip.n, tip.contact, tip.line]), sessionId);
}

/** One order waiting to ship, with what goes on its certificate. */
export interface ToPack {
  readonly sessionId: string;
  readonly paidAt: number;
  /** Undefined when the order's exhibit couldn't be read from Stripe. */
  readonly item: Item | undefined;
  readonly stamps: readonly Stamp[];
}

/** Orders not yet shipped (never streak buy-backs, which ship nothing), oldest first. */
export async function readToPack(db: D1Database): Promise<readonly ToPack[]> {
  const [orders, stamps] = (
    await db.batch<Record<string, unknown>>([
      db
        .prepare(
          `SELECT stripe_session_id, item_slug, paid_at FROM orders
           WHERE status = 'paid' AND item_slug != ?
           ORDER BY paid_at, stripe_session_id`,
        )
        .bind(REPAIR_SLUG),
      db
        .prepare(
          `SELECT s.stripe_session_id, s.contact, s.line FROM order_stamps s
           JOIN orders o ON o.stripe_session_id = s.stripe_session_id
           WHERE o.status = 'paid'
           ORDER BY s.stripe_session_id, s.n`,
        )
        .bind(),
    ])
  ).map((result) => result.results) as [Record<string, unknown>[], Record<string, unknown>[]];

  return orders.map((row) => {
    const sessionId = String(row["stripe_session_id"]);
    return {
      sessionId,
      paidAt: Number(row["paid_at"]),
      item: findItem(String(row["item_slug"])),
      stamps: stamps
        .filter((stamp) => stamp["stripe_session_id"] === sessionId)
        .map((stamp) => ({ contact: String(stamp["contact"]), line: String(stamp["line"]) })),
    };
  });
}
