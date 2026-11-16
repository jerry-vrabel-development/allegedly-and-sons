# 0018 — The black-market loop: closing the gap between the game and the shop

- **Status:** Draft. Nothing here is built; this note sets the direction and
  the build order
- **Date:** 2026-11-15
- **Author:** Jerry Vrabel

## Problem

The game works, and it feels disconnected from what the shop sells. The
Dossier, the Vault lever, the ranks and the streaks (0003) are real and
shipped, but they sit in their own rooms. Nothing you do in them changes what
you see in the shop, and nothing in the shop feeds them. The lever's prizes
are lore, which is fun to read and leads nowhere. There is no purpose, no
drive, and not enough small things to find.

A lootbox is exciting because the reward arrives right before something you
want. The thing the visitor wants here is the next acquisition, so the game
should be about getting to it first, in the voice of the world the shop
already lives in: a black market, run by shady, otherworldly dealers.

## What already exists

This note builds on these; it replaces none of them.

- **The Dossier** (`/dossier`): an agent number, a codename, badges and one
  card per exhibit, all in the `awards` table, granted only by the Worker.
- **The Vault lever** (`/vault`): one free pull a day plus earned bonus pulls,
  four vault cards that are never for sale, odds posted.
- **Ranks and streaks:** the streak milestones already award black-market
  ranks (Regular, Made, Fixer, Kingpin).
- **The Dispatch** (0007): an optional email that lets a dossier follow an
  agent to another device.
- **The cast** (0016): seven characters, all drawn and placed.

## Decided in conversation (2026-11-15)

- **Hunting leads.** Completing a set and anticipating the next item follow.
- **Scarcity is real: one of each product.** The game never contradicts it.
- **The theme is the black market and shady dealings.** The player is a
  contact of the Bureau, not a customer.
- **Tone varies by character** (the tone map below).
- **The world grows with the products.** New products bring new characters:
  bounty hunters, vault hunters, treasure seekers, crooks and corrupt
  aliens from across the dimensions (the guest cast below).
- **Progress belongs to the person eventually.** Today it is keyed to the
  visitor cookie, with email recovery from the Dispatch. Real accounts are a
  backlog decision, not part of this note.

## The frame: you are a contact

The Bureau runs on favors, tip-offs and people who know people. Nothing
shady is ever aimed at the buyer; the shop stays honest. The game is your
standing in the fiction, and the shop is where the deals happen.

## The loop

| Step      | What the visitor does                                | Where it lives                       |
| --------- | ---------------------------------------------------- | ------------------------------------ |
| **Find**  | Spots and clicks a dead drop hidden around the site  | Any page; recorded by the Worker     |
| **Meet**  | A found drop introduces a contact from the cast      | The Dossier gains a Book of Contacts |
| **Learn** | Contacts pass tips about a real, unsold exhibit      | The Job Board and every Vault result |
| **Hunt**  | Tips fill that exhibit's file a piece at a time      | The Job Board, one page per exhibit  |
| **Pay**   | Finds appear on the certificate of what you acquired | The certificate; Gerald stamps them  |

### Dead drops (the hunting)

- Small things tucked into existing pages: a loose brick on the vault page, a
  note in a coat lining, a package under a footer link. Each belongs to a
  contact and gives a short, in-character reaction.
- **Recorded by the Worker, never the browser.** Clicking one sends a request;
  the Worker grants an award (`find:<id>`), idempotent per visitor, same as
  every other award (0006). A person who guesses the URL can claim a find
  without looking for it. That is acceptable because finds are free and
  cosmetic, and they never unlock anything with money value.
- **Findable by everyone.** Each drop is a real focusable control with a text
  label, reachable by keyboard and screen reader. Nothing relies on color,
  and the reaction is words first, with motion as a bonus that reduced motion
  turns off.
- **Never on an exhibit page.** An exhibit page carries no form, so nothing on it
  can touch the price. Drops live on the other pages.
- **Placement is data, not a hunt for the code.** A short list of drops, each
  with a page and a contact, so adding one is a one-line change with a test.

### The Book of Contacts (the collection)

A section of the existing Dossier, not a new page. One entry per contact
(six to start: every cast member but the host, who insists he has no contacts; the guest cast later). An unmet contact
shows as a blank slot that says so in words ("Unmet. Somebody here knows
something."). A met contact shows their name, their job and what they said when found (a portrait can follow). Slots exist so the visitor can see what is missing.

### The Job Board (the anticipation)

A page listing the real state of the shop:

- **Inbound:** the next acquisitions, shown as a silhouette and a clue.
  Tips collected for an item fill in its file a piece at a time. This is the
  free, lootbox-style reveal: the visitor earns the story before the item
  goes on sale.
- **On the block:** what is for sale now.
- **Found a home:** what has sold. If someone buys an item before a visitor
  finishes its file, the Job Board says so plainly, and the cast can tell it
  as a story ("someone else got there first"). Because there is one of each
  product, this will happen, and it is part of the fiction.

Every state is read from the database. The board never invents inventory.

### A tip on every pull

The Vault lever keeps its four cards and its posted odds, unchanged. In
addition, every pull carries one tip about an inbound exhibit. The tip is
not a prize that can be won or missed, so it does not touch the odds and
adds no chance. It simply gives each daily pull a reason to be opened. When
there is no inbound exhibit, the page says so.

### Finds on the certificate (the payoff)

A purchase gives the buyer a certificate (0003). The finds the buyer earned
about that exhibit appear on it, stamped by Gerald ("Gerald is not a
notary" stays beside them). The chase becomes part of the provenance, and
it is the one place the game visibly changes what a buyer receives. This is
a guaranteed record of what the buyer already did, not a bonus for paying.

### Ranks

No new ladder. The existing ranks stay, and finds count toward them the way
badges already do, so the game keeps one sense of progress.

## Tone: a dial per character

The noir rises with how much a character knows, and falls with how much of
the ceremony they handle. The dark ones carry the hunt and the tips; the
light ones carry the rewards.

| Character  | Tone      | Role in the game                               |
| ---------- | --------- | ---------------------------------------------- |
| Loupe      | Noir      | Appraises you as a mark; gives the Vault tips  |
| Courier    | Noir      | The dead-drop man; terse; "asking discouraged" |
| Ibid       | Dry       | Files and cross-references your finds          |
| Nickel     | Wry       | Tallies favors; speaks the Job Board's ticker  |
| Trixie     | Bright    | Presents the reveal when a file completes      |
| Gerald     | Wink      | Stamps your finds on the certificate           |
| Guy Normal | Oblivious | Insists it is all a perfectly ordinary staff   |

The menace is theatrical and about the story only. It is never about the
buyer's money, checkout, delivery or refund. Loupe can squint at you like a
mark; the receipt stays plain.

## The guest cast

The seven recurring characters are the show's staff. New products bring a
second tier: visitors from across the universe and its dimensions who have a
stake in a particular item.

- **Archetypes:** bounty hunters, vault hunters, treasure seekers, crooks
  and corrupt aliens. Rivals who want the item, brokers who sold it,
  collectors who lost it. Each is tied to one product or season.
- **They arrive with the product.** A guest appears on that exhibit's page,
  on the Job Board while it is inbound, and in its tips. When the item sells,
  the guest's last appearance is a line about where they went next, which
  is also how "found a home" gets told. A beloved guest can return.
- **The same rules as the cast (0016).** Invented beings only, no real
  culture's dress, accent or name as the "alien" trait, nothing modelled on a
  real person, nothing borrowed from an existing character. Each is a brief
  in words first; art follows the cast pattern (one SVG file, named parts,
  CSS-only motion).
- **They never speak for the page.** Prices, terms, refunds and shipping are
  said plainly by the page. A guest never claims to hold, reserve or have a
  right to the item.
- **Submissions (0017) can supply them.** A guest brief is the same kind of
  brief the partners already get.

## Lines that hold

- **Scarcity is always true** (0003). One of each product, and every count and
  deadline comes from the database.
- **No purchase ever buys a chance at something of value.** Variable rewards
  come only from free actions. A purchase may give guaranteed records, never
  a roll or a pull.
- **Early looks, not early buying.** A visitor who completes an exhibit's
  file may see its full story before it goes on sale. It is a look, with
  no hold, no reservation and no right to buy first. With one unit of
  each product, early buying would be an unfair edge, and the page says so
  plainly if the question comes up. Revisit only with a lawyer.
- **The comedy goes on the story, never on the receipt** (0003).
- **Honesty about finds.** A tip is a clue, not a claim on the item. The
  Job Board's "inbound" is true, and a guess is labelled as one.

## Storage

All progress uses the existing `agents` and `awards` tables: finds are
awards named `find:<id>`, contacts are awards named `contact:<name>`, and
tips seen are awards named `tip:<exhibit>:<n>`. No browser-only store, so a
visitor's progress already follows them to another device through the
Dispatch recovery (0007). Accounts are a backlog decision and would build on
the same rows.

A new table is needed only for inbound exhibits: the data the Job Board
shows before an item exists as a product page. That is a small design of its
own and belongs in the PR that builds the board.

## Build order

Each is a small PR into `dev`, with tests, and each gets a Ledger row so we
can see which hooks actually hook.

1. **Finds and the Book of Contacts.** The drop list, the Worker endpoint, the
   awards, the Dossier section, and the first five or six drops. The
   "clicky things to find" Jerry asked for, and the smallest piece that
   makes the hunt real.
2. **The Job Board and the pull tip.** The inbound data, the page, one tip on
   every pull, and the "found a home" state. Built as
   [0020](0020-job-board-and-tips.md), using the pending exhibits as "inbound";
   "found a home" waits on one-of-each (0015).
3. **Finds on the certificate.** Gerald's stamps, once there are finds to
   show.
4. **The first guest.** Arrives with the next product, with its brief, its
   art, its exhibit page and its place on the Job Board.
5. **The early look,** if the numbers say the earlier steps are working.

## Open questions

- How many drops to start with, and how hidden. Too easy is boring; too hard
  is invisible. The Ledger will say.
- Whether a tip should be a single line or a small piece of art. (Decided in
  0020: a single line, in a contact's voice.)
- What the first guest is, and which product they arrive with.
- Whether Nickel speaks the Job Board's ticker in his voice (0016 parks
  speaking for the whole cast).
- Whether completing the Book of Contacts earns a rank, a card, or only
  bragging rights.
