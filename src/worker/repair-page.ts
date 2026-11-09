/**
 * The page Stripe sends a buyer back to after "Grease the Clerk"
 * (/streak/restored?session_id=...). Like /thanks, it asks Stripe about the
 * session first, so opening it by hand proves nothing. The streak itself is
 * restored by the webhook, which can land a moment after this page.
 */

import { REPAIR_NAME } from "../core/repair";
import type { ReturnOutcome } from "../core/checkout";
import { html, type SafeHtml } from "./html";
import { layout } from "./pages";

export function repairReturnPage(outcome: ReturnOutcome["kind"]): SafeHtml {
  const back = html`<p><a class="button" href="/vault">Back to the Vault</a></p>`;
  const pages: Record<ReturnOutcome["kind"], { title: string; body: SafeHtml }> = {
    paid: {
      title: "The clerk has been greased",
      body: html`<p class="tagline">Paperwork lost. Your streak lives.</p>
        <p>
          Payment confirmed, and Stripe will email your receipt. Your streak is restored, but
          today's pull is still yours to make before midnight UTC. If the Vault doesn't show it yet,
          give it a minute.
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
      <p><a href="/vault">Back to the Vault</a></p>
    </div>`,
  });
}
