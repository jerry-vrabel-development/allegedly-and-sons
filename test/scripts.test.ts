import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { route, type Deps } from "../src/worker/index";
import { disclaimerPage } from "../src/worker/pages";
import { scriptResponse, SCRIPTS } from "../src/worker/scripts";
import {
  CHECKOUT_SCRIPT_PATH,
  COUNTDOWN_SCRIPT_PATH,
  SOUND_SCRIPT_PATH,
  STORY_SCRIPT_PATH,
  VAULT_SCRIPT_PATH,
} from "../src/core/paths";

const BASE = "https://allegedly.example";

/**
 * What The Fine Print says about each script we serve. A new script needs a
 * line here, and those words in "What Runs in Your Browser" (terms.ts), so the
 * shop never runs something its own disclosure doesn't name.
 */
const NAMED_IN_THE_FINE_PRINT: Readonly<Record<string, string>> = {
  [STORY_SCRIPT_PATH]: "notes when you open a case file and whether you read it to the end",
  [COUNTDOWN_SCRIPT_PATH]: "run one that counts down their clocks",
  [VAULT_SCRIPT_PATH]: "the Vault also runs one that animates the lever",
  [SOUND_SCRIPT_PATH]: "every shop page except checkout runs a sound script of ours",
  [CHECKOUT_SCRIPT_PATH]: "a small one of ours that loads it",
};

const deps: Deps = {
  stripeKey: undefined,
  webhookSecret: undefined,
  fetch: () => Promise.reject(new Error("no outside calls")),
  db: env.DB,
  nowSeconds: () => Date.UTC(2026, 10, 10, 15) / 1000,
  waitUntil: () => undefined,
  visitorId: null,
  access: undefined,
};

describe("the scripts the Worker serves", () => {
  it("are each named in The Fine Print, and nothing is named that isn't served", () => {
    expect(Object.keys(SCRIPTS).sort()).toEqual(Object.keys(NAMED_IN_THE_FINE_PRINT).sort());
    const finePrint = disclaimerPage().value.replace(/\s+/g, " ");
    for (const [path, words] of Object.entries(NAMED_IN_THE_FINE_PRINT)) {
      expect(finePrint, path).toContain(words);
    }
  });

  it("are served as cacheable JavaScript from their own paths", async () => {
    for (const [path, source] of Object.entries(SCRIPTS)) {
      const response = await route(new Request(`${BASE}${path}`), deps);
      expect(response.status, path).toBe(200);
      expect(response.headers.get("Content-Type"), path).toBe("text/javascript; charset=utf-8");
      expect(response.headers.get("Cache-Control"), path).toBe("public, max-age=300");
      expect(await response.text(), path).toBe(source);
    }
  });

  it("serve nothing for a path that isn't a script, even one that names a built-in", () => {
    expect(scriptResponse("/assets/nothing.js")).toBeUndefined();
    expect(scriptResponse("constructor")).toBeUndefined();
    expect(scriptResponse("toString")).toBeUndefined();
  });
});
