import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { SIGNATURE_TOLERANCE_SECONDS, verifyStripeSignature } from "../src/worker/stripe-signature";

const SECRET = "whsec_test_secret";
const T = 1762531200; // 2025-11-07T16:00:00Z
const PAYLOAD = '{"id":"evt_test_1","type":"checkout.session.completed"}';
/** Computed independently with Python's hmac module, not with the code under test. */
const KNOWN_SIGNATURE = "6804fe2979fe45763f169938150352cc15328b0008aa933a398d5edd39e5d755";
const OTHER = "a".repeat(64);

/** Signs like Stripe does, for property tests: HMAC-SHA256 over "t.payload", hex. */
async function sign(payload: string, t: number, secret = SECRET): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${String(t)}.${payload}`),
  );
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function check(header: string | null, payload = PAYLOAD, now = T, secret = SECRET) {
  return verifyStripeSignature(payload, header, secret, now);
}

describe("verifyStripeSignature", () => {
  it("accepts a known-good signature", async () => {
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE}`)).toEqual({ ok: true });
  });

  it("refuses the wrong secret", async () => {
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE}`, PAYLOAD, T, "whsec_other")).toEqual({
      ok: false,
      reason: "no matching signature",
    });
  });

  it("refuses (without throwing) when the secret is empty", async () => {
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE}`, PAYLOAD, T, "")).toEqual({
      ok: false,
      reason: "no matching signature",
    });
  });

  it("refuses a tampered body", async () => {
    const tampered = PAYLOAD.replace("evt_test_1", "evt_test_2");
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE}`, tampered)).toEqual({
      ok: false,
      reason: "no matching signature",
    });
  });

  it("refuses a tampered timestamp, even within tolerance", async () => {
    expect(await check(`t=${String(T + 1)},v1=${KNOWN_SIGNATURE}`)).toEqual({
      ok: false,
      reason: "no matching signature",
    });
  });

  it("accepts timestamps up to the tolerance in either direction, and refuses beyond", async () => {
    const header = `t=${String(T)},v1=${KNOWN_SIGNATURE}`;
    expect(SIGNATURE_TOLERANCE_SECONDS).toBe(300);
    expect(await check(header, PAYLOAD, T + 300)).toEqual({ ok: true });
    expect(await check(header, PAYLOAD, T - 300)).toEqual({ ok: true });
    for (const now of [T + 301, T - 301]) {
      expect(await check(header, PAYLOAD, now)).toEqual({
        ok: false,
        reason: "timestamp outside tolerance",
      });
    }
  });

  it("refuses a missing or empty header", async () => {
    for (const header of [null, ""]) {
      expect(await check(header)).toEqual({ ok: false, reason: "missing header" });
    }
  });

  it("refuses malformed headers", async () => {
    for (const header of [
      `v1=${KNOWN_SIGNATURE}`, // no timestamp
      `t=abc,v1=${KNOWN_SIGNATURE}`, // non-numeric timestamp
      `t=-5,v1=${KNOWN_SIGNATURE}`,
      `t=${String(T)},t=${String(T)},v1=${KNOWN_SIGNATURE}`, // two timestamps
      `t=${String(T)}`, // no signature
      `t=${String(T)},v0=${KNOWN_SIGNATURE}`, // only the legacy scheme
      `t=${String(T)},v1=${KNOWN_SIGNATURE.slice(0, 63)}`, // too short
      `t=${String(T)},v1=${"z".repeat(64)}`, // not hex
      "garbage",
    ]) {
      expect(await check(header), header).toEqual({ ok: false, reason: "malformed header" });
    }
  });

  it("accepts when any one of several v1 signatures matches (secret rotation)", async () => {
    expect(await check(`t=${String(T)},v1=${OTHER},v1=${KNOWN_SIGNATURE}`)).toEqual({ ok: true });
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE},v1=${OTHER}`)).toEqual({ ok: true });
  });

  it("ignores v0 and unknown schemes, and tolerates spaces and order", async () => {
    expect(await check(`v0=${OTHER}, v1=${KNOWN_SIGNATURE}, x=1, t=${String(T)}`)).toEqual({
      ok: true,
    });
  });

  it("accepts upper-case hex", async () => {
    expect(await check(`t=${String(T)},v1=${KNOWN_SIGNATURE.toUpperCase()}`)).toEqual({ ok: true });
  });

  it("never throws on any header string", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (header) => {
        const result = await check(header);
        expect(typeof result.ok).toBe("boolean");
      }),
    );
  });

  it("accepts any correctly signed payload and refuses it once one character changes", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.nat(), async (payload, index) => {
        const signature = await sign(payload, T);
        const header = `t=${String(T)},v1=${signature}`;
        expect(await check(header, payload)).toEqual({ ok: true });

        const i = index % payload.length;
        const changed =
          payload.slice(0, i) + (payload[i] === "x" ? "y" : "x") + payload.slice(i + 1);
        expect(await check(header, changed)).toEqual({
          ok: false,
          reason: "no matching signature",
        });
      }),
      { numRuns: 50 },
    );
  });
});
