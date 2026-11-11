/**
 * The checkout page's script: mounts Stripe's embedded Checkout on the
 * checkout page (design note 0005). Served from /assets/checkout.js so the
 * CSP never needs 'unsafe-inline'.
 *
 * It does nothing unless the page has a mount point with a publishable key
 * and a session URL, and if anything fails (Stripe.js didn't load, the session
 * request failed, Stripe threw) it says so in the status line and leaves the
 * "Continue on Stripe's secure page" button, which always works, in place.
 *
 * Stripe.js is the "clover" build, matching our pinned API version, where the
 * method is initEmbeddedCheckout (renamed createEmbeddedCheckoutPage in dahlia).
 */

import { CHECKOUT_MOUNT_ID, CHECKOUT_STATUS, CHECKOUT_STATUS_ID } from "../../core/checkout-page";
import { fetchClientSecret } from "../client-secret";

/** As much of Stripe.js (clover) as this script uses. */
interface EmbeddedCheckout {
  mount(element: HTMLElement): void;
}
interface StripeClient {
  initEmbeddedCheckout(options: {
    fetchClientSecret: () => Promise<string>;
  }): Promise<EmbeddedCheckout>;
}
declare global {
  interface Window {
    /** Set by Stripe.js when it loads. Missing if it was blocked or failed. */
    Stripe?: (publishableKey: string) => StripeClient;
  }
}

function start(): void {
  const mount = document.getElementById(CHECKOUT_MOUNT_ID);
  const status = document.getElementById(CHECKOUT_STATUS_ID);
  if (mount === null || status === null) return;
  const key = mount.getAttribute("data-publishable-key");
  const sessionUrl = mount.getAttribute("data-session-url");
  if (key === null || key === "" || sessionUrl === null || sessionUrl === "") return;

  const fail = (): void => {
    status.textContent = CHECKOUT_STATUS.failed;
  };

  if (typeof window.Stripe !== "function") {
    fail();
    return;
  }

  status.textContent = CHECKOUT_STATUS.loading;

  try {
    window
      .Stripe(key)
      .initEmbeddedCheckout({
        fetchClientSecret: () => fetchClientSecret(sessionUrl, (url, init) => fetch(url, init)),
      })
      .then((checkout) => {
        checkout.mount(mount);
        status.textContent = "";
        // Stripe's form has its own Pay button; quiet the fallback so the two don't compete.
        mount.closest(".checkout")?.classList.add("embedded");
      })
      .catch(fail);
  } catch {
    fail();
  }
}

start();
