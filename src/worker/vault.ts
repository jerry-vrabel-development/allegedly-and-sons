/**
 * The Vault Lever, in D1 (design note 0003, G2).
 *
 * The Worker decides everything: whether a pull is allowed, and what it
 * draws. Each step is a single statement, so it holds under concurrent
 * presses: the daily pull relies on a unique index, and a bonus pull is
 * recorded only if the agent has more bonus commendations than bonus pulls,
 * checked in the same INSERT.
 */

import { codenameFor } from "../core/dossier";
import { milestoneBadges } from "../core/streak";
import { grantAwards } from "./dossier";
import { readStreak } from "./streak";
import { BONUS_BADGES, cardForRoll, findVaultCard, vaultDay, type VaultCard } from "../core/vault";

export type PullKind = "daily" | "bonus";

export interface LatestPull {
  readonly card: VaultCard;
  readonly kind: PullKind;
  readonly pulledAt: number;
  /** The agent already had this card before this pull. */
  readonly duplicate: boolean;
}

export interface VaultState {
  /** Today's free pull hasn't been used. */
  readonly dailyReady: boolean;
  /** Bonus pulls earned and not yet used. */
  readonly bonusLeft: number;
  /** Bonus pulls earned in all (one per bonus commendation). */
  readonly bonusEarned: number;
  readonly latest: LatestPull | undefined;
  /** Vault card ids the agent holds. */
  readonly owned: ReadonlySet<string>;
}

const BONUS_PLACEHOLDERS = BONUS_BADGES.map(() => "?").join(", ");

/** A visitor's vault: what they can pull now, and what they've pulled. */
export async function readVault(
  db: D1Database,
  visitorId: string | null,
  nowSeconds: number,
): Promise<VaultState> {
  if (visitorId === null) {
    return { dailyReady: true, bonusLeft: 0, bonusEarned: 0, latest: undefined, owned: new Set() };
  }
  const results = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM vault_pulls
             WHERE visitor_id = ?1 AND kind = 'daily' AND day = ?2) AS daily_used,
           (SELECT COUNT(*) FROM vault_pulls
             WHERE visitor_id = ?1 AND kind = 'bonus') AS bonus_used,
           (SELECT COUNT(*) FROM awards
             WHERE visitor_id = ?1 AND award IN (${BONUS_PLACEHOLDERS})) AS bonus_earned`,
      )
      .bind(visitorId, vaultDay(nowSeconds), ...BONUS_BADGES),
    db
      .prepare(
        `SELECT p.card, p.kind, p.pulled_at,
           EXISTS (SELECT 1 FROM vault_pulls q
                    WHERE q.visitor_id = p.visitor_id AND q.card = p.card AND q.id < p.id) AS duplicate
         FROM vault_pulls p WHERE p.visitor_id = ? ORDER BY p.id DESC LIMIT 1`,
      )
      .bind(visitorId),
    db.prepare("SELECT DISTINCT card FROM vault_pulls WHERE visitor_id = ?").bind(visitorId),
  ]);
  // A batch returns one result per statement, in order.
  const [[counts], [latestRow], owned] = results.map((result) => result.results) as [
    [Record<string, unknown>],
    [Record<string, unknown>?],
    Record<string, unknown>[],
  ];
  const bonusEarned = Number(counts["bonus_earned"]);
  const latestCard = latestRow === undefined ? undefined : findVaultCard(String(latestRow["card"]));
  return {
    dailyReady: Number(counts["daily_used"]) === 0,
    bonusLeft: Math.max(0, bonusEarned - Number(counts["bonus_used"])),
    bonusEarned,
    latest:
      latestRow === undefined || latestCard === undefined
        ? undefined
        : {
            card: latestCard,
            kind: latestRow["kind"] === "bonus" ? "bonus" : "daily",
            pulledAt: Number(latestRow["pulled_at"]),
            duplicate: Number(latestRow["duplicate"]) === 1,
          },
    owned: new Set(owned.map((row) => String(row["card"]))),
  };
}

export type PullResult =
  { readonly ok: true; readonly kind: PullKind; readonly card: VaultCard } | { readonly ok: false };

/**
 * Pulls the lever for a visitor: today's free pull if it's unused, else a
 * bonus pull if one is left. `roll` (from rollFrom) picks the card. On a
 * pull, the card goes into the dossier too.
 */
export async function pullLever(
  db: D1Database,
  visitorId: string,
  nowSeconds: number,
  roll: number,
): Promise<PullResult> {
  const card = cardForRoll(roll);
  const day = vaultDay(nowSeconds);

  // Every puller becomes an agent (pulls reference the dossier).
  await db
    .prepare("INSERT OR IGNORE INTO agents (visitor_id, codename, created_at) VALUES (?, ?, ?)")
    .bind(visitorId, codenameFor(visitorId), nowSeconds)
    .run();

  let kind: PullKind = "daily";
  const daily = await db
    .prepare(
      `INSERT OR IGNORE INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
       VALUES (?, ?, 'daily', ?, ?)`,
    )
    .bind(visitorId, day, card.id, nowSeconds)
    .run();
  if (daily.meta.changes === 0) {
    kind = "bonus";
    const bonus = await db
      .prepare(
        `INSERT INTO vault_pulls (visitor_id, day, kind, card, pulled_at)
         SELECT ?1, ?2, 'bonus', ?3, ?4
         WHERE (SELECT COUNT(*) FROM awards
                 WHERE visitor_id = ?1 AND award IN (${BONUS_PLACEHOLDERS}))
             > (SELECT COUNT(*) FROM vault_pulls WHERE visitor_id = ?1 AND kind = 'bonus')`,
      )
      .bind(visitorId, day, card.id, nowSeconds, ...BONUS_BADGES)
      .run();
    if (bonus.meta.changes === 0) return { ok: false };
  }

  // Every card this agent has pulled goes in the dossier, not just this one,
  // so a grant that failed after an earlier pull is mended by the next.
  await db
    .prepare(
      `INSERT OR IGNORE INTO awards (visitor_id, award, earned_at)
       SELECT visitor_id, 'vault:' || card, MIN(pulled_at) FROM vault_pulls
       WHERE visitor_id = ? GROUP BY card`,
    )
    .bind(visitorId)
    .run();
  // A free pull extends the duty streak: grant any milestone it reached
  // (idempotent; each milestone badge is also a bonus pull).
  if (kind === "daily") {
    const streak = await readStreak(db, visitorId, nowSeconds);
    await grantAwards(db, visitorId, milestoneBadges(streak.days), nowSeconds);
  }
  return { ok: true, kind, card };
}

/** A random 32-bit number from the Workers runtime's secure generator. */
export function secureUint32(): number {
  return new DataView(crypto.getRandomValues(new Uint8Array(4)).buffer).getUint32(0);
}
