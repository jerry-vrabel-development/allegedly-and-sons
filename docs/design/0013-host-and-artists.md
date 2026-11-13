# 0013 — The Broadcast's host, and art by human artists

- **Status:** The host is built (a still drawing for everyone, with motion
  for the effects group); the artists' partnership is planning only
- **Date:** 2026-11-11
- **Author:** Jerry Vrabel

## Problem

The Back-Room Broadcast ([0009](0009-back-room-broadcast.md)) has a host who
talks but can't be seen. It needs a face, and more characters after him:
callers, the notary, whoever runs the Vault.

The first host is a house sketch, made with AI help so we can launch and see
what lands, the same way the first lore was. That doesn't scale and it isn't
the point. Real artists will draw funnier, stranger characters than we can,
and they will share their own work, which brings traffic.

We want the shop's art to grow through human artists, with a partnership like
the one planned for writers ([0002](0002-writers.md)): artists contribute, we
publish what we accept, and they earn from it.

## The act and the truth (decided 2026-11-11)

- **The act, out front:** hardcore capitalists working an alien market. The
  host, the Broadcast, the Vault and the Fine Print's flavor all play it.
- **The truth, behind it:** we are fair to our partners, and we want this to
  be a healthy place for writers and artists to grow and work together.
- **The act is aimed at the audience, never at partners.** Anything a partner
  relies on (the agreement, the split, payouts, credit) is said plainly, the
  way the Fine Print gives every clause a "Plainly" line. Flavor may sit
  beside it; it never replaces it.

## The host (decided)

One character who is a game-show host, a used-car salesman and a black-market
pitchman at once, and who is, allegedly, a perfectly ordinary human being.

- **The pitchman:** a tall pompadour, a grin with a few teeth too many, a loud
  checked oxblood coat with gold lapels, a bow tie, a microphone, a podium.
- **The merchandise:** he holds his coat open. The shop's own exhibits hang
  inside (the paperclip, the left sock, the receipt).
- **The tells:** sideways pupils, a blink that closes from the sides, skin a
  shade off, and something under the hair. He never admits any of it.
- **The reveal is the joke, used sparingly.** When an exhibit sells, the hair
  jumps and two antennae spring out. He pats it down and carries on.
- **Three poses:** waiting (a slow bob, the odd sideways blink), pitching
  (mouth, eyebrows and microphone arm working, the ON AIR lamp glowing), and
  sold (the reveal).
- He has no name yet.

## How the art is built

- **Original drawings as SVG**, in the shop's colours, with CSS for motion.
  No image files to license and nothing third-party, the same rule as the
  scripts and the sounds.
- **Pitching** starts with the existing "Tune in" button. **Sold** fires when
  a segment ends.
- **Motion is part of the effects test** ([0011](0011-sound-scheme.md)). The
  drawing is on the page for everyone; only the effects group's script gives
  him a pose, so the plain group sees him still.
- **One file:** `src/worker/host-art.ts` holds the drawing, the artist's
  credit, the names of the moving parts and the styles that move them.
- **Reduced motion:** he holds still and only changes pose.
- **On the front page's stage too (2026-11-13).** The effects group's script
  gives him a pose wherever he is drawn. On the stage he waits, and gives
  himself away when the segment ends. He pitches only on `/broadcast`, where
  "Tune in" is.
- **"Motion: on / off" (2026-11-13).** His waiting motion starts on its own
  and never stops, beside other content, so the page needs a way to stop it
  (WCAG 2.2.2, Pause, Stop, Hide). Pages with the host get a "Motion" toggle
  in the site header beside "Sound", said in words with `aria-pressed`. Off
  means off: he is the still drawing again, and the end of a segment doesn't
  move him. It is remembered in the browser under its own key, apart from the
  sound setting. Under reduced motion nothing moves, so the toggle isn't
  shown. This also covers `/broadcast`, which had the same motion and no
  toggle. The same toggle stops the stage's ticker
  ([0014](0014-front-page-show.md)).
- **Never the only way to know something.** The host's lines stay as text on
  the page, ON AIR is written in words, and the drawing has a short
  description for screen readers.
- **True to the lines in 0009:** he is an obvious character, never a
  stand-in for a real person, a real customer or a real endorsement.

## Phases

1. **House art (now):** the host and the first characters are AI-assisted
   sketches, credited to "The Bureau." No artist features.
2. **Artists' partnership (a later version release, alongside the
   writers'):** submissions, credit, bio pages and a way to earn.

## What to build now so phase 2 is easy

- Keep each **drawing separate from the page** that shows it: one file per
  character or piece, so an artist's version can replace a house sketch
  without a rewrite.
- Every piece has an **artist**. Until phase 2, the artist is "The Bureau."
- **Name the moving parts** the same way in every character (hair, brows,
  jaw, arm), so the motion can be reused when the drawing changes.
- Write down a short **brief an artist can draw to**: the size, the palette,
  the parts that move, and what the character must never be (a real person).

## Credit and bio pages

The same as for writers:

- Each piece shows a credit with a **themed title**, for example:
  - Sketch Artist, Bureau of Improbable Acquisitions
  - Forger-in-Residence
  - Keeper of Likenesses
  - Court Illustrator (Never Called)
- Each partnered artist gets a **bio page**, linked from their credits,
  listing their work.
- Artists may use a **pen name** and choose what appears on their page. We
  show nothing personal they haven't approved, and never payout details.

## Every piece has two seats (decided 2026-11-11)

- **A writer's seat and an artist's seat.** The writer builds the character
  or the lore; the artist renders it in their style. That holds for an
  exhibit, a Vault card, the host and the callers.
- Vault cards already work this way: each has a name, a one-line summary and
  a secret file of lore, beside its picture.
- Today the Bureau sits in both seats of every piece.

## The product is what earns (decided 2026-11-11)

- **The product sits between the writer and the artist.** An exhibit has a
  story and it has art. When it sells, the writer and the artist each earn a
  share of that sale.
- **They can partner on a product.** A writer and an artist who make an
  exhibit together both profit when it sells, so the better they make it,
  the more both earn.
- **One rule for both crafts.** The writer's share in [0002](0002-writers.md)
  and the artist's share work the same way: both follow that exhibit's
  verified sales (see [0001](0001-analytics.md)).
- **The Bureau holds an empty seat.** Until a partner's story or art replaces
  the house version, that share stays with the shop.
- Leading option for paying it out: **Stripe Connect**, which can split one
  payment between the shop and more than one partner and handles their tax
  forms.

Work that isn't a product doesn't earn by this rule: the host, the callers,
and Vault cards, which are pulled for free and never sold. How the writers
and artists of that work are paid is an open question below.

## Cards as a line of their own (ideas, not decided)

Cards could grow into several products, each with its two seats:

- **Rarity:** the tiers the Vault already has, as a reason to collect.
- **Foil:** a shinier printing of the same card.
- **Seasonal:** sets that come and go with the calendar.
- **Sold as things:** prints, or physical cards and packs.

Two lines already drawn apply to all of it. Pulls are free and the Vault's
cards are never for sale ([0003](0003-gamification.md)), and odds stay posted
and honest ([0008](0008-sound-and-motion.md)). Selling cards in any form
would change the first of those on purpose, so it needs its own decision.
Selling packs with random contents would also need a look at the law before
it is built.

## Rights and agreements

- **Human-made work.** Partnered art is the artist's own work. That is the
  reason for the program.
- A simple artist agreement stating what we may publish, adapt and animate,
  for how long, and what the artist keeps (for example, the right to show the
  piece in their own portfolio and to sell their own prints).
- Get a legal review before the first paid piece goes live.

## Open questions

- **The first price.** Who sets a new exhibit's opening price, and on what
  basis? The price is part of the joke, and it is also what every share is
  cut from. Does the shop set it, do the partners propose it, or does it
  start somewhere modest and move with what sells? Any change has to stay
  true to 0009: no invented "was" prices.
- **What comes off the top.** Is a share cut from the price paid, or from
  what is left after the object, packaging, shipping and card fees?
- **The split:** what share goes to the shop, the writer and the artist, and
  whether the two crafts get the same.
- **Sale prices.** When an exhibit sells at an on-air discount, do the shares
  come off the price paid, so everyone takes the discount together?
- **Refunds.** A refunded sale pays no share. If the share was already paid
  out, how is it taken back?
- **How partners meet:** do a writer and an artist arrive as a team, does the
  shop pair them, or can an artist pick a published story to illustrate?
- **Work that isn't a product** (the host, callers, Vault cards), for both
  crafts. Options so far: a flat fee on acceptance; tie a card to an exhibit
  and share in that exhibit's sales; or let a card or character people
  respond to graduate into something sold, where it earns like any product.
- **Card variants.** If foil, seasonal or printed cards are sold, do the
  card's writer and artist share in every variant of it?
- **Where artists are found:** open submissions, invitations, local Chicago
  artists, or a mix.
- Which tools count as human-made, and how a submission says so.
- What we can take beyond SVG (hand-drawn work scanned in, raster images
  hosted on our own storage), and who prepares it for animation.
- Can a later artist redraw an existing exhibit or character? If so, what
  happens to the first artist's credit and share?
- The host's name.
