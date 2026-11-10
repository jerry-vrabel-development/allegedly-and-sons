import { describe, expect, it } from "vitest";
import {
  AVAILABLE_ITEMS,
  CATALOG,
  findAvailableItem,
  findItem,
  formatPrice,
  fullWings,
  isAvailable,
  WING_SIZE,
  WINGS,
  wingItems,
} from "../src/core/catalog";
import { ART } from "../src/worker/art";

describe("catalog", () => {
  it("has twenty exhibits, four to each of the five wings", () => {
    expect(CATALOG).toHaveLength(20);
    for (const wing of WINGS) expect(wingItems(wing.id)).toHaveLength(WING_SIZE);
  });

  it("has the three launch exhibits for sale, and always something for sale", () => {
    expect(AVAILABLE_ITEMS.map((item) => item.slug)).toEqual(
      expect.arrayContaining([
        "alien-paperclip",
        "second-best-quill",
        "viking-participation-trophy",
      ]),
    );
    expect(AVAILABLE_ITEMS.length).toBeGreaterThan(0);
    expect(AVAILABLE_ITEMS.every(isAvailable)).toBe(true);
  });

  it("numbers exhibits in order with no gaps, so the next number is obvious", () => {
    CATALOG.forEach((item, index) => {
      expect(item.exhibit).toBe(`AS-${String(index + 1).padStart(4, "0")}`);
    });
  });

  it("has original art for every exhibit, pending ones included", () => {
    for (const item of CATALOG) expect(ART[item.slug]).toMatch(/^<svg /);
    expect(Object.keys(ART).sort()).toEqual(CATALOG.map((item) => item.slug).sort());
  });

  it("gives every exhibit four pitch beats, none naming a price", () => {
    for (const item of CATALOG) {
      expect(item.pitch).toHaveLength(4);
      for (const beat of item.pitch) expect(beat).not.toMatch(/\$|\d+ ?(dollars|bucks|cents)/i);
    }
  });

  it("keeps every estimated value an obvious joke, never a dollar figure", () => {
    for (const item of CATALOG) expect(item.estimatedValue).not.toMatch(/\$|USD|dollars?/i);
  });

  it("prices every exhibit within one of the three tiers (note 0010)", () => {
    const tiers = [
      [1_900, 4_900],
      [7_900, 19_900],
      [27_500, 49_900],
    ] as const;
    for (const item of CATALOG) {
      expect(
        tiers.some(([low, high]) => item.priceCents >= low && item.priceCents <= high),
        item.slug,
      ).toBe(true);
    }
  });

  it("marks a pending exhibit's specs as expected until it's sourced", () => {
    for (const item of CATALOG.filter((candidate) => !isAvailable(candidate))) {
      expect(item.specs.some((spec) => spec.value.includes("(expected)"))).toBe(true);
    }
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

describe("wings", () => {
  it("puts every exhibit in a known wing, at most four to a wing", () => {
    const ids = new Set(WINGS.map((wing) => wing.id));
    for (const item of CATALOG) expect(ids.has(item.wing)).toBe(true);
    for (const wing of WINGS) expect(wingItems(wing.id).length).toBeLessThanOrEqual(WING_SIZE);
  });

  it("counts only wings with all four exhibits as full", () => {
    for (const wing of fullWings()) expect(wingItems(wing.id)).toHaveLength(WING_SIZE);
    expect(fullWings().map((wing) => wing.id)).toEqual(WINGS.map((wing) => wing.id));
  });
});

describe("findAvailableItem", () => {
  it("finds an exhibit that's for sale", () => {
    expect(findAvailableItem("alien-paperclip")?.slug).toBe("alien-paperclip");
  });

  it("refuses unknown and acquisition-pending exhibits", () => {
    expect(findAvailableItem("the-other-three-xenoclips")).toBeUndefined();
    expect(findItem("martian-rubber-band")?.status).toBe("pending");
    expect(findAvailableItem("martian-rubber-band")).toBeUndefined();
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
