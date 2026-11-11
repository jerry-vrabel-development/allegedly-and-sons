/**
 * What the Worker needs from the outside world: its secrets and public
 * config, and the dependencies every route handler is given so tests can swap
 * in fakes.
 */

import type { OutgoingEmail } from "../core/dispatch";
import type { AccessDeps } from "./access";
import type { AnalyticsDeps } from "./analytics";
import type { WebhookDeps } from "./webhook";

/**
 * Secrets the Worker reads. Set each with `npx wrangler secret put <NAME>`, and
 * locally in .dev.vars.
 */
export interface Secrets {
  readonly STRIPE_SECRET_KEY?: string;
  /** The webhook endpoint's signing secret (whsec_...), from the Stripe dashboard. */
  readonly STRIPE_WEBHOOK_SECRET?: string;
}

/** Public config. Not secret: Stripe publishable keys are meant to be in pages. */
export interface PublicVars {
  /** pk_test_... or pk_live_..., set in wrangler.jsonc "vars". */
  readonly STRIPE_PUBLISHABLE_KEY?: string;
  /** Cloudflare Access team domain, e.g. allegedlyandsons.cloudflareaccess.com. */
  readonly ACCESS_TEAM_DOMAIN?: string;
  /** The Access application's Audience (AUD) tag for /bureau. Unset keeps /bureau closed. */
  readonly ACCESS_AUD?: string;
  /**
   * The postal address every Dispatch email carries (CAN-SPAM). Public: it's
   * in every email. Unset keeps the Dispatch closed (note 0007).
   */
  readonly DISPATCH_POSTAL_ADDRESS?: string;
}

/** What `route` needs from the outside world, so tests can swap in fakes. */
export interface Deps extends WebhookDeps, AnalyticsDeps, AccessDeps {
  /** Stripe publishable key for the embedded checkout, or undefined to use only the hosted flow. */
  readonly publishableKey?: string | undefined;
  /** Stripe secret key, or undefined when checkout isn't configured. */
  readonly stripeKey: string | undefined;
  readonly fetch: typeof fetch;
  /** Random 32-bit numbers for the vault lever. Defaults to the secure generator. */
  readonly randomUint32?: () => number;
  /** Sends one Dispatch email. Undefined when the Worker has no email binding. */
  readonly sendEmail?: ((email: OutgoingEmail) => Promise<void>) | undefined;
  /** The Dispatch footer's postal address. Undefined keeps the Dispatch closed. */
  readonly postalAddress?: string | undefined;
}
