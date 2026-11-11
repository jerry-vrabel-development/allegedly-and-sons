import { createExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { CHECKOUT_STATUS, STRIPE_JS_URL } from "../src/core/checkout-page";
import { CHECKOUT_JS } from "../src/worker/client-scripts.generated";
import { STRIPE_API_VERSION } from "../src/worker/stripe";
import { publishableKeyFrom } from "../src/worker/env";
import worker from "../src/worker/index";
import { STRICT_CSP } from "../src/worker/security-headers";
import { testEnv } from "./test-env";
import { CHECKOUT_SCRIPT_PATH } from "../src/core/paths";

describe("the checkout script", () => {
  it("is served from our origin as JavaScript, with the strict policy", async () => {
    const response = await worker.fetch(
      new Request(`https://allegedly.example${CHECKOUT_SCRIPT_PATH}`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
    expect(await response.text()).toBe(CHECKOUT_JS);
  });

  it("uses the clover method, matching the pinned API version and Stripe.js build", () => {
    expect(STRIPE_API_VERSION).toMatch(/\.clover$/);
    expect(STRIPE_JS_URL).toBe("https://js.stripe.com/clover/stripe.js");
    expect(CHECKOUT_JS).toContain(".initEmbeddedCheckout(");
    expect(CHECKOUT_JS).not.toContain("createEmbeddedCheckoutPage");
  });

  // How it asks for the client secret is unit tested (client-secret.test.ts)
  // and the mount is watched in real browsers; these check the bundle itself.
  it("does nothing risky: no eval, no innerHTML, no storage, no other hosts", () => {
    expect(CHECKOUT_JS).not.toMatch(
      /eval\(|innerHTML|outerHTML|document\.write|localStorage|sessionStorage|https?:\/\//,
    );
    expect(CHECKOUT_JS).not.toMatch(/^\s*(import|export)\s/m);
    expect(CHECKOUT_JS.length).toBeLessThan(5000);
  });

  it("quiets the fallback only after Stripe's form has mounted", () => {
    const mounted = CHECKOUT_JS.indexOf("checkout.mount(mount)");
    const quieted = CHECKOUT_JS.indexOf('classList.add("embedded")');
    expect(mounted).toBeGreaterThan(-1);
    expect(quieted).toBeGreaterThan(mounted);
  });

  it("says something useful while loading and if it fails", () => {
    expect(CHECKOUT_JS).toContain(JSON.stringify(CHECKOUT_STATUS.loading));
    expect(CHECKOUT_JS).toContain(JSON.stringify(CHECKOUT_STATUS.failed));
    expect(CHECKOUT_STATUS.failed).toContain("Nothing was charged");
  });
});

describe("publishableKeyFrom", () => {
  it("accepts only pk_test_ and pk_live_ keys, trimmed", () => {
    expect(publishableKeyFrom({ STRIPE_PUBLISHABLE_KEY: " pk_test_abc123 " })).toBe(
      "pk_test_abc123",
    );
    expect(publishableKeyFrom({ STRIPE_PUBLISHABLE_KEY: "pk_live_abc123" })).toBe("pk_live_abc123");
    for (const value of [
      undefined,
      "",
      " ",
      "sk_test_abc",
      "pk_test_",
      'pk_test_a"b',
      "rk_test_abc",
    ]) {
      expect(
        publishableKeyFrom(value === undefined ? {} : { STRIPE_PUBLISHABLE_KEY: value }),
        value,
      ).toBeUndefined();
    }
  });

  it("is set in wrangler.jsonc to a sandbox key", () => {
    expect(publishableKeyFrom(testEnv())).toMatch(/^pk_test_/);
  });
});

describe("the deployed Worker's checkout page", () => {
  it("loads Stripe.js and our script when a Stripe key and publishable key are set", async () => {
    const response = await worker.fetch(
      new Request("https://allegedly.example/checkout/alien-paperclip"),
      testEnv({ STRIPE_SECRET_KEY: "sk_test_fake" }),
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain(STRIPE_JS_URL);
    expect(text).toContain(CHECKOUT_SCRIPT_PATH);
  });
});
