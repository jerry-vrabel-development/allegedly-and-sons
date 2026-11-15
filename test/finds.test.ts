import { describe, expect, it } from "vitest";
import { isSoundName } from "../src/client/sounds";
import { dropForm } from "../src/worker/find-drop";
import { findFigure } from "../src/worker/find-figure";
import {
  FIND_PATH,
  FINDS,
  findAwardId,
  findById,
  findPathFor,
  isFindAward,
} from "../src/core/finds";

describe("the finds (note 0018)", () => {
  it("has six finds, each a different contact with its own address", () => {
    expect(FINDS).toHaveLength(6);
    expect(new Set(FINDS.map((find) => find.id)).size).toBe(FINDS.length);
    expect(new Set(FINDS.map((find) => find.contact)).size).toBe(FINDS.length);
    for (const find of FINDS) expect(findPathFor(find.id)).toMatch(FIND_PATH);
  });

  it("gives every find words for each part, so nothing is an icon alone", () => {
    for (const find of FINDS) {
      for (const text of [find.contact, find.role, find.label, find.hint, find.reaction]) {
        expect(text.trim()).not.toBe("");
      }
      expect(find.role).toMatch(/\.$/);
      expect(find.hint).toMatch(/\.$/);
      expect(find.from).toMatch(/^\//);
      expect(find.fromName).not.toBe("");
    }
  });

  it("keeps the contacts to the story: no price, no money, no promise about an exhibit", () => {
    for (const find of FINDS) {
      const said = `${find.role} ${find.hint} ${find.label} ${find.reaction}`;
      expect(said).not.toMatch(/[$0-9]/);
      expect(said).not.toMatch(/\b(price|refund|shipping|reserve|reserved|hold|discount|free)\b/i);
    }
  });

  it("finds a find by its id", () => {
    expect(findById("loose-brick")?.contact).toBe("Loupe");
    expect(findById("loupe")).toBeUndefined();
    expect(findById("")).toBeUndefined();
  });

  it("names the award `find:<id>` and recognises only real ones", () => {
    expect(findAwardId("loose-brick")).toBe("find:loose-brick");
    for (const find of FINDS) expect(isFindAward(findAwardId(find.id))).toBe(true);
    for (const bogus of ["find:", "find:loupe", "loose-brick", "card:loose-brick", "FIND:parcel"]) {
      expect(isFindAward(bogus)).toBe(false);
    }
  });

  it("matches only a find-shaped address", () => {
    expect(FIND_PATH.exec("/find/loose-brick")?.[1]).toBe("loose-brick");
    for (const bad of [
      "/find/",
      "/find",
      "/find/Loud",
      "/find/a/b",
      "/find/9x",
      "/find/-x",
      "/finds/x",
    ]) {
      expect(FIND_PATH.exec(bad)).toBeNull();
    }
  });
});

describe("the hidden control", () => {
  it("is a plain form with one button that says what it does", () => {
    const form = dropForm("loose-brick").value;
    expect(form).toContain('method="post"');
    expect(form).toContain('action="/find/loose-brick"');
    expect(form).toContain("Press the loose brick");
    expect(form).not.toContain("<script");
  });

  it("sparkles when pressed, with a sound the shop really has", () => {
    const form = dropForm("loose-brick").value;
    expect(form).toContain('data-sound="sparkle"');
    expect(isSoundName("sparkle")).toBe(true);
  });

  it("refuses a find that doesn't exist, so a typo can't ship", () => {
    expect(() => dropForm("loupe")).toThrow('No find called "loupe".');
  });
});

describe("the contact's sketch on the found page", () => {
  it("draws every contact: described, credited, and the page's one data-host", () => {
    for (const find of FINDS) {
      const figure = findFigure(find.id).value;
      expect(figure, find.id).toContain('<div class="set">');
      expect(figure.match(/data-host/g), find.id).toHaveLength(1);
      expect(figure, find.id).toContain('role="img"');
      expect(figure, find.id).toContain("Sketch by The Bureau.");
      expect(figure, find.id).not.toMatch(/<script|style=|href=/);
    }
  });

  it("draws a different character for each find", () => {
    const drawings = FINDS.map((find) => findFigure(find.id).value);
    expect(new Set(drawings).size).toBe(FINDS.length);
  });

  it("refuses a find with no sketch, so a new find can't ship without one", () => {
    expect(() => findFigure("loupe")).toThrow('No sketch for the find "loupe".');
  });
});
