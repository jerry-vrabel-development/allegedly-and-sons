import { CATALOG, formatPrice, type Item } from "../core/catalog";
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

export function homePage(): SafeHtml {
  return layout({
    title: SITE_NAME,
    description:
      "Rare objects with extraordinary, completely unverifiable histories, recovered by The Bureau of Improbable Acquisitions.",
    body: html` <p class="kicker">Purveyors of Rare Objects</p>
      <h1>${SITE_NAME}</h1>
      <p class="tagline">
        Est. “a long time ago.” Recovered from crash sites, lost civilizations and the backs of very
        old drawers.
      </p>
      <h2>The Collection</h2>
      <ul class="items">
        ${CATALOG.map(
          (item) =>
            html`<li class="card">
              <p class="kicker">Exhibit ${item.exhibit}</p>
              <h3><a href="${itemPath(item)}">${item.name}</a></h3>
              <p>${item.tagline}</p>
              <p class="price">${formatPrice(item.priceCents)}</p>
            </li>`,
        )}
      </ul>`,
  });
}

export function itemPage(item: Item): SafeHtml {
  const { story } = item;
  return layout({
    title: item.name,
    description: `${item.name}: ${item.tagline}`,
    body: html` <article>
      <p class="kicker">Exhibit ${item.exhibit}</p>
      <h1>${item.name}</h1>
      <p class="tagline">${item.tagline}</p>
      <p class="price">${formatPrice(item.priceCents)}</p>
      <p class="status">Acquisitions open soon.</p>

      <section aria-labelledby="story-heading">
        <h2 id="story-heading">The Story</h2>
        <h3>${story.headline}</h3>
        ${story.paragraphs.map((paragraph) => html`<p>${paragraph}</p>`)}
        <p class="byline">Recorded by ${story.author.name}, ${story.author.title}</p>
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

      <p><a href="/">Back to the collection</a></p>
    </article>`,
  });
}

export function disclaimerPage(): SafeHtml {
  return layout({
    title: "The Fine Print",
    description: "What you actually receive from Allegedly & Sons, said plainly.",
    body: html` <h1>The Fine Print</h1>
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
          Bureau Certificates are part of the joke. They are not appraisals or proof of
          authenticity, history or value.
        </li>
        <li>Nothing here is an investment. Your paperclip will not go up in value.</li>
        <li>Refund and shipping details will be posted here before the shop takes orders.</li>
      </ul>
      <p><a href="/">Back to the collection</a></p>`,
  });
}

export function notFoundPage(): SafeHtml {
  return layout({
    title: "Not found",
    description: "The Bureau is still looking.",
    body: html` <h1>Not found</h1>
      <p>Not found. The Bureau is still looking.</p>
      <p><a href="/">Back to the collection</a></p>`,
  });
}
