import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/worker/index";
import { httpsRedirect } from "../src/worker/https";
import { testEnv } from "./test-env";

const HTTP_VISITOR = new Headers({ "CF-Visitor": '{"scheme":"http"}' });

describe("httpsRedirect", () => {
  it("sends a visitor Cloudflare saw on plain http to the same page on https", () => {
    const response = httpsRedirect(
      new URL("http://allegedly.example/items/x?ref=a#top"),
      HTTP_VISITOR,
    );
    expect(response?.status).toBe(308);
    expect(response?.headers.get("Location")).toBe("https://allegedly.example/items/x?ref=a#top");
  });

  it("leaves a visitor Cloudflare saw on https alone", () => {
    const headers = new Headers({ "CF-Visitor": '{"scheme":"https"}' });
    expect(httpsRedirect(new URL("https://allegedly.example/"), headers)).toBeNull();
  });

  it("leaves an https address alone even if the header disagrees", () => {
    expect(httpsRedirect(new URL("https://allegedly.example/"), HTTP_VISITOR)).toBeNull();
  });

  it("leaves local runs alone: no CF-Visitor header means no redirect", () => {
    expect(httpsRedirect(new URL("http://allegedlyandsons.com/healthz"), new Headers())).toBeNull();
  });

  it.each(["not json", "null", "42", '"http"', "{}", '{"scheme":42}'])(
    "ignores a CF-Visitor header that is not a plain-http report: %s",
    (value) => {
      const headers = new Headers({ "CF-Visitor": value });
      expect(httpsRedirect(new URL("http://allegedly.example/"), headers)).toBeNull();
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

  it("redirects every path, without running the page or setting a cookie", async () => {
    const response = await visit("http://allegedly.example/broadcast?fx=on", {
      headers: HTTP_VISITOR,
    });
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe("https://allegedly.example/broadcast?fx=on");
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("keeps the method, so a stray http POST is not turned into a GET", async () => {
    const response = await visit("http://allegedly.example/webhooks/stripe", {
      method: "POST",
      body: "{}",
      headers: HTTP_VISITOR,
    });
    expect(response.status).toBe(308);
  });

  it("serves a local http run that sends no CF-Visitor, as wrangler dev does", async () => {
    const response = await visit("http://allegedlyandsons.com/healthz");
    expect(response.status).toBe(200);
  });
});
