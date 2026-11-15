import { describe, expect, it } from "vitest";
import {
  GERALD_ARTIST,
  GERALD_CSS,
  GERALD_PARTS,
  geraldArt,
  geraldFigure,
} from "../src/worker/gerald-art";

const art = geraldArt().value;

describe("Gerald's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="gerald-title gerald-desc"');
    expect(art).toMatch(/<title id="gerald-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="gerald-desc">[^<]+<\/desc>/);
  });

  it("describes a small jelly being in a tie, with a stamp visible inside him", () => {
    const description = /<desc id="gerald-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["jelly", "tie", "bubbles", "stamp", "inside", "not a notary"]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: two eyes, four bubbles, one stamp and one tie", () => {
    expect(art.match(/<circle\s+cx="(172|228)"\s+cy="252"\s+r="12"/g)).toHaveLength(2);
    expect(art.match(/<circle\s+cx="\d+"\s+cy="\d+"\s+r="[346]"\s*\/>/g)).toHaveLength(4);
    expect(art.match(/class="gerald-stamp"/g)).toHaveLength(1);
    expect(art.match(/class="gerald-tie"/g)).toHaveLength(1);
  });

  it("says he is not a notary, and carries no digit, so it never reads as a real seal", () => {
    expect(art).toMatch(/>\s*GERALD · NOT A NOTARY\s*</);
    const text = [...art.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((match) => match[1]);
    expect(text).toHaveLength(1);
    for (const line of text) expect(line, line).not.toMatch(/\d|\$|€|£/);
    const description = /<desc id="gerald-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
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
    for (const id of ids) expect(id).toMatch(/^gerald-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(GERALD_PARTS).toHaveLength(3);
    for (const part of GERALD_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(GERALD_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws him", () => {
    expect(GERALD_ARTIST).toBe("The Bureau");
  });
});

describe("Gerald on a page", () => {
  const figure = geraldFigure().value;

  it("is one figure, the page's data-host, with the drawing and its credit", () => {
    expect(figure.startsWith('<figure class="gerald-figure" data-host>')).toBe(true);
    expect(figure.match(/data-host/g)).toHaveLength(1);
    expect(figure).toContain(art);
    expect(figure.endsWith("<figcaption>Sketch by The Bureau.</figcaption></figure>")).toBe(true);
  });
});

describe("Gerald's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = GERALD_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the figure has a pose, so the Motion toggle and the plain group stop him", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving).toHaveLength(3);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain("[data-pose]");
  });

  it("moves every part", () => {
    for (const part of GERALD_PARTS) {
      expect(GERALD_CSS, part).toMatch(
        new RegExp(`\\.gerald-figure\\[data-pose\\] \\.${part} \\{ animation:`),
      );
    }
  });

  it("raises the stamp through him and straightens the tie on the same beat", () => {
    expect(GERALD_CSS).toContain("@keyframes gerald-stamp {");
    expect(GERALD_CSS).toContain("translateY(-34px)");
    expect(GERALD_CSS).toMatch(
      /\.gerald-figure\[data-pose\] \.gerald-stamp \{ animation: gerald-stamp 4\.8s/,
    );
    expect(GERALD_CSS).toMatch(
      /\.gerald-figure\[data-pose\] \.gerald-tie \{ animation: gerald-tie 4\.8s/,
    );
  });

  it("floats inside the certificate box on a wide screen, and sits above its words on a narrow one", () => {
    expect(GERALD_CSS).toContain(".certificate:has(> .gerald-figure) { display: flow-root; }");
    expect(GERALD_CSS).toContain("@media (min-width: 30rem) { .gerald-figure { float: right;");
  });
});
