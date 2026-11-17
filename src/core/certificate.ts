/**
 * Finds on the certificate (design note 0018, build step 3; note 0021): the
 * payoff of the hunt. When an agent acquires an exhibit, the tips they were
 * told about it appear on its Bureau Certificate, stamped by Gerald.
 *
 * Pure rules. A stamp is a record of what the buyer already did, never a
 * bonus for paying: it comes only from tips already in their file, and buying
 * adds none. Tips are about exhibits on their way (0020), so stamps appear
 * once an exhibit an agent heard about goes on sale and that agent buys it.
 */

import { tipAwardId, tipsAbout, type Tip } from "./tips";

/** The tips about `exhibit` that this agent holds, in the order they are told: Gerald's stamps. */
export function certificateStamps(exhibit: string, held: ReadonlySet<string>): readonly Tip[] {
  return tipsAbout(exhibit).filter((tip) => held.has(tipAwardId(tip)));
}
