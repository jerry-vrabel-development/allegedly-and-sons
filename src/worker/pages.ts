import { CATALOG, formatPrice, type Item } from "../core/catalog";
import { checkoutPath } from "../core/checkout";
import { shareLinks } from "../core/share";
import { artPath } from "./art";
import { html, type SafeHtml } from "./html";

export const SITE_NAME = "Allegedly & Sons";
export const STYLESHEET_PATH = "/assets/site.css";

interface PageOptions {
  readonly title: string;
  readonly description: string;
  readonly body: SafeHtml;
}

/** The shared page shell: landmarks, skip link, header nav and footer. */
export function layout({ title, description, body }: PageOptions): SafeHtml {
  const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} · ${SITE_NAME}`;
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>${fullTitle}</title>
        <meta name="description" content="${description}" />
        <link rel="stylesheet" href="${STYLESHEET_PATH}" />
      </head>
      <body>
        <a class="skip-link" href="#main">Skip to content</a>
        <header class="site">
          <div class="wrap">
            <a class="brand" href="/">${SITE_NAME}</a>
            <nav aria-label="Main">
              <ul>
                <li><a href="/">The Collection</a></li>
                <li><a href="/disclaimer">The Fine Print</a></li>
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
      <p class="price">${formatPrice(item.priceCents)}</p>
    </div>
  </li>`;
}

export function homePage(): SafeHtml {
  const [featured] = CATALOG;
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

export function itemPage(item: Item, origin: string): SafeHtml {
  const { story } = item;
  const [opening, ...rest] = story.paragraphs;
  const others = CATALOG.filter((other) => other.slug !== item.slug);
  const links = shareLinks({
    url: `${origin}${itemPath(item)}`,
    text: `${item.name}: ${item.tagline}`,
  });

  return layout({
    title: item.name,
    description: `${item.name}: ${item.hook}`,
    body: html` <article>
        <div class="exhibit">
          <figure class="art">${art(item, item.artAlt, true)}</figure>
          <div class="buybox">
            <p class="kicker">Exhibit ${item.exhibit}</p>
            <h1>${item.name}</h1>
            <dl class="pricing">
              <dt>Estimated value</dt>
              <dd class="anchor">${item.estimatedValue}</dd>
              <dt>Your price</dt>
              <dd class="price">${formatPrice(item.priceCents)}</dd>
            </dl>
            <form class="acquire" method="post" action="${checkoutPath(item)}">
              <button class="button" type="submit">Acquire this exhibit</button>
            </form>
            <p class="secure-note">Secure checkout by Stripe. US shipping only, for now.</p>
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
                : html`<details>
                    <summary>Keep reading the case file</summary>
                    ${rest.map((paragraph) => html`<p>${paragraph}</p>`)}
                  </details>`
            }
            <p class="byline">Recorded by ${story.author.name}, ${story.author.title}</p>
          </section>

          <section aria-labelledby="share-heading">
            <h2 id="share-heading">Share this exhibit</h2>
            <ul class="share">
              ${links.map(
                (link) =>
                  html`<li>
                    <a href="${link.href}">${link.label}</a>
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
 * Where buyers ask for refunds or about an order. Shown publicly on The Fine Print.
 * Unset until the founder sets one up; the page says so plainly until then, and
 * real orders shouldn't open without it.
 */
export const ORDER_CONTACT_EMAIL: string | undefined = undefined;

/** Refunds: how long a buyer has to change their mind, in Earth hours. */
export const REFUND_WINDOW_HOURS = 24;

/** The longest we take to ship, in days. */
export const MAX_SHIP_DAYS = 30;

interface Term {
  /** The black-market heading. */
  readonly heading: string;
  /** Flavor, in the Bureau's voice. */
  readonly flavor: string;
  /** What it actually means, said plainly. Every term has one. */
  readonly plainly: SafeHtml;
}

function contactTerm(email: string | undefined): Term {
  return {
    heading: "Reaching the Bureau",
    flavor: "Don't call us. Don't follow the courier. Use the drop below.",
    plainly:
      email === undefined
        ? html`Contact details will be posted here before the shop takes real orders.`
        : html`Email <a href="mailto:${email}">${email}</a> for refunds or anything about an order.`,
  };
}

/**
 * The terms of sale, themed as back-room dealings. The voice is shady; the
 * terms are not. Each one ends with a plain sentence saying exactly what it means.
 */
export function saleTerms(email: string | undefined = ORDER_CONTACT_EMAIL): readonly Term[] {
  return [
    {
      heading: "No Take-Backs After Twelve Orbits",
      flavor:
        "Cold feet? Speak up within twelve orbits of the Naxous star. After that the deal is done, and the Bureau never saw you.",
      plainly: html`You can cancel for a full refund within ${String(REFUND_WINDOW_HOURS)} hours of
      purchase. Ask through the contact below.`,
    },
    {
      heading: "Ambushed Couriers and Misfiring Wormholes",
      flavor: "Couriers get waylaid. Wormholes misfire. In this line of work, it happens.",
      plainly: html`If your item arrives damaged or never arrives, you get a full refund.`,
    },
    {
      heading: "The Courier's Cut Is Covered",
      flavor: "The courier's fee is baked into the price. Nobody asks the courier questions.",
      plainly: html`Shipping is included in the price. We ship to US addresses only.`,
    },
    {
      heading: "Rare Goods Travel Slowly",
      flavor:
        "False-bottomed crates. Decoy routes. Packaging that has to be talked into it. The rarer the object, the longer the road, and some exhibits insist on special handling.",
      plainly: html`Orders ship within ${String(MAX_SHIP_DAYS)} days of purchase. If yours will take
      longer, we'll email you and you can cancel for a full refund.`,
    },
    contactTerm(email),
  ];
}

export function disclaimerPage(email: string | undefined = ORDER_CONTACT_EMAIL): SafeHtml {
  return layout({
    title: "The Fine Print",
    description:
      "What you actually receive from Allegedly & Sons, and the terms of sale, said plainly.",
    body: html` <div class="prose">
      <h1>The Fine Print</h1>
      <p class="tagline">Said plainly, for once.</p>
      <ul>
        <li>
          Every item is exactly the ordinary object described under
          <strong>Specifications</strong> on its page. That is what ships.
        </li>
        <li>
          The stories are fiction, written for fun. No aliens, Vikings or pharaohs were consulted.
        </li>
        <li>
          Each “estimated value” is a joke too. It is not a real price, a former price or an
          appraisal.
        </li>
        <li>
          Bureau Certificates are part of the joke. They are not appraisals or proof of
          authenticity, history or value.
        </li>
        <li>Nothing here is an investment. Your paperclip will not go up in value.</li>
      </ul>

      <section aria-labelledby="terms-heading">
        <h2 id="terms-heading">The Terms of the Arrangement</h2>
        <p class="tagline">Keep your voice down. Here is how the Bureau does business.</p>
        ${saleTerms(email).map(
          (term) =>
            html`<h3>${term.heading}</h3>
              <p>${term.flavor}</p>
              <p><strong>Plainly:</strong> ${term.plainly}</p>`,
        )}
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

export function thanksPage(): SafeHtml {
  return layout({
    title: "Acquisition recorded",
    description: "Thank you for your acquisition.",
    body: html` <div class="prose">
      <h1>Acquisition recorded</h1>
      <p class="tagline">The Bureau thanks you for your discretion.</p>
      <p>
        Thank you. Stripe will email your receipt. Your exhibit will be packed with its Bureau
        Certificate and shipped to the address you gave at checkout.
      </p>
      <p><a href="/">Back to the collection</a></p>
    </div>`,
  });
}

/** Shown when checkout can't start, so the buyer is never left on a blank error. */
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
