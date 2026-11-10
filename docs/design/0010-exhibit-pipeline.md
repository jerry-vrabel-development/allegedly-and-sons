# 0010 — The exhibit pipeline: adding products, wings and prices

- **Status:** Decided; PR 1 (groundwork and the Off-World wing) building
- **Date:** 2026-11-10
- **Author:** Jerry Vrabel

## Problem

The shop has three exhibits. The Back-Room Broadcast (note 0009) airs eight
segments a day, so each item is on air about three times a day and the
Midnight Auction repeats every third night. The goal is twenty exhibits to
start, and after that a steady flow of new ones, which needs a repeatable way
to add an exhibit. It also needs to answer how a new exhibit joins the
gamification (note 0003).

An exhibit is a real object that ships. Its specs, its price and the 24-hour
refund are promises, so an exhibit can't be sold before the object is in
hand. Writing the lore, though, shouldn't have to wait for sourcing.

## Decisions

### Two statuses: available and acquisition pending

- **Available:** sourced, priced and in stock. It can be bought and it airs
  on the Broadcast.
- **Acquisition pending:** the lore, art and case file are live, so it can be
  read, shared and collected as an exhibit card. There's no buy button
  ("Acquisition pending: the Bureau is still recovering this one"), checkout
  routes answer 404, it's never on the Broadcast, and its price is labeled
  "Expected price." The home page shows it in the collection with the same
  label.

New exhibits land as pending and are switched to available, one at a time,
when Jerry has the object in hand. The switch is a one-line change.

### Wings: sets of four

Exhibits are grouped into five **wings** of four:

| Wing               | Exhibits                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Off-World          | Alien Paperclip, Martian Rubber Band, Moonwalker's Spare Button, Time Traveler's Bus Token          |
| The Cryptid Wing   | Bigfoot's Lost Comb, Loch Ness Bath Duck, Mothman's Night-Light, Tooth Fairy's Spare Change         |
| Lost Civilizations | Atlantean Bottle Cap, Rosetta Coaster, Pharaoh's Spare Key, Last Dodo's Feather                     |
| Royal & Legendary  | Second-Best Quill, Viking Participation Trophy, Emperor's Lost Thimble, King Arthur's Lesser Pebble |
| The Unexplained    | Haunted Rubber Stamp, Bermuda Triangle Guitar Pick, Marble of Infinite Regret, Prototype Fortune    |

- **A wing commendation for collecting all four exhibit cards** in a wing
  (the "card sets" item from G4). Cards are earned the same way as before,
  by finishing a case file or acquiring the exhibit, and pending exhibits
  count, so every wing can be completed by reading alone.
- **Worked out, not stored.** A wing commendation is derived from the cards
  an agent holds whenever the dossier is read, like duty streaks. Nothing new
  is stored, and it can't drift out of step with the cards.
- **Only full wings have a commendation.** A wing with fewer than four
  exhibits doesn't offer one yet, so adding an exhibit never takes a
  commendation away. A test checks that no wing holds more than four.
- Later, beyond twenty: new wings of four, or seasonal wings (G7, "The Great
  Bigfoot Audit").

### Ranks

There are now up to 38 commendations (9 badges, 5 wings, 20 exhibit cards and
4 vault cards). The existing ranks keep their thresholds, so no agent drops a
rank. New ranks fill the gap: Case Officer (10), Station Chief (15), Keeper
of the Back Room (22) and Deputy Director (30). A rank only shows if it's
below the current total, and Director of Improbable Acquisitions is always
the full set.

### Prices spread across three tiers

| Tier      | Range     | For                                                      |
| --------- | --------- | -------------------------------------------------------- |
| Pocket    | $19–$49   | Impulse buys and first purchases; small things           |
| Collector | $79–$199  | The middle of the catalog                                |
| Relic     | $275–$499 | The headliners (today's three) and Midnight Auction bait |

Prices are first guesses and are set for real when an exhibit is sourced,
from its actual cost and shipping (note 0006). On air, the usual 15% and 30%
come off.

## The pipeline: adding one exhibit

1. **Concept.** An ordinary object plus an outlandish story, assigned to a
   wing. The lore rule applies: outlandish, never plausible.
2. **Copy.** Tagline, hook, estimated value (obviously absurd, never a real
   former price), a case file of three paragraphs, the host's pitch (four
   beats, never a price), and alt text.
3. **Art.** An original SVG evidence photo in `src/worker/art.ts` on the
   shared evidence board, with the exhibit tag.
4. **Catalog entry.** Next free exhibit number, `status: "pending"`, wing,
   expected price, and specs written as "expected" until sourced.
5. **Checks.** `npm run check`. The catalog tests enforce unique slugs and
   exhibit numbers, art for every item, a wing of at most four, four pitch
   beats, a price within its tier's range, and an estimated value with no
   dollar sign.
6. **Source.** Buy the object. Correct the specs to what actually ships, set
   the real price, and flip it to `status: "available"`.

## What would change our mind

- If pending exhibits get views but no "notify me" demand → add a Dispatch
  "tell me when it's recovered" option (once Dispatch emails send), or keep
  fewer exhibits pending at a time.
- If Pocket-tier items cannibalize Relic sales instead of bringing in first
  buyers → narrow the spread.
