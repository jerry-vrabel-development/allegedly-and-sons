# 0003 — Gamification, collectibles and the lore rule

- **Status:** Decided; G1 (the Agent Dossier) and G2 (the Vault Lever) shipped; building G3
  part 1 (note 0007)
- **Date:** 2026-11-05, rewritten 2026-11-08
- **Author:** Jerry Vrabel

## Problem

The shop should be a habit, not a one-time laugh. Visitors should come back,
collect, show off, recruit friends and buy, and the mechanics should be built
deliberately on two frameworks:

- **Hooked** (Nir Eyal): Trigger → Action → Variable Reward → Investment, a
  loop repeated until the trigger becomes internal ("I wonder what the Bureau
  acquired today").
- **Octalysis** (Yu-Kai Chou, _Actionable Gamification_): eight core drives.
  "White hat" drives (meaning, accomplishment, creativity, ownership) make
  people feel good and stay; "black hat" drives (scarcity, unpredictability,
  loss avoidance) create urgency and sell, but burn people out if they lead.
  **Revised 2026-11-09: every mechanic is judged on traffic, conversion and
  sales.** This is a black-market shop, and it leans into black hat drives
  (loss aversion, urgency, scarcity, guilt-trip copy in the smuggler's voice)
  wherever they convert. Each mechanic gets a Ledger row so we keep what
  works. The one limit is the section below: law and money, not taste.

## The loop

| Hooked step                | At the Bureau                                                                 |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Trigger, outside**       | Share links, posts, the Bureau Dispatch email (G3), "notify me" on editions   |
| **Trigger, inside**        | Curiosity: what absurd thing came in today? Is my pull ready?                 |
| **Action**                 | One tap: pull the vault lever, open a case file, check the dossier            |
| **Variable reward: hunt**  | Lever results, secret lore pages, surprise acquisitions                       |
| **Variable reward: self**  | Cards, card sets, ranks, badges                                               |
| **Variable reward: tribe** | Shareable cards; Recruiter credit when your share brings someone              |
| **Investment**             | The dossier itself: codename, number, sets in progress, streak, field reports |

Without a return trigger the loop never closes, which is why the Dispatch (G3)
comes right after the lever.

## The eight drives

| Drive              | Mechanic                                                                       |
| ------------------ | ------------------------------------------------------------------------------ |
| 1 Epic Meaning     | You're a Bureau field agent, recovering the improbable                         |
| 2 Accomplishment   | Ranks, badges, completed card sets                                             |
| 3 Creativity       | Codenames; later, field reports and votes on the next acquisitions             |
| 4 Ownership        | The dossier, cards, agent number, certificates, physical trading cards         |
| 5 Social           | Shareable cards, Recruiter badge, a recruiter leaderboard                      |
| 6 Scarcity         | Real limited editions, one free pull a day, the locked vault, rank-gated items |
| 7 Unpredictability | The lever, secret pages, surprise acquisitions, seasonal operations            |
| 8 Loss Avoidance   | Duty streaks with real deadlines; freezes earned, repairs bought (G4)          |

## Lines we don't cross (law and money, not taste)

- **Scarcity is always true.** Edition counts, stock and deadlines are real
  numbers from the database. Fake "only 3 left" or resetting countdowns are
  deceptive practices (FTC) and lose trust that sells future drops.
- **No purchase ever buys a chance at something of value.** Prize + chance +
  paying = an illegal lottery. The lever is free (daily, plus pulls earned by
  actions); purchases earn cards and rank, **never pulls**. Lever prizes may
  include discount codes only with written official rules, posted odds and a
  lawyer's review; until then, prizes are vault cards, badges and secret lore.
- **Paid random packs**, if ever: a real item worth at least the price,
  posted odds, 18+, no checkout from Belgium, a lawyer first.
- **The comedy goes on the story, never on the receipt.** What ships, the
  price, shipping and refunds are always plain (see the lore rule below).

## The lore rule: outlandish, never plausible

All lore follows one rule: **make it outlandish, never plausible.** Claims so
over the top that no reasonable buyer takes them literally are puffery; the
risk is in claims a buyer might believe ("authentic 1800s," "will go up in
value," anything about health or safety). Bureau certificates read as comedy
("Authenticity: Allegedly") and never imitate a real appraiser or museum.

## Build order

Each is a small PR into `dev` with tests, and each mechanic gets a row in the
Ledger, so we can see which hooks actually hook.

1. **G1 — the Agent Dossier (shipped).** Server-side, keyed to the visitor
   cookie (migration 0006: `agents`, `awards`). Awards come only from events
   the Worker recorded itself, so nothing can be claimed from the browser:
   - First Contact (opened a case file), Case Closed (finished one), Town Crier
     (shared), Recruiter (someone arrived through your share; never for your
     own link), Acquirer (first purchase, from the verified webhook).
   - One card per exhibit: finish its case file, or acquire it.
   - Ranks by commendations: Civilian Informant → Junior Field Agent → Field
     Agent → Senior Field Agent → Senior Treasure Hunter → Director of
     Improbable Acquisitions (everything).
   - A stable codename from the visitor id and a sequential agent number.
   - `/dossier`, linked from every page's header. Sealed cards and locked
     badges say so in words, never color alone.
   - Granting never breaks what triggered it, and is idempotent.
2. **G2 — the Vault Lever (shipped).** `/vault`, a plain form with no script
   (migration 0007: `vault_pulls`).
   - One free pull per agent per UTC day, enforced by a unique index, so two
     quick presses can't both win. A pull needs the visitor cookie already
     set; bots never pull.
   - One bonus pull for each of First Contact, Case Closed, Town Crier and
     Recruiter, checked in the same statement that records the pull. Never
     Acquirer and never cards, since those can come from a purchase.
   - Four vault cards, never for sale, each with a secret file: The Left Sock
     of Atlantis (Common, 40%), The Yeti's Library Card (Uncommon, 30%), A
     Jar of Pre-Owned Thunder (Uncommon, 20%), The Moon's Receipt (Rare,
     10%). Odds are posted on the page and drawn with rejection sampling, so
     they're exact. Duplicates are possible and say so.
   - Vault cards are awards (`vault:<card>`), so they count toward rank.
   - The result page says exactly what came out: no near misses. The door's
     swing is CSS only; reduced motion turns it off, and "The vault creaks
     open…" is always there in words.
   - The Ledger counts pullers, pulls, bonus pulls, and pullers who came back
     on another day.
3. **G3 — the Bureau Dispatch.** Email sign-up framed as agent registration
   (Cloudflare Email Sending): new acquisitions, "your pull is ready," set
   reminders. It also lets a dossier follow the agent across devices. This is
   the outside trigger that closes the loop. Part 1 (registration, recovery,
   unsubscribe) is decided in [note 0007](0007-dispatch.md); the mailings
   themselves are part 2.
4. **G4 — streaks, limited editions, card sets.**
   - **PR 1, duty streaks.** The duty is the daily free vault pull,
     the habit we already have. Worked out from `vault_pulls`, so nothing new
     is stored and it can't drift. Every 7 days earns a freeze (up to 2) that
     covers a missed day automatically ("bend, not break": Duolingo found a
     broken long streak loses the user, a saved one brings them back).
     Milestones at 3, 7, 14 and 30 days award black-market ranks (Regular,
     Made, Fixer, Kingpin), each also a bonus pull. The Vault and dossier
     name the stakes and the real time left ("Your 9-day streak dies at
     midnight UTC: 4 hours left. Walk away now and it dies with you."). The
     Ledger shows alive and dead streaks by length and freezes spent.
   - **PR 2, "Grease the Clerk" (this PR).** A dead streak can be bought
     back for $2.99 on the day it died and the next (until midnight UTC),
     on Stripe's hosted checkout, cards only, nothing shipped. The webhook
     records the order and, in the same transaction, a repair that bridges
     the missed days (migration 0009), so the streak comes back due: today's
     pull is still owed. No Acquirer badge or card for a buy-back. Repair
     revenue counts in the Ledger's sales. A definite
     item for a price, not a chance, so it stays legal while vault prizes
     have no money value (revisit if discount codes ever become prizes).
   - Later: real numbered editions ("No. 12 of 50") with true remaining
     counts; set completion rewards and set bundles at checkout.
5. **G5 — social.** Shareable card images (Open Graph), a "recruit an agent"
   referral reward (credit for both sides; not chance-based), a recruiter
   leaderboard.
6. **G6 — more per order.** Order bumps (Deluxe Containment Crate, framed
   certificate, wax-sealed dossier; see note 0006), gift mode (certificate in
   the recipient's name), rank-gated items (only Senior Agents may acquire the
   vault piece).
7. **G7 — seasons and field reports.** Time-limited operations ("The Great
   Bigfoot Audit") with their own card set and lore; buyers' photo field
   reports earn a badge and get featured; physical trading cards in every
   shipment.

## Privacy and accessibility

- The dossier is keyed to the first-party visitor id. No accounts until G3
  (and then only an email the agent chooses to give). The Fine Print says so.
- Clearing cookies starts a new file until G3 can restore one by email.
- Text names and descriptions for every badge and card; animations respect
  reduced motion; nothing relies on color alone.

## Open questions

- Edition sizes for the first limited run.
- Do partnered writers (note 0002) get their own badge or card?
- Certificate tiers: free extra, printable PDF, or a paid upgrade (G6)?
