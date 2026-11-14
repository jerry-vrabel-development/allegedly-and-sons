import { describe, expect, it } from "vitest";
import { TRIXIE_ARTIST, TRIXIE_CSS, TRIXIE_PARTS, trixieArt } from "../src/worker/trixie-art";

const art = trixieArt().value;

describe("Trixie's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="trixie-title trixie-desc"');
    expect(art).toMatch(/<title id="trixie-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="trixie-desc">[^<]+<\/desc>/);
  });

  it("describes the showgirl, her four arms, her plumes and the paperclip she presents", () => {
    const description = /<desc id="trixie-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["four", "arms", "plumes", "leotard", "paperclip", "tray", "winks"]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: seven plumes in the fan, four in the train and four arms", () => {
    expect(art.match(/transform="rotate\(-?\d+ 200 160\)"/g)).toHaveLength(7);
    expect(art.match(/transform="rotate\(-?\d+ \d+ 462\)"/g)).toHaveLength(4);
    expect(art.match(/stroke-width="18"/g)).toHaveLength(4);
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
    // Ids are Trixie's own, so they can't collide with the host's, the Archivist's or the page's.
    for (const id of ids) expect(id).toMatch(/^trixie-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(TRIXIE_PARTS).toHaveLength(4);
    for (const part of TRIXIE_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(TRIXIE_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws her", () => {
    expect(TRIXIE_ARTIST).toBe("The Bureau");
  });
});

describe("Trixie's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = TRIXIE_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the host has a pose, so the Motion toggle and the plain group stop her", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving.length).toBeGreaterThanOrEqual(4);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain(":has([data-pose");
  });

  it("moves every part, and flares her plumes when the segment ends", () => {
    for (const part of TRIXIE_PARTS) {
      expect(TRIXIE_CSS, part).toMatch(
        new RegExp(`:has\\(\\[data-pose\\]\\) \\.${part} \\{ animation:`),
      );
    }
    expect(TRIXIE_CSS).toContain(
      '.set:has([data-pose="sold"]) .trixie-plumage { animation-name: trixie-flare;',
    );
  });

  it("starts with her wink open: the lid is drawn closed up", () => {
    expect(TRIXIE_CSS).toMatch(/\.trixie-wink \{[^}]*transform: scaleY\(0\)/);
  });

  it("shows only where the stage is wide enough, and never overlaps the others", () => {
    expect(TRIXIE_CSS).toMatch(/\.trixie-stage \{ display: none;/);
    expect(TRIXIE_CSS).toContain("@media (min-width: 56rem) { .trixie-stage { display: block; } }");
  });
});
