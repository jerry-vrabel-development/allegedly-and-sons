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

Early days: tooling, CI and a placeholder Worker. No shop features yet.

## Getting started

Needs Node 22 (see `.nvmrc`).

```sh
npm ci
npm run dev     # local Worker at http://localhost:8787
npm run check   # format, lint, types, tests with coverage: the same checks CI runs
```

| Script                  | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run dev`           | Run the Worker locally with Wrangler                                   |
| `npm test`              | Run the tests inside the Workers runtime (Vitest + Cloudflare plugin)  |
| `npm run test:coverage` | Tests plus coverage; fails below the floors in `vitest.config.ts`      |
| `npm run lint`          | ESLint with type-aware `typescript-eslint` strict rules, zero warnings |
| `npm run typecheck`     | Strict TypeScript for app and tests                                    |
| `npm run cf-typegen`    | Regenerate Worker types after changing `wrangler.jsonc`                |
| `npm run deploy`        | Deploy the Worker (after changes reach `main`)                         |

## Planned stack

- Cloudflare Workers (strict TypeScript)
- D1 for catalog, orders and analytics events
- Stripe Checkout, with purchases confirmed by verified webhooks
- Privacy-first analytics: no third-party trackers, no tracking cookies, no
  personal data stored

## Design notes

- [0001 — Privacy-first analytics](docs/design/0001-analytics.md)
- [0002 — Writers' partnership for item lore](docs/design/0002-writers.md)

## Branch flow

feature branch → PR into `dev` → `dev` → `main` → deploy
