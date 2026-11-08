import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  isNetwork,
  NETWORKS,
  parseSharePath,
  REF,
  refFrom,
  SHARE_PATH,
  sharedItemUrl,
  shareLinks,
  sharePath,
  shareTarget,
} from "../src/core/share";

const INPUT = {
  url: "https://allegedly.example/items/alien-paperclip?r=0a1b2c3d4e",
  text: "The Alien Paperclip",
};

describe("shareLinks", () => {
  it("offers five networks with clear labels, each through our own /share route", () => {
    expect(shareLinks("alien-paperclip")).toEqual([
      { label: "Share on Bluesky", href: "/share/alien-paperclip/bluesky" },
      { label: "Share on X", href: "/share/alien-paperclip/x" },
      { label: "Share on Facebook", href: "/share/alien-paperclip/facebook" },
      { label: "Share on Reddit", href: "/share/alien-paperclip/reddit" },
      { label: "Share by email", href: "/share/alien-paperclip/email" },
    ]);
  });
});

describe("SHARE_PATH", () => {
  it("matches every share link and captures the item and network", () => {
    for (const network of NETWORKS) {
      const match = SHARE_PATH.exec(sharePath("alien-paperclip", network));
      expect(match?.slice(1)).toEqual(["alien-paperclip", network]);
    }
  });

  it.each(["/share/alien-paperclip", "/share/alien-paperclip/x/extra", "/share//x", "/items/x"])(
    "doesn't match %s",
    (path) => {
      expect(SHARE_PATH.test(path)).toBe(false);
    },
  );
});

describe("parseSharePath", () => {
  it("reads the item and network from a share path", () => {
    expect(parseSharePath("/share/alien-paperclip/x")).toEqual({
      slug: "alien-paperclip",
      network: "x",
    });
  });

  it("gives undefined for anything else", () => {
    expect(parseSharePath("/items/alien-paperclip")).toBeUndefined();
  });
});

describe("isNetwork", () => {
  it("knows exactly the five networks", () => {
    for (const network of NETWORKS) expect(isNetwork(network)).toBe(true);
    for (const other of ["myspace", "X", "", null, 1]) expect(isNetwork(other)).toBe(false);
  });
});

describe("shareTarget", () => {
  it("uses https share pages, plus a mailto link for email", () => {
    for (const network of NETWORKS) {
      const href = shareTarget(network, INPUT);
      expect(href).toMatch(network === "email" ? /^mailto:\?/ : /^https:\/\//);
    }
  });

  it("includes the encoded shared URL, ref and all, for every network", () => {
    const encoded = encodeURIComponent(INPUT.url);
    for (const network of NETWORKS) expect(shareTarget(network, INPUT)).toContain(encoded);
  });

  it("never lets text break out of its query parameter", () => {
    fc.assert(
      fc.property(fc.string(), fc.constantFrom(...NETWORKS), (text, network) => {
        const href = shareTarget(network, { url: INPUT.url, text });
        const query = href.slice(href.indexOf("?") + 1);
        expect(query).not.toMatch(/[\s"<>#]/);
        expect(query.split("&").every((pair) => /^[a-z]+=/.test(pair))).toBe(true);
      }),
    );
  });
});

describe("ref codes", () => {
  it("turn 5 random bytes into 10 lowercase hex characters", () => {
    expect(refFrom(new Uint8Array([0, 1, 0xab, 0xcd, 0xff]))).toBe("0001abcdff");
  });

  it("always match REF", () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 5, maxLength: 5 }), (bytes) => {
        expect(refFrom(bytes)).toMatch(REF);
      }),
    );
  });

  it("refuse the wrong amount of randomness", () => {
    expect(() => refFrom(new Uint8Array(4))).toThrow(RangeError);
  });

  it("ride on the shared link as ?r=", () => {
    expect(sharedItemUrl("https://allegedly.example", "alien-paperclip", "0a1b2c3d4e")).toBe(
      "https://allegedly.example/items/alien-paperclip?r=0a1b2c3d4e",
    );
  });
});
