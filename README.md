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

Planning. No application code yet.

## Planned stack

- Cloudflare Workers (strict TypeScript)
- D1 for catalog, orders and analytics events
- Stripe Checkout, with purchases confirmed by verified webhooks
- Privacy-first analytics: no third-party trackers, no tracking cookies, no
  personal data stored

## Design notes

- [0001 — Privacy-first analytics](docs/design/0001-analytics.md)

## Branch flow

feature branch → PR into `dev` → `dev` → `main` → deploy
