/** Reading the Worker's environment: secrets, public vars and bindings, blank treated as unset. */

import { DISPATCH_FROM, type OutgoingEmail } from "../core/dispatch";
import type { PublicVars, Secrets } from "./deps";
import { ORDER_CONTACT_EMAIL } from "./pages";

/**
 * The real `fetch`, wrapped so it's never called with the wrong `this`
 * (Workers throw "Illegal invocation" if it is).
 */
export const globalFetch: typeof fetch = (input, init) => fetch(input, init);

/** A secret's value, trimmed, or undefined when it's missing or blank. */
function secretValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/** Reads the Stripe key from the environment, treating blank as unset. */
export function stripeKeyFrom(env: Secrets): string | undefined {
  return secretValue(env.STRIPE_SECRET_KEY);
}

/** Reads the webhook signing secret from the environment, treating blank as unset. */
export function webhookSecretFrom(env: Secrets): string | undefined {
  return secretValue(env.STRIPE_WEBHOOK_SECRET);
}

/** Reads the Stripe publishable key, accepting only pk_test_/pk_live_ keys. */
export function publishableKeyFrom(vars: PublicVars): string | undefined {
  const key = secretValue(vars.STRIPE_PUBLISHABLE_KEY);
  return key !== undefined && /^pk_(test|live)_[A-Za-z0-9]+$/.test(key) ? key : undefined;
}

/** The current time in whole Unix seconds. */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/** Reads the Dispatch footer's postal address, treating blank as unset. */
export function postalAddressFrom(vars: PublicVars): string | undefined {
  return secretValue(vars.DISPATCH_POSTAL_ADDRESS);
}

/** Wraps the email binding so the rest of the Worker sends plain OutgoingEmails. */
export function emailSender(
  binding: SendEmail | undefined,
): ((email: OutgoingEmail) => Promise<void>) | undefined {
  if (binding === undefined) return undefined;
  return async (email) => {
    await binding.send({
      from: DISPATCH_FROM,
      replyTo: ORDER_CONTACT_EMAIL,
      to: email.to,
      subject: email.subject,
      text: email.text,
      ...(email.headers === undefined ? {} : { headers: { ...email.headers } }),
    });
  };
}
