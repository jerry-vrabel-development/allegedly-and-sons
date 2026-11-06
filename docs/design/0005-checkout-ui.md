# 0005 — Hosted or embedded checkout

- **Status:** Accepted (2026-11-06): Option B
- **Date:** 2026-11-06
- **Author:** Jerry Vrabel

## Problem

Clicking **Acquire this exhibit** sends the buyer to Stripe's hosted Checkout
page on `checkout.stripe.com`. Since #17 it carries the shop's name, colors,
corners and a serif font, but it still feels jarring: the buyer visibly leaves
the shop at the most important moment, and the page is Stripe's layout, not
ours.

The shop is a comedy shop and a portfolio piece. Checkout is where the joke
has to stop and trust has to take over, so the experience matters. But the
shop also has a strong, deliberate stance today:

- **No JavaScript at all.** The Content Security Policy has no `script-src`,
  and a test checks that no page has inline scripts or styles.
- **No third parties on our pages** (0001): no trackers, no third-party scripts.
- **Card details never touch our code** (#9).

Any embedded option means Stripe's JavaScript running on our own pages. The
question is whether a smoother checkout is worth that, and if so, how to keep
the cost as small as possible.

## Options

### Option A — Keep hosted Checkout, on our own domain

Stay with Stripe's hosted page, but serve it from our own address with Stripe's
custom domain add-on (for example `checkout.allegedlyandsons.com` instead of
`checkout.stripe.com`), and add a logo or icon.

- ➕ No JavaScript on our pages; the CSP and the privacy stance stay as they are.
- ➕ Least code: two DNS records, and Stripe owns the whole payment page,
  including its accessibility and fraud handling.
- ➕ The address bar stays ours, and Stripe says Apple Pay and Google Pay work
  on the custom domain without extra setup.
- ➖ Costs USD 10 a month (Stripe's add-on, as of November 2026), on top of
  registering the shop's domain.
- ➖ The page is still Stripe's layout. Branding (#17) narrows the gap but
  doesn't close it.

### Option B — Embedded page: Stripe's Checkout inside our page

Create the Checkout Session in embedded mode (the `ui_mode` value has been
renamed across API versions, `embedded` and later `embedded_page`; confirm
against our pinned `2025-09-30.clover` at build time). Stripe returns a client
secret, and Stripe.js mounts the whole Checkout in an iframe on our own
`/checkout/<item>` page. After payment, Stripe sends the buyer to our return
page with the session id.

- ➕ The buyer never leaves the shop. Our header, footer and voice frame the
  payment form.
- ➕ Card details still never touch our code: they're inside Stripe's iframe.
- ➕ Still Stripe's checkout, so Stripe keeps handling payment methods, address
  collection and most of the form's accessibility.
- ➖ Stripe.js has to load from `js.stripe.com` (Stripe says not to bundle or
  self-host it), so the CSP must allow Stripe's script, frames and API calls on
  that page.
- ➖ Stripe.js collects device signals for fraud prevention. That's a third
  party running on our page, which 0001 rules out for analytics. It's
  defensible for payments, but it has to be said plainly on The Fine Print.
- ➖ More moving parts: a client-secret endpoint, our first client script, a
  return page that reads the session, and browser tests for all of it.

### Option C — Embedded form: our own layout around Stripe's fields

Stripe's newer embedded-form mode (`ui_mode=form`) lets us lay out the checkout
ourselves, with Stripe's secure fields inside.

- ➕ The most seamless result: it can look exactly like the shop.
- ➖ The most JavaScript and the most code we own, including the accessibility
  of the whole form, error states and every payment method's quirks.
- ➖ Too much for a shop that hasn't taken its first real order yet.

## Decision

**Option B: the embedded page**, decided 2026-11-06.

The shop is now on its own domain (`allegedlyandsons.com`), so embedding keeps
the buyer on our address and inside our page, without Stripe's USD 10 a month
custom-domain add-on. Before the shop has sales, the extra code is a better
trade than a monthly fee.

Scoped tightly, as planned:

- **Stripe.js loads only on the checkout page.** Every other page stays
  script-free with today's strict CSP; only `/checkout/<item>` gets a looser
  policy, limited to Stripe's origins.
- **Our own script is tiny**, served from our origin (no inline script), and
  only mounts Stripe's checkout.
- **It degrades gracefully.** If JavaScript is off or Stripe.js fails to load,
  the page offers "Continue on Stripe's secure page," which uses today's hosted
  flow. Nobody gets stuck.
- **The Fine Print says it plainly:** the checkout page loads Stripe's script,
  Stripe may collect device information to prevent fraud, and no other page
  runs any script.

Option A stays the fallback. Option C is ruled out for now.

### What would change my mind

- **The per-page CSP can't be kept tight**, for example if Stripe.js needs
  broad sources that would effectively loosen the whole site. Then stay with
  Option A.
- **Accessibility regressions** (axe failures or keyboard traps) that we can't
  fix from our side. Then Option A.
- **Real buyers say hosted checkout is fine**, or buy at the same rate. The
  data from 0001 should decide this once there's enough of it, not taste.

## Security and privacy

- Per-route CSP: the strict site-wide policy stays the default; the checkout
  page adds only the Stripe sources Stripe documents for embedded Checkout.
- The client secret is created per session, server-side, and never logged.
- The return page confirms payment status with Stripe server-side before
  saying anything; the webhook from 0004 stays the source of truth for orders.
- A test proves every non-checkout page still sends the strict CSP with no
  `script-src`.

## Testing

- Unit and Worker tests: the session is created in embedded mode with the same
  catalog price, the return URL and the per-route CSP.
- Browser tests (desktop, Android, iPhone): the checkout page mounts Stripe's
  iframe, the no-JavaScript fallback works, axe passes, and no console or CSP
  errors appear.
- A sandbox purchase end to end with test card 4242.

## Build plan (small PRs)

1. Per-route security headers: strict by default, a Stripe-only policy for
   `/checkout/*`, with tests proving other pages are unchanged.
2. Embedded session and the checkout page (server side), with the hosted
   fallback link.
3. The small client script that mounts Checkout, plus browser tests.
4. Return page and The Fine Print disclosure.

## Open questions

- Should B wait until after webhooks (0004), so the return page and order
  recording land together?
