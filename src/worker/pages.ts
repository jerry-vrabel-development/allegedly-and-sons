import { CATALOG, formatPrice, type Item } from "../core/catalog";
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
            <p class="cta-soon">Acquisitions open soon</p>
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

export function disclaimerPage(): SafeHtml {
  return layout({
    title: "The Fine Print",
    description: "What you actually receive from Allegedly & Sons, said plainly.",
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
        <li>Refund and shipping details will be posted here before the shop takes orders.</li>
      </ul>
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
