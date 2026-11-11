/** "Grease the Clerk" (design note 0003, G4): starting a buy-back and the page Stripe returns to. */

import { returnOutcome, SESSION_ID } from "../core/checkout";
import { VAULT_PATH } from "../core/paths";
import { repairSessionForm } from "../core/repair";
import { canRepair } from "../core/streak";
import { vaultDay } from "../core/vault";
import type { Deps } from "./deps";
import {
  forbidden,
  fromOwnSite,
  page,
  PRIVATE_PAGE_CACHE,
  returningVisitor,
  seeOther,
} from "./http";
import { repairReturnPage, repairUnavailablePage, type RepairReturn } from "./repair-page";
import { readStreak } from "./streak";
import { createCheckoutSession, retrieveCheckoutSession } from "./stripe";

/**
 * "Grease the Clerk": POST /streak/repair starts a Stripe Checkout Session to
 * buy back the visitor's dead streak, if it can still be bought back. The
 * price comes from core/repair.ts, never from the form. Anything else goes
 * back to the Vault.
 */
export async function repairCheckout(request: Request, deps: Deps): Promise<Response> {
  if (!fromOwnSite(request)) return forbidden();
  const visitorId = returningVisitor(request, deps);
  const { stripeKey } = deps;
  if (visitorId === undefined || stripeKey === undefined) return seeOther(VAULT_PATH);
  const now = deps.nowSeconds();
  const streak = await readStreak(deps.db, visitorId, now);
  if (!canRepair(streak, vaultDay(now))) return seeOther(VAULT_PATH);
  const result = await createCheckoutSession(
    stripeKey,
    repairSessionForm(new URL(request.url).origin, visitorId, streak.lost),
    deps.fetch,
  );
  if (!result.ok) {
    console.error(`repair checkout failed: ${result.reason}`);
    return page(repairUnavailablePage(), 502);
  }
  return seeOther(result.url);
}

/**
 * What our own records say about a paid buy-back: restored (the repair is on
 * file), owed (the order is on file with no repair, so the payment restored
 * nothing), or pending (the webhook hasn't landed yet).
 */
async function paidRepairState(db: D1Database, sessionId: string): Promise<RepairReturn> {
  const [repairs, orders] = await db.batch([
    db.prepare("SELECT 1 FROM streak_repairs WHERE stripe_session_id = ?").bind(sessionId),
    db.prepare("SELECT 1 FROM orders WHERE stripe_session_id = ?").bind(sessionId),
  ]);
  if (repairs?.results.length === 1) return "restored";
  return orders?.results.length === 1 ? "owed" : "pending";
}

/**
 * Where Stripe sends a buy-back buyer. Says only what Stripe confirms about
 * the payment, and only what our records show about the streak.
 */
export async function repairReturn(url: URL, deps: Deps): Promise<Response> {
  const id = url.searchParams.get("session_id");
  let outcome: RepairReturn = "unchecked";
  if (id !== null && SESSION_ID.test(id) && deps.stripeKey !== undefined) {
    const lookup = await retrieveCheckoutSession(deps.stripeKey, id, deps.fetch);
    if (lookup.ok) {
      const { kind } = returnOutcome(lookup.session);
      outcome = kind === "paid" ? await paidRepairState(deps.db, id) : kind;
    } else console.error(`repair return page: ${lookup.reason}`);
  }
  const response = page(repairReturnPage(outcome, id ?? ""));
  response.headers.set("Cache-Control", PRIVATE_PAGE_CACHE);
  return response;
}
