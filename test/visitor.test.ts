import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { VISITOR_ID } from "../src/core/analytics";
import { checkoutSessionForm, embeddedCheckoutSessionForm } from "../src/core/checkout";
import { CATALOG } from "../src/core/catalog";
import {
  VISITOR_COOKIE,
  VISITOR_COOKIE_MAX_AGE,
  visitorCookie,
  visitorIdFrom,
  visitorIdFromCookie,
} from "../src/core/visitor";

const ID = "0123456789abcdef0123456789abcdef";
const bytes = fc.uint8Array({ minLength: 16, maxLength: 16 });

describe("visitorIdFromCookie", () => {
  it.each([
    [`__Host-vid=${ID}`, ID],
    [`theme=dark; __Host-vid=${ID}; other=1`, ID],
    [`  __Host-vid = ${ID} `, ID],
  ])("reads the id from %j", (header, expected) => {
    expect(visitorIdFromCookie(header)).toBe(expected);
  });

  it.each([
    ["no header", null],
    ["an empty header", ""],
    ["other cookies only", "theme=dark; session=abc"],
    ["a cookie without the __Host- prefix", `vid=${ID}`],
    ["a too-short id", "__Host-vid=abc123"],
    ["an uppercase id", `__Host-vid=${ID.toUpperCase()}`],
    ["an id with junk after it", `__Host-vid=${ID}x`],
    ["a valueless pair", "__Host-vid"],
  ])("gives undefined for %s", (_label, header) => {
    expect(visitorIdFromCookie(header)).toBeUndefined();
  });

  it("never throws, and anything it returns is a valid visitor id", () => {
    fc.assert(
      fc.property(fc.string(), (header) => {
        const id = visitorIdFromCookie(header);
        if (id !== undefined) expect(id).toMatch(VISITOR_ID);
      }),
    );
  });
});

describe("visitorIdFrom", () => {
  it("turns 16 random bytes into 32 lowercase hex characters", () => {
    expect(visitorIdFrom(new Uint8Array(16).fill(0xab))).toBe("ab".repeat(16));
  });

  it("always gives a valid id that survives a round trip through the cookie", () => {
    fc.assert(
      fc.property(bytes, (random) => {
        const id = visitorIdFrom(random);
        expect(id).toMatch(VISITOR_ID);
        const header = visitorCookie(id).split(";")[0] ?? "";
        expect(visitorIdFromCookie(header)).toBe(id);
      }),
    );
  });

  it("refuses the wrong amount of randomness", () => {
    expect(() => visitorIdFrom(new Uint8Array(8))).toThrow(RangeError);
  });
});

describe("visitorCookie", () => {
  it("is secure, host-only, HttpOnly, Lax and lasts a year", () => {
    expect(VISITOR_COOKIE).toBe("__Host-vid");
    expect(visitorCookie(ID)).toBe(
      `__Host-vid=${ID}; Max-Age=${String(VISITOR_COOKIE_MAX_AGE)}; Path=/; Secure; HttpOnly; SameSite=Lax`,
    );
    expect(VISITOR_COOKIE_MAX_AGE).toBe(31_536_000);
    // __Host- cookies must not name a Domain, or browsers drop them.
    expect(visitorCookie(ID)).not.toMatch(/Domain=/i);
  });
});

describe("checkout forms carry the visitor to Stripe", () => {
  const item = CATALOG[0];
  const origin = "https://allegedly.example";

  it("set client_reference_id on hosted and embedded sessions", () => {
    expect(checkoutSessionForm(item, origin, ID).get("client_reference_id")).toBe(ID);
    expect(embeddedCheckoutSessionForm(item, origin, ID).get("client_reference_id")).toBe(ID);
  });

  it("leave it out when there's no visitor", () => {
    expect(checkoutSessionForm(item, origin).has("client_reference_id")).toBe(false);
    expect(embeddedCheckoutSessionForm(item, origin, null).has("client_reference_id")).toBe(false);
  });
});
