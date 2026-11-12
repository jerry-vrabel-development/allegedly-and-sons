import { describe, expect, it } from "vitest";
import { SOUND_SCRIPT_PATH, STYLESHEET_PATH } from "../src/core/paths";
import { html } from "../src/worker/html";
import { isBureauPath, pageRule } from "../src/worker/page-rules";
import { layout, Page } from "../src/worker/pages";

describe("pageRule", () => {
  it("gives the embedded checkout page Stripe's policy and nothing of ours beside it", () => {
    expect(pageRule("/checkout/alien-paperclip")).toMatchObject({
      policy: "checkout",
      banner: false,
      sound: false,
    });
  });

  it("lets item pages and the Vault talk to our own origin, with banner and sound", () => {
    for (const path of ["/items/alien-paperclip", "/vault"]) {
      expect(pageRule(path), path).toMatchObject({
        policy: "ownOrigin",
        banner: true,
        sound: true,
      });
    }
  });

  it("keeps the banner off the Broadcast itself, which still has sound", () => {
    expect(pageRule("/broadcast")).toMatchObject({
      policy: "ownOrigin",
      banner: false,
      sound: true,
    });
  });

  it("gives assets, the private ledger, the health check and a missing path no script or chrome", () => {
    for (const path of ["/assets/site.css", "/assets/sound.js", "/bureau/ledger", "/healthz", ""]) {
      expect(pageRule(path), path).toMatchObject({ policy: "strict", banner: false, sound: false });
    }
  });

  it("keeps the banner off pages about one visitor's payment or email link", () => {
    for (const path of ["/thanks", "/streak/restored", "/dispatch/sent", "/dispatch/confirm"]) {
      expect(pageRule(path), path).toMatchObject({ policy: "shop", banner: false, sound: true });
    }
  });

  it("gives every other shop page our own scripts, the banner and sound", () => {
    for (const path of ["/", "/disclaimer", "/dossier", "/dispatch", "/checkout/a/session"]) {
      expect(pageRule(path), path).toMatchObject({ policy: "shop", banner: true, sound: true });
    }
  });
});

describe("isBureauPath", () => {
  it("is true for /bureau and anything under it, and nothing that only starts the same", () => {
    expect(isBureauPath("/bureau")).toBe(true);
    expect(isBureauPath("/bureau/ledger")).toBe(true);
    expect(isBureauPath("/bureaucracy")).toBe(false);
    expect(isBureauPath("/")).toBe(false);
  });
});

describe("the layout's chrome", () => {
  const page = layout({ title: "T", description: "D", body: html`<p>hi</p>`, scripts: ["/x.js"] });
  const TAG = `<script src="${SOUND_SCRIPT_PATH}" defer></script>`;
  const banner = html`<p class="on-air-banner">On air</p>`;

  it("is absent from a page as its function returns it", () => {
    expect(page).toBeInstanceOf(Page);
    expect(page.value).not.toContain(TAG);
    expect(page.value).not.toContain("on-air-banner");
    expect(page.withChrome({ banner: undefined, sound: false }).value).toBe(page.value);
  });

  it("puts the sound script right after the stylesheet, so it runs before page scripts", () => {
    const { value } = page.withChrome({ banner: undefined, sound: true });
    expect(value.indexOf(TAG)).toBeGreaterThan(value.indexOf(STYLESHEET_PATH));
    expect(value.indexOf(TAG)).toBeLessThan(value.indexOf("/x.js"));
    expect(value).not.toContain("on-air-banner");
  });

  it("puts the banner just inside <body>, right after the skip link", () => {
    const { value } = page.withChrome({ banner, sound: false });
    expect(value).toContain(
      '<a class="skip-link" href="#main">Skip to content</a><p class="on-air-banner">On air</p>',
    );
    expect(value).not.toContain(TAG);
    // Everything else is the same page.
    expect(value.replace(banner.value, "")).toBe(page.value);
  });
});

describe("the layout's link-preview tags", () => {
  const preview = { origin: "https://allegedly.example", pathname: "/broadcast" };
  const open = layout({ title: "T", description: 'It\'s "D" & more', body: html`<p>hi</p>` });
  const shut = layout({ title: "T", description: "D", body: html`<p>hi</p>`, noindex: true });
  const item = layout({
    title: "T",
    description: "D",
    body: html`<p>hi</p>`,
    canonical: "https://allegedly.example/items/x",
  });
  const none = { banner: undefined, sound: false };

  it("are absent from a page as its function returns it, and without a preview", () => {
    expect(open.value).not.toContain("og:");
    expect(open.withChrome(none).value).not.toContain("og:");
    expect(open.withChrome(none).value).not.toContain("twitter:");
  });

  it("carry the page's own title and description, over the shop's one card", () => {
    const { value } = open.withChrome({ ...none, preview });
    expect(value).toContain('<meta property="og:title" content="T · Allegedly &amp; Sons" />');
    expect(value).toContain('<meta property="og:site_name" content="Allegedly &amp; Sons" />');
    expect(value).toContain('<meta property="og:type" content="website" />');
    expect(value).toContain(
      '<meta property="og:image" content="https://allegedly.example/assets/share-card.jpg" />',
    );
    expect(value).toContain('<meta property="og:image:width" content="1200" />');
    expect(value).toContain('<meta property="og:image:height" content="630" />');
    expect(value).toContain('<meta property="og:image:alt" content="Allegedly &amp; Sons,');
    expect(value).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it("escape the description, so a quote or an ampersand can't break out of the tag", () => {
    const { value } = open.withChrome({ ...none, preview });
    expect(value).toContain('content="It&#39;s &quot;D&quot; &amp; more"');
    expect(value).not.toContain('content="It\'s "D"');
  });

  it("point og:url at the page's address, or at its canonical one when it has one", () => {
    expect(open.withChrome({ ...none, preview }).value).toContain(
      '<meta property="og:url" content="https://allegedly.example/broadcast" />',
    );
    expect(item.withChrome({ ...none, preview }).value).toContain(
      '<meta property="og:url" content="https://allegedly.example/items/x" />',
    );
  });

  it("are never put on a page kept out of search results", () => {
    expect(shut.withChrome({ ...none, preview }).value).not.toContain("og:");
  });
});
