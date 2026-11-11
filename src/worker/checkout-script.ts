/**
 * The checkout page's script: mounts Stripe's embedded Checkout on the
 * checkout page (design note 0005, PR 3). Served from /assets/checkout.js so
 * the CSP never needs 'unsafe-inline'.
 *
 * It's deliberately small and plain (no build step, no framework). It does
 * nothing unless the page has a #checkout mount point with a publishable key
 * and a session URL, and if anything fails (Stripe.js didn't load, the session
 * request failed, Stripe threw) it says so in the status line and leaves the
 * "Continue on Stripe's secure page" button, which always works, in place.
 *
 * Stripe.js is the "clover" build, matching our pinned API version, where the
 * method is initEmbeddedCheckout (renamed createEmbeddedCheckoutPage in dahlia).
 */

/** Stripe.js, pinned to the release that matches STRIPE_API_VERSION (clover). */
export const STRIPE_JS_URL = "https://js.stripe.com/clover/stripe.js";

export const CHECKOUT_STATUS = {
  loading: "Opening the vault…",
  failed:
    "The secure form couldn’t open here. Nothing was charged. You can still pay on Stripe’s own secure page below.",
} as const;

export const CHECKOUT_JS = `"use strict";
(function () {
  var mount = document.getElementById("checkout");
  var status = document.getElementById("checkout-status");
  if (!mount || !status) return;
  var key = mount.getAttribute("data-publishable-key");
  var sessionUrl = mount.getAttribute("data-session-url");
  if (!key || !sessionUrl) return;

  function fail() {
    status.textContent = ${JSON.stringify(CHECKOUT_STATUS.failed)};
  }

  if (typeof window.Stripe !== "function") {
    fail();
    return;
  }

  status.textContent = ${JSON.stringify(CHECKOUT_STATUS.loading)};

  function fetchClientSecret() {
    return fetch(sessionUrl, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(function (response) {
        if (!response.ok) throw new Error("session " + response.status);
        return response.json();
      })
      .then(function (body) {
        if (!body || typeof body.clientSecret !== "string") throw new Error("no client secret");
        return body.clientSecret;
      });
  }

  try {
    window
      .Stripe(key)
      .initEmbeddedCheckout({ fetchClientSecret: fetchClientSecret })
      .then(function (checkout) {
        checkout.mount(mount);
        status.textContent = "";
        // Stripe's form has its own Pay button; quiet the fallback so the two don't compete.
        var page = mount.closest(".checkout");
        if (page) page.classList.add("embedded");
      })
      .catch(fail);
  } catch (error) {
    fail();
  }
})();
`;
