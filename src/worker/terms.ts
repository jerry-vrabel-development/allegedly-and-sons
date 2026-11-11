/**
 * The Fine Print's clauses: what a buyer gets, the terms of sale, and how the
 * shop runs. Content only; pages.ts lays it out (disclaimerPage).
 *
 * Every clause has black-market flavor and a "Plainly" line. The flavor is
 * atmosphere; the Plainly line is the term, and it's binding.
 */

import { html, type SafeHtml } from "./html";

/**
 * Where buyers ask for refunds or about an order. Shown publicly on The Fine
 * Print. Cloudflare Email Routing forwards it to the founder's inbox.
 */
export const ORDER_CONTACT_EMAIL = "bureau@allegedlyandsons.com";

/** Refunds: how long a buyer has to change their mind, in Earth hours. */
export const REFUND_WINDOW_HOURS = 24;

/** The longest we take to ship, in days. */
export const MAX_SHIP_DAYS = 30;

/**
 * When the terms last changed (YYYY-MM-DD). Orders are governed by the terms
 * posted when they were placed, so bump this with every change to the terms.
 */
export const TERMS_LAST_AMENDED = "2026-11-10";

/** A clause of The Fine Print: black-market flavor, then what it actually means. */
export interface Term {
  /** The black-market heading. */
  readonly heading: string;
  /** Flavor, in the Bureau's voice. Atmosphere only; never the deal itself. */
  readonly flavor: string;
  /** What it actually means: gruff, but never vague. Every clause has one, and it's binding. */
  readonly plainly: SafeHtml;
}

/** What a buyer actually gets. The voice is shady; these facts are not. */
export const MERCHANDISE_TERMS: readonly Term[] = [
  {
    heading: "What Changes Hands",
    flavor:
      "No crates are pried open in the alley. You get precisely the object on the manifest, and nothing that glows.",
    plainly: html`You get the ordinary object listed under <strong>Specifications</strong> on its
      page. That is what ships.`,
  },
  {
    heading: "The Provenance",
    flavor: "Every relic comes with a story. The Bureau never said the story was true.",
    plainly: html`The stories are fiction, written for fun. No aliens, Vikings or pharaohs were
    consulted.`,
  },
  {
    heading: "The Appraisal",
    flavor:
      "Each estimated value was arrived at by a man in a trench coat who declined to show his work.",
    plainly: html`Each “estimated value” is a joke. It is not a real price, a former price or an
    appraisal.`,
  },
  {
    heading: "The Paperwork",
    flavor:
      "Every relic leaves with a Bureau Certificate: stamped, sealed and legally meaningless.",
    plainly: html`Bureau Certificates are part of the joke. They are not appraisals or proof of
    authenticity, history or value.`,
  },
  {
    heading: "Not a Sound Investment",
    flavor:
      "Some say a Xenoclip appreciates. Those people now work in the gift shop, under supervision.",
    plainly: html`Nothing here is an investment. Your paperclip will not go up in value.`,
  },
];

function contactTerm(email: string): Term {
  return {
    heading: "Reaching the Bureau",
    flavor: "Don't call us. Don't follow the courier. Use the drop below.",
    plainly: html`Email <a href="mailto:${email}">${email}</a> for refunds or anything about an
      order.`,
  };
}

/**
 * The terms of sale, themed as back-room dealings and as seller-friendly as
 * the law comfortably allows. The flavor is atmosphere; the Plainly line is
 * the term. Refunds for a change of mind (24 hours), for damaged or lost
 * items, and for late shipping stay: mail-order rules and the card networks
 * require them in practice, and dropping them only turns refunds into
 * chargebacks. Have a lawyer review before real orders (enforceability of
 * the liability cap and venue varies).
 */
export function saleTerms(email: string = ORDER_CONTACT_EMAIL): readonly Term[] {
  return [
    {
      heading: "No Take-Backs After Twelve Orbits",
      flavor:
        "Cold feet? Speak up within twelve orbits of the Naxous star. After that the deal is done, and the Bureau never saw you.",
      plainly: html`Changed your mind? Full refund if you ask within ${String(REFUND_WINDOW_HOURS)}
      hours of purchase.`,
    },
    {
      heading: "Ambushed Couriers and Misfiring Wormholes",
      flavor: "Couriers get waylaid. Wormholes misfire. In this line of work, it happens.",
      plainly: html`Arrives damaged, or never arrives? Full refund.`,
    },
    {
      heading: "The Courier's Cut Is Covered",
      flavor: "The courier's fee is baked into the price. Nobody asks the courier questions.",
      plainly: html`Shipping is included in the price. US addresses only.`,
    },
    {
      heading: "Rare Goods Travel Slowly",
      flavor:
        "False-bottomed crates. Decoy routes. Packaging that has to be talked into it. The rarer the object, the longer the road.",
      plainly: html`Orders ship within ${String(MAX_SHIP_DAYS)} days of purchase. If yours will take
      longer, we'll email you, and you can cancel for a full refund.`,
    },
    {
      heading: "Prices Change When the Cameras Do",
      flavor:
        "When an exhibit is on the air, the Bureau's host is authorized to let it go cheap. When the segment ends, so does the generosity.",
      plainly: html`An exhibit on the Back-Room Broadcast sells at its Smuggler's Special Value
      until the segment ends, at the time shown. The price you see when you start checkout is the
      price you pay, even if the segment ends while you're paying.`,
    },
    {
      heading: "Sold As Found",
      flavor: "The Bureau vouches for nothing. Least of all itself.",
      plainly: html`Items are sold as-is, with no warranties beyond the ones the law requires.`,
    },
    {
      heading: "The Limits of the Bureau's Debt",
      flavor: "Whatever befalls you, the Bureau's debt to you ends at the price of the relic.",
      plainly: html`As far as the law allows, our liability for any order is limited to what you
      paid for it.`,
    },
    {
      heading: "The Bureau Chooses Its Clients",
      flavor:
        "Not everyone gets through the door. Some get through it and are politely shown back out.",
      plainly: html`We may refuse or cancel any order, for example over a pricing mistake or
      suspected fraud. If we cancel, you get a full refund.`,
    },
    {
      heading: "Money Goes Back the Way It Came",
      flavor: "No envelopes of cash. No store credit. No favors.",
      plainly: html`Refunds go back to the card you paid with.`,
    },
    {
      heading: "Come to the Bureau Before the Bank",
      flavor: "Go to the bank before the Bureau, and the Bureau will remember.",
      plainly: html`Problem with an order? Contact us first. We'll sort it out faster than a card
      dispute will.`,
    },
    {
      heading: "The Bureau Answers to Illinois",
      flavor: "The Bureau operates from undisclosed locations, every one of which is in Illinois.",
      plainly: html`These terms are governed by Illinois law. Any dispute goes to the courts of Cook
      County, Illinois.`,
    },
    {
      heading: "The Arrangement Shifts in the Dark",
      flavor:
        "The Bureau rewrites its arrangements by candlelight. Yours stays sealed in the envelope you were handed.",
      plainly: html`We may update these terms. Your order is governed by the terms posted when you
      placed it.`,
    },
    {
      heading: "What Leaves the Vault Stays Out",
      flavor: "Once a recording or certificate leaves the vault, it cannot be un-leaked.",
      plainly: html`Digital items (like certificate files, audio, and streak restorations) can't be
      refunded once delivered, unless they don't work. The 24-hour change-of-mind refund doesn't
      cover them.`,
    },
    contactTerm(email),
  ];
}

/** How the shop runs: what loads in the browser and what's recorded. */
export const METHODS_TERMS: readonly Term[] = [
  {
    heading: "What Runs in Your Browser",
    flavor:
      "The Bureau's agents work quietly: one watches the reading room, one winds the clocks, one minds the checkout desk, and for half of you a fourth works the sound effects. Nobody else gets in.",
    plainly: html`Only our own scripts and Stripe’s ever run. Item pages run a small one of ours
      that notes when you open a case file and whether you read it to the end. The Vault and the
      Back-Room Broadcast run one that counts down their clocks. Half of visitors also get the shop
      with sound and motion, and half get it plain, so we can tell whether it helps; which half
      you're in comes from the first cookie's random number, and nothing more is recorded for it.
      For the sound-and-motion half, every shop page except checkout runs a sound script of ours: it
      plays a sound when you press certain buttons and links or open a case file, and adds a Sound
      button to the top of the page. If you turn the sound off, your browser remembers that, and
      nothing about it is sent to us. For that half the Vault also runs one that animates the lever.
      The checkout page runs Stripe’s, which shows the payment form, and a small one of ours that
      loads it. Stripe may collect information about your device to help prevent fraud; see
      <a href="https://stripe.com/privacy">Stripe’s privacy policy</a>. Card details go straight to
      Stripe and never touch our servers.`,
  },
  {
    heading: "What the Bureau Keeps on File",
    flavor:
      "The Bureau keeps a discreet ledger of who came by and which relics caught their eye. Two slips of paper, tucked in your coat pocket: one so we know you when you return, one noting who pointed you our way. The second burns itself when you leave.",
    plainly: html`We set two cookies of our own. The first holds a random number and nothing else,
    and it lasts a year from your latest visit. We use it to count visitors and to see which pages
    and links lead to purchases. The second remembers which website or campaign link brought you
    here, and it’s deleted when you close your browser. When you check out, we pass the first one’s
    number to Stripe with your order, so we can tell which visits led to a sale. We also note which
    item pages are viewed, whether you read their case files, which share buttons you press, the
    country your connection comes from, and the website that sent you. If you earn badges or cards,
    or pull the vault lever, we keep them and your pulls with the first cookie’s number, along with
    an agent number and a codename made from it. Our records don’t include your IP address, and we
    don’t use third-party trackers or ad networks.`,
  },
  {
    heading: "Correspondence",
    flavor:
      "Agents who leave a forwarding address receive the occasional sealed envelope. Burn after reading is optional.",
    plainly: html`If you register with the Bureau Dispatch, we keep the email address you give us
      with your file, once you’ve confirmed it from the link we send. We use it to send you that
      link, to let you open your file on another device, and for Bureau mail. We never sell it,
      share it, or put it in our analytics. Every Bureau email has a link to unsubscribe, which
      works immediately; your address stays on file so you can still open your file elsewhere. To
      have it deleted entirely, write to
      <a href="mailto:${ORDER_CONTACT_EMAIL}">${ORDER_CONTACT_EMAIL}</a>.`,
  },
];
