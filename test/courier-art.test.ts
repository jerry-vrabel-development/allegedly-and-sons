import { describe, expect, it } from "vitest";
import {
  COURIER_ARTIST,
  COURIER_CSS,
  COURIER_PARTS,
  courierArt,
  courierFigure,
} from "../src/worker/courier-art";

const art = courierArt().value;

describe("the Courier's drawing", () => {
  it("is one picture with a name and a description for screen readers", () => {
    expect(art.match(/<svg\b/g)).toHaveLength(1);
    expect(art).toContain('role="img"');
    expect(art).toContain('aria-labelledby="courier-title courier-desc"');
    expect(art).toMatch(/<title id="courier-title">[^<]+<\/title>/);
    expect(art).toMatch(/<desc id="courier-desc">[^<]+<\/desc>/);
  });

  it("describes a courier drawn half out of a wormhole: coat, collar, cap, satchel, slip, legs", () => {
    const description = /<desc id="courier-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    for (const word of ["wormhole", "coat", "collar", "cap", "satchel", "slip", "legs"]) {
      expect(description, word).toContain(word);
    }
  });

  it("draws what it describes: five legs, one satchel, one slip, three buttons", () => {
    // Five legs, each a pair of strokes and a spat.
    expect(art.match(/<ellipse\s+cx="\d+"\s+cy="\d+"\s+rx="14"\s+ry="7"/g)).toHaveLength(5);
    expect(art.match(/class="courier-satchel"/g)).toHaveLength(1);
    expect(art.match(/class="courier-slip"/g)).toHaveLength(1);
    expect(art.match(/<circle\s+cx="224"\s+cy="\d+"\s+r="5"/g)).toHaveLength(3);
  });

  it("has no name and makes no promise: its only words are the plate, with no digit, date or money", () => {
    expect(art).toMatch(/>\s*ASKING DISCOURAGED\s*</);
    const text = [...art.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map((match) => match[1]);
    expect(text).toHaveLength(1);
    for (const line of text) expect(line, line).not.toMatch(/\d|\$|€|£/);
    const description = /<desc id="courier-desc">([^<]+)<\/desc>/.exec(art)?.[1] ?? "";
    expect(description).not.toMatch(/\d|\$|€|£|deliver(y|ed) (by|on|in)|arriv|ship/i);
  });

  it("needs nothing the page's policy forbids: no inline styles, scripts or outside files", () => {
    expect(art).not.toMatch(
      /\sstyle=|<style|<script|\son[a-z]+=|href=|https?:\/\/|<image\b|<foreignObject/,
    );
  });

  it("gives every id once, all its own", () => {
    const ids = [...art.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^courier-/);
  });

  it("names every moving part, in the drawing and in its styles", () => {
    expect(COURIER_PARTS).toHaveLength(4);
    for (const part of COURIER_PARTS) {
      expect(art, part).toMatch(new RegExp(`class="[^"]*\\b${part}\\b`));
      expect(COURIER_CSS, part).toContain(`.${part}`);
    }
  });

  it("is credited to the Bureau until a partner draws it", () => {
    expect(COURIER_ARTIST).toBe("The Bureau");
  });
});

describe("the Courier on a page", () => {
  const figure = courierFigure().value;

  it("is one figure, the page's data-host, with the drawing and its credit", () => {
    expect(figure.startsWith('<figure class="courier-figure" data-host>')).toBe(true);
    expect(figure.match(/data-host/g)).toHaveLength(1);
    expect(figure).toContain(art);
    expect(figure.endsWith("<figcaption>Sketch by The Bureau.</figcaption></figure>")).toBe(true);
  });
});

describe("the Courier's motion", () => {
  // Rules, without the @keyframes blocks.
  const rules = COURIER_CSS.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "")
    .split("}")
    .map((rule) => rule.trim())
    .filter((rule) => rule.includes("{"));

  it("holds still unless the figure has a pose, so the Motion toggle and the plain group stop it", () => {
    const moving = rules.filter((rule) => /animation(-name)?:/.test(rule));
    expect(moving).toHaveLength(4);
    for (const rule of moving) expect(rule.split("{")[0], rule).toContain("[data-pose]");
  });

  it("moves every part", () => {
    for (const part of COURIER_PARTS) {
      expect(COURIER_CSS, part).toMatch(
        new RegExp(`\\.courier-figure\\[data-pose\\] \\.${part} \\{ animation:`),
      );
    }
  });

  it("turns the wormhole's rim by moving its dashes, which needs no pivot", () => {
    expect(COURIER_CSS).toContain("@keyframes courier-turn { to { stroke-dashoffset: -48; } }");
  });

  it("sits beside the page's words on a wide screen and above them on a narrow one", () => {
    expect(COURIER_CSS).toContain("@media (min-width: 40rem) { .courier-figure { float: right;");
    expect(COURIER_CSS).toContain(".prose:has(> .courier-figure) { display: flow-root; }");
    expect(COURIER_CSS).toContain(".certificate-moment { clear: both; }");
  });
});
