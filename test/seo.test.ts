import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import { checkoutPath, checkoutSessionPath } from "../src/core/checkout";
import {
  CHECKOUT_PREFIX,
  REPAIR_PATH,
  REPAIR_RETURN_PATH,
  SHARE_PREFIX,
  STREAK_PREFIX,
} from "../src/core/paths";
import { sharePath } from "../src/core/share";
import worker from "../src/worker/index";
import { DISALLOWED, robotsTxt, sitemapPaths, sitemapXml } from "../src/worker/seo";
import { testEnv } from "./test-env";

const ORIGIN = "https://allegedly.example";

describe("robots.txt", () => {
  const text = robotsTxt(ORIGIN);

  it("opens the shop to every crawler and closes the private paths", () => {
    expect(text).toContain("User-agent: *");
    for (const path of ["/bureau", "/dossier", "/vault", "/thanks", "/checkout/", "/share/"]) {
      expect(text).toContain(`Disallow: ${path}\n`);
    }
  });

  it("never closes the pages the sitemap lists", () => {
    for (const listed of sitemapPaths()) {
      const closed = DISALLOWED.some((path) => listed === path || listed.startsWith(path));
      expect(closed, listed).toBe(false);
    }
  });

  it("points at the sitemap on the same origin", () => {
    expect(text).toContain(`Sitemap: ${ORIGIN}/sitemap.xml\n`);
  });

  it("keeps the slug prefixes in step with the real paths", () => {
    const item = CATALOG[0];
    expect(checkoutPath(item).startsWith(CHECKOUT_PREFIX)).toBe(true);
    expect(checkoutSessionPath(item).startsWith(CHECKOUT_PREFIX)).toBe(true);
    expect(sharePath(item.slug, "email").startsWith(SHARE_PREFIX)).toBe(true);
    expect(REPAIR_PATH.startsWith(STREAK_PREFIX)).toBe(true);
    expect(REPAIR_RETURN_PATH.startsWith(STREAK_PREFIX)).toBe(true);
  });
});

describe("sitemap.xml", () => {
  const xml = sitemapXml(ORIGIN);

  it("lists the front door, the Broadcast, the Fine Print and every exhibit once", () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(locs).toHaveLength(3 + CATALOG.length);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs).toContain(`${ORIGIN}/`);
    expect(locs).toContain(`${ORIGIN}/broadcast`);
    expect(locs).toContain(`${ORIGIN}/disclaimer`);
    for (const item of CATALOG) {
      expect(locs).toContain(`${ORIGIN}/items/${item.slug}`);
    }
  });

  it("is well-formed sitemap XML", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith("</urlset>")).toBe(true);
  });

  it("escapes an origin with markup characters in it", () => {
    expect(sitemapXml("https://a.example/?x=1&y=<2>")).not.toMatch(/<2>|&y=/);
  });
});

describe("the Worker serves them", () => {
  async function visit(path: string, method = "GET"): Promise<Response> {
    const ctx = createExecutionContext();
    const response = await worker.fetch(
      new Request(`${ORIGIN}${path}`, { method }),
      testEnv(),
      ctx,
    );
    await waitOnExecutionContext(ctx);
    return response;
  }

  it("serves robots.txt as plain text, cacheable, with no cookie and strict headers", async () => {
    const response = await visit("/robots.txt");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=3600");
    expect(response.headers.get("Content-Security-Policy")).not.toContain("script-src 'self'");
    expect(await response.text()).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });

  it("serves sitemap.xml as XML for this origin", async () => {
    const response = await visit("/sitemap.xml");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(await response.text()).toContain(`<loc>${ORIGIN}/items/${CATALOG[0].slug}</loc>`);
  });

  it("answers HEAD too", async () => {
    expect((await visit("/robots.txt", "HEAD")).status).toBe(200);
  });
});
