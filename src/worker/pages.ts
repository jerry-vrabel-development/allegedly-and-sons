import { AVAILABLE_ITEMS, CATALOG, formatPrice, isAvailable, type Item } from "../core/catalog";
import { checkoutPath, checkoutSessionPath, regularOffer } from "../core/checkout";
import { BROADCAST_PATH, chicagoTime, type Offer } from "../core/broadcast";
import { shareLinks } from "../core/share";
import { artPath } from "./art";
import { CHECKOUT_SCRIPT_PATH, STRIPE_JS_URL } from "./checkout-script";
import { CASE_CLOSED_ID, STORY_END_ID, STORY_SCRIPT_PATH } from "./story-script";
import { html, type SafeHtml } from "./html";

export const SITE_NAME = "Allegedly & Sons";
export const STYLESHEET_PATH = "/assets/site.css";

interface PageOptions {
  readonly title: string;
  readonly description: string;
  readonly body: SafeHtml;
  /** Keep the page out of search results (checkout pages). */
  readonly noindex?: boolean;
  /**
   * The page's one true address, for search engines. Item pages set it, so
   * shared links (?r=...) all count as the same page.
   */
  readonly canonical?: string;
  /** Scripts for this page, loaded with `defer` in this order (see scripts.ts for ours). */
  readonly scripts?: readonly string[];
}

/** The shared page shell: landmarks, skip link, header nav and footer. */
export function layout({
  title,
  description,
  body,
  noindex = false,
  canonical,
  scripts = [],
}: PageOptions): SafeHtml {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>${fullTitle}</title>
        <meta name="description" content="${description}" />
        ${noindex ? html`<meta name="robots" content="noindex" />` : html``}
        ${canonical === undefined ? html`` : html`<link rel="canonical" href="${canonical}" />`}
        <link rel="stylesheet" href="${STYLESHEET_PATH}" />
        ${scripts.map((src) => html`<script src="${src}" defer></script>`)}
      </head>
      <body>
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site">
          <div class="wrap">
            <a class="brand" href="/">${SITE_NAME}</a>
            <nav aria-label="Main">
              <ul>
                <li><a href="/">The Collection</a></li>
                <li><a href="/dossier">Your Dossier</a></li>
                <li><a href="/vault">The Vault</a></li>
              </ul>
            </nav>
          </div>
        </header>
        <main id="main" tabindex="-1">
          <div class="wrap">${body}</div>
        </main>
        <footer class="site">
          <div class="wrap">
            <p>${SITE_NAME}, Purveyors of Rare Objects. Est. “a long time ago.”</p>
            <p>
              Home of The Bureau of Improbable Acquisitions.
              <a href="/disclaimer">Read the fine print</a>.
            </p>
          </div>
        </footer>
      </body>
    </html> `;
}

/**
 * Where the terms of sale start on The Fine Print. Linked beside every place a
 * buyer pays, so the terms are in front of them when they agree to them; the
 * page itself is linked from every footer.
 */
export const TERMS_PATH = "/disclaimer#terms-heading";

export function itemPath(item: Item): string {
  return `/items/${item.slug}`;
}

/** The item's illustration. Pass empty alt where a visible name already says it. */
function art(item: Item, alt: string, eager = false): SafeHtml {
  return html`<img
    src="${artPath(item.slug)}"
    alt="${alt}"
    width="800"
    height="600"
    loading="${eager ? "eager" : "lazy"}"
    decoding="async"
  />`;
}

/** A collection card. The image is decorative here: the name is right below it. */
function card(item: Item): SafeHtml {
  return html`<li class="card">
    ${art(item, "")}
    <div class="card-body">
      <p class="kicker">Exhibit ${item.exhibit}</p>
      <h3><a href="${itemPath(item)}">${item.name}</a></h3>
      <p>${item.tagline}</p>
      ${
        isAvailable(item)
          ? html`<p class="price">${formatPrice(item.priceCents)}</p>`
          : html`<p class="pending">Acquisition pending</p>`
      }
    </div>
  </li>`;
}

/** The buy box's action: the button, or, while the Bureau is still recovering it, why not. */
function acquireBlock(item: Item, offer: Offer): SafeHtml {
  if (!isAvailable(item)) {
    return html`<p class="pending-note">
      <strong>Acquisition pending.</strong> The Bureau is still recovering this one. Read the case
      file now; it goes on sale when it arrives.
    </p>`;
  }
  return html`<p class="acquire">
      <a class="button" href="${checkoutPath(item)}" rel="nofollow" data-sound="kachunk"
        >Acquire this exhibit</a
      >
    </p>
    ${onAirNote(offer)}
    <p class="secure-note">
      Secure checkout by Stripe. US shipping only, for now.
      <a href="${TERMS_PATH}">Terms of sale</a>.
    </p>`;
}

export function homePage(): SafeHtml {
  const [featured] = AVAILABLE_ITEMS;
  const hero = html`<section class="hero" aria-labelledby="featured-heading">
    <figure class="art">${art(featured, featured.artAlt, true)}</figure>
    <div class="hero-copy">
      <p class="kicker">Now on display · Exhibit ${featured.exhibit}</p>
      <h2 id="featured-heading">${featured.name}</h2>
      <p class="hook">${featured.hook}</p>
      <p class="price">${formatPrice(featured.priceCents)}</p>
      <p><a class="button" href="${itemPath(featured)}">View the exhibit</a></p>
    </div>
  </section>`;

  return layout({
    title: SITE_NAME,
    description:
      "Rare objects with extraordinary, completely unverifiable histories, recovered by The Bureau of Improbable Acquisitions.",
    body: html` <div class="intro">
        <p class="kicker">Purveyors of Rare Objects</p>
        <h1>${SITE_NAME}</h1>
        <p class="tagline">
          Recovered from crash sites, lost civilizations and the backs of very old drawers.
        </p>
      </div>
      ${hero}
      <section aria-labelledby="collection-heading">
        <h2 id="collection-heading">The Collection</h2>
        <ul class="items">
          ${CATALOG.map((item) => card(item))}
        </ul>
      </section>`,
  });
}

/**
 * The price line for an item: on air, the Smuggler's Special Value with the
 * real regular price and the real end time beside it, in words.
 */
function priceLine(offer: Offer): SafeHtml {
  if (offer.segment === undefined) return html`${formatPrice(offer.priceCents)}`;
  return html`${formatPrice(offer.priceCents)}
    <span class="regular">(regularly ${formatPrice(offer.regularCents)})</span>`;
}

/** One short line above the price when the item is on air (keeps the buy button on screen). */
function onAirTag(offer: Offer): SafeHtml {
  if (offer.segment === undefined) return html``;
  const percent = Math.round((1 - offer.priceCents / offer.regularCents) * 100);
  // On phones the regular price moves up here, so the price row stays one line.
  const regular = formatPrice(offer.regularCents);
  // prettier-ignore
  const wide = html`<span class="wide-only">Smuggler's Special Value · </span>`;
  // prettier-ignore
  const phone = html`<span class="phone-only">, regularly ${regular}</span>`;
  return html`<p class="on-air-tag">
    <strong>On air</strong> · ${wide}${String(percent)}% off${phone}
  </p>`;
}

function onAirNote(offer: Offer): SafeHtml {
  if (offer.segment === undefined) return html``;
  const where = offer.segment.kind === "auction" ? ", in the Midnight Auction" : "";
  return html`<p class="on-air-note">
    <strong>On air now${where}.</strong>
    This price ends at ${chicagoTime(offer.segment.endsAt)} Chicago time.
    <a href="${BROADCAST_PATH}">Watch the broadcast</a>.
  </p>`;
}

/** How many other exhibits an item page suggests. */
export const CROSS_SELL_COUNT = 3;

/**
 * The other exhibits an item page suggests: the rest of its wing first (one
 * step closer to a wing commendation, note 0010), then exhibits for sale,
 * then pending ones.
 */
export function crossSells(item: Item): readonly Item[] {
  const others = CATALOG.filter((other) => other.slug !== item.slug);
  const sameWing = others.filter((other) => other.wing === item.wing);
  const rest = others.filter((other) => other.wing !== item.wing);
  const forSale = rest.filter(isAvailable);
  const pending = rest.filter((other) => !isAvailable(other));
  return [...sameWing, ...forSale, ...pending].slice(0, CROSS_SELL_COUNT);
}

export function itemPage(item: Item, origin: string, offer: Offer = regularOffer(item)): SafeHtml {
  const { story } = item;
  const [opening, ...rest] = story.paragraphs;
  const others = crossSells(item);
  const links = shareLinks(item.slug);

  return layout({
    title: item.name,
    canonical: `${origin}${itemPath(item)}`,
    // The story script only matters when there's a case file to open.
    scripts: rest.length === 0 ? [] : [STORY_SCRIPT_PATH],
    description: `${item.name}: ${item.hook}`,
    body: html` <article>
        <div class="exhibit">
          <figure class="art">${art(item, item.artAlt, true)}</figure>
          <div class="buybox">
            <p class="kicker">Exhibit ${item.exhibit}</p>
            <h1>${item.name}</h1>
            ${onAirTag(offer)}
            <dl class="pricing">
              <dt>Estimated value</dt>
              <dd class="anchor">${item.estimatedValue}</dd>
              <dt>${isAvailable(item) ? "Your price" : "Expected price"}</dt>
              <dd class="price">${priceLine(offer)}</dd>
            </dl>
            ${acquireBlock(item, offer)}
            <p class="hook">${item.hook}</p>
            <h2 class="small">Included</h2>
            <ul class="included">
              <li>${item.name}</li>
              <li>Bureau Certificate No. ${item.exhibit} (Authenticity: Allegedly)</li>
            </ul>
          </div>
        </div>

        <div class="prose">
          <section aria-labelledby="story-heading">
            <h2 id="story-heading">The Case File</h2>
            <h3>${story.headline}</h3>
            <p>${opening}</p>
            ${
              rest.length === 0
                ? html``
                : html`<details data-story="${item.slug}" data-card="${item.exhibit}">
                    <summary>Keep reading the case file</summary>
                    ${rest.map((paragraph, index) =>
                      index === rest.length - 1
                        ? html`<p id="${STORY_END_ID}">${paragraph}</p>`
                        : html`<p>${paragraph}</p>`,
                    )}
                  </details>`
            }
            ${
              rest.length === 0
                ? html``
                : html`<p class="case-closed" id="${CASE_CLOSED_ID}" role="status"></p>`
            }
            <p class="byline">Recorded by ${story.author.name}, ${story.author.title}</p>
          </section>

          <section aria-labelledby="share-heading">
            <h2 id="share-heading">Share this exhibit</h2>
            <ul class="share">
              ${links.map(
                (link) =>
                  html`<li>
                    <a href="${link.href}" rel="nofollow" data-sound="whoosh">${link.label}</a>
                  </li>`,
              )}
            </ul>
          </section>

          <section aria-labelledby="specs-heading">
            <h2 id="specs-heading">Specifications</h2>
            <dl class="specs">
              ${item.specs.map(
                (spec) =>
                  html`<dt>${spec.label}</dt>
                    <dd>${spec.value}</dd>`,
              )}
            </dl>
          </section>

          <section class="certificate" aria-labelledby="certificate-heading">
            <h2 id="certificate-heading">Bureau Certificate</h2>
            <p>Every acquisition comes with Bureau Certificate No. ${item.exhibit}.</p>
            <p><strong>Authenticity:</strong> Allegedly.</p>
          </section>
        </div>
      </article>

      <section aria-labelledby="more-heading">
        <h2 id="more-heading">Other recent acquisitions</h2>
        <ul class="items">
          ${others.map((other) => card(other))}
        </ul>
      </section>`,
  });
}

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

/** One group of clauses: heading, flavor, then the binding plain line. */
function clauses(terms: readonly Term[]): SafeHtml {
  return html`${terms.map(
    (term) =>
      html`<h3>${term.heading}</h3>
        <p>${term.flavor}</p>
        <p><strong>Plainly:</strong> ${term.plainly}</p>`,
  )}`;
}

/** "2026-11-08" → "November 8, 2026". */
function longDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function disclaimerPage(email: string = ORDER_CONTACT_EMAIL): SafeHtml {
  return layout({
    title: "The Fine Print",
    description:
      "What you actually receive from Allegedly & Sons, and the terms of sale, each said plainly.",
    body: html` <div class="prose">
      <h1>The Fine Print</h1>
      <p class="tagline">
        Read it by candlelight. Every clause comes with a plain translation, marked
        <strong>Plainly</strong>.
      </p>

      <section aria-labelledby="merchandise-heading">
        <h2 id="merchandise-heading">Regarding the Merchandise</h2>
        ${clauses(MERCHANDISE_TERMS)}
      </section>

      <section aria-labelledby="terms-heading">
        <h2 id="terms-heading">The Terms of the Arrangement</h2>
        <p class="tagline">Keep your voice down. Here is how the Bureau does business.</p>
        ${clauses(saleTerms(email))}
      </section>

      <section aria-labelledby="methods-heading">
        <h2 id="methods-heading">The Bureau's Methods</h2>
        ${clauses(METHODS_TERMS)}
      </section>

      <section aria-labelledby="seal-heading">
        <h2 id="seal-heading">Signed and Sealed</h2>
        <p>
          Last amended the night the ledger caught fire (<time datetime="${TERMS_LAST_AMENDED}"
            >${longDate(TERMS_LAST_AMENDED)}</time
          >). Witnessed by Gerald, the Bureau's notary. Gerald is not a notary.
        </p>
        <p>
          <strong>Plainly:</strong> the flavor text is atmosphere. The Plainly lines are the deal.
        </p>
      </section>
      <p><a href="/">Back to the collection</a></p>
    </div>`,
  });
}

export function notFoundPage(): SafeHtml {
  return layout({
    title: "Not found",
    description: "The Bureau is still looking.",
    body: html` <div class="prose">
      <h1>Not found</h1>
      <p>Not found. The Bureau is still looking.</p>
      <p><a href="/">Back to the collection</a></p>
    </div>`,
  });
}

/** What the return page says, decided by asking Stripe (see returnOutcome). */
export type ReturnView =
  | { readonly kind: "paid" | "processing" | "incomplete"; readonly item: Item | undefined }
  | { readonly kind: "unchecked" };

/**
 * The return page, after checkout. It only says "recorded" once Stripe has
 * confirmed the session was paid; anyone can open /thanks, so it never takes
 * the visit itself as proof. Orders are recorded by the webhook, not here.
 */
export function thanksPage(view: ReturnView = { kind: "unchecked" }): SafeHtml {
  const item = view.kind === "unchecked" ? undefined : view.item;
  const back = html`<p><a href="/">Back to the collection</a></p>`;

  switch (view.kind) {
    case "paid":
      return layout({
        title: "Acquisition recorded",
        description: "Thank you for your acquisition.",
        noindex: true,
        body: html` <div class="prose">
          <h1>Acquisition recorded</h1>
          <p class="tagline">The Bureau thanks you for your discretion.</p>
          <p>
            Payment confirmed${item === undefined ? html`` : html` for ${item.name}`}. Stripe will
            email your receipt. Your exhibit will be packed with its Bureau Certificate and shipped
            to the address you gave at checkout.
          </p>
          ${
            // The sound module (note 0011) adds "Stamp your certificate" here for the fx group.
            item === undefined
              ? html``
              : html`<div class="certificate-moment" data-certificate="${item.exhibit}"></div>`
          }
          ${back}
        </div>`,
      });
    case "processing":
      return layout({
        title: "Payment processing",
        description: "Stripe is still confirming your payment.",
        noindex: true,
        body: html` <div class="prose">
          <h1>Payment processing</h1>
          <p class="tagline">The Bureau is counting the coins.</p>
          <p>
            Stripe is still confirming your
            payment${item === undefined ? html`` : html` for ${item.name}`}. Some payment methods
            take a little while. Stripe will email you once it clears, and we ship after that.
          </p>
          ${back}
        </div>`,
      });
    case "incomplete":
      return layout({
        title: "Acquisition not completed",
        description: "This checkout wasn't completed.",
        noindex: true,
        body: html` <div class="prose">
          <h1>Acquisition not completed</h1>
          <p class="tagline">The vault door is still closed.</p>
          <p>This checkout wasn’t finished, so nothing was charged.</p>
          ${
            item === undefined
              ? back
              : html`<p><a href="${checkoutPath(item)}">Try again: ${item.name}</a></p>
                  ${back}`
          }
        </div>`,
      });
    case "unchecked":
      return layout({
        title: "Thank you",
        description: "Thank you for visiting the Bureau.",
        noindex: true,
        body: html` <div class="prose">
          <h1>Thank you</h1>
          <p class="tagline">The Bureau thanks you for your discretion.</p>
          <p>
            We couldn’t look up an acquisition from here. If you just paid, Stripe will email your
            receipt, and nothing is charged twice.
          </p>
          ${back}
        </div>`,
      });
  }
}

/**
 * The embedded checkout page (design note 0005, Option B). With a publishable
 * key, it loads Stripe.js and our small script (checkout-script.ts), which
 * mounts Stripe's Checkout into #checkout. Without one, or whenever JavaScript
 * or Stripe.js isn't available, the hosted-checkout button below still works,
 * so nobody gets stuck. The page itself creates nothing at Stripe: the script
 * asks `data-session-url` for a session when it runs.
 */
export function checkoutPage(
  item: Item,
  publishableKey?: string,
  offer: Offer = regularOffer(item),
): SafeHtml {
  const embedded = publishableKey !== undefined;
  return layout({
    title: `Acquire ${item.name}`,
    description: `Checkout for ${item.name}.`,
    noindex: true,
    scripts: embedded ? [STRIPE_JS_URL, CHECKOUT_SCRIPT_PATH] : [],
    body: html` <div class="prose checkout">
      <p class="kicker">Exhibit ${item.exhibit}</p>
      <h1>Acquire ${item.name}</h1>
      <p class="price">${priceLine(offer)}</p>
      ${onAirNote(offer)}
      <p id="checkout-status" class="checkout-status" role="status"></p>
      ${
        embedded
          ? html`<div
              id="checkout"
              data-session-url="${checkoutSessionPath(item)}"
              data-publishable-key="${publishableKey}"
            ></div>`
          : html`<div id="checkout" data-session-url="${checkoutSessionPath(item)}"></div>`
      }
      <form class="acquire" method="post" action="${checkoutPath(item)}">
        <button class="button" type="submit">Continue on Stripe’s secure page</button>
      </form>
      <p class="secure-note">
        By paying, you agree to the <a href="${TERMS_PATH}">terms of sale</a>. Card details go
        straight to Stripe and never touch our servers. US shipping only, for now.
      </p>
      <p><a href="${itemPath(item)}">Back to ${item.name}</a></p>
    </div>`,
  });
}

/** Shown while checkout is switched off on purpose (no Stripe key yet), so nobody is told to retry. */
export function checkoutClosedPage(item: Item): SafeHtml {
  return layout({
    title: "Acquisitions open soon",
    description: "The Bureau isn't taking acquisitions yet.",
    body: html` <div class="prose">
      <h1>Acquisitions open soon</h1>
      <p>The Bureau is still preparing the vault. Nothing was charged.</p>
      <p><a href="${itemPath(item)}">Back to ${item.name}</a></p>
    </div>`,
  });
}

/** Shown when checkout fails unexpectedly (Stripe or network trouble), so the buyer is never left on a blank error. */
export function checkoutUnavailablePage(item: Item): SafeHtml {
  return layout({
    title: "Checkout unavailable",
    description: "Checkout couldn't open just now.",
    body: html` <div class="prose">
      <h1>Checkout couldn’t open</h1>
      <p>The vault is stuck. Nothing was charged. Please try again in a few minutes.</p>
      <p><a href="${itemPath(item)}">Back to ${item.name}</a></p>
    </div>`,
  });
}
