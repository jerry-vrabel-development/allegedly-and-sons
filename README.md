# Allegedly & Sons

**Purveyors of Rare Objects · Est. "a long time ago"**

Home of **The Bureau of Improbable Acquisitions**, the field division that
recovers our merchandise from crash sites, lost civilizations and the backs of
very old drawers.

A comedy shop of ordinary objects with extraordinary, completely unverifiable
lore (alien paperclips, the second-best quill, Viking participation trophies),
built on serious engineering underneath.

> Every item is exactly what it looks like. The stories are jokes. Refunds are
> cheerful and no-questions-asked.

## Status

Prototype in progress: the collection with a featured exhibit, three item pages with illustrated art, share links and the fine print. Checkout works through Stripe-hosted Checkout (tested in Stripe's sandbox); orders aren't recorded by the shop yet, which needs verified webhooks.

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

### Stripe checkout

The **Acquire this exhibit** button posts to `/checkout/<item>`. The Worker
prices the item from the catalog (never from the browser), asks Stripe for a
hosted Checkout page and redirects there. Card details never touch this code.
Without a key, checkout shows a friendly "couldn't open" page and charges
nothing.

Local testing, with a **test-mode** key from the Stripe dashboard (sandbox →
Developers → API keys):

```sh
echo 'STRIPE_SECRET_KEY=sk_test_...' > .dev.vars   # gitignored; never commit keys
npm run dev
```

Pay with Stripe's test card `4242 4242 4242 4242`, any future date, any CVC.

Deployed Worker:

```sh
npx wrangler secret put STRIPE_SECRET_KEY   # paste the key at the prompt
```

Before your first `npm run test:e2e`, install the browsers once:
`npx playwright install --with-deps chromium webkit`

## Planned stack

- Cloudflare Workers (strict TypeScript)
- D1 for catalog, orders and analytics events
- Stripe Checkout, with purchases confirmed by verified webhooks
- Privacy-first analytics: no third-party trackers, no tracking cookies, no
  personal data stored

## Design notes

- [0001 — Privacy-first analytics](docs/design/0001-analytics.md)
- [0002 — Writers' partnership for item lore](docs/design/0002-writers.md)
- [0003 — Gamification, collectibles and the lore rule](docs/design/0003-gamification.md)

## Branch flow

feature branch → PR into `dev` → `dev` → `main` → deploy
