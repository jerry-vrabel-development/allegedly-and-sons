import { describe, expect, it } from "vitest";
import {
  CHECKOUT_CSP,
  SECURITY_HEADERS,
  ITEM_CSP,
  SHOP_CSP,
  STRICT_CSP,
  securityHeadersFor,
  withSecurityHeaders,
} from "../src/worker/security-headers";

/** Splits a CSP into { directive: [sources] } so tests can check one directive at a time. */
function parse(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split(";").map((part) => {
      const [name = "", ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

describe("withSecurityHeaders", () => {
  it("adds every security header", () => {
    const secured = withSecurityHeaders(new Response("hi"));
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(secured.headers.get(name)).toBe(value);
    }
  });

  it("keeps the original status, headers and body", async () => {
    const original = new Response("teapot", {
      status: 418,
      headers: { "Content-Type": "text/plain", "X-Custom": "kept" },
    });
    const secured = withSecurityHeaders(original);
    expect(secured.status).toBe(418);
    expect(secured.headers.get("X-Custom")).toBe("kept");
    expect(await secured.text()).toBe("teapot");
  });

  it("overrides a weaker header set upstream", () => {
    const secured = withSecurityHeaders(
      new Response("x", { headers: { "X-Content-Type-Options": "sniff-away" } }),
    );
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("uses the strict policy when no path is given", () => {
    const secured = withSecurityHeaders(new Response("x"));
    expect(secured.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
  });

  it("uses the checkout policy for a successful checkout page", () => {
    const secured = withSecurityHeaders(new Response("x"), "/checkout/alien-paperclip");
    expect(secured.headers.get("Content-Security-Policy")).toBe(CHECKOUT_CSP);
  });
});

describe("the strict policy", () => {
  it("is what SECURITY_HEADERS sends", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toBe(STRICT_CSP);
  });

  it("starts locked down and allows no script, frames or connections", () => {
    const csp = parse(STRICT_CSP);
    expect(csp["default-src"]).toEqual(["'none'"]);
    expect(csp).not.toHaveProperty("script-src");
    expect(csp).not.toHaveProperty("frame-src");
    expect(csp).not.toHaveProperty("connect-src");
  });

  it("is byte-for-byte the policy the shop shipped before per-route headers", () => {
    expect(STRICT_CSP).toBe(
      "default-src 'none'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://checkout.stripe.com",
    );
  });

  it("allows forms to post only to us and redirect only to Stripe Checkout", () => {
    expect(STRICT_CSP).toMatch(/form-action 'self' https:\/\/checkout\.stripe\.com(;|$)/);
  });
});

describe("the checkout policy", () => {
  const csp = parse(CHECKOUT_CSP);
  const strict = parse(STRICT_CSP);

  it("allows scripts only from us and Stripe", () => {
    expect(csp["script-src"]).toEqual([
      "'self'",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://checkout.stripe.com",
    ]);
  });

  it("allows frames only to Stripe, and connections only to us and Stripe", () => {
    expect(csp["frame-src"]).toEqual([
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://hooks.stripe.com",
      "https://checkout.stripe.com",
    ]);
    expect(csp["connect-src"]).toEqual([
      "'self'",
      "https://api.stripe.com",
      "https://checkout.stripe.com",
    ]);
  });

  it("allows images from us and Stripe only", () => {
    expect(csp["img-src"]).toEqual(["'self'", "https://*.stripe.com"]);
  });

  it("never allows inline or eval'd script, or any wildcard host", () => {
    expect(CHECKOUT_CSP).not.toMatch(/unsafe-|data:|blob:|\s\*(\s|;|$)|https:(\s|;|$)/);
    for (const [directive, sources] of Object.entries(csp)) {
      for (const source of sources) {
        if (source.startsWith("'")) continue;
        expect(source, `${directive} ${source}`).toMatch(/^https:\/\/(\*\.)?[a-z.]*stripe\.com$/);
      }
    }
  });

  it("keeps every strict directive it doesn't need to loosen", () => {
    for (const directive of [
      "default-src",
      "style-src",
      "frame-ancestors",
      "base-uri",
      "form-action",
    ]) {
      expect(csp[directive], directive).toEqual(strict[directive]);
    }
  });
});

describe("securityHeadersFor", () => {
  it("uses the checkout policy only for a 200 on /checkout/<item>", () => {
    expect(securityHeadersFor("/checkout/alien-paperclip", 200)["Content-Security-Policy"]).toBe(
      CHECKOUT_CSP,
    );
  });

  it("keeps the strict policy for checkout errors, redirects and not-found", () => {
    for (const status of [303, 404, 502, 503]) {
      expect(
        securityHeadersFor("/checkout/alien-paperclip", status)["Content-Security-Policy"],
        String(status),
      ).toBe(STRICT_CSP);
    }
  });

  it("lets item pages run only our own script and report only to us", () => {
    const csp = securityHeadersFor("/items/alien-paperclip", 200)["Content-Security-Policy"];
    expect(csp).toBe(ITEM_CSP);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    // Scripts and connections: our own origin and nothing else.
    expect(csp).toMatch(/script-src 'self'(;|$)/);
    expect(csp).toMatch(/connect-src 'self'(;|$)/);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    // A missing item is a 404 page, which runs nothing.
    expect(securityHeadersFor("/items/xenoclip", 404)["Content-Security-Policy"]).toBe(STRICT_CSP);
  });

  it("lets every other shop page run only our own scripts (note 0011), with no connections", () => {
    for (const path of [
      "/",
      "/items/alien-paperclip/extra",
      "/items/",
      "/disclaimer",
      "/thanks",
      "/dossier",
      "/checkout",
      "/checkout/",
      "/checkout/alien-paperclip/extra",
      "/checkout/Alien-Paperclip",
      "/checkoutx/alien-paperclip",
    ]) {
      expect(securityHeadersFor(path, 200)["Content-Security-Policy"], path).toBe(SHOP_CSP);
    }
    expect(SHOP_CSP).toMatch(/script-src 'self'(;|$)/);
    expect(SHOP_CSP).not.toContain("connect-src");
    expect(SHOP_CSP).not.toMatch(/unsafe-/);
  });

  it("keeps the strict policy for assets, the private ledger, the health check and errors", () => {
    for (const path of ["/assets/site.css", "/assets/sound.js", "/bureau/ledger", "/healthz", ""]) {
      expect(securityHeadersFor(path, 200)["Content-Security-Policy"], path).toBe(STRICT_CSP);
    }
    for (const status of [301, 404, 500]) {
      expect(securityHeadersFor("/", status)["Content-Security-Policy"]).toBe(STRICT_CSP);
    }
  });

  it("changes only the CSP: every other header is identical on both policies", () => {
    const checkout = securityHeadersFor("/checkout/alien-paperclip", 200);
    const strict = securityHeadersFor("/", 200);
    for (const [name, value] of Object.entries(strict)) {
      if (name === "Content-Security-Policy") continue;
      expect(checkout[name], name).toBe(value);
    }
    expect(Object.keys(checkout).sort()).toEqual(Object.keys(strict).sort());
  });
});
