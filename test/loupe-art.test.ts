import { describe, expect, it } from "vitest";
import { LOUPE_ARTIST, LOUPE_CSS, LOUPE_PARTS, loupeArt } from "../src/worker/loupe-art";

const art = loupeArt().value;

describe("Loupe's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="loupe-title loupe-desc"');
    expect(art).toMatch(/<title id="loupe-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="loupe-desc">[^<]+<\/desc>/);
  });

  it("describes the Appraiser: one eye, a loupe, small hands, a gem and a waistcoat", () => {
    const description = /<desc id="loupe-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["eye", "floats", "loupe", "hands", "gem", "waistcoat", "buttons"]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: one pupil, two hands, one lens, three buttons", () => {
    expect(art.match(/class="loupe-pupil"/g)).toHaveLength(1);
    expect(art.match(/class="loupe-hand loupe-hand-(l|r)"/g)).toHaveLength(2);
    expect(art.match(/class="loupe-lens"/g)).toHaveLength(1);
    expect(art.match(/<circle\s+cx="200"\s+cy="(330|348|366)"\s+r="4.5"/g)).toHaveLength(3);
  });

  it("states no price or value: its only words are its name, with no digit or money sign", () => {
    expect(art).toMatch(/>\s*LOUPE\s*</);
    const text = [...art.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((match) => match[1]);
    expect(text).toHaveLength(1);
    for (const line of text) expect(line, line).not.toMatch(/\d|\$|€|£/);
    const description = /<desc id="loupe-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    expect(description).not.toMatch(/\d|\$|€|£/);
  });

  it("needs nothing the page's policy forbids: no inline styles, scripts or outside files", () => {
    expect(art).not.toMatch(
      /\sstyle=|<style|<script|\son[a-z]+=|href=|https?:\/\/|<image\b|<foreignObject/,
    );
  });

  it("gives every id once, all its own", () => {
    const ids = [...art.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^loupe-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(LOUPE_PARTS).toHaveLength(5);
    for (const part of LOUPE_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(LOUPE_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws it", () => {
    expect(LOUPE_ARTIST).toBe("The Bureau");
  });
});

describe("Loupe's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = LOUPE_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the figure has a pose, so the Motion toggle and the plain group stop it", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving).toHaveLength(5);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain("[data-pose]");
  });

  it("moves every part", () => {
    for (const part of LOUPE_PARTS) {
      expect(LOUPE_CSS, part).toMatch(
        new RegExp(`\\.loupe-figure\\[data-pose\\] \\.${part} \\{ animation:`),
      );
    }
  });

  it("turns its two hands opposite ways", () => {
    expect(LOUPE_CSS).toMatch(/\.loupe-hand-l \{[^}]*--turn: 1/);
    expect(LOUPE_CSS).toMatch(/\.loupe-hand-r \{[^}]*--turn: -1/);
    expect(LOUPE_CSS).toContain("rotate(calc(var(--turn) * 14deg))");
  });

  it("sits beside the page's words on a wide screen and above them on a narrow one", () => {
    expect(LOUPE_CSS).toContain("@media (min-width: 40rem) { .loupe-figure { float: right;");
    expect(LOUPE_CSS).toContain(".prose.vault { display: flow-root; }");
  });
});
