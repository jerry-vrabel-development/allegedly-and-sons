# 0003 — Gamification, collectibles and the lore rule

- **Status:** Draft (planning only; no code yet)
- **Date:** 2026-11-05
- **Author:** Jerry Vrabel

## Problem

The shop should be fun to explore, not just to buy from. We want visitors to come
back, collect things and share them. We also want product drops and collectibles
to feel exciting without creating legal risk or treating visitors badly.

## The lore rule: outlandish, never plausible

All lore, whether drafted with AI or written by partnered writers (see
[0002](0002-writers.md)), follows one rule:

**Make it outlandish, never plausible.**

- ✅ Recovered from a crashed UFO, owned by a Viking with a participation trophy,
  used by a lost civilization to sign treaties with pigeons.
- ❌ "Authentic 1800s artifact," "Lincoln's actual pen," "will go up in value,"
  or anything about health or safety.

Why: claims so over the top that no reasonable buyer would take them literally
are generally treated as puffery. The risk comes from claims a buyer might
actually believe and rely on.

**The comedy goes on the story, never on the receipt.** What physically ships,
the price, shipping times and refunds are always stated plainly and truthfully.

A disclaimer page explains the joke, linked from the footer of every page.

### Bureau certificates

Every product comes with a certificate from the Bureau of Improbable
Acquisitions. Certifying an unverifiable object is part of the joke, so the
certificate must read as comedy:

- Issued by the Bureau and signed by a fictional agent, with stamps like
  "Authenticity: Allegedly" and "Verified by Nobody, Certified by Us."
- It never imitates a real appraiser, auction house, museum or grading service,
  and never claims real historical provenance.

## Earned badges and cards (first)

Visitors earn collectibles for free by exploring the shop:

- **Badges** for actions: reading lore, sharing an item, a return visit through a
  shared link, a first purchase.
- **Cards** for items: each card shows the item's art and one line of its lore.
  You get a card by reading an item's full story or buying the item.
- **Bureau ranks** grow with badges, for example Junior Field Agent → Senior
  Treasure Hunter → Director of Improbable Acquisitions.
- **The case file:** a page showing your badges, cards and rank, with stamps.

Nothing earned costs money, so there is no chance-based purchase and no legal
question.

### Privacy

- Collectibles live in the visitor's own browser at first: no accounts, no
  personal data, consistent with [0001](0001-analytics.md).
- Trade-off: clearing the browser clears the case file. Accounts can come later
  if visitors ask for them.
- Analytics count badge and card events like any other event, with no visitor
  identity.

### Accessibility

- Badges and cards have text names and descriptions, not just icons or colors.
- Unlock animations respect reduced-motion settings.

## The Vault Lever

A big brass lever on the Bureau's vault door. Pulling it (or rolling the dice)
gives a chance at the locked vault.

- **Never paid.** Pulls are a reward: a free daily pull, plus bonus pulls earned
  with badges.
- **Vault prizes have no money value:** vault-only cards, badges and secret lore
  pages. No discounts or free items, which would turn it into a sweepstakes with
  its own rules.
- If a purchase ever earns pulls, prizes must stay non-monetary, since paying
  for a chance at something of value is what makes a lottery.
- The odds are posted on the vault page.
- No fake near-misses and no countdown pressure.
- Reduced motion: show "the vault creaks open…" instead of the spin.
- Pull counts live in the browser, like the case file; the Worker checks the
  daily limit so it can't simply be reset by hand. (Detail to settle in the
  build plan.)

## Product drops and paid random items (later, if ever)

Timed drops of new items (a fixed item at a fixed price) are fine and need no
special rules.

Selling **random** items for money (mystery crates, random card packs) is
legally sensitive: Belgium treats paid loot boxes as gambling, Brazil bans them
for under-18s, and US rules on chance-based sales vary by state. If we ever do
it, these guardrails apply:

- Every crate or pack contains a real item worth at least its price.
- The odds are posted on the page.
- An 18+ confirmation at checkout.
- No checkout from Belgium.
- No dark patterns: no fake near-misses, no countdown pressure.
- A legal review before launch.

## Open questions

- Which badges and ranks ship first?
- Is a card earned by reading the whole story, or only by buying?
- Should the case file be shareable as an image or a link?
- Do partnered writers get their own badge or card?
- Is the certificate a free extra with every item, a printable PDF, or a paid
  upgrade tier?
- How many bonus pulls can be earned per day?
