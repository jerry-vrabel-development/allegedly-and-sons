import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * The embedded checkout (design note 0005, PR 3), with Stripe stubbed out:
 * CI has no real Stripe keys, and these tests are about our page and script,
 * not Stripe's form. A fake Stripe.js stands in for js.stripe.com and the
 * session request is answered here, so nothing reaches Stripe.
 */

const CHECKOUT = "/checkout/alien-paperclip";
const SESSION = "**/checkout/alien-paperclip/session";
const FAILED = /couldn’t open here\. Nothing was charged/;

/** Mimics the bits of Stripe.js (clover) our script uses. */
const FAKE_STRIPE_JS = `
window.Stripe = function (key) {
  window.__stripeKey = key;
  return {
    initEmbeddedCheckout: function (options) {
      return options.fetchClientSecret().then(function (secret) {
        return {
          mount: function (element) {
            var form = document.createElement("div");
            form.setAttribute("data-testid", "fake-stripe-checkout");
            form.setAttribute("data-secret", secret);
            form.textContent = "Stripe's checkout would be here";
            element.appendChild(form);
          },
        };
      });
    },
  };
};`;

async function stubStripeJs(page: Page): Promise<void> {
  await page.route("https://js.stripe.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: FAKE_STRIPE_JS }),
  );
}

/** Answers the session request; returns the requests it saw. */
async function stubSession(page: Page, status = 200): Promise<Request[]> {
  const seen: Request[] = [];
  await page.route(SESSION, (route) => {
    seen.push(route.request());
    return status === 200
      ? route.fulfill({ json: { clientSecret: "cs_test_e2e_secret_fake" } })
      : route.fulfill({ status, json: { error: "unavailable" } });
  });
  return seen;
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

const fallback = (page: Page) =>
  page.getByRole("button", { name: "Continue on Stripe’s secure page" });

test.describe("embedded checkout", () => {
  test("Acquire opens the checkout page and Stripe's form mounts in place", async ({ page }) => {
    await stubStripeJs(page);
    const sessions = await stubSession(page);
    const errors = collectErrors(page);

    await page.goto("/items/alien-paperclip");
    await page.getByRole("link", { name: "Acquire this exhibit" }).click();
    await expect(page).toHaveURL(new RegExp(`${CHECKOUT}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acquire The Alien Paperclip");

    const form = page.getByTestId("fake-stripe-checkout");
    await expect(form).toBeVisible();
    await expect(form).toHaveAttribute("data-secret", "cs_test_e2e_secret_fake");
    await expect(page.getByRole("status")).toHaveText("");
    // The fallback stays, but steps back so it doesn't compete with Stripe's own Pay button.
    await expect(fallback(page)).toBeVisible();
    await expect(page.locator(".checkout")).toHaveClass(/\bembedded\b/);
    await expect(fallback(page)).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    // One session, created by a same-origin POST, only once the buyer is on the page.
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.method()).toBe("POST");
    expect(await sessions[0]?.headerValue("origin")).toBe(new URL(page.url()).origin);
    expect(await page.evaluate(() => (window as { __stripeKey?: string }).__stripeKey)).toMatch(
      /^pk_test_/,
    );
    expect(errors).toEqual([]);
  });

  test("says so and keeps the fallback when the session request fails", async ({ page }) => {
    await stubStripeJs(page);
    await stubSession(page, 502);
    await page.goto(CHECKOUT);
    await expect(page.getByRole("status")).toHaveText(FAILED);
    await expect(page.getByTestId("fake-stripe-checkout")).toHaveCount(0);
    await expect(fallback(page)).toBeVisible();
    // Still the bold primary action: it's the only way to pay now.
    await expect(page.locator(".checkout")).not.toHaveClass(/\bembedded\b/);
  });

  test("says so and keeps the fallback when Stripe.js can't load", async ({ page }) => {
    await page.route("https://js.stripe.com/**", (route) => route.abort());
    const sessions = await stubSession(page);
    await page.goto(CHECKOUT);
    await expect(page.getByRole("status")).toHaveText(FAILED);
    await expect(fallback(page)).toBeVisible();
    expect(sessions).toHaveLength(0);
  });

  test("has no WCAG 2.2 AA violations with the form mounted, light and dark", async ({ page }) => {
    await stubStripeJs(page);
    await stubSession(page);
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto(CHECKOUT);
      await expect(page.getByTestId("fake-stripe-checkout")).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.map((v) => `${v.id}: ${v.help}`),
        colorScheme,
      ).toEqual([]);
    }
  });

  test("fits the screen without sideways scrolling", async ({ page }) => {
    await stubStripeJs(page);
    await stubSession(page);
    await page.goto(CHECKOUT);
    await expect(page.getByTestId("fake-stripe-checkout")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("checkout without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("still offers Stripe's secure page, and asks Stripe for nothing", async ({ page }) => {
    const sessions = await stubSession(page);
    await page.goto(CHECKOUT);
    await expect(fallback(page)).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("");
    expect(sessions).toHaveLength(0);
  });

  test("Acquire still gets there from the item page", async ({ page }) => {
    await page.goto("/items/alien-paperclip");
    await page.getByRole("link", { name: "Acquire this exhibit" }).click();
    await expect(page).toHaveURL(new RegExp(`${CHECKOUT}$`));
    await expect(fallback(page)).toBeVisible();
  });
});
