import { describe, expect, it } from "vitest";
import {
  clientSecretFrom,
  fetchClientSecret,
  type SessionRequest,
} from "../src/client/client-secret";

/** A session endpoint that answers with `response` and records how it was asked. */
function endpoint(response: Response) {
  const calls: { url: string; init: Parameters<SessionRequest>[1] }[] = [];
  const request: SessionRequest = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve(response);
  };
  return { request, calls };
}

describe("clientSecretFrom", () => {
  it("returns the client secret", () => {
    expect(clientSecretFrom({ clientSecret: "cs_test_secret_abc" })).toBe("cs_test_secret_abc");
  });

  it("throws for anything without a string client secret", () => {
    for (const body of [
      null,
      undefined,
      "cs_test",
      7,
      [],
      {},
      { clientSecret: 7 },
      { error: "x" },
    ]) {
      expect(() => clientSecretFrom(body), JSON.stringify(body)).toThrow("no client secret");
    }
  });
});

describe("fetchClientSecret", () => {
  it("POSTs to the session URL, same origin, asking for JSON", async () => {
    const { request, calls } = endpoint(Response.json({ clientSecret: "cs_test_secret_abc" }));
    await expect(fetchClientSecret("/checkout/alien-paperclip/session", request)).resolves.toBe(
      "cs_test_secret_abc",
    );
    expect(calls).toEqual([
      {
        url: "/checkout/alien-paperclip/session",
        init: {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        },
      },
    ]);
  });

  it("throws with the status when the endpoint refuses, without reading the body", async () => {
    for (const status of [403, 404, 502, 503]) {
      const { request } = endpoint(Response.json({ error: "closed" }, { status }));
      await expect(fetchClientSecret("/x", request)).rejects.toThrow(`session ${String(status)}`);
    }
  });

  it("throws when a success carries no client secret, or isn't JSON", async () => {
    await expect(fetchClientSecret("/x", endpoint(Response.json({})).request)).rejects.toThrow(
      "no client secret",
    );
    await expect(
      fetchClientSecret("/x", endpoint(new Response("<html>")).request),
    ).rejects.toThrow();
  });

  it("passes on a network failure for the caller to show the fallback", async () => {
    const offline: SessionRequest = () => Promise.reject(new TypeError("Failed to fetch"));
    await expect(fetchClientSecret("/x", offline)).rejects.toThrow("Failed to fetch");
  });
});
