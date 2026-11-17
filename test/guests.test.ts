import { describe, expect, it } from "vitest";
import { CATALOG, findItem, type Item } from "../src/core/catalog";
import { GUESTS, guestExhibit, guestFor, type Guest } from "../src/core/guests";
import { boardPage } from "../src/worker/board-page";
import { GUEST_FIGURES, guestBoardLine, guestFigure, guestSection } from "../src/worker/guest";
import { itemPage } from "../src/worker/pages";

const ORIGIN = "https://allegedly.example";
// What a guest never talks about: the same words the tips stay clear of (notes 0003, 0020).
const PROMISES =
  /\$|\bprice|\bcost|\bpay|\bbuy|\bsale\b|\bdiscount|\bshipping|\bdeliver|\bstock\b|\breserve|\bguarantee|\bhold(?:s|ing)? (?:it|one) for\b|\bfirst dibs/i;

function item(slug: string): Item {
  const found = findItem(slug);
  if (found === undefined) throw new Error(`no item ${slug}`);
  return found;
}

describe("the guests", () => {
  it("each arrive with an exhibit that exists, one guest to an exhibit", () => {
    for (const guest of GUESTS) expect(guestExhibit(guest).slug).toBe(guest.exhibit);
    expect(new Set(GUESTS.map((guest) => guest.id)).size).toBe(GUESTS.length);
    expect(new Set(GUESTS.map((guest) => guest.exhibit)).size).toBe(GUESTS.length);
  });

  it("start with Silt Prenderby and the Atlantean Bottle Cap (note 0022)", () => {
    expect(guestFor("atlantean-bottle-cap")?.name).toBe("Silt Prenderby");
    expect(guestFor("alien-paperclip")).toBeUndefined();
  });

  it("say something, briefly, and never name a price or promise anything", () => {
    for (const guest of GUESTS) {
      expect(guest.lines.length, guest.id).toBeGreaterThan(0);
      for (const line of [...guest.lines, guest.board, guest.role]) {
        expect(line.length, line).toBeLessThan(170);
        expect(line, line).not.toMatch(PROMISES);
      }
    }
  });

  it("each have a drawing", () => {
    for (const guest of GUESTS) expect(GUEST_FIGURES[guest.id], guest.id).toBeDefined();
  });

  it("fail loudly on an exhibit that doesn't exist", () => {
    const stray: Guest = {
      id: "x",
      name: "X",
      role: "",
      exhibit: "no-such-exhibit",
      lines: [],
      board: "",
    };
    expect(() => guestExhibit(stray)).toThrow('No exhibit called "no-such-exhibit".');
    expect(() => guestFigure(stray)).toThrow('No drawing for guest "x".');
  });
});

describe("Who's asking, on the guest's exhibit page", () => {
  const page = itemPage(item("atlantean-bottle-cap"), ORIGIN).value.replace(/\s+/g, " ");

  it("introduces the guest with their drawing, role and lines", () => {
    expect(page).toContain('<h2 id="guest-heading">Who’s asking</h2>');
    expect(page).toContain('<figure class="silt-figure">');
    expect(page).toContain("<h3>Silt Prenderby</h3>");
    for (const line of guestFor("atlantean-bottle-cap")?.lines ?? []) {
      expect(page).toContain(`<p class="guest-line">“${line}”</p>`);
    }
  });

  it("says plainly that the guest is a character who holds nothing and doesn't speak for the shop", () => {
    expect(page).toContain(
      "<strong>Plainly:</strong> Silt Prenderby is a character in the story, who",
    );
    expect(page).toContain("holds nothing, sells nothing and doesn’t speak for the shop");
  });

  it("keeps the page's one data-host (Gerald's), so the guest is a still drawing", () => {
    expect(page.match(/data-host/g)).toHaveLength(1);
    expect(page).toContain('<figure class="gerald-figure" data-host>');
  });

  it("comes after the case file, and only one heading id is the guest's", () => {
    expect(page.indexOf("story-heading")).toBeLessThan(page.indexOf("guest-heading"));
    expect(page.match(/id="guest-heading"/g)).toHaveLength(1);
  });

  it("is nowhere on an exhibit with no guest", () => {
    for (const other of CATALOG.filter((one) => guestFor(one.slug) === undefined)) {
      expect(guestSection(other).value, other.slug).toBe("");
      expect(guestBoardLine(other).value, other.slug).toBe("");
      expect(itemPage(other, ORIGIN).value, other.slug).not.toContain("guest-heading");
    }
  });
});

describe("Who's asking, on the Job Board", () => {
  const page = boardPage(new Set()).value;

  it("adds the guest's one line to their exhibit's card, and no other", () => {
    const guest = guestFor("atlantean-bottle-cap");
    expect(page).toContain(`<strong>Who’s asking:</strong> ${guest?.board ?? "missing"}`);
    const onBoard = GUESTS.filter((one) => guestExhibit(one).status === "pending");
    expect(page.match(/Who’s asking:/g)).toHaveLength(onBoard.length);
  });

  it("puts the line on the right card", () => {
    const card = page.slice(page.indexOf("The Atlantean Bottle Cap"));
    const next = card.indexOf('<li class="card">');
    expect(card.slice(0, next === -1 ? undefined : next)).toContain("Who’s asking:");
  });
});
