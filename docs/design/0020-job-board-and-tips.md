# 0020 — The Job Board and the pull tip

- **Status:** Built
- **Date:** 2026-11-16
- **Author:** Jerry Vrabel

## Problem

The hunt in 0018 gives a visitor contacts to find. It still doesn't point
at the product: nothing connects the free play to what the shop sells. This is
build step 2 of 0018, the smallest piece that makes the Vault and the catalog
talk to each other.

## What exists that changes the plan

0018 imagined "inbound" exhibits as silhouettes and clues that fill in before
an item exists as a page. The catalog already has seventeen exhibits marked
pending (0010): each has a live page and its full story, and nothing to buy
yet. Hiding what is already public would be false, so for now:

- **Inbound means pending** (decided 2026-11-16). The Job Board lists the
  pending exhibits as "on its way". No new table. A table of secret exhibits
  can come later, when there is a real next product to tease (0018 build step 4).
- **There is no early look to give.** A pending exhibit's page is already
  readable by everyone, so 0018's "early look" is moot for these. It returns
  only if secret exhibits do.

## Decisions

- **A tip is one line from a contact** (decided 2026-11-16): the contact's own
  voice, about one pending exhibit. Each of the seventeen has two tips, from
  two different contacts, so every contact speaks and every exhibit has a
  file that can fill in.
- **A tip is a clue, never a claim.** It says nothing about price, stock,
  shipping or dates, and it holds nothing for the visitor. A test checks the
  lines for those words. The page says so in plain words (0003, 0018).
- **Every pull carries one tip.** It is shown under the card on the Vault
  page. It is not a prize that can be won or missed, so the odds, the cards and
  the bonus pulls are unchanged. Pull number n always shows the same tip, in a
  fixed order that gives every exhibit's first tip before any second one.
- **The tip is recorded as an award**, `tip:<exhibit>:<n>`, in the existing
  `awards` table, so it follows the agent through Dispatch recovery (0007) like
  every other award. It is a record of what the agent was told, so **it does not
  count toward rank**: a tip is not something to collect.
- **The Job Board** is `/board`, linked from the footer and from the tip. It
  lists "on the block" (what can be bought now) and "on its way" (pending
  exhibits), each read from the catalog, with the visitor's own tips shown
  against each exhibit and a plain count ("Tips: 1 of 2."). When every tip about
  an exhibit has been told, the file says so. It is kept out of search (noindex, and disallowed in robots.txt).
- **When an exhibit goes on sale** its tips drop out of the pull rotation
  (they are only about what is on its way); tips already told stay in the
  agent's file.
- **The Ledger** gets two columns in "The hunt": agents given a tip, and tips
  given.

## Not built

- **"Found a home."** 0018 wants the board to say when an exhibit has sold.
  Nothing records that truthfully yet, because one-of-each (0015) is still only
  proposed, so the board shows no sold section. The board never invents
  inventory.
- **The tip in the reel.** For the effects group, the tip appears on the page
  after "Collect", not inside the reel's dialog. It keeps the Vault's script
  small and the dialog about the draw.
- **Tips only from contacts you've met.** A tip names its contact whether or
  not the visitor has found them. Making a tip depend on the Book of Contacts
  is a possible later link.

## Open

- Whether the Job Board should also give a free tip each day, apart from pulls.
- Whether a complete file should earn anything beyond its line on the board.
