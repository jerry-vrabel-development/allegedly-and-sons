/**
 * Measuring the Vault's sound and motion (design note 0008, PR 3).
 *
 * Half of agents get the reel and its sounds ("fx"); half get the plain lever
 * ("plain"). The split is by the last hex digit of the visitor id, so each
 * agent stays in one group, and the Ledger compares pulls per agent and how
 * often agents come back. Nothing is stored for it.
 */

export type EffectsVariant = "fx" | "plain";

/** The last hex digits that put an agent in the "fx" group (half of the 16). */
const FX_DIGITS: readonly string[] = ["0", "2", "4", "6", "8", "a", "c", "e"];

export function effectsVariant(visitorId: string): EffectsVariant {
  return FX_DIGITS.includes(visitorId.slice(-1)) ? "fx" : "plain";
}

/** The same rule in SQL, for the Ledger: true for "fx" visitor ids. */
export const FX_SQL = `substr(visitor_id, -1) IN (${FX_DIGITS.map((d) => `'${d}'`).join(", ")})`;

/**
 * Whether this view of the Vault plays effects: the agent's group, unless
 * ?fx=on or ?fx=off says otherwise for this one view (for checking both
 * versions). Visitors without an id see the plain lever.
 */
export function effectsOn(visitorId: string | null, fxParam: string | null): boolean {
  if (fxParam === "on") return true;
  if (fxParam === "off") return false;
  return visitorId !== null && effectsVariant(visitorId) === "fx";
}
