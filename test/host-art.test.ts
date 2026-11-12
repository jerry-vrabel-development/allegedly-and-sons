import { describe, expect, it } from "vitest";
import { HOST_ARTIST, HOST_CSS, HOST_PARTS, hostArt } from "../src/worker/host-art";

const art = hostArt().value;

describe("the Broadcast host's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="host-title host-desc"');
    expect(art).toMatch(/<title id="host-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="host-desc">[^<]+<\/desc>/);
  });

  it("describes the pitchman and the exhibits in his coat", () => {
    const description = /<desc id="host-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["pompadour", "coat", "microphone", "paperclip", "sock", "receipt"]) {
      expect(description, word).toContain(word);
    }
  });

  it("needs nothing the page's policy forbids: no inline styles, scripts or outside files", () => {
    expect(art).not.toMatch(
      /\sstyle=|<style|<script|\son[a-z]+=|href=|https?:\/\/|<image\b|<foreignObject/,
    );
  });

  it("gives every id once, and every reference points at one of them", () => {
    const ids = [...art.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    const references = [...art.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) expect(ids, reference).toContain(reference);
    // Ids are the host's own, so they can't collide with the page's.
    for (const id of ids) expect(id).toMatch(/^host-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(HOST_PARTS.length).toBeGreaterThan(8);
    for (const part of HOST_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(HOST_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited, and until a partner draws him the artist is the Bureau", () => {
    expect(HOST_ARTIST).toBe("The Bureau");
  });
});

describe("the host's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = HOST_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still until the effects script gives him a pose", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving.length).toBeGreaterThan(4);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain("[data-pose");
  });

  it("has a look for each pose", () => {
    expect(HOST_CSS).toContain('[data-pose="pitching"]');
    expect(HOST_CSS).toContain('[data-pose="sold"]');
  });

  it("keeps the reveal for the sale: the antennae are hidden in every other pose", () => {
    const hidden = rules.find((rule) => rule.startsWith(".host-antennae"));
    expect(hidden).toContain("opacity: 0");
    const shown = rules.filter(
      (rule) => rule.includes(".host-antennae") && rule.includes("opacity: 1"),
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]).toContain('[data-pose="sold"]');
  });

  it("shows a talking mouth without motion, for reduced motion", () => {
    expect(HOST_CSS).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\[data-pose="pitching"\] \.host-jaw \{ transform: scaleY\(/,
    );
  });
});
