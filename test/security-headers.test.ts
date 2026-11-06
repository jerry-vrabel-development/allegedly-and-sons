import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, withSecurityHeaders } from "../src/worker/security-headers";

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

  it("starts the CSP locked down", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain("default-src 'none'");
  });

  it("allows forms to post only to us and redirect only to Stripe Checkout", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toMatch(
      /form-action 'self' https:\/\/checkout\.stripe\.com(;|$)/,
    );
  });
});
