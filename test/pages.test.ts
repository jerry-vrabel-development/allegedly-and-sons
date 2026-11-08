import { describe, expect, it } from "vitest";
import { CATALOG, formatPrice, type Item } from "../src/core/catalog";
import {
  checkoutClosedPage,
  checkoutPage,
  checkoutUnavailablePage,
  disclaimerPage,
  homePage,
  MAX_SHIP_DAYS,
  REFUND_WINDOW_HOURS,
  saleTerms,
  itemPage,
  itemPath,
  layout,
  notFoundPage,
  SITE_NAME,
  thanksPage,
} from "../src/worker/pages";
import { escapeHtml, html, type SafeHtml } from "../src/worker/html";

/** Collapses whitespace, since Prettier is free to reflow the HTML templates. */
function squish(page: SafeHtml): string {
  return page.value.replace(/\s+/g, " ");
}

function firstItem(): Item {
  return CATALOG[0];
}

const ORIGIN = "https://allegedly.example";

const pages = {
  home: squish(homePage()),
  item: squish(itemPage(firstItem(), ORIGIN)),
  disclaimer: squish(disclaimerPage()),
  notFound: squish(notFoundPage()),
  thanks: squish(thanksPage()),
  checkoutUnavailable: squish(checkoutUnavailablePage(firstItem())),
  checkoutClosed: squish(checkoutClosedPage(firstItem())),
  checkout: squish(checkoutPage(firstItem())),
};

function count(haystack: string, needle: RegExp): number {
  return haystack.match(needle)?.length ?? 0;
}

describe("every page", () => {
  for (const [name, page] of Object.entries(pages)) {
    describe(name, () => {
      it("is an English HTML document with a viewport", () => {
        expect(page.startsWith("<!doctype html>")).toBe(true);
        expect(page).toContain('<html lang="en">');
        expect(page).toContain('name="viewport"');
      });

      it("has exactly one h1", () => {
        expect(count(page, /<h1[\s>]/g)).toBe(1);
      });

      it("has landmarks and a working skip link", () => {
        expect(page).toContain('href="#main"');
        expect(page).toContain('<main id="main"');
        expect(page).toContain('<nav aria-label="Main">');
        expect(page).toContain('<footer class="site">');
      });

      it("links to the fine print from the footer", () => {
        const footer = page.slice(page.indexOf('<footer class="site">'));
        expect(footer).toContain('href="/disclaimer"');
      });

      it("uses no inline styles or scripts (the CSP would block them)", () => {
        expect(page).not.toMatch(/<style|style="/);
        // Any script must be an external file; an inline one would be blocked.
        expect(page).not.toMatch(/<script(?![^>]*\ssrc=)/);
      });
    });
  }
});

describe("checkout page", () => {
  const item = firstItem();
  const KEY = "pk_test_abc123";
  const embedded = squish(checkoutPage(item, KEY));

  it("loads Stripe.js (clover) and then our script, both deferred, only with a publishable key", () => {
    expect(embedded).toContain(
      '<script src="https://js.stripe.com/clover/stripe.js" defer></script><script src="/assets/checkout.js" defer></script>',
    );
    expect(count(embedded, /<script/g)).toBe(2);
    expect(pages.checkout).not.toContain("<script");
  });

  it("is the only page with any script", () => {
    for (const [name, page] of Object.entries(pages)) {
      expect(page.includes("<script"), name).toBe(false);
    }
  });

  it("hands the script its publishable key and session URL, escaped", () => {
    expect(embedded).toContain(`data-session-url="/checkout/${item.slug}/session"`);
    expect(embedded).toContain(`data-publishable-key="${KEY}"`);
    expect(squish(checkoutPage(item, 'pk_"x'))).toContain('data-publishable-key="pk_&quot;x"');
  });

  it("has a polite status line for the script to talk through", () => {
    expect(embedded).toContain(
      '<p id="checkout-status" class="checkout-status" role="status"></p>',
    );
  });

  it("keeps the hosted fallback with the embedded checkout", () => {
    expect(embedded).toContain("Continue on Stripe’s secure page");
  });

  it("is kept out of search results, like the return page; no other page is", () => {
    for (const [name, page] of Object.entries(pages)) {
      expect(page.includes('<meta name="robots" content="noindex" />'), name).toBe(
        name === "checkout" || name === "thanks",
      );
    }
  });

  it("names the item and price, and has a mount point that knows where to ask for a session", () => {
    expect(pages.checkout).toContain(`<h1>Acquire ${item.name}</h1>`);
    expect(pages.checkout).toContain(formatPrice(item.priceCents));
    expect(pages.checkout).toContain(
      `<div id="checkout" data-session-url="/checkout/${item.slug}/session"></div>`,
    );
  });

  it("always offers the hosted checkout as a fallback, posting to today's checkout route", () => {
    expect(pages.checkout).toMatch(
      new RegExp(
        `<form class="acquire" method="post" action="/checkout/${item.slug}">\\s*<button class="button" type="submit">Continue on Stripe’s secure page</button>`,
      ),
    );
  });

  it("says plainly where card details go, and links back to the item", () => {
    expect(pages.checkout).toContain("Card details go straight to Stripe");
    expect(pages.checkout).toContain(`href="${itemPath(item)}"`);
  });
});

describe("layout", () => {
  it("escapes the title and description", () => {
    const page = squish(layout({ title: "<x>", description: '"y"', body: html`` }));
    expect(page).toContain(`<title>&lt;x&gt; · ${SITE_NAME.replace("&", "&amp;")}</title>`);
    expect(page).toContain('content="&quot;y&quot;"');
  });
});

describe("home page", () => {
  it("lists every item with a link and a price", () => {
    for (const item of CATALOG) {
      expect(pages.home).toContain(`href="${itemPath(item)}"`);
      expect(pages.home).toContain(formatPrice(item.priceCents));
    }
  });
});

describe("item page", () => {
  for (const item of CATALOG) {
    it(`shows ${item.slug}: name, price, story, byline, specs and certificate`, () => {
      const page = squish(itemPage(item, ORIGIN));
      expect(page).toContain(formatPrice(item.priceCents));
      expect(page).toContain(`Exhibit ${item.exhibit}`);
      expect(page).toContain(`Bureau Certificate No. ${item.exhibit}`);
      expect(page).toContain("Authenticity:</strong> Allegedly.");
      expect(page).toContain(item.hook);
      expect(page).toContain(item.estimatedValue);
      expect(page).toContain(`alt="${item.artAlt}"`);
      expect(page).toContain(`src="/assets/art/${item.slug}.svg"`);
      expect(page).toContain(encodeURIComponent(`${ORIGIN}/items/${item.slug}`));
      expect(page).toContain(item.story.author.title);
      expect(count(page, /<p>/g)).toBeGreaterThanOrEqual(item.story.paragraphs.length);
      for (const spec of item.specs)
        expect(page).toContain(`<dt>${spec.label}</dt> <dd>${spec.value}</dd>`);
    });
  }

  it("escapes lore, so a writer's stray markup renders as text", () => {
    const base = firstItem();
    const sneaky: Item = {
      ...base,
      name: "Clip <b>",
      story: { ...base.story, paragraphs: ["<img src=x onerror=alert(1)>"] },
    };
    const page = squish(itemPage(sneaky, ORIGIN));
    expect(page).toContain("Clip &lt;b&gt;");
    expect(page).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(page).not.toContain("<img src=x");
  });
});

describe("item page details", () => {
  it('hides all but the first paragraph behind "keep reading"', () => {
    const page = squish(itemPage(firstItem(), ORIGIN));
    const [first, second] = firstItem().story.paragraphs;
    expect(page.indexOf(first)).toBeLessThan(page.indexOf("<details>"));
    expect(page.indexOf(second ?? "")).toBeGreaterThan(page.indexOf("<details>"));
  });

  it('skips "keep reading" when the story is a single paragraph', () => {
    const base = firstItem();
    const short: Item = { ...base, story: { ...base.story, paragraphs: ["Just one."] } };
    const page = squish(itemPage(short, ORIGIN));
    expect(page).toContain("<p>Just one.</p>");
    expect(page).not.toContain("<details>");
  });

  it("cross-sells every other item, but not itself", () => {
    const item = firstItem();
    const page = squish(itemPage(item, ORIGIN));
    const more = page.slice(page.indexOf("Other recent acquisitions"));
    for (const other of CATALOG) {
      expect(more.includes(`href="/items/${other.slug}"`)).toBe(other.slug !== item.slug);
    }
  });
});

describe("home page hero", () => {
  it("features the first item with a call to action", () => {
    const item = firstItem();
    expect(pages.home).toContain("Now on display");
    expect(pages.home).toContain(item.hook);
    expect(pages.home).toContain(
      `<a class="button" href="/items/${item.slug}">View the exhibit</a>`,
    );
  });
});

describe("disclaimer page", () => {
  it("says plainly what ships and what the certificate is", () => {
    expect(pages.disclaimer).toContain("That is what ships.");
    expect(pages.disclaimer).toContain("not appraisals or proof of authenticity");
    expect(pages.disclaimer).toContain("Nothing here is an investment.");
    expect(pages.disclaimer).toContain("not a real price, a former price or an appraisal");
  });
});

describe("terms of sale", () => {
  it("says plainly what runs in the browser: only checkout, only Stripe and us", () => {
    expect(pages.disclaimer).toContain("What Runs in Your Browser");
    expect(pages.disclaimer).toContain("Only the checkout page runs any script");
    expect(pages.disclaimer).toContain("Stripe may collect information about your device");
    expect(pages.disclaimer).toContain('href="https://stripe.com/privacy"');
    expect(pages.disclaimer).not.toContain("uses no trackers");
  });

  it("says plainly what the shop keeps on file: one cookie, passed to Stripe, no IPs, no third parties", () => {
    const text = pages.disclaimer.replace(/\s+/g, " ");
    expect(text).toContain("What the Bureau Keeps on File");
    expect(text).toContain("we set one cookie of our own");
    expect(text).toContain("lasts a year from your latest visit");
    expect(text).toContain("we pass that number to Stripe with your order");
    expect(text).toContain("Our records don’t include your IP address");
    expect(text).toContain("we don’t use third-party trackers or ad networks");
  });

  it("gives every themed term a plain-language line", () => {
    const terms = saleTerms();
    expect(terms.length).toBeGreaterThanOrEqual(5);
    // One per term, plus one for "What the Bureau Keeps on File".
    expect(count(pages.disclaimer, /<strong>Plainly:<\/strong>/g)).toBe(terms.length + 1);
    for (const term of terms) {
      expect(pages.disclaimer).toContain(`<h3>${escapeHtml(term.heading)}</h3>`);
      expect(term.plainly.value.trim()).not.toBe("");
    }
  });

  it("states the refund window, damaged-item refunds, shipping and ship time plainly", () => {
    expect(REFUND_WINDOW_HOURS).toBe(24);
    expect(MAX_SHIP_DAYS).toBe(30);
    expect(pages.disclaimer).toContain(
      "You can cancel for a full refund within 24 hours of purchase.",
    );
    expect(pages.disclaimer).toContain("arrives damaged or never arrives, you get a full refund.");
    expect(pages.disclaimer).toContain("Shipping is included in the price.");
    expect(pages.disclaimer).toContain("Orders ship within 30 days of purchase.");
    expect(pages.disclaimer).toContain("you can cancel for a full refund.");
  });

  it("no longer promises details later, now that they're here", () => {
    expect(pages.disclaimer).not.toContain("Refund and shipping details will be posted");
  });

  it("says plainly that contact details are coming while none is set", () => {
    expect(pages.disclaimer).toContain(
      "Contact details will be posted here before the shop takes real orders.",
    );
    expect(pages.disclaimer).not.toContain("mailto:");
  });

  it("shows a mailto link once a contact email is set, escaped", () => {
    const page = squish(disclaimerPage("orders@bureau.example"));
    expect(page).toContain('<a href="mailto:orders@bureau.example">orders@bureau.example</a>');
    expect(page).not.toContain("Contact details will be posted");
    const sneaky = squish(disclaimerPage('x"><script>@evil.example'));
    expect(sneaky).not.toContain("<script>");
  });

  it("keeps the comedy obviously comedy: no real contraband words", () => {
    expect(pages.disclaimer).not.toMatch(/\b(drugs?|weapons?|guns?|stolen|narcotics?)\b/i);
  });
});

describe("buying", () => {
  for (const item of CATALOG) {
    it(`${item.slug} links to its own checkout page`, () => {
      // A plain link: it only navigates, and the checkout page creates nothing at Stripe
      // until the buyer is there, so a crawler following it is harmless (nofollow anyway).
      const page = squish(itemPage(item, ORIGIN));
      expect(page).toContain(
        `<p class="acquire"> <a class="button" href="/checkout/${item.slug}" rel="nofollow">Acquire this exhibit</a> </p>`,
      );
      expect(page).not.toContain("Acquisitions open soon");
    });
  }

  it("has no form or input on the item page, so the browser can't choose what to pay", () => {
    expect(pages.item).not.toMatch(/<form|<input/);
  });

  it("never puts a price in the checkout page's fallback form either", () => {
    const form = pages.checkout.slice(
      pages.checkout.indexOf("<form"),
      pages.checkout.indexOf("</form>"),
    );
    expect(form).toContain('method="post"');
    expect(form).not.toContain("<input");
  });

  it("says 'recorded' only for a paid session, naming the item and what happens next", () => {
    const item = firstItem();
    const paid = squish(thanksPage({ kind: "paid", item }));
    expect(paid).toContain("<h1>Acquisition recorded</h1>");
    expect(paid).toContain(`Payment confirmed for ${item.name}`);
    expect(paid).toContain("Stripe will email your receipt");
    for (const view of [
      { kind: "processing", item },
      { kind: "incomplete", item },
      { kind: "unchecked" },
    ] as const) {
      expect(squish(thanksPage(view)), view.kind).not.toContain("Acquisition recorded");
    }
  });

  it("says a delayed payment is still processing, without promising it cleared", () => {
    const page = squish(thanksPage({ kind: "processing", item: firstItem() }));
    expect(page).toContain("<h1>Payment processing</h1>");
    expect(page).toContain("Stripe is still confirming your payment");
  });

  it("says an unfinished checkout charged nothing, and offers the way back", () => {
    const item = firstItem();
    const page = squish(thanksPage({ kind: "incomplete", item }));
    expect(page).toContain("<h1>Acquisition not completed</h1>");
    expect(page).toContain("nothing was charged");
    expect(page).toContain(`href="/checkout/${item.slug}"`);
    expect(squish(thanksPage({ kind: "incomplete", item: undefined }))).not.toContain(
      'href="/checkout/',
    );
  });

  it("stays calm and claims nothing when it couldn't check", () => {
    expect(pages.thanks).toContain("<h1>Thank you</h1>");
    expect(pages.thanks).toContain("If you just paid, Stripe will email your receipt");
  });

  it("names the item only when it's known", () => {
    expect(squish(thanksPage({ kind: "paid", item: undefined }))).toContain(
      "Payment confirmed. Stripe",
    );
    expect(squish(thanksPage({ kind: "processing", item: undefined }))).toContain(
      "Stripe is still confirming your payment. Some",
    );
  });

  it("says acquisitions open soon while checkout is off, without asking anyone to retry", () => {
    const item = firstItem();
    expect(pages.checkoutClosed).toContain("<h1>Acquisitions open soon</h1>");
    expect(pages.checkoutClosed).toContain("Nothing was charged.");
    expect(pages.checkoutClosed).not.toMatch(/try again/i);
    expect(pages.checkoutClosed).toContain(`href="/items/${item.slug}"`);
  });

  it("explains a failed checkout plainly and links back to the item", () => {
    const item = firstItem();
    expect(pages.checkoutUnavailable).toContain("Nothing was charged.");
    expect(pages.checkoutUnavailable).toContain(`href="/items/${item.slug}"`);
  });
});
