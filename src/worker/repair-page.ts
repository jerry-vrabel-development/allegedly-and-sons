/**
 * The page Stripe sends a buyer back to after "Grease the Clerk"
 * (/streak/restored?session_id=...). Like /thanks, it asks Stripe about the
 * session first, so opening it by hand proves nothing. The streak itself is
 * restored by the webhook, which can land a moment after this page, so for a
 * paid session the page also checks our own records before saying "restored".
 */

import { REPAIR_NAME } from "../core/repair";
import type { ReturnOutcome } from "../core/checkout";
import { html, type SafeHtml } from "./html";
import { layout, ORDER_CONTACT_EMAIL } from "./pages";
import { VAULT_PATH } from "../core/paths";

/**
 * What the return page can say. Stripe's answer, and for a paid session what
 * our own records show: "restored" once the repair is on file, "owed" when
 * the order is on file with no repair (paid, and nothing was restored), and
 * "pending" while the webhook hasn't landed yet.
 */
export type RepairReturn = "restored" | "pending" | "owed" | Exclude<ReturnOutcome["kind"], "paid">;

/** `sessionId` is the reference shown on the "owed" page; unused by the others. */
export function repairReturnPage(outcome: RepairReturn, sessionId: string): SafeHtml {
  const back = html`<p><a class="button" href="${VAULT_PATH}">Back to the Vault</a></p>`;
  const email = html`<a href="mailto:${ORDER_CONTACT_EMAIL}">${ORDER_CONTACT_EMAIL}</a>`;
  const pages: Record<RepairReturn, { title: string; body: SafeHtml }> = {
    restored: {
      title: "The clerk has been greased",
      body: html`<p class="tagline">Paperwork lost. Your streak lives.</p>
        <p>
          Payment confirmed, and Stripe will email your receipt. Your streak is restored. If you
          haven't pulled today, that pull is still yours to make before midnight UTC.
        </p>`,
    },
    pending: {
      title: "The clerk has been paid",
      body: html`<p>
          Payment confirmed, and Stripe will email your receipt. The clerk is still losing the
          paperwork: your streak should be back within a minute. Reload this page to check.
        </p>
        <p>
          If it isn't back after a few minutes, email ${email} and we'll restore it or refund you.
        </p>`,
    },
    owed: {
      title: "Paid, but nothing was restored",
      body: html`<p>
          Your payment went through, but there was no dead streak left for it to restore, so you got
          nothing for it. That's our problem, not yours: you are owed a refund.
        </p>
        <p>
          Email ${email} with this reference and we'll send it back: <code>${sessionId}</code>
        </p>`,
    },
    processing: {
      title: "Payment processing",
      body: html`<p>
        Stripe is still confirming your payment. Your streak is restored as soon as it clears.
      </p>`,
    },
    incomplete: {
      title: "The clerk wasn't paid",
      body: html`<p>The payment wasn't completed, so nothing was charged and nothing changed.</p>`,
    },
    unchecked: {
      title: REPAIR_NAME,
      body: html`<p>
        We couldn't check this payment just now. If you paid, Stripe will email your receipt and
        your streak will be restored.
      </p>`,
    },
  };
  const page = pages[outcome];
  return layout({
    title: page.title,
    description: "Buying back a duty streak.",
    noindex: true,
    body: html`<div class="prose">
      <h1>${page.title}</h1>
      ${page.body} ${back}
    </div>`,
  });
}

/** When checkout for a buy-back couldn't be started. */
export function repairUnavailablePage(): SafeHtml {
  return layout({
    title: "The clerk is out",
    description: "Checkout couldn't be started.",
    noindex: true,
    body: html`<div class="prose">
      <h1>The clerk is out</h1>
      <p>Checkout couldn't be started just now. Nothing was charged. Please try again shortly.</p>
      <p><a href="${VAULT_PATH}">Back to the Vault</a></p>
    </div>`,
  });
}
