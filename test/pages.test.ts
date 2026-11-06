import { describe, expect, it } from "vitest";
import { CATALOG, formatPrice, type Item } from "../src/core/catalog";
import {
  checkoutClosedPage,
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
        expect(page).not.toMatch(/<script|<style|style="/);
      });
    });
  }
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
  it("gives every themed term a plain-language line", () => {
    const terms = saleTerms();
    expect(terms.length).toBeGreaterThanOrEqual(5);
    expect(count(pages.disclaimer, /<strong>Plainly:<\/strong>/g)).toBe(terms.length);
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
    it(`${item.slug} has a labeled button that posts to its own checkout`, () => {
      const page = squish(itemPage(item, ORIGIN));
      expect(page).toContain(
        `<form class="acquire" method="post" action="/checkout/${item.slug}"> <button class="button" type="submit">Acquire this exhibit</button> </form>`,
      );
      expect(page).not.toContain("Acquisitions open soon");
    });
  }

  it("never puts a price in the form, so the browser can't choose what to pay", () => {
    const form = pages.item.slice(pages.item.indexOf("<form"), pages.item.indexOf("</form>"));
    expect(form).not.toContain("<input");
  });

  it("thanks the buyer and says what happens next", () => {
    expect(pages.thanks).toContain("Acquisition recorded");
    expect(pages.thanks).toContain("Stripe will email your receipt");
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
