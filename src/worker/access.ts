/**
 * Cloudflare Access, checked by the Worker too (defense in depth).
 *
 * Access sits in front of /bureau and only lets the owner through, after an
 * emailed one-time code. Every request it lets through carries a signed JWT
 * in the Cf-Access-Jwt-Assertion header. The Worker verifies that token
 * itself (signature, audience, issuer, expiry), so if the Access rule is ever
 * edited away or misconfigured, /bureau fails closed instead of open.
 * See https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

import { isRecord } from "../core/guards";

export interface AccessConfig {
  /** e.g. "allegedlyandsons.cloudflareaccess.com". */
  readonly teamDomain: string;
  /** The Access application's Audience (AUD) tag. */
  readonly aud: string;
}

export interface AccessDeps {
  readonly access: AccessConfig | undefined;
  readonly fetch: typeof fetch;
  readonly nowSeconds: () => number;
}

/** Who Access let in. */
export interface AccessIdentity {
  readonly email: string;
}

export const ACCESS_JWT_HEADER = "Cf-Access-Jwt-Assertion";

const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;
const AUD = /^[0-9a-f]{64}$/;

/** Reads Access config from public vars; anything malformed or missing means "closed". */
export function accessConfigFrom(vars: {
  readonly ACCESS_TEAM_DOMAIN?: string;
  readonly ACCESS_AUD?: string;
}): AccessConfig | undefined {
  const teamDomain = vars.ACCESS_TEAM_DOMAIN?.trim() ?? "";
  const aud = vars.ACCESS_AUD?.trim() ?? "";
  return TEAM_DOMAIN.test(teamDomain) && AUD.test(aud) ? { teamDomain, aud } : undefined;
}

function base64UrlBytes(text: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return undefined;
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  try {
    return Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    return undefined;
  }
}

function base64UrlJson(text: string): unknown {
  const bytes = base64UrlBytes(text);
  if (bytes === undefined) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
}

/** The team's current public signing keys, or undefined if they can't be fetched. */
async function signingKeys(config: AccessConfig, deps: AccessDeps): Promise<unknown[] | undefined> {
  try {
    const response = await deps.fetch(`https://${config.teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    return isRecord(body) && Array.isArray(body["keys"]) ? (body["keys"] as unknown[]) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Verifies an Access JWT. Returns who it was issued to, or undefined for
 * anything short of a valid, current RS256 token for this application.
 */
export async function verifyAccessJwt(
  token: string | null,
  deps: AccessDeps,
): Promise<AccessIdentity | undefined> {
  const config = deps.access;
  if (config === undefined || token === null) return undefined;
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

  const header = base64UrlJson(headerPart);
  const payload = base64UrlJson(payloadPart);
  const signature = base64UrlBytes(signaturePart);
  if (!isRecord(header) || !isRecord(payload) || signature === undefined) return undefined;
  if (header["alg"] !== "RS256" || typeof header["kid"] !== "string") return undefined;

  // Claims first: cheap, and no network call for an obviously wrong token.
  const now = deps.nowSeconds();
  const { aud, iss, exp, nbf, email } = payload;
  const audiences = Array.isArray(aud) ? aud : [aud];
  if (!audiences.includes(config.aud)) return undefined;
  if (iss !== `https://${config.teamDomain}`) return undefined;
  if (typeof exp !== "number" || exp <= now) return undefined;
  if (nbf !== undefined && (typeof nbf !== "number" || nbf > now)) return undefined;
  if (typeof email !== "string" || email === "") return undefined;

  const keys = await signingKeys(config, deps);
  const jwk = keys?.find((key) => isRecord(key) && key["kid"] === header["kid"]);
  if (!isRecord(jwk)) return undefined;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk as unknown as JsonWebKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, signed);
    return valid ? { email } : undefined;
  } catch {
    return undefined;
  }
}
