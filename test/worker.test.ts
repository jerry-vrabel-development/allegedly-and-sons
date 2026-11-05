import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/core/catalog";

const BASE = "https://allegedly.example";

function get(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${BASE}${path}`, init));
}

describe("Worker", () => {
  it("serves the home page as HTML", async () => {
    const response = await get("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("The Collection");
  });

  it("serves every item page", async () => {
    for (const item of CATALOG) {
      const response = await get(`/items/${item.slug}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain(item.exhibit);
    }
  });

  it("serves the fine print", async () => {
    const response = await get("/disclaimer");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("The Fine Print");
  });

  it("serves the stylesheet as CSS", async () => {
    const response = await get("/assets/site.css");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(await response.text()).toContain("prefers-reduced-motion");
  });

  it("reports health as JSON and is never cached", async () => {
    const response = await get("/healthz");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("answers HEAD like GET", async () => {
    const response = await get("/", { method: "HEAD" });
    expect(response.status).toBe(200);
  });

  it("returns a friendly HTML 404 for unknown paths and items", async () => {
    for (const path of [
      "/the-other-three-xenoclips",
      "/items/xenoclip",
      "/items/ALIEN",
      "/items/",
    ]) {
      const response = await get(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
      expect(await response.text()).toContain("The Bureau is still looking.");
    }
  });

  it("rejects non-GET methods with 405 and an Allow header", async () => {
    const response = await get("/", { method: "POST", body: "{}" });
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("puts security headers on every response, including errors", async () => {
    for (const response of [
      await get("/"),
      await get("/nope"),
      await get("/", { method: "DELETE" }),
    ]) {
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("style-src 'self'");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });
});
