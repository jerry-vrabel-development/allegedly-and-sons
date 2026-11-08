/**
 * Test-only signing for Cloudflare Access JWTs: a real RSA key pair, made fresh
 * per test run, standing in for the team's keys.
 */

export const TEAM = "allegedlyandsons.cloudflareaccess.com";
export const AUD = "a".repeat(64);
export const NOW = 1762531200;

const encoder = new TextEncoder();
export function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? encoder.encode(bytes) : bytes;
  return btoa(String.fromCharCode(...raw))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function keyPair(kid: string) {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  )) as CryptoKeyPair;
  const jwk = (await crypto.subtle.exportKey("jwk", pair.publicKey)) as JsonWebKey;
  return { privateKey: pair.privateKey, jwk: { ...jwk, kid, alg: "RS256", use: "sig" } };
}

export const SIGNER = await keyPair("key-1");
export const OTHER = await keyPair("key-2");

export async function token(
  claims: Record<string, unknown> = {},
  header: Record<string, unknown> = {},
  key: CryptoKey = SIGNER.privateKey,
): Promise<string> {
  const h = b64url(JSON.stringify({ alg: "RS256", kid: "key-1", typ: "JWT", ...header }));
  const p = b64url(
    JSON.stringify({
      aud: [AUD],
      iss: `https://${TEAM}`,
      exp: NOW + 3600,
      iat: NOW - 10,
      nbf: NOW - 10,
      email: "jerry@example.com",
      ...claims,
    }),
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(`${h}.${p}`));
  return `${h}.${p}.${b64url(new Uint8Array(signature))}`;
}

/** The URL a fetch was called with, whatever form it took. */
export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}
