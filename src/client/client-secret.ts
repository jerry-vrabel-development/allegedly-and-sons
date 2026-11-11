/**
 * Asking our own session endpoint for an embedded Checkout Session's client
 * secret (design note 0005). Pure: the request function is passed in, so it's
 * unit tested without a browser.
 */

/** As much of `fetch` as this needs; the browser's own fits. */
export type SessionRequest = (
  url: string,
  init: {
    readonly method: "POST";
    readonly headers: { readonly Accept: string };
    readonly credentials: "same-origin";
  },
) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<unknown> }>;

/** The client secret in the session endpoint's JSON answer. Throws if there isn't one. */
export function clientSecretFrom(body: unknown): string {
  if (typeof body === "object" && body !== null && "clientSecret" in body) {
    const { clientSecret } = body;
    if (typeof clientSecret === "string") return clientSecret;
  }
  throw new Error("no client secret");
}

/**
 * POSTs to the page's session URL (same origin, so the visitor cookie goes
 * with it) and returns the client secret. Throws on any answer that isn't a
 * success with a client secret in it; the caller shows the fallback.
 */
export async function fetchClientSecret(
  sessionUrl: string,
  request: SessionRequest,
): Promise<string> {
  const response = await request(sessionUrl, {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(`session ${String(response.status)}`);
  return clientSecretFrom(await response.json());
}
