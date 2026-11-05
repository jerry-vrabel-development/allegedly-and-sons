import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { shareLinks } from "../src/core/share";

const INPUT = {
  url: "https://allegedly.example/items/alien-paperclip",
  text: "The Alien Paperclip",
};

describe("shareLinks", () => {
  it("offers five networks with clear labels", () => {
    expect(shareLinks(INPUT).map((link) => link.label)).toEqual([
      "Share on Bluesky",
      "Share on X",
      "Share on Facebook",
      "Share on Reddit",
      "Share by email",
    ]);
  });

  it("uses https share pages, plus a mailto link", () => {
    for (const { href } of shareLinks(INPUT)) expect(href).toMatch(/^(https:\/\/|mailto:\?)/);
  });

  it("includes the encoded page URL in every link", () => {
    const encoded = encodeURIComponent(INPUT.url);
    for (const { href } of shareLinks(INPUT)) expect(href).toContain(encoded);
  });

  it("never lets text break out of its query parameter", () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        for (const { href } of shareLinks({ url: INPUT.url, text })) {
          const query = href.slice(href.indexOf("?") + 1);
          expect(query).not.toMatch(/[\s"<>#]/);
          expect(query.split("&").every((pair) => /^[a-z]+=/.test(pair))).toBe(true);
        }
      }),
    );
  });
});
