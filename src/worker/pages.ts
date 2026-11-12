import { AVAILABLE_ITEMS, CATALOG, formatPrice, isAvailable, type Item } from "../core/catalog";
import { checkoutPath, checkoutSessionPath, regularOffer } from "../core/checkout";
import { chicagoTime, type Offer } from "../core/broadcast";
import { shareLinks } from "../core/share";
import { CHECKOUT_MOUNT_ID, CHECKOUT_STATUS_ID, STRIPE_JS_URL } from "../core/checkout-page";
import { CASE_CLOSED_ID, STORY_END_ID } from "../core/story";
import { html, SafeHtml } from "./html";
import {
  MERCHANDISE_TERMS,
  METHODS_TERMS,
  ORDER_CONTACT_EMAIL,
  saleTerms,
  TERMS_LAST_AMENDED,
  type Term,
} from "./terms";
import {
  BROADCAST_PATH,
  CHECKOUT_SCRIPT_PATH,
  DISCLAIMER_PATH,
  DOSSIER_PATH,
  HOME_PATH,
  SOUND_SCRIPT_PATH,
  STORY_SCRIPT_PATH,
  STYLESHEET_PATH,
  TERMS_PATH,
  VAULT_PATH,
  artPath,
  itemPathFor,
  SHARE_CARD_PATH,
} from "../core/paths";

export const SITE_NAME = "Allegedly & Sons";

/** What the link-preview card shows, for people who can't see it. */
const SHARE_CARD_ALT =
  "Allegedly & Sons, Purveyors of Rare Objects, beside the Back-Room Broadcast's host, a grinning salesman with a microphone.";

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

/**
 * What a request adds to the shared shell. Which pages get what is decided by
 * page-rules.ts; the router fills this in for each request.
 */
export interface Chrome {
  /** The ON AIR strip (note 0009), shown just inside <body>, after the skip link. */
  readonly banner: SafeHtml | undefined;
  /**
   * Loads the sound script (note 0011) right after the stylesheet, so it runs
   * before any page script that uses it (deferred scripts run in order).
   */
  readonly sound: boolean;
  /**
   * Where the page was served, so its link-preview tags can carry full
   * addresses (Open Graph needs them). Only pages open to search engines get
   * the tags; without this, none do.
   */
  readonly preview?: { readonly origin: string; readonly pathname: string };
}

const NO_CHROME: Chrome = { banner: undefined, sound: false };

/**
 * A laid-out page. Its `value` is the page with no chrome, which is what
 * every page function's caller and test sees; `withChrome` renders the same
 * page again with a request's chrome in place.
 */
export class Page extends SafeHtml {
  readonly withChrome: (chrome: Chrome) => SafeHtml;

  constructor(render: (chrome: Chrome) => SafeHtml) {
    super(render(NO_CHROME).value);
    this.withChrome = render;
  }
}

/**
 * What link previews (Facebook, X, Bluesky, LinkedIn, messaging apps) show: the
 * page's own title and description, over the shop's one card.
 */
function sharePreview(
  { title, description, address }: { title: string; description: string; address: string },
  imageAddress: string,
): SafeHtml {
  return html`<meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${address}" />
    <meta property="og:image" content="${imageAddress}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${SHARE_CARD_ALT}" />
    <meta name="twitter:card" content="summary_large_image" />`;
}

/** The shared page shell: landmarks, skip link, header nav and footer. */
export function layout(options: PageOptions): Page {
  return new Page((chrome) => shell(options, chrome));
}

function shell(
  { title, description, body, noindex = false, canonical, scripts = [] }: PageOptions,
  { banner, sound, preview }: Chrome,
): SafeHtml {
  // prettier-ignore
  const soundScript = sound ? html`<script src="${SOUND_SCRIPT_PATH}" defer></script>` : html``;
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  const previewTags =
    noindex || preview === undefined
      ? html``
      : sharePreview(
          {
            title: fullTitle,
            description,
            address: canonical ?? `${preview.origin}${preview.pathname}`,
          },
          `${preview.origin}${SHARE_CARD_PATH}`,
        );
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
        ${previewTags}
        <link rel="stylesheet" href="${STYLESHEET_PATH}" />
        ${soundScript} ${scripts.map((src) => html`<script src="${src}" defer></script>`)}
      </head>
      <body>
        <a class="skip-link" href="#main">Skip to content</a>${banner ?? html``}
        <header class="site">
          <div class="wrap">
            <a class="brand" href="${HOME_PATH}">${SITE_NAME}</a>
            <nav aria-label="Main">
              <ul>
                <li><a href="${HOME_PATH}">The Collection</a></li>
                <li><a href="${DOSSIER_PATH}">Your Dossier</a></li>
                <li><a href="${VAULT_PATH}">The Vault</a></li>
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
              <a href="${DISCLAIMER_PATH}">Read the fine print</a>.
            </p>
          </div>
        </footer>
      </body>
    </html> `;
}

export function itemPath(item: Item): string {
  return itemPathFor(item.slug);
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

export function homePage(): Page {
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

export function itemPage(item: Item, origin: string, offer: Offer = regularOffer(item)): Page {
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

export function disclaimerPage(email: string = ORDER_CONTACT_EMAIL): Page {
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
      <p><a href="${HOME_PATH}">Back to the collection</a></p>
    </div>`,
  });
}

export function notFoundPage(): Page {
  return layout({
    title: "Not found",
    description: "The Bureau is still looking.",
    body: html` <div class="prose">
      <h1>Not found</h1>
      <p>Not found. The Bureau is still looking.</p>
      <p><a href="${HOME_PATH}">Back to the collection</a></p>
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
export function thanksPage(view: ReturnView = { kind: "unchecked" }): Page {
  const item = view.kind === "unchecked" ? undefined : view.item;
  const back = html`<p><a href="${HOME_PATH}">Back to the collection</a></p>`;

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
 * key, it loads Stripe.js and our small script (src/client/entries/checkout.ts),
 * which mounts Stripe's Checkout into #checkout. Without one, or whenever JavaScript
 * or Stripe.js isn't available, the hosted-checkout button below still works,
 * so nobody gets stuck. The page itself creates nothing at Stripe: the script
 * asks `data-session-url` for a session when it runs.
 */
export function checkoutPage(
  item: Item,
  publishableKey?: string,
  offer: Offer = regularOffer(item),
): Page {
  const embedded = publishableKey !== undefined;
  const sessionUrl = checkoutSessionPath(item);
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
      <p id="${CHECKOUT_STATUS_ID}" class="checkout-status" role="status"></p>
      ${
        embedded
          ? html`<div
              id="${CHECKOUT_MOUNT_ID}"
              data-session-url="${sessionUrl}"
              data-publishable-key="${publishableKey}"
            ></div>`
          : html`<div id="${CHECKOUT_MOUNT_ID}" data-session-url="${sessionUrl}"></div>`
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
export function checkoutClosedPage(item: Item): Page {
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
export function checkoutUnavailablePage(item: Item): Page {
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
