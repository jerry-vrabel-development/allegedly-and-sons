import { describe, expect, it } from "vitest";
import { CATALOG, findItem, formatPrice } from "../src/core/catalog";

describe("catalog", () => {
  it("launches with three items", () => {
    expect(CATALOG).toHaveLength(3);
  });

  it("has unique, URL-safe slugs", () => {
    const slugs = CATALOG.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("has unique exhibit numbers in the AS-0000 format", () => {
    const exhibits = CATALOG.map((item) => item.exhibit);
    expect(new Set(exhibits).size).toBe(exhibits.length);
    for (const exhibit of exhibits) expect(exhibit).toMatch(/^AS-\d{4}$/);
  });

  it("prices every item in whole, positive cents", () => {
    for (const item of CATALOG) {
      expect(Number.isInteger(item.priceCents)).toBe(true);
      expect(item.priceCents).toBeGreaterThan(0);
    }
  });

  it("gives every item a credited story and plain specifications", () => {
    for (const item of CATALOG) {
      expect(item.story.paragraphs.length).toBeGreaterThan(0);
      expect(item.story.author.name).not.toBe("");
      expect(item.story.author.title).not.toBe("");
      expect(item.specs.some((spec) => spec.label === "Material")).toBe(true);
    }
  });
});

describe("findItem", () => {
  it("finds an item by slug", () => {
    expect(findItem("alien-paperclip")?.name).toBe("The Alien Paperclip");
  });

  it("returns undefined for unknown slugs", () => {
    expect(findItem("the-other-three-xenoclips")).toBeUndefined();
  });
});

describe("formatPrice", () => {
  it("formats cents as US dollars", () => {
    expect(formatPrice(49_900)).toBe("$499.00");
    expect(formatPrice(123_456)).toBe("$1,234.56");
    expect(formatPrice(5)).toBe("$0.05");
  });
});
