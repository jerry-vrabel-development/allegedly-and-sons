/**
 * Small checks shared across the core: the shapes we accept from outside
 * (request bodies, Stripe payloads, tokens) before reading anything from them.
 */

/** A plain object: not null, not an array. Safe to read fields from as `unknown`. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An item slug as it may arrive from outside (Stripe metadata): lowercase
 * letters, digits and hyphens, at most 64 characters. It says the text is
 * safe to store and show, not that the item exists (see findItem).
 */
export const SLUG = /^[a-z0-9-]{1,64}$/;
