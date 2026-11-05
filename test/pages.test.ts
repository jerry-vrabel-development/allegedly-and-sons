import { describe, expect, it } from "vitest";
import { CATALOG, formatPrice, type Item } from "../src/core/catalog";
import {
  disclaimerPage,
  homePage,
  itemPage,
  itemPath,
  layout,
  notFoundPage,
  SITE_NAME,
} from "../src/worker/pages";
import { html, type SafeHtml } from "../src/worker/html";

/** Collapses whitespace, since Prettier is free to reflow the HTML templates. */
function squish(page: SafeHtml): string {
  return page.value.replace(/\s+/g, " ");
}

function firstItem(): Item {
  const [item] = CATALOG;
  if (!item) throw new Error("The catalog is empty.");
  return item;
}

const pages = {
  home: squish(homePage()),
  item: squish(itemPage(firstItem())),
  disclaimer: squish(disclaimerPage()),
  notFound: squish(notFoundPage()),
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
      const page = squish(itemPage(item));
      expect(page).toContain(formatPrice(item.priceCents));
      expect(page).toContain(`Exhibit ${item.exhibit}`);
      expect(page).toContain(`Bureau Certificate No. ${item.exhibit}`);
      expect(page).toContain("Authenticity:</strong> Allegedly.");
      expect(page).toContain(item.story.author.title);
      expect(count(page, /<p>/g)).toBeGreaterThanOrEqual(item.story.paragraphs.length);
      expect(count(page, /<dt>/g)).toBe(item.specs.length);
    });
  }

  it("escapes lore, so a writer's stray markup renders as text", () => {
    const base = firstItem();
    const sneaky: Item = {
      ...base,
      name: "Clip <b>",
      story: { ...base.story, paragraphs: ["<img src=x onerror=alert(1)>"] },
    };
    const page = squish(itemPage(sneaky));
    expect(page).toContain("Clip &lt;b&gt;");
    expect(page).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(page).not.toContain("<img");
  });
});

describe("disclaimer page", () => {
  it("says plainly what ships and what the certificate is", () => {
    expect(pages.disclaimer).toContain("That is what ships.");
    expect(pages.disclaimer).toContain("not appraisals or proof of authenticity");
    expect(pages.disclaimer).toContain("Nothing here is an investment.");
  });
});
