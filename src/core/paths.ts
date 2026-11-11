/**
 * Every fixed URL path the shop serves, in one place: pages, form posts,
 * scripts and the stylesheet. Link to a page with its constant, never a
 * typed-out string, so a path can be changed here and nowhere else.
 *
 * Paths that carry a slug (/items/<slug>, /checkout/<slug>, /share/...) are
 * matched by patterns that live with their parsers (catalog.ts, checkout.ts,
 * share.ts); the functions here build the links to them.
 *
 * Every constant is a plain string literal, with no imports, so a browser
 * script (src/client) that uses one path bundles that path and nothing else.
 * A test checks the ones that extend another path still start with it.
 */

export const HOME_PATH = "/";

/** An exhibit's page. */
export function itemPathFor(slug: string): string {
  return `/items/${slug}`;
}

/** An exhibit's illustration. */
export function artPath(slug: string): string {
  return `/assets/art/${slug}.svg`;
}

/** The Fine Print. */
export const DISCLAIMER_PATH = "/disclaimer";

/**
 * Where the terms of sale start on The Fine Print. Linked beside every place a
 * buyer pays, so the terms are in front of them when they agree to them; the
 * page itself is linked from every footer.
 */
export const TERMS_PATH = "/disclaimer#terms-heading";

/** Where The Fine Print says what the shop keeps on file. */
export const METHODS_PATH = "/disclaimer#methods-heading";

/** Where buyers land after paying. */
export const THANKS_PATH = "/thanks";

export const DOSSIER_PATH = "/dossier";

/** The Dispatch section of the dossier. */
export const DOSSIER_DISPATCH_PATH = "/dossier#dispatch";

export const VAULT_PATH = "/vault";
export const VAULT_PULL_PATH = "/vault/pull";

/** Where a pull sends the agent back to: the result, with the door opening. */
export const VAULT_OPENED_LOCATION = "/vault?opened=1#latest-pull";

export const BROADCAST_PATH = "/broadcast";

/** "Grease the Clerk": the form post that starts a buy-back, and where Stripe returns the buyer. */
export const REPAIR_PATH = "/streak/repair";
export const REPAIR_RETURN_PATH = "/streak/restored";

export const DISPATCH_PATH = "/dispatch";
export const DISPATCH_SENT_PATH = "/dispatch/sent";
export const DISPATCH_CONFIRM_PATH = "/dispatch/confirm";
export const DISPATCH_RECOVER_PATH = "/dispatch/recover";
export const DISPATCH_UNSUBSCRIBE_PATH = "/dispatch/unsubscribe";

/** Where the story script reports reads. */
export const EVENTS_PATH = "/events";

export const WEBHOOK_PATH = "/webhooks/stripe";

/** Everything private to the Bureau sits under here, behind Cloudflare Access. */
export const BUREAU_PATH = "/bureau";
export const LEDGER_PATH = "/bureau/ledger";

export const STYLESHEET_PATH = "/assets/site.css";

/** Our own scripts (see worker/scripts.ts for what each one is). */
export const STORY_SCRIPT_PATH = "/assets/story.js";
export const COUNTDOWN_SCRIPT_PATH = "/assets/countdown.js";
/** The Vault's own script (src/client/entries/vault.ts): the lever plays in place. */
export const VAULT_SCRIPT_PATH = "/assets/vault.js";
export const SOUND_SCRIPT_PATH = "/assets/sound.js";
export const CHECKOUT_SCRIPT_PATH = "/assets/checkout.js";
