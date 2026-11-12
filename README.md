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

**The shop**

- The collection, illustrated item pages, share links and The Fine Print.
  Exhibits are grouped into wings of four; new ones arrive as **acquisition
  pending** (case file and card live, nothing to buy) until the object is in
  hand. See [0010](docs/design/0010-exhibit-pipeline.md) for how to add one.
- **Embedded checkout:** buyers pay inside the shop's own page, in Stripe's
  embedded form, with Stripe's hosted page as a fallback.
- **Orders recorded by verified Stripe webhooks** in D1, idempotently.
- A return page that asks Stripe whether a session was really paid before
  saying so.
- **The Back-Room Broadcast** ([0009](docs/design/0009-back-room-broadcast.md)):
  one exhibit is always "on air" at a special price, in rolling three-hour
  segments and a nightly Midnight Auction on Chicago's clock. The price is
  locked when checkout starts, and each order records the segment that sold it.

**Agents, the Vault and streaks** ([0003](docs/design/0003-gamification.md))

- Every visitor can become a Bureau agent: `/dossier` shows their badges,
  exhibit cards and rank, awarded by the Worker from what they actually do
  (read a case file to the end, share, bring someone in, acquire).
- At `/vault`, each agent gets one free pull of the vault lever a day, plus one
  bonus pull for each of eight commendations (never for buying), and draws a
  vault card at posted odds. The Worker enforces the limits and does the
  drawing.
- Pulling on consecutive days builds a duty streak, with freezes and milestone
  badges. A streak that just died can be bought back for $2.99 ("Grease the
  Clerk"), recorded by the same verified webhook.
- **The Bureau Dispatch** ([0007](docs/design/0007-dispatch.md)): agents can
  register an email (double opt-in) to keep their file and open it on any
  device. It is built and tested, but closed on the live site until the
  postal address every email must carry is set.

**Sound and motion** ([0008](docs/design/0008-sound-and-motion.md),
[0011](docs/design/0011-sound-scheme.md))

- Synthesized sound across the shop and an animated reel on the Vault lever,
  all first-party, with a Sound on/off button and reduced motion respected.
- It runs as an experiment: half of visitors get sound and motion and half get
  the plain shop, split by visitor id, with a stopping rule written down in
  advance. The test is still running; there is no result yet.

**Analytics** ([0001](docs/design/0001-analytics.md))

- Item views, case-file reads, shares, visits from shares and checkout starts
  are recorded in D1 with a first-party visitor id, country, referrer host and
  campaign. Each order carries the visitor id, so a sale can be traced back to
  the visits before it.
- The private ledger at `/bureau/ledger` shows it all, with 95% intervals and
  a minimum sample before anything is ranked, behind Cloudflare Access (which
  the Worker verifies too).

**Not built yet:** a private order list for fulfillment, and refund tracking.

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
   nothing, and a failure stores nothing so Stripe retries. For a delayed
   payment method the session completes unpaid and no order is recorded yet;
   the order is recorded when `checkout.session.async_payment_succeeded`
   arrives for the same session.
5. Stripe returns the buyer to `/thanks?session_id=…`, which asks Stripe about
   that session and says "recorded", "processing" or "not completed"
   accordingly.

If JavaScript or Stripe.js isn't available, the checkout page's "Continue on
Stripe's secure page" button uses Stripe's hosted page instead, and steps 4–5
are the same.

## Security and privacy

- **Only our own scripts and Stripe's run.** Every script is served from the
  shop's own origin, never inline, and is listed in one table
  (`src/worker/scripts.ts`). Successful shop pages allow `script-src 'self'`;
  item pages, the Vault and the Broadcast may also talk to our own origin; the
  checkout page alone allows Stripe's documented sources. Errors, redirects,
  assets and the private ledger keep a strict Content Security Policy with no
  `script-src` at all. Tests check each policy.
- **No third-party trackers.** Analytics are first-party, recorded by the Worker
  in D1, after the response is sent. Two first-party cookies: `__Host-vid` (a
  random id, kept a year from the latest visit) recognizes returning visitors,
  and `__Host-landing` (gone when the browser closes) remembers which site or
  campaign brought the visit. Both are `Secure`, `HttpOnly` and
  `SameSite=Lax`, and are only ever set on private HTML pages, never on
  cacheable files. Every HTML page sends `Cache-Control: no-transform`, so
  nothing can be injected in transit.
- **The Fine Print says what runs and what's kept, in plain words,** and a test
  fails if a script is served that it doesn't name.
- **No raw IPs or user agents stored.** Analytics keep the item, the time, the
  country, the referring host and the campaign; tests check nothing else leaks.
- **One piece of personal data is stored: a Dispatch email address,** and only
  after the agent confirms it from a link. It is never logged and never joins
  the analytics. One-time link tokens are stored only as hashes. Orders hold
  Stripe ids, the item, the amount and timestamps; names, emails and shipping
  addresses for orders stay with Stripe, and logs carry event types, ids and
  short reasons, never payloads.
- **Secrets stay secret:** Stripe keys and the webhook signing secret are
  Worker secrets, never in the repo. The publishable key is public by design.

## Testing

`npm run check` runs formatting, type-aware linting, strict types and more than
900 Vitest tests inside the Workers runtime against the real D1 schema, with
100% coverage of the Worker and core TypeScript (CI floors: 95% lines, 90%
branches). Property-based tests (fast-check) cover the signature check, order
parsing and HTML escaping.

The browser scripts are real TypeScript in `src/client`
([0012](docs/design/0012-client-scripts.md)), bundled into a generated module
the Worker serves. Their logic is unit tested and counted in coverage. Their
DOM wiring (`src/client/entries`) is not counted; the browser tests exercise
it, apart from two paths noted in 0012.

After editing anything in `src/client`, run `npm run build:client` and commit
the generated file. CI fails if it's stale.

`npm run test:e2e` runs 91 Playwright tests on each of desktop Chrome, Android
and iPhone (WebKit), with axe WCAG 2.2 AA checks in light and dark mode. The
checkout tests stub Stripe.js, so they need no keys.

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
`https://allegedlyandsons.com/webhooks/stripe`, with the events
`checkout.session.completed` and `checkout.session.async_payment_succeeded`
(the second is how an order paid by a delayed method gets recorded), snapshot
payload. Its signing secret is `STRIPE_WEBHOOK_SECRET`.

Check recorded orders:

```sh
npx wrangler d1 execute DB --remote --command "SELECT item_slug, amount_cents, status, paid_at FROM orders"
```

Before your first `npm run test:e2e`, install the browsers once:
`npx playwright install --with-deps chromium webkit`

## Stack

- Cloudflare Workers, strict TypeScript, no runtime dependencies (plain `fetch`
  and Web Crypto instead of the Stripe SDK)
- D1 for orders, processed Stripe events, analytics events, agents' dossiers,
  vault pulls and Dispatch registrations
- Stripe Checkout, embedded, with purchases recorded by verified webhooks
- Vitest in the Workers runtime, Playwright with axe, GitHub Actions CI

## Design notes

- [0001 — Analytics for the shop](docs/design/0001-analytics.md)
- [0002 — Writers' partnership for item lore](docs/design/0002-writers.md)
- [0003 — Gamification, collectibles and the lore rule](docs/design/0003-gamification.md) (dossier, Vault and streaks built)
- [0004 — Recording orders with Stripe webhooks](docs/design/0004-orders-and-webhooks.md) (built)
- [0005 — Hosted or embedded checkout](docs/design/0005-checkout-ui.md) (built)
- [0007 — The Bureau Dispatch](docs/design/0007-dispatch.md) (registration and recovery built)
- [0008 — Sound and motion](docs/design/0008-sound-and-motion.md) (built)
- [0009 — The Back-Room Broadcast](docs/design/0009-back-room-broadcast.md) (built)
- [0010 — The exhibit pipeline: adding products, wings and prices](docs/design/0010-exhibit-pipeline.md) (built)
- [0011 — Sound for the whole shop](docs/design/0011-sound-scheme.md) (built; the test is running)
- [0012 — Browser scripts as real TypeScript](docs/design/0012-client-scripts.md) (built)
- [0013 — The Broadcast's host, and art by human artists](docs/design/0013-host-and-artists.md) (the host is built; the partnership is planning)
- [0014 — The front page as the show](docs/design/0014-front-page-show.md) (decided; the stage band is built)
- [0015 — One of each, per run](docs/design/0015-one-per-run.md) (proposed)

## Branch flow

feature branch → PR into `dev` → `dev` → `main` → deploy
