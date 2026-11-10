import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = [
  { name: "home", path: "/" },
  { name: "alien paperclip", path: "/items/alien-paperclip" },
  { name: "second-best quill", path: "/items/second-best-quill" },
  { name: "viking trophy", path: "/items/viking-participation-trophy" },
  { name: "pending exhibit", path: "/items/martian-rubber-band" },
  { name: "fine print", path: "/disclaimer" },
  { name: "thank you", path: "/thanks" },
  { name: "dossier", path: "/dossier" },
  { name: "vault", path: "/vault" },
  { name: "broadcast", path: "/broadcast" },
  { name: "dispatch sent", path: "/dispatch/sent" },
  { name: "dispatch confirm link", path: `/dispatch/confirm?t=${"0".repeat(64)}` },
  { name: "dispatch expired link", path: "/dispatch/recover?t=expired" },
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
        // A 404 page (not found, an expired link) reports its own status as a
        // console error; that one is expected.
        const source = new URL(message.location().url);
        const ownStatus = `${source.pathname}${source.search}` === path;
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
      // The whole button, not a sliver: whichever item is on air (and the
      // ON AIR banner) must still leave it on the first screen.
      await expect(page.getByRole("link", { name: "Acquire this exhibit" })).toBeInViewport({
        ratio: 1,
      });
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

  test("shares through our own route, which hands off a ref'd link", async ({ page }) => {
    const bluesky = page.getByRole("link", { name: "Share on Bluesky" });
    await expect(bluesky).toHaveAttribute("href", "/share/alien-paperclip/bluesky");
    await expect(bluesky).toHaveAttribute("rel", "nofollow");
    // Check the hand-off without following it: following would leave for bsky.app.
    for (const [name, target] of [
      ["Share on Bluesky", /^https:\/\/bsky\.app\/intent\/compose\?/],
      ["Share by email", /^mailto:\?/],
    ] as const) {
      const href = await page.getByRole("link", { name }).getAttribute("href");
      const response = await page.request.get(href ?? "", { maxRedirects: 0 });
      expect(response.status()).toBe(303);
      const location = response.headers()["location"] ?? "";
      expect(location).toMatch(target);
      expect(location).toMatch(/alien-paperclip%3Fr%3D[0-9a-f]{10}/);
    }
  });

  test("cross-sells the other items", async ({ page }) => {
    const more = page.getByRole("region", { name: "Other recent acquisitions" });
    await expect(more.getByRole("link")).toHaveCount(3);
  });

  test("links the terms of sale from the buy box, landing on the terms", async ({ page }) => {
    await page.getByRole("link", { name: "Terms of sale" }).click();
    await expect(page).toHaveURL(/\/disclaimer#terms-heading$/);
    await expect(
      page.getByRole("heading", { level: 2, name: "The Terms of the Arrangement" }),
    ).toBeInViewport();
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

test("sets the visitor cookie: secure, host-only, HttpOnly, Lax, one year", async ({ page }) => {
  const response = await page.goto("/items/alien-paperclip");
  // Read the header itself, not the cookie jar: browsers differ on keeping
  // Secure cookies for http://localhost, but every one receives the header.
  const setCookie = (await response?.headerValue("set-cookie")) ?? "";
  expect(setCookie).toMatch(
    /^__Host-vid=[0-9a-f]{32}; Max-Age=31536000; Path=\/; Secure; HttpOnly; SameSite=Lax$/,
  );
  expect(await response?.headerValue("cache-control")).toContain("private");
  // HttpOnly: page scripts can't read it.
  expect(await page.evaluate(() => document.cookie)).not.toContain("__Host-vid");
});

test.describe("story reads", () => {
  /** Collects the story beacons the page sends to /events. */
  function watchReads(page: import("@playwright/test").Page): string[] {
    const depths: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === "/events") {
        const body = request.postDataJSON() as { item: string; depth: string };
        expect(body.item).toBe("alien-paperclip");
        depths.push(body.depth);
      }
    });
    return depths;
  }

  test("reports 'opened', then 'finished' once the end stays in view", async ({ page }) => {
    const depths = watchReads(page);
    await page.goto("/items/alien-paperclip");
    await page.getByText("Keep reading the case file").click();
    await expect.poll(() => depths).toEqual(["opened"]);
    await page.locator("#story-end").scrollIntoViewIfNeeded();
    await expect.poll(() => depths, { timeout: 10_000 }).toEqual(["opened", "finished"]);
  });

  test("doesn't count a flick past the end as finished", async ({ page }) => {
    const depths = watchReads(page);
    await page.goto("/items/alien-paperclip");
    await page.getByText("Keep reading the case file").click();
    await page.locator("#story-end").scrollIntoViewIfNeeded();
    await page.getByRole("heading", { name: "Other recent acquisitions" }).scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    // Longer than the dwell time: the end was on screen only briefly.
    await page.waitForTimeout(4_000);
    expect(depths).toEqual(["opened"]);
  });

  test("sends nothing when the case file stays closed", async ({ page }) => {
    const depths = watchReads(page);
    await page.goto("/items/alien-paperclip");
    await page.waitForTimeout(1_000);
    expect(depths).toEqual([]);
  });
});

test("the ledger is simply not found without Cloudflare Access", async ({ page }) => {
  const response = await page.goto("/bureau/ledger");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "The Ledger" })).toHaveCount(0);
});

test("finishing a case file earns its card in your dossier", async ({ page, browserName }) => {
  // The dossier follows the visitor cookie, which is Secure. WebKit won't keep
  // Secure cookies on http://localhost (these tests' server), so every request
  // there is a new visitor. On the real https site Safari keeps it; granting
  // itself is covered by test/dossier-worker.test.ts.
  test.skip(browserName === "webkit", "WebKit drops Secure cookies on http://localhost");
  await page.goto("/items/second-best-quill");
  await page.getByText("Keep reading the case file").click();
  await page.locator("#story-end").scrollIntoViewIfNeeded();
  // The story must stay on screen for the dwell time before it counts as finished.
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(1_000);
        const dossier = await page.request.get("/dossier");
        return (await dossier.text()).includes("Card AS-0002 · Collected");
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.getByRole("link", { name: "Your Dossier" }).click();
  await expect(page.getByText("Card AS-0002 · Collected")).toBeVisible();
  await expect(page.getByText(/Agent No\. \d{4}/)).toBeVisible();
});

test("pulling the lever spins the reel and lands on the card", async ({ page, browserName }) => {
  // The lever needs the Secure visitor cookie, which WebKit won't keep on
  // http://localhost. Pull rules are covered by test/vault-worker.test.ts.
  test.skip(browserName === "webkit", "WebKit drops Secure cookies on http://localhost");
  // ?fx=on: half of agents get the plain lever (note 0008, PR 3); this tests the reel.
  await page.goto("/vault?fx=on");
  await expect(page.getByText("Your free pull for today is ready.")).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Every pull draws one card at these odds" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pull the lever" }).click();

  const reel = page.getByRole("dialog", { name: "The vault creaks open…" });
  await expect(reel).toBeVisible();
  const collect = reel.getByRole("button", { name: "Collect" });
  // Nothing to collect while the reel is still spinning.
  await expect(collect).toBeHidden();
  const drawn = reel.getByRole("status");
  await expect(drawn).not.toBeEmpty({ timeout: 8_000 });
  await expect(collect).toBeVisible();
  await expect(collect).toBeFocused();
  await expect(
    drawn.getByText(/Vault card V-00\d · (Common|Uncommon|Rare) · New to your file/),
  ).toBeVisible();
  await expect(drawn.getByText("Duty streak: 1 day.")).toBeVisible();
  // Check at rest: mid-flash, axe can't measure the reel's contrast.
  await reel.locator(".reel-window").evaluate(async (box) => {
    await Promise.all(box.getAnimations().map((animation) => animation.finished));
  });
  await expectNoAxeViolations(page);

  await collect.click();
  await expect(page).toHaveURL(/\/vault\?fx=on#latest-pull$/);
  const latest = page.getByRole("region", { name: "Your latest pull" });
  await expect(
    latest.getByText(/Vault card V-00\d · (Common|Uncommon|Rare) · New to your file/),
  ).toBeVisible();
  await expect(page.getByText("The lever is locked until tomorrow.")).toBeVisible();
  const streak = page.getByRole("region", { name: "Duty streak" });
  await expect(streak.getByText("Duty streak: 1 day.")).toBeVisible();
  await expect(streak.getByText("Freezes held: 0 of 2.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Pull the lever" })).toHaveCount(0);
  await expectNoAxeViolations(page);

  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Your Dossier" })
    .click();
  await expect(page.getByText("(collected)")).toBeVisible();
});

test("with reduced motion the reel skips the spin and the flash", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit drops Secure cookies on http://localhost");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vault?fx=on");
  await page.getByRole("button", { name: "Pull the lever" }).click();
  const reel = page.getByRole("dialog", { name: "The vault creaks open…" });
  // No spin: the result is there straight away.
  await expect(reel.getByRole("button", { name: "Collect" })).toBeVisible({ timeout: 1_500 });
  expect(
    await reel.locator(".reel-window").evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("the sound toggle says its state in words and is remembered", async ({ page }) => {
  await page.goto("/vault?fx=on");
  const toggle = page.getByRole("button", { name: "Sound: on" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Sound: off" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Sound: off" })).toBeVisible();
});

test("the plain group gets the plain lever", async ({ page }) => {
  await page.goto("/vault?fx=off");
  await expect(page.getByRole("button", { name: "Pull the lever" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Sound:/ })).toHaveCount(0);
});

test("without JavaScript the lever still works as a plain form", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === "webkit", "WebKit drops Secure cookies on http://localhost");
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/vault");
  await expect(page.getByRole("button", { name: /Sound:/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Pull the lever" }).click();
  await expect(page).toHaveURL(/\/vault\?opened=1#latest-pull$/);
  await expect(page.getByRole("region", { name: "Your latest pull" })).toBeVisible();
  await context.close();
});

test("registering with the Dispatch ends on the same 'check your inbox' page", async ({
  page,
  browserName,
}) => {
  // The form needs the Secure visitor cookie, which WebKit won't keep on
  // http://localhost. The flows are covered by test/dispatch-worker.test.ts.
  test.skip(browserName === "webkit", "WebKit drops Secure cookies on http://localhost");
  await page.goto("/dossier");
  const dispatch = page.getByRole("region", { name: "The Bureau Dispatch" });
  await dispatch.getByLabel("Your email").fill("agent@example.com");
  await expectNoAxeViolations(page);
  await dispatch.getByRole("button", { name: "Register with the Bureau" }).click();
  await expect(page).toHaveURL(/\/dispatch\/sent$/);
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
});

test("an email's link shows a button and never acts on its own", async ({ page }) => {
  await page.goto(`/dispatch/confirm?t=${"0".repeat(64)}`);
  await page.getByRole("button", { name: "Confirm my registration" }).click();
  await expect(page.getByRole("heading", { name: "That link has expired" })).toBeVisible();
});

test("the ON AIR banner leads to the broadcast, where the clock ticks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Watch the broadcast" }).click();
  await expect(
    page.getByRole("heading", { name: "The Back-Room Broadcast", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Smuggler's Special Value")).toBeVisible();
  const clock = page.locator(".countdown .clock");
  await expect(clock).toHaveText(/^\d+:\d\d:\d\d$/);
  const first = await clock.textContent();
  await expect(clock).not.toHaveText(first ?? "", { timeout: 3_000 });
  await expect(page.getByRole("link", { name: /^Acquire it for \$/ })).toBeVisible();
});
