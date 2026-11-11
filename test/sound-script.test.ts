import { createExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";
import worker, { route, type Deps } from "../src/worker/index";
import { CARD_EVENT, SEGMENT_END_EVENT } from "../src/core/dom-events";
import { COUNTDOWN_JS, SOUND_JS, STORY_JS } from "../src/worker/client-scripts.generated";
import { itemPage, thanksPage } from "../src/worker/pages";
import { STRICT_CSP } from "../src/worker/security-headers";
import { LEGACY_MUTE_KEY, SOUND_MUTE_KEY } from "../src/client/sound-rules";
import { SOUND_NAMES } from "../src/client/sounds";
import { CASE_CLOSED_ID } from "../src/core/story";
import { testEnv } from "./test-env";
import { SOUND_SCRIPT_PATH, VAULT_SCRIPT_PATH } from "../src/core/paths";

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

  // The rules and the recipes are unit tested (sounds.test.ts) and the toggle,
  // links and "Tune in" are watched in real browsers (e2e); these check the
  // bundle itself.
  it("does nothing risky: no eval, no innerHTML, no other hosts, one stored setting", () => {
    expect(SOUND_JS).not.toMatch(
      /eval\(|new Function|innerHTML|outerHTML|document\.write|sessionStorage|https?:\/\//,
    );
    expect(SOUND_JS).not.toMatch(/^\s*(import|export)\s/m);
    // Storage is reached for in one place, and only these two keys are named.
    expect(SOUND_JS.match(/localStorage/g)).toHaveLength(1);
    expect(SOUND_JS.match(/"bureau-[a-z-]+"/g)?.sort()).toEqual(
      [JSON.stringify(SOUND_MUTE_KEY), JSON.stringify(LEGACY_MUTE_KEY)].sort(),
    );
    expect(SOUND_JS.match(/\.setItem\(/g)).toHaveLength(1);
  });

  it("carries the sounds and nothing else: no catalog, nothing it doesn't use", () => {
    expect(SOUND_JS.length).toBeLessThan(15_000);
    for (const name of SOUND_NAMES) expect(SOUND_JS).toMatch(new RegExp(`\\b${name}: `));
    for (const item of CATALOG) expect(SOUND_JS).not.toContain(item.slug);
  });

  it("offers the Vault's reel a way to play, and listens for the other scripts", () => {
    expect(SOUND_JS).toContain("window.BureauSound = {");
    expect(SOUND_JS).toContain("addEventListener(CARD_EVENT");
    expect(SOUND_JS).toContain("addEventListener(SEGMENT_END_EVENT");
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
    expect(STORY_JS).toContain("`Case closed. Card ${card} is in your dossier.`");
    expect(STORY_JS).toContain(`CARD_EVENT = ${JSON.stringify(CARD_EVENT)}`);
    expect(STORY_JS).toContain("new Event(CARD_EVENT)");
    expect(STORY_JS).not.toMatch(/innerHTML|outerHTML/);
  });
});

describe("tune in to the Broadcast (note 0011, PR 2)", () => {
  it("marks the broadcast page so the sound module can add the button", async () => {
    expect(await html("/broadcast", FX)).toContain('class="broadcast" data-broadcast');
  });

  it("plays the stinger when the segment ends, only for listeners who tuned in", () => {
    // The bundle carries the event's name and sends it.
    expect(COUNTDOWN_JS).toContain(`SEGMENT_END_EVENT = ${JSON.stringify(SEGMENT_END_EVENT)}`);
    expect(COUNTDOWN_JS).toContain("new Event(SEGMENT_END_EVENT)");
    // The event fires before the reload, so the stinger has time to start.
    expect(COUNTDOWN_JS.indexOf("dispatchEvent")).toBeLessThan(COUNTDOWN_JS.indexOf("reload()"));
    expect(SOUND_JS).toContain('if (tuned) play("stinger")');
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
});
