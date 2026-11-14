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
    // Bring each image into view in turn: lazy images only load near the
    // viewport, and WebKit skips ones a single jump to the bottom passes over.
    const images = page.locator("img");
    for (let i = 0; i < (await images.count()); i += 1) {
      const image = images.nth(i);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(
          () => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
          {
            message: `${path}: ${String(await image.getAttribute("src"))}`,
          },
        )
        .toBe(true);
    }
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

test("the front page's stage leads to the exhibit on air", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Allegedly & Sons");
  const name = page.locator(".stage .name a");
  const shown = (await name.textContent()) ?? "";
  await name.click();
  await expect(page).toHaveURL(/\/items\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(shown);
});

test("the front page's stage keeps the Acquire button on the first screen", async ({ page }) => {
  await page.goto("/");
  const acquire = page.getByRole("link", { name: /^Acquire it for \$/ });
  await expect(acquire).toBeInViewport({ ratio: 1 });
  // The same price the checkout will charge, with its real clock beside it.
  await expect(page.locator(".stage .countdown .clock")).toHaveText(/^\d+:\d\d:\d\d$/);
});

test("the front page has three callers on the line under the stage, marked as lore", async ({
  page,
}) => {
  await page.goto("/");
  const callers = page.getByRole("region", { name: "Callers on the line" });
  await expect(callers.getByRole("listitem")).toHaveCount(3);
  await expect(callers.getByText("Every caller is a character, not a customer.")).toBeVisible();
  for (const caller of await callers.getByRole("listitem").all()) {
    await expect(caller.getByText("The host:")).toBeVisible();
  }
  // Under the stage, above the rest of the lineup: buying comes first.
  const top = async (selector: string) => (await page.locator(selector).boundingBox())?.y ?? 0;
  expect(await top(".stage")).toBeLessThan(await top(".callers"));
  expect(await top(".callers")).toBeLessThan(await top("#collection-heading"));
});

test.describe("item page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/items/alien-paperclip");
  });

  test("shows the price and call to action on the first screen", async ({ page }) => {
    for (const slug of ["alien-paperclip", "second-best-quill", "viking-participation-trophy"]) {
      await page.goto(`/items/${slug}`);
      await expect(page.locator(".buybox .price")).toBeInViewport();
      // The whole button, not a sliver, whichever exhibit is on air. The one
      // on air has a taller buy box (its on-air line), so its own page drops
      // the ON AIR banner to keep the button on the first screen.
      await expect(page.getByRole("link", { name: "Acquire this exhibit" })).toBeInViewport({
        ratio: 1,
      });
    }
  });

  test("the exhibit on air drops the banner from its own page, and only that one", async ({
    page,
  }) => {
    // One of the three purchasable exhibits is always on air, whatever the time.
    const withoutBanner: string[] = [];
    for (const slug of ["alien-paperclip", "second-best-quill", "viking-participation-trophy"]) {
      await page.goto(`/items/${slug}`);
      if ((await page.locator(".on-air-banner").count()) === 0) {
        withoutBanner.push(slug);
        await expect(page.locator(".buybox")).toContainText("On air now");
      } else {
        await expect(page.locator(".buybox")).not.toContainText("On air now");
      }
    }
    expect(withoutBanner).toHaveLength(1);
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
  // The page says so in words (note 0011), with a link to the dossier.
  await expect(page.getByRole("status").filter({ hasText: "Case closed." })).toContainText(
    "Card AS-0002 is in your dossier.",
  );
  await page.getByRole("link", { name: "Your Dossier" }).first().click();
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

test("the sound toggle is in the header, says its state in words and is remembered", async ({
  page,
}) => {
  await page.goto("/?fx=on");
  const toggle = page.getByRole("banner").getByRole("button", { name: "Sound: on" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(page.getByRole("button", { name: "Sound: off" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  // One setting for the whole shop: the Vault remembers it too.
  await page.goto("/vault?fx=on");
  await expect(page.getByRole("button", { name: "Sound: off" })).toBeVisible();
});

test("the plain group gets no sound script and no toggle", async ({ page }) => {
  await page.goto("/?fx=off");
  await expect(page.getByRole("button", { name: /^Sound:/ })).toHaveCount(0);
  expect(await page.evaluate(() => "BureauSound" in window)).toBe(false);
});

test("tuning in to the Broadcast says so and lights the host's lines", async ({ page }) => {
  await page.goto("/broadcast?fx=on");
  const tune = page.getByRole("button", { name: "Tune in" });
  await expect(tune).toHaveAttribute("aria-pressed", "false");
  await tune.click();
  await expect(page.getByRole("button", { name: "Tuned in" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".patter p.speaking")).toHaveCount(1, { timeout: 5_000 });
  await expectNoAxeViolations(page);
});

test("the Broadcast's host waits, pitches when you tune in, and reveals himself at the end", async ({
  page,
}) => {
  await page.goto("/broadcast?fx=on");
  const host = page.locator("[data-host]");
  await expect(host.getByRole("img", { name: "The Broadcast's host" })).toBeVisible();
  await expect(host).toHaveAttribute("data-pose", "waiting");
  await expect(host.locator(".host-antennae")).toHaveCSS("opacity", "0");
  await page.getByRole("button", { name: "Tune in" }).click();
  await expect(host).toHaveAttribute("data-pose", "pitching");
  // The countdown fires this when the segment's clock reaches zero.
  await page.evaluate(() => document.dispatchEvent(new Event("bureau:segment-end")));
  await expect(host).toHaveAttribute("data-pose", "sold");
  await expect(host.locator(".host-antennae")).toHaveCSS("opacity", "1");
});

test("the front page's host waits on the stage and reveals himself when the segment ends", async ({
  page,
}) => {
  await page.goto("/?fx=on");
  const host = page.locator(".stage [data-host]");
  await expect(host.getByRole("img", { name: "The Broadcast's host" })).toBeVisible();
  await expect(host).toHaveAttribute("data-pose", "waiting");
  await expect(host.locator(".host-antennae")).toHaveCSS("opacity", "0");
  // There's no "Tune in" on the front page: he pitches only on /broadcast.
  await expect(page.getByRole("button", { name: "Tune in" })).toHaveCount(0);
  await page.evaluate(() => document.dispatchEvent(new Event("bureau:segment-end")));
  await expect(host).toHaveAttribute("data-pose", "sold");
  await expect(host.locator(".host-antennae")).toHaveCSS("opacity", "1");
});

for (const path of ["/?fx=on", "/broadcast?fx=on"]) {
  test(`the Motion toggle on ${path} holds the host still, and remembers`, async ({ page }) => {
    await page.goto(path);
    const host = page.locator("[data-host]");
    await expect(host).toHaveAttribute("data-pose", "waiting");
    const toggle = page.getByRole("button", { name: "Motion: on" });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Motion: off" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(host).not.toHaveAttribute("data-pose", /./);
    // Still means still: the end of the segment doesn't move him either.
    await page.evaluate(() => document.dispatchEvent(new Event("bureau:segment-end")));
    await expect(host).not.toHaveAttribute("data-pose", /./);
    await page.reload();
    await expect(page.getByRole("button", { name: "Motion: off" })).toBeVisible();
    await expect(page.locator("[data-host]")).not.toHaveAttribute("data-pose", /./);
    // Sound is its own setting, and so is turning motion back on.
    await expect(page.getByRole("button", { name: "Sound: on" })).toBeVisible();
    await page.getByRole("button", { name: "Motion: off" }).click();
    await expect(page.locator("[data-host]")).toHaveAttribute("data-pose", "waiting");
    await expectNoAxeViolations(page);
  });
}

test("the stage's ticker crawls for the effects group, and the Motion toggle stops it", async ({
  page,
}) => {
  await page.goto("/?fx=on");
  const ticker = page.getByRole("region", { name: /^The ticker:/ });
  await expect(ticker).toHaveAttribute("data-rolling", "");
  // While it crawls a second copy follows the first, hidden from assistive technology.
  await expect(ticker.locator("ul")).toHaveCount(2);
  await expect(ticker.locator('ul[aria-hidden="true"]')).toHaveCount(1);
  await expect(ticker.getByRole("listitem").first()).toContainText(/^Fact This segment ends at/);
  await page.getByRole("button", { name: "Motion: on" }).click();
  await expect(ticker).not.toHaveAttribute("data-rolling", "");
  await expect(ticker.locator("ul")).toHaveCount(1);
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Motion: off" }).click();
  await expect(ticker).toHaveAttribute("data-rolling", "");
  await expectNoAxeViolations(page);
});

test("the ticker is a still strip for the plain group and under reduced motion", async ({
  page,
}) => {
  await page.goto("/?fx=off");
  const ticker = page.getByRole("region", { name: /^The ticker:/ });
  await expect(ticker).not.toHaveAttribute("data-rolling", "");
  await expect(ticker.locator("ul")).toHaveCount(1);
  // Every line says which kind it is, in words.
  for (const line of await ticker.getByRole("listitem").all()) {
    await expect(line).toContainText(/^(Fact|Lore) /);
  }
  // It can be reached and scrolled by keyboard.
  await ticker.focus();
  await expect(ticker).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?fx=on");
  await expect(ticker).not.toHaveAttribute("data-rolling", "");
  await expect(ticker.locator("ul")).toHaveCount(1);
});

test("the Motion toggle is only on pages with the host, and not under reduced motion", async ({
  page,
}) => {
  await page.goto("/dossier?fx=on");
  await expect(page.getByRole("button", { name: /^Sound:/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Motion:/ })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?fx=on");
  await expect(page.getByRole("button", { name: /^Sound:/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Motion:/ })).toHaveCount(0);
});

test("the Archivist sits on the front page's stage and works while the host is moving", async ({
  page,
}) => {
  await page.goto("/?fx=on");
  const archivist = page.locator(".stage .archivist-stage");
  await expect(archivist.getByRole("img", { name: "The Archivist" })).toBeVisible();
  await expect(page.locator(".stage [data-host]")).toHaveAttribute("data-pose", "waiting");
  await expect(archivist.locator(".archivist-stamp")).not.toHaveCSS("animation-name", "none");
  // Held still with the Motion toggle, he stops with the host.
  await page.getByRole("button", { name: "Motion: on" }).click();
  await expect(archivist.locator(".archivist-stamp")).toHaveCSS("animation-name", "none");
  await expect(archivist.locator(".archivist-page")).toHaveCSS("animation-name", "none");
  await expectNoAxeViolations(page);
});

test("the plain group sees the Archivist as a still drawing", async ({ page }) => {
  await page.goto("/?fx=off");
  const archivist = page.locator(".stage .archivist-stage");
  await expect(archivist.getByRole("img", { name: "The Archivist" })).toBeVisible();
  await expect(archivist.locator(".archivist-stamp")).toHaveCSS("animation-name", "none");
});

test("Trixie stands on a wide stage and moves while the host does", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.goto("/?fx=on");
  const trixie = page.locator(".stage .trixie-stage");
  await expect(trixie.getByRole("img", { name: /Trixie Parallax/ })).toBeVisible();
  await expect(trixie.locator(".trixie-arm")).not.toHaveCSS("animation-name", "none");
  // She stays clear of the Archivist and the exhibit inset.
  const [her, archivist, inset] = await Promise.all([
    trixie.boundingBox(),
    page.locator(".stage .archivist-stage").boundingBox(),
    page.locator(".stage .inset").boundingBox(),
  ]);
  expect(her && archivist && her.x + her.width).toBeLessThanOrEqual(archivist?.x ?? 0);
  expect(her && inset && inset.x + inset.width).toBeLessThanOrEqual(her?.x ?? 0);
  // Held still with the Motion toggle, she stops with the host.
  await page.getByRole("button", { name: "Motion: on" }).click();
  await expect(trixie.locator(".trixie-arm")).toHaveCSS("animation-name", "none");
  await expect(trixie.locator(".trixie-plumage")).toHaveCSS("animation-name", "none");
  await expectNoAxeViolations(page);
});

test("Trixie gives way on a narrow stage, and is a still drawing for the plain group", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/?fx=off");
  await expect(page.locator(".stage .trixie-stage")).toBeHidden();
  await page.setViewportSize({ width: 1100, height: 800 });
  const trixie = page.locator(".stage .trixie-stage");
  await expect(trixie.getByRole("img", { name: /Trixie Parallax/ })).toBeVisible();
  await expect(trixie.locator(".trixie-arm")).toHaveCSS("animation-name", "none");
});

for (const width of [900, 1100, 1440]) {
  test(`Nickel perches above Trixie at ${String(width)}px, clear of everyone, and moves with the host`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?fx=on");
    const nickel = page.locator(".stage .nickel-stage");
    await expect(nickel.getByRole("img", { name: /Nickel/ })).toBeVisible();
    await expect(nickel.locator(".nickel-bell")).not.toHaveCSS("animation-name", "none");
    // Five figures and the speech bubble, and none of them touches another.
    const boxes = await Promise.all(
      [
        ".says",
        ".stage .inset",
        ".nickel-stage",
        ".trixie-stage",
        ".archivist-stage",
        ".host-stage",
      ].map(async (selector) => ({
        selector,
        box: await page.locator(selector).first().boundingBox(),
      })),
    );
    for (const [index, a] of boxes.entries()) {
      for (const b of boxes.slice(index + 1)) {
        if (a.box === null || b.box === null)
          throw new Error(`${a.selector} or ${b.selector} is not laid out`);
        const apart =
          a.box.x + a.box.width <= b.box.x + 1 ||
          b.box.x + b.box.width <= a.box.x + 1 ||
          a.box.y + a.box.height <= b.box.y + 1 ||
          b.box.y + b.box.height <= a.box.y + 1;
        expect(apart, `${a.selector} and ${b.selector} overlap`).toBe(true);
      }
    }
    // Held still with the Motion toggle, he stops with the host.
    await page.getByRole("button", { name: "Motion: on" }).click();
    for (const part of [".nickel-bell", ".nickel-tape", ".nickel-arm-l", ".nickel-drawer"]) {
      await expect(nickel.locator(part)).toHaveCSS("animation-name", "none");
    }
    await expectNoAxeViolations(page);
  });
}

test("Nickel gives way on a narrow stage, and is a still drawing for the plain group", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/?fx=off");
  await expect(page.locator(".stage .nickel-stage")).toBeHidden();
  await page.setViewportSize({ width: 1100, height: 800 });
  const nickel = page.locator(".stage .nickel-stage");
  await expect(nickel.getByRole("img", { name: /Nickel/ })).toBeVisible();
  await expect(nickel.locator(".nickel-bell")).toHaveCSS("animation-name", "none");
});

test("the plain group sees the front page's host as a still drawing, with no toggles", async ({
  page,
}) => {
  await page.goto("/?fx=off");
  const host = page.locator(".stage [data-host]");
  await expect(host.getByRole("img", { name: "The Broadcast's host" })).toBeVisible();
  await expect(host).not.toHaveAttribute("data-pose", /./);
  await expect(page.getByRole("button", { name: /^(Sound|Motion):/ })).toHaveCount(0);
});

test("the plain group sees the host as a still drawing", async ({ page }) => {
  await page.goto("/broadcast?fx=off");
  const host = page.locator("[data-host]");
  await expect(host.getByRole("img", { name: "The Broadcast's host" })).toBeVisible();
  await expect(host).not.toHaveAttribute("data-pose", /./);
  await expect(page.getByText("Sketch by The Bureau.")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("a link with a sound still gets there", async ({ page }) => {
  await page.goto("/items/alien-paperclip?fx=on");
  await page.getByRole("link", { name: "Acquire this exhibit" }).click();
  await expect(page).toHaveURL(/\/checkout\/alien-paperclip$/);
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
  await page.goto("/disclaimer");
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
