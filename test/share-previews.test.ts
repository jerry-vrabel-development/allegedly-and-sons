import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import worker from "../src/worker/index";
import { testEnv } from "./test-env";

const ORIGIN = "https://allegedly.example";

async function visit(path: string): Promise<Response> {
  const ctx = createExecutionContext();
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`), testEnv(), ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

describe("link previews", () => {
  it.each(["/", "/broadcast", "/disclaimer", `/items/${CATALOG[0].slug}`])(
    "are on %s, with full addresses on this origin",
    async (path) => {
      const body = await (await visit(path)).text();
      expect(body).toContain(
        `<meta property="og:image" content="${ORIGIN}/assets/share-card.jpg" />`,
      );
      expect(body).toMatch(/<meta property="og:title" content="[^"]+" \/>/);
      expect(body).toMatch(/<meta property="og:description" content="[^"]+" \/>/);
      expect(body).toContain('<meta name="twitter:card" content="summary_large_image" />');
    },
  );

  it("use an exhibit's own name and hook, and its canonical address", async () => {
    const item = CATALOG[0];
    const body = await (await visit(`/items/${item.slug}?r=shared`)).text();
    expect(body).toContain(`<meta property="og:url" content="${ORIGIN}/items/${item.slug}" />`);
    expect(body).toContain(`${item.name} · Allegedly &amp; Sons`);
  });

  it("leave off the home page's query string, so ?fx= never reaches a preview", async () => {
    const body = await (await visit("/?fx=on")).text();
    expect(body).toContain(`<meta property="og:url" content="${ORIGIN}/" />`);
  });

  it.each(["/vault", "/dossier", "/thanks"])(
    "are not on %s, which stays out of search",
    async (path) => {
      const body = await (await visit(path)).text();
      expect(body).not.toContain("og:");
    },
  );
});

describe("the preview card", () => {
  /** Width and height from a JPEG's first start-of-frame marker. */
  function dimensions(bytes: Uint8Array): { width: number; height: number } {
    let at = 2;
    while (at < bytes.length) {
      const marker = bytes[at + 1];
      const length = ((bytes[at + 2] ?? 0) << 8) | (bytes[at + 3] ?? 0);
      if (marker !== undefined && marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: ((bytes[at + 5] ?? 0) << 8) | (bytes[at + 6] ?? 0),
          width: ((bytes[at + 7] ?? 0) << 8) | (bytes[at + 8] ?? 0),
        };
      }
      at += 2 + length;
    }
    throw new Error("no start-of-frame marker");
  }

  it("is a 1200 by 630 JPEG, cacheable, and small enough for every platform", async () => {
    const response = await visit("/assets/share-card.jpg");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(response.headers.get("Set-Cookie")).toBeNull();
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xff, 0xd8, 0xff]);
    expect(dimensions(bytes)).toEqual({ width: 1200, height: 630 });
    // Facebook asks for under 8 MB and X for under 5 MB; stay far below both.
    expect(bytes.length).toBeLessThan(300_000);
  });
});
