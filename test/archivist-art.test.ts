import { describe, expect, it } from "vitest";
import {
  ARCHIVIST_ARTIST,
  ARCHIVIST_CSS,
  ARCHIVIST_PARTS,
  archivistArt,
} from "../src/worker/archivist-art";

const art = archivistArt().value;

describe("the Archivist's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="archivist-title archivist-desc"');
    expect(art).toMatch(/<title id="archivist-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="archivist-desc">[^<]+<\/desc>/);
  });

  it("describes the clerk, his four arms and his three eyes", () => {
    const description = /<desc id="archivist-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of [
      "four arms",
      "three eyes",
      "glasses",
      "tea",
      "ledger",
      "stamps",
      "paperclip",
    ]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: three eyes and three half-moon lenses", () => {
    expect(
      art.match(/<ellipse cx="200" cy="(130|165|200)" rx="15" ry="12" fill="#ffffff"/g),
    ).toHaveLength(3);
    expect(art.match(/A19 19 0 0 0 219/g)).toHaveLength(3);
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
    // Ids are the Archivist's own, so they can't collide with the host's or the page's.
    for (const id of ids) expect(id).toMatch(/^archivist-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(ARCHIVIST_PARTS).toHaveLength(4);
    for (const part of ARCHIVIST_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(ARCHIVIST_CSS, part).toContain(`.${part}`);
    }
  });

  it("says his name on his desk, and is credited to the Bureau until a partner draws him", () => {
    expect(art).toContain("IBID.");
    expect(ARCHIVIST_ARTIST).toBe("The Bureau");
  });
});

describe("the Archivist's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = ARCHIVIST_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the host has a pose, so the Motion toggle and the plain group stop him", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving.length).toBeGreaterThanOrEqual(4);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain(":has([data-pose");
  });

  it("moves every part, and stamps faster when the segment ends", () => {
    for (const part of ARCHIVIST_PARTS) {
      expect(ARCHIVIST_CSS, part).toMatch(
        new RegExp(`:has\\(\\[data-pose\\]\\) \\.${part} \\{ animation:`),
      );
    }
    expect(ARCHIVIST_CSS).toContain(
      '.set:has([data-pose="sold"]) .archivist-stamp { animation-duration:',
    );
  });

  it("keeps his third eye open in the still drawing: the lid starts closed up", () => {
    expect(ARCHIVIST_CSS).toMatch(/\.archivist-eye \{[^}]*transform: scaleY\(0\)/);
  });
});
