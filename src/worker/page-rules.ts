/**
 * One table for what each kind of page gets: its Content Security Policy and
 * the chrome the shared layout adds (the ON AIR banner, the sound script).
 * The security headers and the router both read it, so a new page is given
 * its policy and its chrome in one place.
 *
 * Rules apply to successful (200) responses only. Errors, redirects and
 * not-found pages always get the strict policy and no chrome.
 */

import { ITEM_PATH } from "../core/catalog";
import { CHECKOUT_PATH } from "../core/checkout";
import {
  BROADCAST_PATH,
  BUREAU_PATH,
  DISPATCH_PATH,
  REPAIR_RETURN_PATH,
  THANKS_PATH,
  VAULT_PATH,
} from "../core/paths";

/**
 * - strict: no script at all (assets, the private ledger, the health check).
 * - shop: our own scripts, and no connections.
 * - ownOrigin: our own scripts, which may also talk to our own origin.
 * - checkout: Stripe's documented sources, on the embedded checkout page only.
 */
export type Policy = "strict" | "shop" | "ownOrigin" | "checkout";

export interface PageRule {
  readonly policy: Policy;
  /** Whether the page carries the ON AIR banner (note 0009). */
  readonly banner: boolean;
  /** Whether the page loads the sound script, for the "fx" group (note 0011). */
  readonly sound: boolean;
}

/** Responses that never run script: assets, the private ledger, the health check. */
const NO_SCRIPT = /^\/(?:assets\/|bureau|healthz)/;

/** The first rule whose `matches` is true decides. */
const RULES: readonly (PageRule & { readonly matches: (pathname: string) => boolean })[] = [
  // The embedded checkout page: Stripe's form, and nothing of ours beside it.
  {
    matches: (path) => CHECKOUT_PATH.test(path),
    policy: "checkout",
    banner: false,
    sound: false,
  },
  // Item pages report reads to our own origin (note 0001, C4).
  { matches: (path) => ITEM_PATH.test(path), policy: "ownOrigin", banner: true, sound: true },
  // The Vault's reel posts the pull to our own origin (note 0008).
  { matches: (path) => path === VAULT_PATH, policy: "ownOrigin", banner: true, sound: true },
  // The Broadcast is the thing the banner points at, so it doesn't carry one.
  { matches: (path) => path === BROADCAST_PATH, policy: "ownOrigin", banner: false, sound: true },
  // No path (a caller forgot it) fails safe, like everything that runs no script.
  {
    matches: (path) => path === "" || NO_SCRIPT.test(path),
    policy: "strict",
    banner: false,
    sound: false,
  },
  // Pages about one visitor's payment or email link stay free of the banner.
  {
    matches: (path) =>
      path === THANKS_PATH || path === REPAIR_RETURN_PATH || path.startsWith(`${DISPATCH_PATH}/`),
    policy: "shop",
    banner: false,
    sound: true,
  },
];

/** Every other shop page. */
const SHOP_PAGE: PageRule = { policy: "shop", banner: true, sound: true };

/** The rule for a successful response at `pathname`. */
export function pageRule(pathname: string): PageRule {
  return RULES.find((rule) => rule.matches(pathname)) ?? SHOP_PAGE;
}

/** Whether `pathname` is under the private Bureau (kept here so the prefix has one reader). */
export function isBureauPath(pathname: string): boolean {
  return pathname === BUREAU_PATH || pathname.startsWith(`${BUREAU_PATH}/`);
}
