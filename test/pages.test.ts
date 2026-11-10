import { describe, expect, it } from "vitest";
import { AVAILABLE_ITEMS, CATALOG, formatPrice, isAvailable, type Item } from "../src/core/catalog";
import {
  checkoutClosedPage,
  checkoutPage,
  checkoutUnavailablePage,
  disclaimerPage,
  CROSS_SELL_COUNT,
  crossSells,
  homePage,
  MAX_SHIP_DAYS,
  MERCHANDISE_TERMS,
  ORDER_CONTACT_EMAIL,
  METHODS_TERMS,
  REFUND_WINDOW_HOURS,
  saleTerms,
  TERMS_LAST_AMENDED,
  itemPage,
  itemPath,
  layout,
  notFoundPage,
  SITE_NAME,
  TERMS_PATH,
  thanksPage,
} from "../src/worker/pages";
import { escapeHtml, html, type SafeHtml } from "../src/worker/html";
import { STORY_END_ID, STORY_SCRIPT_PATH } from "../src/worker/story-script";

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

      it("links to the fine print from the footer, not the header", () => {
        const footer = page.slice(page.indexOf('<footer class="site">'));
        expect(footer).toContain('href="/disclaimer"');
        const header = page.slice(page.indexOf('<header class="site">'), page.indexOf("</header>"));
        expect(header).not.toContain("/disclaimer");
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

  it("is the only page besides item pages with any script", () => {
    for (const [name, page] of Object.entries(pages)) {
      if (name === "item") continue;
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
  it("lists every item with a link, and a price for each one on sale", () => {
    for (const item of CATALOG) {
      expect(pages.home).toContain(`href="${itemPath(item)}"`);
      if (isAvailable(item)) expect(pages.home).toContain(formatPrice(item.priceCents));
    }
  });

  it("labels acquisition-pending exhibits in words instead of a price", () => {
    const pending = CATALOG.filter((item) => !isAvailable(item));
    expect(pending.length).toBeGreaterThan(0);
    for (const item of pending) {
      const card = pages.home.slice(pages.home.indexOf(`href="${itemPath(item)}"`));
      expect(card.slice(0, card.indexOf("</li>"))).toContain(
        '<p class="pending">Acquisition pending</p>',
      );
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
      // Lore is escaped on the page (an apostrophe becomes &#39;), so compare escaped text.
      expect(page).toContain(escapeHtml(item.hook));
      expect(page).toContain(escapeHtml(item.estimatedValue));
      expect(page).toContain(`alt="${escapeHtml(item.artAlt)}"`);
      expect(page).toContain(`src="/assets/art/${item.slug}.svg"`);
      expect(page).toContain(`<link rel="canonical" href="${ORIGIN}/items/${item.slug}" />`);
      expect(page).toContain(
        `<a href="/share/${item.slug}/bluesky" rel="nofollow" data-sound="whoosh">Share on Bluesky</a>`,
      );
      expect(page).toContain(item.story.author.title);
      expect(count(page, /<p>/g)).toBeGreaterThanOrEqual(item.story.paragraphs.length);
      for (const spec of item.specs)
        expect(page).toContain(
          `<dt>${escapeHtml(spec.label)}</dt> <dd>${escapeHtml(spec.value)}</dd>`,
        );
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
    const item = firstItem();
    const details = page.indexOf(`<details data-story="${item.slug}" data-card="${item.exhibit}">`);
    expect(details).toBeGreaterThan(0);
    expect(page.indexOf(first)).toBeLessThan(details);
    expect(page.indexOf(second ?? "")).toBeGreaterThan(details);
  });

  it("marks the story's last paragraph for the read tracker, and loads only our script", () => {
    const item = firstItem();
    const page = squish(itemPage(item, ORIGIN));
    const last = item.story.paragraphs[item.story.paragraphs.length - 1] ?? "";
    expect(page).toContain(`<p id="${STORY_END_ID}">${escapeHtml(last)}</p>`);
    expect(count(page, /<script /g)).toBe(1);
    expect(page).toContain(`<script src="${STORY_SCRIPT_PATH}" defer></script>`);
  });

  it('skips "keep reading" when the story is a single paragraph', () => {
    const base = firstItem();
    const short: Item = { ...base, story: { ...base.story, paragraphs: ["Just one."] } };
    const page = squish(itemPage(short, ORIGIN));
    // Nothing to open, so no read tracker either.
    expect(page).not.toContain("<script");
    expect(page).toContain("<p>Just one.</p>");
    expect(page).not.toContain("<details>");
  });

  it("cross-sells three others, its own wing first, never itself", () => {
    for (const item of CATALOG) {
      const picks = crossSells(item);
      expect(picks).toHaveLength(CROSS_SELL_COUNT);
      expect(picks.map((pick) => pick.slug)).not.toContain(item.slug);
      const wingmates = CATALOG.filter((o) => o.wing === item.wing && o.slug !== item.slug);
      expect(picks.slice(0, wingmates.length)).toEqual(wingmates.slice(0, CROSS_SELL_COUNT));
      // Outside its wing, exhibits for sale come before pending ones.
      const outside = picks.slice(wingmates.length).map(isAvailable);
      expect(outside).toEqual([...outside].sort((a, b) => Number(b) - Number(a)));
    }
  });

  it("shows the cross-sells on the page", () => {
    const item = firstItem();
    const page = squish(itemPage(item, ORIGIN));
    const more = page.slice(page.indexOf("Other recent acquisitions"));
    for (const other of CATALOG) {
      const picked = crossSells(item).includes(other);
      expect(more.includes(`href="/items/${other.slug}"`)).toBe(picked);
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
    expect(pages.disclaimer).toContain("The stories are fiction");
  });

  it("gives every clause, in every section, a binding plain line", () => {
    const all = [...MERCHANDISE_TERMS, ...saleTerms(), ...METHODS_TERMS];
    // One per clause, plus the closing "the Plainly lines are the deal".
    expect(count(pages.disclaimer, /<strong>Plainly:<\/strong>/g)).toBe(all.length + 1);
    for (const term of all) {
      expect(pages.disclaimer).toContain(`<h3>${escapeHtml(term.heading)}</h3>`);
      expect(term.flavor.trim()).not.toBe("");
      expect(term.plainly.value.trim()).not.toBe("");
    }
  });

  it("says the plain lines are the binding terms, not the flavor", () => {
    expect(pages.disclaimer).toContain(
      "the flavor text is atmosphere. The Plainly lines are the deal.",
    );
  });

  it("dates the terms, so an order can be held to the ones it was placed under", () => {
    expect(TERMS_LAST_AMENDED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Prettier may wrap the tags, so allow whitespace before each ">".
    expect(pages.disclaimer).toMatch(
      new RegExp(`<time datetime="${TERMS_LAST_AMENDED}"\\s*>November 10, 2026</time\\s*>`),
    );
    expect(pages.disclaimer).toContain(
      "Your order is governed by the terms posted when you placed it.",
    );
  });

  it("keeps the comedy obviously comedy: no real contraband words", () => {
    expect(pages.disclaimer).not.toMatch(/\b(drugs?|weapons?|guns?|stolen|narcotics?)\b/i);
  });
});

describe("terms of sale", () => {
  it("keeps the buyer's refunds: change of mind, damaged or lost, and late shipping", () => {
    expect(REFUND_WINDOW_HOURS).toBe(24);
    expect(MAX_SHIP_DAYS).toBe(30);
    expect(pages.disclaimer).toContain("Full refund if you ask within 24 hours of purchase.");
    expect(pages.disclaimer).toContain("Arrives damaged, or never arrives? Full refund.");
    expect(pages.disclaimer).toContain("Orders ship within 30 days of purchase.");
    expect(pages.disclaimer).toContain("you can cancel for a full refund.");
    expect(pages.disclaimer).toContain("Shipping is included in the price. US addresses only.");
  });

  it("states the seller's terms plainly", () => {
    for (const plain of [
      "sold as-is, with no warranties beyond the ones the law requires",
      "our liability for any order is limited to what you paid for it",
      "We may refuse or cancel any order",
      "If we cancel, you get a full refund.",
      "Refunds go back to the card you paid with.",
      "Contact us first.",
      "governed by Illinois law",
      "the courts of Cook County, Illinois",
      "can't be refunded once delivered, unless they don't work",
      "The 24-hour change-of-mind refund doesn't cover them.",
    ]) {
      expect(pages.disclaimer).toContain(plain);
    }
  });

  it("gives the Bureau's real contact address for refunds and orders", () => {
    expect(ORDER_CONTACT_EMAIL).toBe("bureau@allegedlyandsons.com");
    expect(pages.disclaimer).toContain(
      '<a href="mailto:bureau@allegedlyandsons.com">bureau@allegedlyandsons.com</a> for refunds',
    );
    expect(pages.disclaimer).not.toContain("Contact details will be posted");
  });

  it("shows whatever contact address it's given, escaped", () => {
    const page = squish(disclaimerPage("orders@bureau.example"));
    expect(page).toContain('<a href="mailto:orders@bureau.example">orders@bureau.example</a>');
    expect(page).not.toContain("Contact details will be posted");
    const sneaky = squish(disclaimerPage('x"><script>@evil.example'));
    expect(sneaky).not.toContain("<script>");
  });
});

describe("the Bureau's methods", () => {
  it("says plainly what runs in the browser, for everyone and for the sound-and-motion half", () => {
    expect(pages.disclaimer).toContain("What Runs in Your Browser");
    expect(pages.disclaimer).toContain("Only our own scripts and Stripe’s ever run.");
    expect(pages.disclaimer).toContain(
      "notes when you open a case file and whether you read it to the end",
    );
    expect(pages.disclaimer).toContain(
      "The Vault and the Back-Room Broadcast run one that counts down their clocks.",
    );
    // Shop-wide sound (note 0011) and the reel (note 0008) are for half of visitors.
    expect(pages.disclaimer).toContain(
      "Half of visitors also get the shop with sound and motion, and half get it plain",
    );
    expect(pages.disclaimer).toContain(
      "every shop page except checkout runs a sound script of ours",
    );
    expect(pages.disclaimer).toContain(
      "your browser remembers that, and nothing about it is sent to us",
    );
    expect(pages.disclaimer).toContain("the Vault also runs one that animates the lever");
    expect(pages.disclaimer).not.toContain("Four kinds of page run a script");
    expect(pages.disclaimer).not.toContain("Only the checkout page runs any script");
    expect(pages.disclaimer).toContain("Stripe may collect information about your device");
    expect(pages.disclaimer).toContain('href="https://stripe.com/privacy"');
    expect(pages.disclaimer).not.toContain("uses no trackers");
  });

  it("says plainly what the shop keeps on file: two cookies, one passed to Stripe, no IPs, no third parties", () => {
    const text = pages.disclaimer;
    expect(text).toContain("What the Bureau Keeps on File");
    expect(text).toContain("We set two cookies of our own.");
    expect(text).toContain("lasts a year from your latest visit");
    expect(text).toContain("it’s deleted when you close your browser");
    expect(text).toContain(
      "If you earn badges or cards, or pull the vault lever, we keep them and your pulls with the first cookie’s number",
    );
    expect(text).not.toContain("one cookie");
    expect(text).toContain("we pass the first one’s number to Stripe with your order");
    expect(text).toContain("whether you read their case files, which share buttons you press");
    expect(text).toContain("Our records don’t include your IP address");
    expect(text).toContain("we don’t use third-party trackers or ad networks");
  });
});

describe("terms beside every place a buyer pays", () => {
  it("links the terms of sale from each item's buy box", () => {
    for (const item of AVAILABLE_ITEMS) {
      expect(squish(itemPage(item, ORIGIN))).toContain(
        `<a href="${TERMS_PATH}">Terms of sale</a>.`,
      );
    }
  });

  it("tells buyers on the checkout page that paying means agreeing to the terms", () => {
    expect(pages.checkout).toContain(
      `By paying, you agree to the <a href="${TERMS_PATH}">terms of sale</a>.`,
    );
  });

  it("points at the terms section of The Fine Print", () => {
    expect(TERMS_PATH).toBe("/disclaimer#terms-heading");
    expect(pages.disclaimer).toContain('id="terms-heading"');
  });
});

describe("acquisition pending (note 0010)", () => {
  for (const item of CATALOG.filter((candidate) => !isAvailable(candidate))) {
    it(`${item.slug} has its case file and an expected price, but nothing to buy`, () => {
      const page = squish(itemPage(item, ORIGIN));
      expect(page).toContain("<dt>Expected price</dt>");
      expect(page).toContain(formatPrice(item.priceCents));
      expect(page).toContain("<strong>Acquisition pending.</strong>");
      expect(page).toContain(escapeHtml(item.story.headline));
      expect(page).not.toContain("Acquire this exhibit");
      expect(page).not.toContain(`/checkout/${item.slug}`);
      expect(page).not.toContain("Secure checkout by Stripe");
    });
  }
});

describe("buying", () => {
  for (const item of AVAILABLE_ITEMS) {
    it(`${item.slug} links to its own checkout page`, () => {
      // A plain link: it only navigates, and the checkout page creates nothing at Stripe
      // until the buyer is there, so a crawler following it is harmless (nofollow anyway).
      const page = squish(itemPage(item, ORIGIN));
      expect(page).toContain(
        `<p class="acquire"> <a class="button" href="/checkout/${item.slug}" rel="nofollow" data-sound="kachunk" >Acquire this exhibit</a > </p>`,
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
