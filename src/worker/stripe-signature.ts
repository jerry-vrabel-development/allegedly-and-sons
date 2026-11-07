/**
 * Verifies the `Stripe-Signature` header on a webhook (design note 0004).
 *
 * Stripe signs `<timestamp>.<raw body>` with HMAC-SHA256, using the endpoint's
 * signing secret (the whole `whsec_...` string) as the key, and sends
 * `t=<timestamp>,v1=<hex>`. During secret rotation it sends one `v1` per
 * secret. `v0` is a legacy test scheme and is ignored.
 *
 * Plain Web Crypto, no SDK. The comparison is done by `crypto.subtle.verify`,
 * which compares in constant time, so we never hand-roll a string compare.
 */

/** How far the signed timestamp may be from now, either way, before we refuse it. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

/** Why a signature was refused. Short and safe to log: no secret, no payload. */
export type SignatureFailure =
  "missing header" | "malformed header" | "timestamp outside tolerance" | "no matching signature";

export type SignatureCheck =
  { readonly ok: true } | { readonly ok: false; readonly reason: SignatureFailure };

const HEX_SHA256 = /^[0-9a-f]{64}$/i;
const DIGITS = /^\d+$/;

interface ParsedHeader {
  readonly timestamp: string;
  readonly signatures: readonly Uint8Array[];
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Parses `t=...,v1=...,v1=...`. Exactly one numeric `t` and at least one well-formed `v1`. */
function parseHeader(header: string): ParsedHeader | undefined {
  const timestamps: string[] = [];
  const signatures: Uint8Array[] = [];
  for (const part of header.split(",")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "t") timestamps.push(value);
    if (key === "v1") {
      if (!HEX_SHA256.test(value)) return undefined;
      signatures.push(hexToBytes(value));
    }
  }
  const [timestamp] = timestamps;
  if (timestamps.length !== 1 || timestamp === undefined || !DIGITS.test(timestamp)) {
    return undefined;
  }
  if (signatures.length === 0) return undefined;
  return { timestamp, signatures };
}

/**
 * Checks a webhook's signature. `payload` must be the raw request body, exactly
 * as received, read before any JSON parsing. `nowSeconds` is passed in so tests
 * control the clock. Never throws.
 */
export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds: number,
): Promise<SignatureCheck> {
  if (header === null || header.trim() === "") return { ok: false, reason: "missing header" };

  const parsed = parseHeader(header);
  if (parsed === undefined) return { ok: false, reason: "malformed header" };

  // Web Crypto refuses an empty HMAC key; an unset secret can never match anyway.
  if (secret === "") return { ok: false, reason: "no matching signature" };

  if (Math.abs(nowSeconds - Number(parsed.timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signed = encoder.encode(`${parsed.timestamp}.${payload}`);

  for (const signature of parsed.signatures) {
    if (await crypto.subtle.verify("HMAC", key, signature, signed)) return { ok: true };
  }
  return { ok: false, reason: "no matching signature" };
}
