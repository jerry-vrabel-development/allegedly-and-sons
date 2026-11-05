import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "alien paperclip", path: "/items/alien-paperclip" },
  { name: "second-best quill", path: "/items/second-best-quill" },
  { name: "viking trophy", path: "/items/viking-participation-trophy" },
  { name: "fine print", path: "/disclaimer" },
  { name: "not found", path: "/items/the-other-three-xenoclips" },
] as const;

/** WCAG 2.2 AA, the project's accessibility floor. */
async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

for (const { name, path } of PAGES) {
  test.describe(name, () => {
    test("has no WCAG 2.2 AA violations in light mode", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" });
      await page.goto(path);
      await expectNoAxeViolations(page);
    });

    test("has no WCAG 2.2 AA violations in dark mode", async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      await expectNoAxeViolations(page);
    });

    test("fits the screen without sideways scrolling", async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test("loads with no console errors (including CSP blocks)", async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        // The 404 page reports its own status as a console error; that one is expected.
        const ownStatus = new URL(message.location().url).pathname === path;
        if (!ownStatus) errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(path);
      await page.waitForLoadState("load");
      expect(errors).toEqual([]);
    });
  });
}

test("every image loads", async ({ page }) => {
  for (const { path } of PAGES) {
    await page.goto(path);
    const broken = await page.$$eval("img", (images) =>
      images
        .filter((img) => !img.complete || img.naturalWidth === 0)
        .map((img) => img.getAttribute("src")),
    );
    // Lazy images below the fold may not have loaded yet; scroll them in first.
    if (broken.length > 0) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForLoadState("networkidle");
    }
    const stillBroken = await page.$$eval("img", (images) =>
      images.filter((img) => img.naturalWidth === 0).map((img) => img.getAttribute("src")),
    );
    expect(stillBroken, path).toEqual([]);
  }
});

test("the skip link moves focus to the main content", async ({ page, browserName }) => {
  // Mobile Safari doesn't move focus with Tab by default, so check on Chromium.
  test.skip(browserName === "webkit", "Tab focus order is a desktop concern");
  await page.goto("/items/alien-paperclip");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
});

test("home page leads to the featured exhibit", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Allegedly & Sons");
  await page.getByRole("link", { name: "View the exhibit" }).click();
  await expect(page).toHaveURL(/\/items\/alien-paperclip$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Alien Paperclip");
});

test.describe("item page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/items/alien-paperclip");
  });

  test("shows the price and call to action on the first screen", async ({ page }) => {
    for (const slug of ["alien-paperclip", "second-best-quill", "viking-participation-trophy"]) {
      await page.goto(`/items/${slug}`);
      await expect(page.locator(".buybox .price")).toBeInViewport();
      await expect(page.getByText("Acquisitions open soon")).toBeInViewport();
    }
  });

  test("describes the art for screen readers", async ({ page }) => {
    await expect(page.getByRole("img", { name: /paperclip/i }).first()).toBeVisible();
  });

  test("expands the rest of the case file", async ({ page }) => {
    const more = page.getByText("Bureau field agents recovered it");
    await expect(more).toBeHidden();
    await page.getByText("Keep reading the case file").click();
    await expect(more).toBeVisible();
  });

  test("offers share links with the page URL", async ({ page }) => {
    const bluesky = page.getByRole("link", { name: "Share on Bluesky" });
    await expect(bluesky).toHaveAttribute("href", /alien-paperclip/);
    await expect(page.getByRole("link", { name: "Share by email" })).toHaveAttribute(
      "href",
      /^mailto:/,
    );
  });

  test("cross-sells the other items", async ({ page }) => {
    const more = page.getByRole("region", { name: "Other recent acquisitions" });
    await expect(more.getByRole("link")).toHaveCount(2);
  });

  test("links to the fine print from the footer", async ({ page }) => {
    await page.getByRole("contentinfo").getByRole("link", { name: "Read the fine print" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Fine Print");
  });
});

test("unknown items get a friendly 404", async ({ page }) => {
  const response = await page.goto("/items/the-other-three-xenoclips");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("The Bureau is still looking.")).toBeVisible();
});
