/**
 * The Agent Dossier, in D1 (design note 0003, G1).
 *
 * Granting never breaks what triggered it: a failed grant is logged by
 * event name and dropped, like analytics. Grants are idempotent (INSERT OR
 * IGNORE), so a repeated event can't award anything twice.
 */

import type { AnalyticsEvent } from "../core/analytics";
import { codenameFor, isAward, awardsForEvent } from "../core/dossier";

export interface Agent {
  readonly agentNumber: number;
  readonly codename: string;
  /** Award ids with when they were earned, oldest first. */
  readonly awards: readonly { readonly id: string; readonly earnedAt: number }[];
}

/**
 * Grants awards to a visitor, opening their dossier first if they don't
 * have one. Unknown award ids are ignored.
 */
export async function grantAwards(
  db: D1Database,
  visitorId: string,
  awards: readonly string[],
  now: number,
): Promise<void> {
  const valid = awards.filter(isAward);
  if (valid.length === 0) return;
  await db.batch([
    db
      .prepare("INSERT OR IGNORE INTO agents (visitor_id, codename, created_at) VALUES (?, ?, ?)")
      .bind(visitorId, codenameFor(visitorId), now),
    ...valid.map((award) =>
      db
        .prepare("INSERT OR IGNORE INTO awards (visitor_id, award, earned_at) VALUES (?, ?, ?)")
        .bind(visitorId, award, now),
    ),
  ]);
}

/**
 * Grants what a just-recorded event earned: its own visitor's awards and, for
 * a visit through someone's share, the Recruiter badge to the sharer (never
 * to someone opening their own link).
 */
export async function grantForEvent(db: D1Database, event: AnalyticsEvent): Promise<void> {
  if (event.visitorId !== null) {
    await grantAwards(db, event.visitorId, awardsForEvent(event), event.ts);
  }
  if (event.event === "shared_visit" && event.ref !== null) {
    const sharer = await db
      .prepare(
        `SELECT visitor_id FROM analytics_events
         WHERE event = 'share_clicked' AND ref = ? AND visitor_id IS NOT NULL LIMIT 1`,
      )
      .bind(event.ref)
      .first<{ visitor_id: string }>();
    if (sharer !== null && sharer.visitor_id !== event.visitorId) {
      await grantAwards(db, sharer.visitor_id, ["recruiter"], event.ts);
    }
  }
}

/** A visitor's dossier, or undefined if they haven't earned anything yet. */
export async function readDossier(
  db: D1Database,
  visitorId: string | null,
): Promise<Agent | undefined> {
  if (visitorId === null) return undefined;
  const results = await db.batch<Record<string, unknown>>([
    db.prepare("SELECT agent_number, codename FROM agents WHERE visitor_id = ?").bind(visitorId),
    db
      .prepare("SELECT award, earned_at FROM awards WHERE visitor_id = ? ORDER BY earned_at, award")
      .bind(visitorId),
  ]);
  // A batch returns one result per statement, in order.
  const [agents, awards] = results.map((result) => result.results) as [
    Record<string, unknown>[],
    Record<string, unknown>[],
  ];
  const agent = agents[0];
  if (agent === undefined) return undefined;
  return {
    agentNumber: Number(agent["agent_number"]),
    codename: String(agent["codename"]),
    awards: awards.map((row) => ({
      id: String(row["award"]),
      earnedAt: Number(row["earned_at"]),
    })),
  };
}
