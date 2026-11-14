import { describe, expect, it } from "vitest";
import { NICKEL_ARTIST, NICKEL_CSS, NICKEL_PARTS, nickelArt } from "../src/worker/nickel-art";

const art = nickelArt().value;

describe("Nickel's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="nickel-title nickel-desc"');
    expect(art).toMatch(/<title id="nickel-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="nickel-desc">[^<]+<\/desc>/);
  });

  it("describes the register robot: brass, bell, tape, keypad, coin drawer and reels", () => {
    const description = /<desc id="nickel-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["brass", "bell", "tape", "keypad", "drawer", "coins", "reels", "arms"]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: twelve keys, three coins and two arms", () => {
    expect(
      art.match(/<circle\s+cx="(152|180|208|236)"\s+cy="(262|284|306)"\s+r="8"/g),
    ).toHaveLength(12);
    expect(art.match(/<ellipse\s+cx="(150|200|250)"\s+cy="372"/g)).toHaveLength(3);
    expect(art.match(/class="nickel-arm nickel-arm-(l|r)"/g)).toHaveLength(2);
  });

  it("says HA on his screen, with no digits anywhere a visitor could mistake for a price", () => {
    expect(art).toMatch(/>\s*HA\s*</);
    const text = [...art.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((match) => match[1]);
    for (const line of text) expect(line, line).not.toMatch(/\d|\$/);
  });

  it("needs nothing the page's policy forbids: no inline styles, scripts or outside files", () => {
    expect(art).not.toMatch(
      /\sstyle=|<style|<script|\son[a-z]+=|href=|https?:\/\/|<image\b|<foreignObject/,
    );
  });

  it("gives every id once", () => {
    const ids = [...art.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    // Ids are Nickel's own, so they can't collide with the other characters' or the page's.
    for (const id of ids) expect(id).toMatch(/^nickel-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(NICKEL_PARTS).toHaveLength(4);
    for (const part of NICKEL_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(NICKEL_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws him", () => {
    expect(NICKEL_ARTIST).toBe("The Bureau");
  });
});

describe("Nickel's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = NICKEL_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the host has a pose, so the Motion toggle and the plain group stop him", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving.length).toBeGreaterThanOrEqual(4);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain(":has([data-pose");
  });

  it("moves every part, and rings and bangs faster when the segment ends", () => {
    for (const part of NICKEL_PARTS) {
      expect(NICKEL_CSS, part).toMatch(
        new RegExp(`:has\\(\\[data-pose\\]\\) \\.${part} \\{ animation:`),
      );
    }
    expect(NICKEL_CSS).toContain('.set:has([data-pose="sold"]) .nickel-bell { animation-duration:');
    expect(NICKEL_CSS).toContain(
      '.set:has([data-pose="sold"]) .nickel-drawer { animation-duration:',
    );
  });

  it("flings his arms outward, each its own way", () => {
    expect(NICKEL_CSS).toMatch(/\.nickel-arm-l \{[^}]*--fling: 1/);
    expect(NICKEL_CSS).toMatch(/\.nickel-arm-r \{[^}]*--fling: -1/);
    expect(NICKEL_CSS).toContain("rotate(calc(var(--fling) * 28deg))");
  });

  it("shows only where the stage is wide enough, and never overlaps the others", () => {
    expect(NICKEL_CSS).toMatch(/\.nickel-stage \{ display: none;/);
    expect(NICKEL_CSS).toContain("@media (min-width: 56rem) { .nickel-stage { display: block; } }");
  });
});
