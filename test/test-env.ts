import { env } from "cloudflare:workers";
import type { Secrets } from "../src/worker/index";

/**
 * An environment for calling the Worker directly: the real bindings and public
 * vars, plus only the secrets a test passes in. Never spreads `env` itself, so a
 * developer's local .dev.vars (a real sandbox key) can't leak into a test.
 */
export function testEnv(secrets: Secrets = {}) {
  return {
    DB: env.DB,
    STRIPE_PUBLISHABLE_KEY: env.STRIPE_PUBLISHABLE_KEY,
    ACCESS_TEAM_DOMAIN: env.ACCESS_TEAM_DOMAIN,
    ACCESS_AUD: env.ACCESS_AUD,
    ...secrets,
  };
}
