import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/worker/index";
import { httpsRedirect } from "../src/worker/https";
import { testEnv } from "./test-env";

describe("httpsRedirect", () => {
  it("sends plain http to the same page on https, keeping path and query", () => {
    const response = httpsRedirect(new URL("http://allegedly.example/items/x?ref=a#top"));
    expect(response?.status).toBe(308);
    expect(response?.headers.get("Location")).toBe("https://allegedly.example/items/x?ref=a#top");
  });

  it("leaves https alone", () => {
    expect(httpsRedirect(new URL("https://allegedly.example/"))).toBeNull();
  });

  it.each(["http://localhost:8787/", "http://127.0.0.1:8787/", "http://[::1]:8787/"])(
    "leaves local address %s alone, so wrangler dev and browser tests work",
    (address) => {
      expect(httpsRedirect(new URL(address))).toBeNull();
    },
  );
});

describe("the Worker over plain http", () => {
  async function visit(url: string, init: RequestInit = {}): Promise<Response> {
    const ctx = createExecutionContext();
    const response = await worker.fetch(new Request(url, init), testEnv(), ctx);
    await waitOnExecutionContext(ctx);
    return response;
  }

  it("redirects every path, without running the page", async () => {
    const response = await visit("http://allegedly.example/broadcast?fx=on");
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("https://allegedly.example/broadcast?fx=on");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("keeps the method, so a stray http POST is not turned into a GET", async () => {
    const response = await visit("http://allegedly.example/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(308);
  });

  it("still serves a local http address, as wrangler dev does", async () => {
    const response = await visit("http://localhost:8787/");
    expect(response.status).toBe(200);
  });
});
