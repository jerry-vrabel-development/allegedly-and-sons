import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  LANDING_COOKIE,
  landingCookie,
  landingFromCookie,
  landingFromRequest,
  type Landing,
} from "../src/core/landing";

const OWN = "allegedly.example";
const url = (query = "") => new URL(`https://${OWN}/items/alien-paperclip${query}`);

describe("landingFromRequest", () => {
  it("takes the outside site that sent the visit", () => {
    expect(landingFromRequest(url(), "https://old.reddit.com/r/x/comments/1", OWN)).toEqual({
      referrerHost: "old.reddit.com",
      utmSource: null,
      utmCampaign: null,
    });
  });

  it("takes campaign tags, normalized, with or without a referrer", () => {
    expect(
      landingFromRequest(url("?utm_source=Bluesky&utm_campaign=Launch%20Day"), null, OWN),
    ).toEqual({
      referrerHost: null,
      utmSource: "bluesky",
      utmCampaign: "launch-day",
    });
  });

  it.each([
    ["a click within our own site", `https://${OWN}/`],
    ["our own site in capitals", `https://ALLEGEDLY.example/`],
    ["no referrer at all", null],
    ["a non-web referrer", "android-app://com.slack/"],
  ])("has nothing to say about %s", (_label, referer) => {
    expect(landingFromRequest(url(), referer, OWN)).toBeUndefined();
  });
});

describe("the landing cookie", () => {
  it("is a host-only session cookie: no Max-Age, gone when the browser closes", () => {
    const cookie = landingCookie({
      referrerHost: "old.reddit.com",
      utmSource: null,
      utmCampaign: "x",
    });
    expect(cookie).toBe(
      `${LANDING_COOKIE}=old.reddit.com~~x; Path=/; Secure; HttpOnly; SameSite=Lax`,
    );
    expect(cookie).not.toMatch(/Max-Age|Expires|Domain/i);
  });

  const landing: fc.Arbitrary<Landing> = fc
    .record({
      referrerHost: fc.option(fc.stringMatching(/^[a-z0-9-]{1,10}(\.[a-z0-9-]{1,10}){0,3}$/), {
        nil: null,
      }),
      utmSource: fc.option(fc.stringMatching(/^[a-z0-9._+-]{1,30}$/), { nil: null }),
      utmCampaign: fc.option(fc.stringMatching(/^[a-z0-9._+-]{1,30}$/), { nil: null }),
    })
    .filter((l) => l.referrerHost !== null || l.utmSource !== null || l.utmCampaign !== null);

  it("round-trips through a Cookie header, among other cookies", () => {
    fc.assert(
      fc.property(landing, (value) => {
        const pair = landingCookie(value).split(";")[0] ?? "";
        expect(landingFromCookie(`__Host-vid=${"a".repeat(32)}; ${pair}; theme=dark`)).toEqual(
          value,
        );
      }),
    );
  });

  it.each([
    ["no header", null],
    ["no landing cookie", "theme=dark"],
    ["an empty landing", `${LANDING_COOKIE}=~~`],
    ["too few parts", `${LANDING_COOKIE}=reddit.com~x`],
    ["a bad host", `${LANDING_COOKIE}=evil host!~~`],
    ["a bad source", `${LANDING_COOKIE}=~Bad Source~`],
    ["a bad campaign", `${LANDING_COOKIE}=~~<script>`],
    ["a valueless pair", LANDING_COOKIE],
  ])("ignores %s", (_label, header) => {
    expect(landingFromCookie(header)).toBeUndefined();
  });

  it("never throws, and anything it returns is clean", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const parsed = landingFromCookie(`${LANDING_COOKIE}=${value}`);
        if (parsed !== undefined) {
          for (const part of Object.values(parsed)) {
            if (part !== null) expect(part).toMatch(/^[a-z0-9._+-]+$/);
          }
        }
      }),
    );
  });
});
