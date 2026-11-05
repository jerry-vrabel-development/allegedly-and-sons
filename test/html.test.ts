import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { escapeHtml, html, SafeHtml } from "../src/worker/html";

function unescape(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

describe("escapeHtml", () => {
  it("escapes the five HTML special characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });

  it("never lets markup characters through, for any input", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (input) => {
        expect(escapeHtml(input)).not.toMatch(/[<>"']/);
      }),
    );
  });

  it("is lossless: unescaping gives back the original", () => {
    fc.assert(
      fc.property(fc.string({ unit: "binary" }), (input) => {
        expect(unescape(escapeHtml(input))).toBe(input);
      }),
    );
  });
});

describe("html", () => {
  it("escapes interpolated strings", () => {
    expect(html`<p>${"<script>alert(1)</script>"}</p>`.value).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    );
  });

  it("does not double-escape nested html", () => {
    const inner = html`<em>${"a & b"}</em>`;
    expect(html`<p>${inner}</p>`.value).toBe("<p><em>a &amp; b</em></p>");
  });

  it("renders numbers and joins arrays", () => {
    const items = html`${[1, 2].map((n) => html`<li>${n}</li>`)}`;
    expect(items.value).toBe("<li>1</li><li>2</li>");
  });

  it("returns SafeHtml", () => {
    expect(html`x`).toBeInstanceOf(SafeHtml);
  });
});
