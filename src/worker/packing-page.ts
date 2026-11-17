/**
 * Certificates to pack, GET /bureau/packing (design note 0021, part 2): one
 * printable Bureau Certificate per order waiting to ship, with the stamps
 * fixed when it was paid. Private behind Access, never indexed, no script:
 * the browser's own print does the printing, one certificate to a page.
 */

import { LEDGER_PATH } from "../core/paths";
import { certificateBlock } from "./certificate";
import type { ToPack } from "./certificate-store";
import { html, type SafeHtml } from "./html";
import { layout, type Page } from "./pages";

/** The end of the session id: enough to match a certificate to its Stripe order. */
export function orderRef(sessionId: string): string {
  return `…${sessionId.slice(-8)}`;
}

function paidOn(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "long",
  });
}

function slip(order: ToPack): SafeHtml {
  const ref = orderRef(order.sessionId);
  return html`<article class="packing-slip">
    <p class="kicker">Order ${ref} · paid ${paidOn(order.paidAt)}</p>
    ${
      order.item === undefined
        ? html`<p>
            <strong>Exhibit unknown.</strong> Stripe's record didn't name it, so there is no
            certificate to print. Check the order in Stripe before packing.
          </p>`
        : certificateBlock(order.item, order.stamps, "h2", order.sessionId.slice(-8))
    }
  </article>`;
}

export function packingPage(orders: readonly ToPack[]): Page {
  return layout({
    title: "Certificates to pack",
    description: "Private: certificates for orders waiting to ship.",
    noindex: true,
    body: html`<div class="packing">
      <h1>Certificates to pack</h1>
      <div class="no-print">
        <p class="tagline">
          One per order waiting to ship, oldest first. Print from your browser: each certificate
          gets its own page. The stamps were fixed when the order was paid.
        </p>
        <p><a href="${LEDGER_PATH}">Back to the Ledger</a></p>
      </div>
      ${orders.length === 0 ? html`<p>Nothing is waiting to ship.</p>` : orders.map(slip)}
    </div>`,
  });
}
