import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  countryFrom,
  EVENT_NAMES,
  isAutomated,
  isPrefetch,
  parseEvent,
  referrerHostFrom,
  utmValue,
  type AnalyticsEvent,
} from "../src/core/analytics";
import { CATALOG } from "../src/core/catalog";

const VALID: AnalyticsEvent = {
  event: "item_viewed",
  itemSlug: "alien-paperclip",
  ts: 1762531200,
  visitorId: "0123456789abcdef0123456789abcdef",
  referrerHost: "bsky.app",
  country: "US",
  utmSource: "bluesky",
  utmCampaign: "xenoclip-launch",
};

const host = fc
  .array(fc.stringMatching(/^[a-z0-9-]{1,20}$/), { minLength: 1, maxLength: 4 })
  .map((labels) => labels.join("."));

const validEvent: fc.Arbitrary<AnalyticsEvent> = fc.record({
  event: fc.constantFrom(...EVENT_NAMES),
  itemSlug: fc.constantFrom(...CATALOG.map((item) => item.slug)),
  ts: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  visitorId: fc.option(fc.stringMatching(/^[0-9a-f]{32}$/), { nil: null }),
  referrerHost: fc.option(host, { nil: null }),
  country: fc.option(fc.stringMatching(/^[A-Z][A-Z0-9]$/), { nil: null }),
  utmSource: fc.option(fc.stringMatching(/^[a-z0-9._+-]{1,100}$/), { nil: null }),
  utmCampaign: fc.option(fc.stringMatching(/^[a-z0-9._+-]{1,100}$/), { nil: null }),
});

describe("parseEvent", () => {
  it("accepts a well-formed event", () => {
    expect(parseEvent(VALID)).toEqual(VALID);
    const bare = {
      ...VALID,
      visitorId: null,
      referrerHost: null,
      country: null,
      utmSource: null,
      utmCampaign: null,
    };
    expect(parseEvent(bare)).toEqual(bare);
  });

  it("ignores extra fields instead of storing them", () => {
    expect(parseEvent({ ...VALID, ip: "203.0.113.7", userAgent: "Mozilla/5.0" })).toEqual(VALID);
  });

  it.each([
    ["not an object", "item_viewed"],
    ["null", null],
    ["an array", [VALID]],
    ["an unknown event", { ...VALID, event: "purchased" }],
    ["an item not in the catalog", { ...VALID, itemSlug: "xenoclip" }],
    ["a missing item", { ...VALID, itemSlug: undefined }],
    ["a fractional time", { ...VALID, ts: 1.5 }],
    ["a negative time", { ...VALID, ts: -1 }],
    ["a time given as text", { ...VALID, ts: "1762531200" }],
    ["an unsafe integer time", { ...VALID, ts: Number.MAX_SAFE_INTEGER + 1 }],
    ["a referrer with a path", { ...VALID, referrerHost: "bsky.app/profile/someone" }],
    ["a referrer in capitals", { ...VALID, referrerHost: "BSKY.APP" }],
    ["an empty referrer", { ...VALID, referrerHost: "" }],
    ["a missing referrer (must be null)", { ...VALID, referrerHost: undefined }],
    ["an overlong referrer", { ...VALID, referrerHost: `${"a".repeat(250)}.com` }],
    ["a short visitor id", { ...VALID, visitorId: "abc123" }],
    ["an uppercase visitor id", { ...VALID, visitorId: "0123456789ABCDEF0123456789ABCDEF" }],
    ["a missing visitor id (must be null)", { ...VALID, visitorId: undefined }],
    ["a lowercase country", { ...VALID, country: "us" }],
    ["a three-letter country", { ...VALID, country: "USA" }],
    ["an unnormalized UTM source", { ...VALID, utmSource: "Bluesky" }],
    ["a UTM campaign with spaces", { ...VALID, utmCampaign: "big launch" }],
    ["an overlong UTM source", { ...VALID, utmSource: "a".repeat(101) }],
  ])("drops %s", (_label, value) => {
    expect(parseEvent(value)).toBeUndefined();
  });

  it("accepts every well-formed event unchanged", () => {
    fc.assert(
      fc.property(validEvent, (event) => {
        expect(parseEvent(event)).toEqual(event);
      }),
    );
  });

  it("never throws, and anything it accepts is valid when checked again", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const parsed = parseEvent(value);
        if (parsed !== undefined) expect(parseEvent(parsed)).toEqual(parsed);
      }),
    );
  });

  it("drops events with any one field corrupted", () => {
    const corrupt = fc.oneof(
      fc.constant(undefined),
      fc.string(),
      fc.double(),
      fc.object(),
      fc.constant(null),
    );
    fc.assert(
      fc.property(
        validEvent,
        fc.constantFrom(
          "event",
          "itemSlug",
          "ts",
          "visitorId",
          "referrerHost",
          "country",
          "utmSource",
          "utmCampaign",
        ),
        corrupt,
        (event, field, value) => {
          const bad = { ...event, [field]: value };
          const parsed = parseEvent(bad);
          // A corruption can land on another valid value (null referrer, a real slug).
          if (parsed !== undefined) expect(parsed).toEqual(bad);
        },
      ),
    );
  });
});

describe("referrerHostFrom", () => {
  it("keeps only the host, lowercased", () => {
    expect(referrerHostFrom("https://Bsky.App/profile/someone?q=secret#frag")).toBe("bsky.app");
    expect(referrerHostFrom("http://old.reddit.com/r/x")).toBe("old.reddit.com");
  });

  it("drops credentials and ports", () => {
    expect(referrerHostFrom("https://user:pass@example.com:8443/x")).toBe("example.com");
  });

  it.each([
    ["no header", null],
    ["garbage", "not a url"],
    ["an empty header", ""],
    ["an app link", "android-app://com.slack/"],
    ["a file URL", "file:///home/me/page.html"],
    ["an IPv6 address", "https://[2001:db8::1]/"],
  ])("gives null for %s", (_label, value) => {
    expect(referrerHostFrom(value)).toBeNull();
  });

  it("never returns anything but a bare host or null", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.webUrl({ withQueryParameters: true })), (value) => {
        const result = referrerHostFrom(value);
        if (result !== null) expect(result).toMatch(/^[a-z0-9.-]+$/);
      }),
    );
  });
});

describe("utmValue", () => {
  it.each([
    ["Bluesky", "bluesky"],
    ["  Bluesky ", "bluesky"],
    ["Xenoclip Launch", "xenoclip-launch"],
    ["reddit.r_funny+weird", "reddit.r_funny+weird"],
  ])("normalizes %j to %j", (raw, expected) => {
    expect(utmValue(raw)).toBe(expected);
  });

  it.each([null, "", "   ", "<script>", "a".repeat(101), "café"])("gives null for %j", (raw) => {
    expect(utmValue(raw)).toBeNull();
  });

  it("always gives a value parseEvent accepts, or null", () => {
    fc.assert(
      fc.property(fc.string(), (raw) => {
        const utmSource = utmValue(raw);
        expect(parseEvent({ ...VALID, utmSource })).toEqual({ ...VALID, utmSource });
      }),
    );
  });
});

describe("countryFrom", () => {
  it.each([
    ["US", "US"],
    ["T1", "T1"],
    ["XX", "XX"],
    ["us", null],
    ["USA", null],
    [undefined, null],
    [42, null],
  ])("%j → %j", (raw, expected) => {
    expect(countryFrom(raw)).toBe(expected);
  });
});

describe("isAutomated", () => {
  it.each([
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  ])("lets a browser through: %s", (ua) => {
    expect(isAutomated(ua)).toBe(false);
  });

  it.each([
    null,
    "",
    "   ",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)",
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "curl/8.5.0",
    "python-requests/2.32.3",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36",
  ])("flags an automated client: %s", (ua) => {
    expect(isAutomated(ua)).toBe(true);
  });
});

describe("isPrefetch", () => {
  it.each([
    [{ "Sec-Purpose": "prefetch" }, true],
    [{ "Sec-Purpose": "prefetch;prerender" }, true],
    [{ Purpose: "prefetch" }, true],
    [{ "X-Moz": "prefetch" }, true],
    [{}, false],
    [{ "Sec-Fetch-Dest": "document" }, false],
  ])("%j → %s", (headers, expected) => {
    expect(isPrefetch(new Headers(headers))).toBe(expected);
  });
});
