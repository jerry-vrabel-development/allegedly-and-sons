/**
 * The catalog: every item the shop sells, with its story.
 *
 * Kept as plain, typed data in the shared core so the Worker, tests and (later)
 * analytics all read the same rulebook. Stories are separate from items and
 * always have an author, so partnered writers can replace house stories later
 * (see docs/design/0002-writers.md).
 *
 * Lore rule (docs/design/0003-gamification.md): stories are outlandish, never
 * plausible. Specifications are plain facts about what actually ships.
 */

export interface Author {
  readonly name: string;
  /** A themed Bureau title, e.g. "Senior Treasure Hunter". */
  readonly title: string;
}

export interface Story {
  readonly headline: string;
  /** At least one paragraph; the first is shown before "keep reading". */
  readonly paragraphs: readonly [string, ...string[]];
  readonly author: Author;
}

/** A true, plain fact about the physical item that ships. */
export interface Spec {
  readonly label: string;
  readonly value: string;
}

export interface Item {
  /** URL-safe id, used in /items/<slug>. */
  readonly slug: string;
  readonly name: string;
  /** Exhibit number, also printed on the Bureau certificate. */
  readonly exhibit: string;
  readonly tagline: string;
  /** One gripping line shown above the fold, before the full story. */
  readonly hook: string;
  /**
   * A comedic "estimated value", shown next to the real price as a joke anchor.
   * It must be obviously absurd (never a real former price): see the lore rule.
   */
  readonly estimatedValue: string;
  /** Alt text for the item's illustration. */
  readonly artAlt: string;
  /** Price in US cents, to avoid floating-point money. */
  readonly priceCents: number;
  readonly specs: readonly Spec[];
  readonly story: Story;
}

export const THE_BUREAU: Author = {
  name: "The Bureau",
  title: "Field Office, Bureau of Improbable Acquisitions",
};

/** At least one item; the first is featured on the home page. */
export const CATALOG: readonly [Item, ...Item[]] = [
  {
    slug: "alien-paperclip",
    name: "The Alien Paperclip",
    exhibit: "AS-0001",
    tagline: "Recovered from a crash site. Still holds paper.",
    hook: "A UFO crossed a soybean field in 1973. This is what fell out.",
    estimatedValue: "4 billion Zorbian credits",
    artAlt:
      "Illustration of a silver paperclip glowing on a dark evidence board, with a small flying saucer overhead.",
    priceCents: 49_900,
    specs: [
      { label: "Material", value: "Steel wire" },
      { label: "Length", value: "About 33 mm" },
      { label: "Condition", value: "Excellent. Has seen things." },
    ],
    story: {
      headline: "The Xenoclip of the Soybean Field",
      paragraphs: [
        "In the summer of 1973, a craft the size of a minivan skidded across a soybean field and left behind exactly one thing: this paperclip. The pilots, we are told, were in a hurry.",
        "Bureau field agents recovered it from a gopher who had been using it to file his taxes. Under examination, the clip bent into a shape no human geometry allows, then bent back, apparently embarrassed.",
        "It has since held together the minutes of three secret meetings, a pizza menu and a single unread letter addressed “To Whom It May Concern, Earth.” It is ready to hold your papers next.",
      ],
      author: THE_BUREAU,
    },
  },
  {
    slug: "second-best-quill",
    name: "The Second-Best Quill",
    exhibit: "AS-0002",
    tagline: "Present at nearly everything important.",
    hook: "Every great signature in history had a backup. Meet it.",
    estimatedValue: "One slightly disputed goose",
    artAlt: "Illustration of a cream-colored feather quill resting at an angle beside an ink blot.",
    priceCents: 34_900,
    specs: [
      { label: "Material", value: "Feather with a metal nib" },
      { label: "Length", value: "About 28 cm" },
      { label: "Ink", value: "Not included. It prefers to watch." },
    ],
    story: {
      headline: "Always the Backup, Never the Bride",
      paragraphs: [
        "Every great document in history was signed with the best quill. This is the one lying right next to it.",
        "It waited in reserve at a treaty between two kingdoms over a disputed goose, stood by at a royal wedding in case of blots, and once, for eleven glorious minutes, signed a pharaoh’s lunch order.",
        "It has never been first. It has never complained. The Bureau considers it the most dependable object in the collection.",
      ],
      author: THE_BUREAU,
    },
  },
  {
    slug: "viking-participation-trophy",
    name: "The Viking Participation Trophy",
    exhibit: "AS-0003",
    tagline: "Awarded for showing up to the raid.",
    hook: "Found in the grave of Bjorn the Adequate. His saga: “He was there.”",
    estimatedValue: "Three longships and a sandwich",
    artAlt: "Illustration of a small bronze-colored trophy cup with Viking horns on its lid.",
    priceCents: 27_500,
    specs: [
      { label: "Material", value: "Bronze-colored plastic" },
      { label: "Height", value: "About 10 cm" },
      { label: "Engraving", value: "Blank. Bjorn never got around to it." },
    ],
    story: {
      headline: "Bjorn the Adequate",
      paragraphs: [
        "Long before medals, the Norse gave this trophy to any warrior who reached the longship on time, brought a snack and tried their best.",
        "Only one has ever surfaced, buried with Bjorn the Adequate, whose entire saga is a single line: “He was there.”",
        "Bjorn’s descendants handed it to the Bureau in exchange for a sandwich and a sincere thank-you. They describe the deal as fair.",
      ],
      author: THE_BUREAU,
    },
  },
];

/** Finds an item by slug, or `undefined` if the Bureau has no such thing. */
export function findItem(slug: string): Item | undefined {
  return CATALOG.find((item) => item.slug === slug);
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats a price in cents as US dollars, e.g. 49900 → "$499.00". */
export function formatPrice(cents: number): string {
  return USD.format(cents / 100);
}
