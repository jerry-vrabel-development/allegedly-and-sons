/**
 * Duty streaks in D1 (design note 0003, G4). A streak is worked out from the
 * agent's daily vault pulls and any days they bought back (streak_repairs),
 * so it can't drift from what actually happened.
 */

import { streakFrom, summarizeStreaks, type Streak, type StreakSummary } from "../core/streak";
import { vaultDay } from "../core/vault";

type Row = Record<string, unknown>;

/** Every day a repair row covers. */
function daysIn(row: Row): number[] {
  const from = Number(row["from_day"]);
  return Array.from({ length: Number(row["to_day"]) - from + 1 }, (_, i) => from + i);
}

/** A visitor's streak right now. */
export async function readStreak(
  db: D1Database,
  visitorId: string | null,
  nowSeconds: number,
): Promise<Streak> {
  const today = vaultDay(nowSeconds);
  if (visitorId === null) return streakFrom([], today);
  const results = await db.batch<Row>([
    db
      .prepare("SELECT day FROM vault_pulls WHERE visitor_id = ? AND kind = 'daily'")
      .bind(visitorId),
    db.prepare("SELECT from_day, to_day FROM streak_repairs WHERE visitor_id = ?").bind(visitorId),
  ]);
  // A batch returns one result per statement, in order.
  const [pulls, repairs] = results.map((result) => result.results) as [Row[], Row[]];
  return streakFrom(
    pulls.map((row) => Number(row["day"])),
    today,
    repairs.flatMap(daysIn),
  );
}

/** Every agent's streak, summed for the Ledger. */
export async function readStreakSummary(
  db: D1Database,
  nowSeconds: number,
): Promise<StreakSummary> {
  const results = await db.batch<Row>([
    db.prepare("SELECT visitor_id, day FROM vault_pulls WHERE kind = 'daily'"),
    db.prepare("SELECT visitor_id, from_day, to_day FROM streak_repairs"),
  ]);
  const [pulls, repairs] = results.map((result) => result.results) as [Row[], Row[]];
  const byAgent = new Map<string, { days: number[]; bridged: number[] }>();
  const agent = (id: unknown) => {
    const key = String(id);
    const entry = byAgent.get(key) ?? { days: [], bridged: [] };
    byAgent.set(key, entry);
    return entry;
  };
  for (const row of pulls) agent(row["visitor_id"]).days.push(Number(row["day"]));
  for (const row of repairs) agent(row["visitor_id"]).bridged.push(...daysIn(row));
  return summarizeStreaks(byAgent.values(), vaultDay(nowSeconds));
}
