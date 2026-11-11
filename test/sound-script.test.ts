import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import worker, { route, type Deps } from "../src/worker/index";
import { COUNTDOWN_JS, SEGMENT_END_EVENT } from "../src/worker/broadcast-script";
import { itemPage, thanksPage } from "../src/worker/pages";
import { STRICT_CSP } from "../src/worker/security-headers";
import {
  CARD_EVENT,
  HOST_LINE_MS,
  LEGACY_MUTE_KEY,
  LINK_DELAY_MS,
  SOUND_JS,
  SOUND_MUTE_KEY,
  SOUND_NAMES,
  wantsSound,
  withSound,
} from "../src/worker/sound-script";
import { CASE_CLOSED_ID, STORY_JS } from "../src/worker/story-script";
import { testEnv } from "./test-env";
import { SOUND_SCRIPT_PATH, STYLESHEET_PATH, VAULT_SCRIPT_PATH } from "../src/core/paths";

const BASE = "https://allegedly.example";
/** Ends in "a": the "fx" group. */
const FX = "a".repeat(32);
/** Ends in "b": the "plain" group. */
const PLAIN = "b".repeat(32);
const NOW = Date.UTC(2026, 10, 10, 15) / 1000;
const TAG = `<script src="${SOUND_SCRIPT_PATH}" defer></script>`;

function deps(visitorId: string | null): Deps {
  return {
    stripeKey: undefined,
    webhookSecret: undefined,
    fetch: () => Promise.reject(new Error("no outside calls")),
    db: env.DB,
    nowSeconds: () => NOW,
    waitUntil: () => undefined,
    visitorId,
    access: undefined,
  };
}

async function html(path: string, visitorId: string | null): Promise<string> {
  const response = await route(new Request(`${BASE}${path}`), deps(visitorId));
  expect(response.status, path).toBe(200);
  return response.text();
}

describe("the sound script", () => {
  it("is served from our origin as JavaScript, under the strict policy", async () => {
    const response = await worker.fetch(
      new Request(`${BASE}${SOUND_SCRIPT_PATH}`),
      testEnv(),
      createExecutionContext(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("Content-Security-Policy")).toBe(STRICT_CSP);
    expect(await response.text()).toBe(SOUND_JS);
  });

  it("does nothing risky: no eval, no innerHTML, no other hosts, one stored setting", () => {
    expect(SOUND_JS).not.toMatch(
      /eval\(|new Function|innerHTML|outerHTML|document\.write|sessionStorage|https?:\/\//,
    );
    expect(SOUND_JS.match(/localStorage\.\w+\(/g)).toEqual([
      "localStorage.getItem(",
      "localStorage.getItem(",
      "localStorage.setItem(",
    ]);
    expect(SOUND_JS).toContain(`setItem(${JSON.stringify(SOUND_MUTE_KEY)}`);
    // The Vault's old setting is only ever read, so nobody's choice is lost.
    expect(SOUND_JS).toContain(`getItem(${JSON.stringify(LEGACY_MUTE_KEY)})`);
  });

  it("knows every sound by name, and plays nothing it doesn't know", () => {
    for (const name of SOUND_NAMES) expect(SOUND_JS).toMatch(new RegExp(`\\b${name}: function`));
    expect(SOUND_JS).toContain("hasOwnProperty.call(sounds, name)");
  });

  it("says the toggle's state in words and with aria-pressed", () => {
    expect(SOUND_JS).toContain('"Sound: off" : "Sound: on"');
    expect(SOUND_JS).toContain('setAttribute("aria-pressed"');
  });

  it("delays a link only briefly, and never a new-tab or modified click", () => {
    expect(LINK_DELAY_MS).toBeLessThanOrEqual(250);
    expect(SOUND_JS).toContain("event.metaKey || event.ctrlKey || event.shiftKey || event.altKey");
    expect(SOUND_JS).toContain('!target.hasAttribute("target")');
    expect(SOUND_JS).toContain("!muted");
  });

  it("creaks when a case file opens and stamps when one is finished", () => {
    expect(SOUND_JS).toContain('if (story.open) play("creak")');
    expect(SOUND_JS).toContain(`addEventListener(${JSON.stringify(CARD_EVENT)}`);
  });
});

describe("withSound and wantsSound", () => {
  it("adds the script right after the stylesheet, so it runs before page scripts", () => {
    const page = `<head><link rel="stylesheet" href="${STYLESHEET_PATH}" /><script src="/x.js" defer></script></head>`;
    const added = withSound(page, STYLESHEET_PATH);
    expect(added.indexOf(TAG)).toBeGreaterThan(added.indexOf(STYLESHEET_PATH));
    expect(added.indexOf(TAG)).toBeLessThan(added.indexOf("/x.js"));
  });

  it("leaves a page without our stylesheet unchanged", () => {
    expect(withSound("<p>hi</p>", STYLESHEET_PATH)).toBe("<p>hi</p>");
  });

  it("skips checkout, private pages, posts and the health check", () => {
    for (const path of ["/checkout/alien-paperclip", "/bureau/ledger", "/vault/pull", "/healthz"]) {
      expect(wantsSound(path), path).toBe(false);
    }
    for (const path of ["/", "/items/alien-paperclip", "/vault", "/broadcast", "/thanks"]) {
      expect(wantsSound(path), path).toBe(true);
    }
  });
});

describe("which visitors get sound (note 0011: the A/B test grows)", () => {
  it("adds it for the fx group on every shop page", async () => {
    for (const path of ["/", "/items/alien-paperclip", "/dossier", "/broadcast", "/thanks"]) {
      expect(await html(path, FX), path).toContain(TAG);
    }
  });

  it("leaves it out for the plain group and visitors with no id", async () => {
    for (const visitor of [PLAIN, null]) {
      expect(await html("/", visitor)).not.toContain(TAG);
    }
  });

  it("follows ?fx=on and ?fx=off for one view", async () => {
    expect(await html("/?fx=on", PLAIN)).toContain(TAG);
    expect(await html("/?fx=off", FX)).not.toContain(TAG);
  });

  it("loads before the Vault's reel, which uses it", async () => {
    const page = await html("/vault", FX);
    expect(page.indexOf(TAG)).toBeGreaterThan(0);
    expect(page.indexOf(TAG)).toBeLessThan(page.indexOf(VAULT_SCRIPT_PATH));
  });
});

describe("case closed (note 0011)", () => {
  it("gives a story with a case file an empty status line for the story script to fill", () => {
    const page = itemPage(CATALOG[0], BASE).value;
    expect(page).toContain(`<p class="case-closed" id="${CASE_CLOSED_ID}" role="status"></p>`);
    expect(page).toContain(`data-card="${CATALOG[0].exhibit}"`);
  });

  it("has no status line when there's no case file to finish", () => {
    const [first] = CATALOG[0].story.paragraphs;
    const short = { ...CATALOG[0], story: { ...CATALOG[0].story, paragraphs: [first] as const } };
    expect(itemPage(short, BASE).value).not.toContain(CASE_CLOSED_ID);
  });

  it("says the card was earned in words, safely, and fires the card event", () => {
    expect(STORY_JS).toContain('"Case closed. Card " + card + " is in your dossier."');
    expect(STORY_JS).toContain(`new Event(${JSON.stringify(CARD_EVENT)})`);
    expect(STORY_JS).not.toMatch(/innerHTML|outerHTML/);
  });
});

describe("tune in to the Broadcast (note 0011, PR 2)", () => {
  it("marks the broadcast page so the sound module can add the button", async () => {
    expect(await html("/broadcast", FX)).toContain('class="broadcast" data-broadcast');
  });

  it("says its state in words and with aria-pressed, and plays static then the stinger", () => {
    expect(SOUND_JS).toContain('button("Tune in")');
    expect(SOUND_JS).toContain('tune.textContent = "Tuned in"');
    expect(SOUND_JS).toContain('tune.setAttribute("aria-pressed", "true")');
    expect(SOUND_JS).toContain('play("static")');
    expect(SOUND_JS).toContain('play("stinger")');
  });

  it("lights the host's lines one at a time, but not under reduced motion", () => {
    expect(HOST_LINE_MS).toBeGreaterThanOrEqual(3000);
    expect(SOUND_JS).toContain('classList.add("speaking")');
    expect(SOUND_JS).toContain("if (!reduced) setTimeout(nextLine");
  });

  it("plays the stinger when the segment ends, only for listeners who tuned in", () => {
    expect(COUNTDOWN_JS).toContain(`new Event(${JSON.stringify(SEGMENT_END_EVENT)})`);
    // The event fires before the reload, so the stinger has time to start.
    expect(COUNTDOWN_JS.indexOf("dispatchEvent")).toBeLessThan(COUNTDOWN_JS.indexOf("reload()"));
    expect(SOUND_JS).toContain(
      `addEventListener(${JSON.stringify(SEGMENT_END_EVENT)}, function () { if (tuned) play("stinger"); })`,
    );
  });
});

describe("stamp your certificate (note 0011, PR 2)", () => {
  const item = CATALOG[0];

  it("gives a paid thank-you page a place for the stamp, with the certificate number", () => {
    expect(thanksPage({ kind: "paid", item }).value).toContain(
      `<div class="certificate-moment" data-certificate="${item.exhibit}"></div>`,
    );
  });

  it("has no stamp when the item is unknown, or the payment isn't done", () => {
    expect(thanksPage({ kind: "paid", item: undefined }).value).not.toContain("data-certificate");
    expect(thanksPage({ kind: "processing", item }).value).not.toContain("data-certificate");
    expect(thanksPage({ kind: "incomplete", item }).value).not.toContain("data-certificate");
  });

  it("slams, plays the fanfare and says the stamp in words, announced", () => {
    expect(SOUND_JS).toContain('button("Stamp your certificate")');
    expect(SOUND_JS).toContain('play("slam")');
    expect(SOUND_JS).toContain('play("fanfare")');
    expect(SOUND_JS).toContain(
      '"Stamped: Bureau Certificate No. " + number + ". Authenticity: Allegedly."',
    );
    expect(SOUND_JS).toContain('said.setAttribute("role", "status")');
  });
});
