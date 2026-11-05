# 0002 — Writers' partnership for item lore

- **Status:** Draft (planning only; no code yet)
- **Date:** 2026-11-05
- **Author:** Jerry Vrabel

## Problem

Every item's value is its story. For the first batch of products, AI helps us
sketch the items and their lore so we can launch quickly and see what gets
bites. Over time, real writers will make funnier, stranger lore than we can, and
they will share their own work, which brings traffic.

We want a partnership where writers submit lore, we publish the stories we
accept, and each writer earns a share of every sale of their item.

## Phases

1. **First batch (now):** AI-assisted concepts and lore, credited to
   "The Bureau." No writer features.
2. **Writers' partnership (a later version release):** submissions, credit,
   bio pages and revenue share.

## What to build now so phase 2 is easy

- Keep the **story separate from the item** in the catalog. An item has one
  current story; a story has an author.
- Every story has an **author**. Until phase 2, the author is "The Bureau."
- This costs almost nothing now and means a writer's story can replace a house
  story later without a rewrite.

## Credit and bio pages

- Each story shows a byline with a **themed title** that fits the Bureau, for
  example:
  - Field Agent, Bureau of Improbable Acquisitions
  - Senior Treasure Hunter
  - Bounty Hunter (Retired, Allegedly)
  - Keeper of Questionable Records
- Each partnered writer gets a **bio page**, linked from their bylines, listing
  their stories.
- Writers may use a **pen name** and choose what appears on their page. We show
  nothing personal they haven't approved, and we never show payout details.

## Revenue share

- Leading option: **Stripe Connect**, which can split each payment between the
  shop and the writer and handles writers' tax forms.
- Payout percentage: to decide.
- Purchases are still confirmed only by verified Stripe webhooks (see
  [0001](0001-analytics.md)), so payouts are based on real, verified sales.

## Rights and agreements

- A simple writer agreement stating what we may publish, for how long, and what
  the writer keeps (for example, the right to show the piece in their own
  portfolio).
- Get a legal review before the first paid story goes live.

## Submissions

- A submission form and a review step. Nothing goes live without approval.
- Submissions are stored privately; contact details never appear in logs or
  analytics.

## Open questions

- Payout percentage, and whether it is a flat rate or tiered.
- Is a story tied to one item for good, or can a later story replace it? If it
  can be replaced, what happens to the first writer's share?
- Do we pay a flat fee on acceptance, a share of sales, or both?
- How are writers found: open submissions, invitations, or both?
- Should the disclaimer page mention the writers' program?
