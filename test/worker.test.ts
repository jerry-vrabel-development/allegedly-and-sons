import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const BASE = "https://allegedly.example";

function get(path: string, init?: RequestInit): Promise<Response> {
  return exports.default.fetch(new Request(`${BASE}${path}`, init));
}

describe("Worker", () => {
  it("serves the placeholder home page", async () => {
    const response = await get("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(await response.text()).toContain("Allegedly & Sons");
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

  it("returns 404 for unknown paths", async () => {
    const response = await get("/the-other-three-xenoclips");
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("Not found");
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
      expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });
});
