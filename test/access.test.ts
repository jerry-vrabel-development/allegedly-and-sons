import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  accessConfigFrom,
  verifyAccessJwt,
  type AccessConfig,
  type AccessDeps,
} from "../src/worker/access";

import { AUD, NOW, OTHER, SIGNER, TEAM, b64url, token, urlOf } from "./access-signing";

const CONFIG: AccessConfig = { teamDomain: TEAM, aud: AUD };

/** Deps whose fetch serves the team's public keys (or fails), recording calls. */
function deps(
  certs: () => Response = () => Response.json({ keys: [SIGNER.jwk, OTHER.jwk] }),
  access: AccessConfig | undefined = CONFIG,
): AccessDeps & { urls: string[] } {
  const urls: string[] = [];
  return {
    access,
    nowSeconds: () => NOW,
    fetch: (input) => {
      urls.push(urlOf(input));
      return Promise.resolve(certs());
    },
    urls,
  };
}

describe("accessConfigFrom", () => {
  it("needs both a team domain and a 64-hex AUD tag", () => {
    expect(accessConfigFrom({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD })).toEqual(CONFIG);
    expect(accessConfigFrom({ ACCESS_TEAM_DOMAIN: ` ${TEAM} `, ACCESS_AUD: ` ${AUD} ` })).toEqual(
      CONFIG,
    );
    expect(accessConfigFrom({ ACCESS_TEAM_DOMAIN: TEAM })).toBeUndefined();
    expect(accessConfigFrom({ ACCESS_AUD: AUD })).toBeUndefined();
    expect(
      accessConfigFrom({ ACCESS_TEAM_DOMAIN: "evil.example", ACCESS_AUD: AUD }),
    ).toBeUndefined();
    expect(accessConfigFrom({ ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: "short" })).toBeUndefined();
  });
});

describe("the shipped config (wrangler.jsonc)", () => {
  it("opens the ledger to the Bureau ledger Access application", () => {
    expect(accessConfigFrom(env)).toEqual({
      teamDomain: "allegedlyandsons.cloudflareaccess.com",
      aud: "758a0a900d0124c2c9b0f2e33817c9c1b7b7926e2947210926a115cd7f548c60",
    });
  });
});

describe("verifyAccessJwt", () => {
  it("accepts a valid token for this application, from the team's own key list", async () => {
    const d = deps();
    expect(await verifyAccessJwt(await token(), d)).toEqual({ email: "jerry@example.com" });
    expect(d.urls).toEqual([`https://${TEAM}/cdn-cgi/access/certs`]);
  });

  it("accepts a single-string audience too", async () => {
    expect(await verifyAccessJwt(await token({ aud: AUD }), deps())).toEqual({
      email: "jerry@example.com",
    });
  });

  it.each([
    ["another application's audience", { aud: ["b".repeat(64)] }],
    ["another team's issuer", { iss: "https://evil.cloudflareaccess.com" }],
    ["an expired token", { exp: NOW - 1 }],
    ["a token not yet valid", { nbf: NOW + 60 }],
    ["a malformed nbf", { nbf: "soon" }],
    ["a missing expiry", { exp: undefined }],
    ["no email", { email: undefined }],
    ["an empty email", { email: "" }],
  ])("rejects %s", async (_label, claims) => {
    expect(await verifyAccessJwt(await token(claims), deps())).toBeUndefined();
  });

  it("rejects a token signed with someone else's key", async () => {
    const forged = await token({}, {}, OTHER.privateKey);
    expect(await verifyAccessJwt(forged, deps())).toBeUndefined();
  });

  it("rejects a token whose key isn't in the team's list", async () => {
    expect(await verifyAccessJwt(await token({}, { kid: "key-9" }), deps())).toBeUndefined();
  });

  it("rejects a tampered payload", async () => {
    const [h, , s] = (await token()).split(".");
    const p = b64url(
      JSON.stringify({ aud: [AUD], iss: `https://${TEAM}`, exp: NOW + 60, email: "evil@x" }),
    );
    expect(await verifyAccessJwt(`${h ?? ""}.${p}.${s ?? ""}`, deps())).toBeUndefined();
  });

  it.each([
    ["alg none", { alg: "none" }],
    ["HS256", { alg: "HS256" }],
    ["no kid", { kid: undefined }],
  ])("rejects %s", async (_label, header) => {
    expect(await verifyAccessJwt(await token({}, header), deps())).toBeUndefined();
  });

  it.each([
    ["no token", null],
    ["garbage", "not-a-jwt"],
    ["four parts", "a.b.c.d"],
    ["bad base64", "a!.b.c"],
    ["not JSON", `${b64url("nope")}.${b64url("{}")}.${b64url("sig")}`],
    ["a JSON array header", `${b64url("[]")}.${b64url("{}")}.${b64url("sig")}`],
    ["undecodable base64", "a.b.c"],
  ])("rejects %s without fetching keys", async (_label, value) => {
    const d = deps();
    expect(await verifyAccessJwt(value, d)).toBeUndefined();
    expect(d.urls).toEqual([]);
  });

  it("fails closed when Access isn't configured", async () => {
    const closed: AccessDeps = { ...deps(), access: undefined };
    expect(await verifyAccessJwt(await token(), closed)).toBeUndefined();
  });

  it.each([
    ["the key list is unreachable", () => new Response("down", { status: 503 })],
    ["the key list is malformed", () => Response.json({ nope: true })],
    ["the key list isn't JSON", () => new Response("<html>")],
    ["a listed key is unusable", () => Response.json({ keys: [{ kid: "key-1", kty: "RSA" }] })],
  ])("fails closed when %s", async (_label, certs) => {
    expect(await verifyAccessJwt(await token(), deps(certs))).toBeUndefined();
  });

  it("fails closed when fetching the key list throws", async () => {
    const d: AccessDeps = {
      access: CONFIG,
      nowSeconds: () => NOW,
      fetch: () => Promise.reject(new Error("network")),
    };
    expect(await verifyAccessJwt(await token(), d)).toBeUndefined();
  });
});
