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

/**
 * The effects test's stopping rule (design note 0011): it runs until each
 * group has about TARGET_PULLERS agents who pulled, or for TEST_DAYS days
 * after shop-wide sound joined, whichever comes first. Then a clear winner
 * ships to everyone, and if there's none, everyone gets the effects.
 */

/** When the test began counting: the Vault's split (note 0008, PR 3). */
export const TEST_STARTED = Date.UTC(2026, 10, 9) / 1000;

/** When shop-wide sound joined (note 0011); the days run from here. */
export const TEST_WIDENED = Date.UTC(2026, 10, 10) / 1000;

export const TEST_DAYS = 30;

/** Agents who pulled, per group, that end the test early. */
export const TARGET_PULLERS = 200;

export interface TestStatus {
  /** Which day of the test it is, 1 to TEST_DAYS. */
  readonly day: number;
  readonly fxPullers: number;
  readonly plainPullers: number;
  /** Why the test is over, or undefined while it runs. */
  readonly ended: "target" | "time" | undefined;
}

export function testStatus(
  nowSeconds: number,
  fxPullers: number,
  plainPullers: number,
): TestStatus {
  const elapsed = Math.floor((nowSeconds - TEST_WIDENED) / 86_400) + 1;
  const day = Math.min(Math.max(elapsed, 1), TEST_DAYS);
  const ended =
    fxPullers >= TARGET_PULLERS && plainPullers >= TARGET_PULLERS
      ? "target"
      : nowSeconds >= TEST_WIDENED + TEST_DAYS * 86_400
        ? "time"
        : undefined;
  return { day, fxPullers, plainPullers, ended };
}
