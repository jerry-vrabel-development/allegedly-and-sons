import { describe, expect, it } from "vitest";
import { SITE_CSS } from "../src/worker/styles";
import { SILT_ARTIST, SILT_CSS, SILT_PARTS, siltArt, siltFigure } from "../src/worker/silt-art";

const art = siltArt().value;
const description = /<desc id="silt-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";

describe("Silt Prenderby's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="silt-title silt-desc"');
    expect(art).toContain('<title id="silt-title">Silt Prenderby</title>');
    expect(description.trim().length).toBeGreaterThan(0);
  });

  it("describes his brief: crab, striped suit, tie, eyes on stalks, bowler, claws, invoice, bubbles", () => {
    for (const word of [
      "crab",
      "striped suit",
      "tie",
      "stalks",
      "bowler",
      "claw",
      "invoice",
      "bubbles",
    ]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: six legs, two eyes, four items on the invoice", () => {
    // Each leg is an ink stroke under a coral one.
    expect(art.match(/stroke="#1c110d"\s+stroke-width="16"/g)).toHaveLength(6);
    expect(art.match(/<circle\s+cx="\d+"\s+cy="\d+"\s+r="17"/g)).toHaveLength(2);
    expect(art.match(/<circle\s+cx="318"\s+cy="\d+"\s+r="4"/g)).toHaveLength(4);
  });

  it("invoices in words only: no number, currency or price, in the drawing or its description", () => {
    const text = [...art.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((match) =>
      match[1]?.trim(),
    );
    expect(text).toEqual(["INVOICE", "BUBBLES", "ALL BUBBLES ITEMISED"]);
    for (const words of [...text, description]) {
      expect(words, words).not.toMatch(/\d|\$|€|£|\bprice|\bcost|\bpay|\bbuy|\bsale\b/i);
    }
  });

  it("needs nothing the page's policy forbids: no inline styles, scripts or outside files", () => {
    expect(art).not.toMatch(
      /\sstyle=|<style|<script|\son[a-z]+=|href=|https?:\/\/|<image\b|<foreignObject/,
    );
  });

  it("gives every id once, all its own, and only uses its own", () => {
    const ids = [...art.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^silt-/);
    for (const [, ref] of art.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(SILT_PARTS).toHaveLength(3);
    for (const part of SILT_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(SILT_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws it", () => {
    expect(SILT_ARTIST).toBe("The Bureau");
  });
});

describe("Silt on a page", () => {
  const figure = siltFigure().value;

  it("is one figure with the drawing and its credit, and never the page's data-host", () => {
    expect(figure.startsWith('<figure class="silt-figure">')).toBe(true);
    expect(figure).not.toContain("data-host");
    expect(figure).toContain(art);
    expect(figure.endsWith("<figcaption>Sketch by The Bureau.</figcaption></figure>")).toBe(true);
  });
});

describe("Silt's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = SILT_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the figure has a pose", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving).toHaveLength(3);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain("[data-pose]");
  });

  it("moves every part", () => {
    for (const part of SILT_PARTS) {
      expect(SILT_CSS, part).toMatch(
        new RegExp(`\\.silt-figure\\[data-pose\\] \\.${part} \\{ animation:`),
      );
    }
  });

  it("is in the shop's stylesheet", () => {
    expect(SITE_CSS).toContain(SILT_CSS);
  });
});
