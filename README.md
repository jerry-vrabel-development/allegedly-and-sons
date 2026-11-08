# Allegedly & Sons

**Purveyors of Rare Objects · Est. "a long time ago"**

Home of **The Bureau of Improbable Acquisitions**, the field division that
recovers our merchandise from crash sites, lost civilizations and the backs of
very old drawers.

A comedy shop of ordinary objects with extraordinary, completely unverifiable
lore (alien paperclips, the second-best quill, Viking participation trophies),
built on serious engineering underneath.

> Every item is exactly what it looks like. The stories are jokes. Change your
> mind within 24 hours for a full refund. The terms are on The Fine Print page,
> in the Bureau's voice, each with a plain-language line.

## Status

Live at **[allegedlyandsons.com](https://allegedlyandsons.com)**, taking payments
in **Stripe's sandbox** (test cards only; no real money moves yet).

- The collection, three illustrated item pages, share links and The Fine Print.
- **Embedded checkout:** buyers pay inside the shop's own page, in Stripe's
  embedded form, with Stripe's hosted page as a fallback.
- **Orders recorded by verified Stripe webhooks** in D1, idempotently.
- A return page that asks Stripe whether a session was really paid before
  saying so.

Not built yet: a private order list for fulfillment. Analytics
([0001](docs/design/0001-analytics.md)) is in progress: item views and
checkout starts are recorded in D1 with a first-party visitor id, country,
referrer host and campaign, and each order carries the visitor id, so a sale
can be traced back to the visits before it. Shares go through the shop's own
`/share` route, so each one is tied to the visits (and sales) it brings back,
and a small first-party script records whether visitors open each item's case
file and read it to the end. The private ledger at `/bureau/ledger` shows it
all, with honest intervals, behind Cloudflare Access (which the Worker verifies
too).

Every visitor can become a Bureau agent: `/dossier` shows their badges, exhibit
cards and rank, awarded by the Worker from what they actually do (read a case
file to the end, share, bring someone in, acquire). See
[0003](docs/design/0003-gamification.md) for the full gamification roadmap.

## How a purchase works

1. **Acquire this exhibit** opens `/checkout/<item>`, a page in the shop. It
   creates nothing at Stripe.
2. Our small script (`/assets/checkout.js`) asks `POST /checkout/<item>/session`
   for a Checkout Session. The Worker prices it from the catalog (never from the
   browser) and returns only the client secret.
3. Stripe.js mounts Stripe's embedded Checkout on the page. Card details go to
   Stripe and never touch this code.
4. Stripe sends a signed `checkout.session.completed` event to
   `POST /webhooks/stripe`. The Worker verifies the signature, then records the
   event id and the order in one D1 transaction; a repeated event changes
   nothing, and a failure stores nothing so Stripe retries.
5. Stripe returns the buyer to `/thanks?session_id=…`, which asks Stripe about
   that session and says "recorded", "processing" or "not completed"
   accordingly.

If JavaScript or Stripe.js isn't available, the checkout page's "Continue on
Stripe's secure page" button uses Stripe's hosted page instead, and steps 4–5
are the same.

## Security and privacy

- **Two kinds of page run script, nothing third-party.** Item pages allow only
  our own story script (`script-src 'self'`, reporting reads to our own
  `/events`); the checkout page allows our own script and Stripe's documented
  sources. Every other page sends a strict Content Security Policy with no
  `script-src` at all. Tests check all three.
- **No third-party trackers.** Analytics are first-party, recorded by the Worker
  in D1, after the response is sent. One first-party cookie (`__Host-vid`, a
  random id: `Secure`, `HttpOnly`, `SameSite=Lax`) recognizes returning
  visitors; it's only ever set on private HTML pages, never on cacheable files.
  Every HTML page sends `Cache-Control: no-transform`, so nothing can be
  injected in transit. The Fine Print says all of this in plain words.
- **No raw IPs or user agents stored.** Analytics keep the item, the time, the
  country, the referring host and the campaign; tests check nothing else leaks.
- **No personal data stored.** Orders hold Stripe ids, the item, the amount and
  timestamps. Names, emails and addresses stay with Stripe, and logs carry event
  types, ids and short reasons, never payloads.
- **Secrets stay secret:** Stripe keys and the webhook signing secret are
  Worker secrets, never in the repo. The publishable key is public by design.

## Testing

`npm run check` runs formatting, type-aware linting, strict types and 255
Vitest tests inside the Workers runtime against the real D1 schema, with 100%
coverage (CI floors: 95% lines, 90% branches). Property-based tests (fast-check)
cover the signature check, order parsing and HTML escaping.

`npm run test:e2e` runs 45 Playwright tests on desktop Chrome, Android and
iPhone (WebKit), with axe WCAG 2.2 AA checks in light and dark mode. The checkout
tests stub Stripe.js, so they need no keys.

The checkout and webhook code was also checked by breaking it on purpose and
confirming a test fails, and end to end against Stripe's sandbox before release.

## Getting started

Needs Node 22 (see `.nvmrc`).

```sh
npm ci
npm run dev     # local Worker at http://localhost:8787
npm run check   # format, lint, types, tests with coverage: the same checks CI runs
```

| Script                  | What it does                                                               |
| ----------------------- | -------------------------------------------------------------------------- |
| `npm run dev`           | Run the Worker locally with Wrangler                                       |
| `npm test`              | Run the tests inside the Workers runtime (Vitest + Cloudflare plugin)      |
| `npm run test:coverage` | Tests plus coverage; fails below the floors in `vitest.config.ts`          |
| `npm run test:e2e`      | Browser tests (Playwright) on desktop, Android and iPhone, with axe checks |
| `npm run lint`          | ESLint with type-aware `typescript-eslint` strict rules, zero warnings     |
| `npm run typecheck`     | Strict TypeScript for app and tests                                        |
| `npm run cf-typegen`    | Regenerate Worker types after changing `wrangler.jsonc`                    |
| `npm run deploy`        | Deploy the Worker (after changes reach `main`)                             |

### Stripe setup

Local, with **sandbox** keys from the Stripe dashboard (sandbox → Developers →
API keys). `.dev.vars` is gitignored; never commit keys.

```sh
echo 'STRIPE_SECRET_KEY=sk_test_...' > .dev.vars
npm run dev
```

The publishable key (`STRIPE_PUBLISHABLE_KEY`) is a public var in
`wrangler.jsonc`. Pay with Stripe's test card `4242 4242 4242 4242`, any future
date, any CVC. Without a secret key, checkout shows "Acquisitions open soon" and
charges nothing.

Deployed Worker, once:

```sh
npx wrangler d1 migrations apply DB --remote       # create or update the tables
npx wrangler secret put STRIPE_SECRET_KEY           # paste at the prompt
npx wrangler secret put STRIPE_WEBHOOK_SECRET       # from the Stripe webhook endpoint
```

In Stripe (Workbench → Webhooks), add **one** endpoint per environment:
`https://allegedlyandsons.com/webhooks/stripe`, event
`checkout.session.completed`, snapshot payload. Its signing secret is
`STRIPE_WEBHOOK_SECRET`.

Check recorded orders:

```sh
npx wrangler d1 execute DB --remote --command "SELECT item_slug, amount_cents, status, paid_at FROM orders"
```

Before your first `npm run test:e2e`, install the browsers once:
`npx playwright install --with-deps chromium webkit`

## Stack

- Cloudflare Workers, strict TypeScript, no runtime dependencies (plain `fetch`
  and Web Crypto instead of the Stripe SDK)
- D1 for orders, processed Stripe events and analytics events
- Stripe Checkout, embedded, with purchases recorded by verified webhooks
- Vitest in the Workers runtime, Playwright with axe, GitHub Actions CI

## Design notes

- [0001 — Analytics for the shop](docs/design/0001-analytics.md)
- [0002 — Writers' partnership for item lore](docs/design/0002-writers.md)
- [0003 — Gamification, collectibles and the lore rule](docs/design/0003-gamification.md)
- [0004 — Recording orders with Stripe webhooks](docs/design/0004-orders-and-webhooks.md) (built)
- [0005 — Hosted or embedded checkout](docs/design/0005-checkout-ui.md) (built)

## Branch flow

feature branch → PR into `dev` → `dev` → `main` → deploy
