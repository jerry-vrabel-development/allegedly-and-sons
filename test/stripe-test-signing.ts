/** Test helper: signs a payload the way Stripe does (HMAC-SHA256 over "t.payload", hex). */
export async function stripeSignatureHeader(
  payload: string,
  secret: string,
  timestamp: number,
): Promise<string> {
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
    new TextEncoder().encode(`${String(timestamp)}.${payload}`),
  );
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `t=${String(timestamp)},v1=${hex}`;
}
