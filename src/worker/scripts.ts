/**
 * Every script the Worker serves, by path: the one place a script is added.
 *
 * All are first-party, served from our own origin and never inline. The Fine
 * Print's "What Runs in Your Browser" names each one in plain words, and a
 * test (test/scripts.test.ts) fails if a script is added here without being
 * named there.
 */

import { CHECKOUT_JS, COUNTDOWN_JS, STORY_JS, VAULT_JS } from "./client-scripts.generated";
import { SOUND_JS } from "./sound-script";
import {
  CHECKOUT_SCRIPT_PATH,
  COUNTDOWN_SCRIPT_PATH,
  SOUND_SCRIPT_PATH,
  STORY_SCRIPT_PATH,
  VAULT_SCRIPT_PATH,
} from "../core/paths";

export const SCRIPTS: Readonly<Record<string, string>> = {
  [STORY_SCRIPT_PATH]: STORY_JS,
  [COUNTDOWN_SCRIPT_PATH]: COUNTDOWN_JS,
  [VAULT_SCRIPT_PATH]: VAULT_JS,
  [SOUND_SCRIPT_PATH]: SOUND_JS,
  [CHECKOUT_SCRIPT_PATH]: CHECKOUT_JS,
};

/** The response for a script path, or undefined if we serve no script there. */
export function scriptResponse(pathname: string): Response | undefined {
  // Own keys only: "/constructor" and the like must not find Object's.
  if (!Object.hasOwn(SCRIPTS, pathname)) return undefined;
  return new Response(SCRIPTS[pathname], {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
