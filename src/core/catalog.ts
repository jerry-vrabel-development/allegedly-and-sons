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

/** The wings of the collection (note 0010): sets of four exhibits. */
export type WingId =
  "off-world" | "cryptid" | "lost-civilizations" | "royal-legendary" | "unexplained";

export interface Wing {
  readonly id: WingId;
  readonly name: string;
  /** One line, in the Bureau's voice. */
  readonly blurb: string;
}

/** A wing is complete, and earns its commendation, at this many exhibits. */
export const WING_SIZE = 4;

/** The wings, in the order the shop shows them. */
export const WINGS: readonly Wing[] = [
  { id: "off-world", name: "Off-World", blurb: "Recovered from crash sites and other planets." },
  { id: "cryptid", name: "The Cryptid Wing", blurb: "Personal effects of the rarely seen." },
  {
    id: "lost-civilizations",
    name: "Lost Civilizations",
    blurb: "From cities that sank, scattered or misplaced themselves.",
  },
  {
    id: "royal-legendary",
    name: "Royal & Legendary",
    blurb: "Near the throne. Occasionally on it.",
  },
  { id: "unexplained", name: "The Unexplained", blurb: "The Bureau has stopped asking." },
];

/**
 * Available: sourced, in stock, for sale and on the Broadcast. Pending: the
 * case file is live and the card can be collected, but there's nothing to
 * buy yet (note 0010).
 */
export type ItemStatus = "available" | "pending";

export interface Item {
  /** URL-safe id, used in /items/<slug>. */
  readonly slug: string;
  readonly name: string;
  readonly status: ItemStatus;
  readonly wing: WingId;
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
  /** Price in US cents, to avoid floating-point money. Expected price while pending. */
  readonly priceCents: number;
  readonly specs: readonly Spec[];
  readonly story: Story;
  /**
   * The Back-Room Broadcast host's pitch (note 0009), one line per beat.
   * Lore rule: outlandish, never plausible; the price is never in here.
   */
  readonly pitch: readonly [string, ...string[]];
}

export const THE_BUREAU: Author = {
  name: "The Bureau",
  title: "Field Office, Bureau of Improbable Acquisitions",
};

/**
 * Every exhibit, in exhibit-number order. At least one is available; the first
 * available one is featured on the home page.
 */
export const CATALOG: readonly [Item, ...Item[]] = [
  {
    slug: "alien-paperclip",
    status: "available",
    wing: "off-world",
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
    pitch: [
      "Folks, I've been told not to say where this came from. I'm going to say it anyway: space.",
      "Look at that curve. No human hand bent that. Possibly no hand at all.",
      "It held the minutes of three secret meetings and it is ready to hold your grocery list.",
      "My producer is waving at me. The feds are waving at my producer. We do not have long.",
    ],
  },
  {
    slug: "second-best-quill",
    status: "available",
    wing: "royal-legendary",
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
    pitch: [
      "Every treaty in history had a best quill. This one was right there. Right there, folks.",
      "It stood by at a royal wedding in case of blots. Do you know what that kind of loyalty costs?",
      "It signed a pharaoh's lunch order. For eleven minutes it was the most powerful pen on Earth.",
      "Second place is still a place. Tonight it can be your place.",
    ],
  },
  {
    slug: "viking-participation-trophy",
    status: "available",
    wing: "royal-legendary",
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
    pitch: [
      "Bjorn the Adequate showed up. That's it. That's the whole saga. And they gave him this.",
      "You show up to things. Meetings. Birthdays. The dentist, mostly. Where's your trophy?",
      "Bronze-colored, horned, and buried with honor. Well. Buried.",
      "His family traded it for a sandwich. I'm asking a little more than a sandwich.",
    ],
  },
  {
    slug: "martian-rubber-band",
    status: "pending",
    wing: "off-world",
    name: "The Martian Rubber Band",
    exhibit: "AS-0004",
    tagline: "Stretched across two planets. Snapped back.",
    hook: "It once held Mars and Earth together for a long weekend.",
    estimatedValue: "Two planets, loosely bundled",
    artAlt:
      "Illustration of a red rubber band stretched between a small red planet and a small blue planet.",
    priceCents: 2_400,
    specs: [
      { label: "Material", value: "Rubber (expected)" },
      { label: "Size", value: "About 8 cm across, unstretched (expected)" },
      { label: "Condition", value: "Elastic. Homesick." },
    ],
    story: {
      headline: "The Interplanetary Bundle",
      paragraphs: [
        "In 1911, during a close pass, a Martian clerk tried to file Earth and Mars in the same folder. Lacking a folder, he used this.",
        "For one long weekend the two planets were held together by a single red rubber band. Tides got confused. Pigeons flew to Mars and back without noticing. A man in Ohio reported that his mailbox now faced the wrong planet.",
        "On Monday the band snapped back to its natural size and landed in a desk drawer in Duluth, where the Bureau found it under a stapler that refused to comment.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "This rubber band has held two planets at once. What has your rubber band done?",
      "For one weekend, Mars and Earth were bundled together. By this. Right here.",
      "The pigeons still talk about it. Ask any pigeon.",
      "It snapped back, folks. It's ready to bundle again. Your mail. Your celery. Your worlds.",
    ],
  },
  {
    slug: "moonwalkers-spare-button",
    status: "pending",
    wing: "off-world",
    name: "The Moonwalker's Spare Button",
    exhibit: "AS-0005",
    tagline: "Packed for the Moon, just in case. Never needed.",
    hook: "The spacesuit had no buttons. Somebody packed a spare anyway.",
    estimatedValue: "One small step, slightly used",
    artAlt:
      "Illustration of a large four-hole button floating above the grey surface of the Moon, with Earth in the sky.",
    priceCents: 8_900,
    specs: [
      { label: "Material", value: "Plastic, four holes (expected)" },
      { label: "Diameter", value: "About 2 cm (expected)" },
      { label: "Condition", value: "Has not been sewn. Has been to the Moon." },
    ],
    story: {
      headline: "In Case of Buttons",
      paragraphs: [
        "Moon suits are zipped, sealed and clamped. They have no buttons at all. Somebody packed a spare button anyway, taped inside a glove, with a note: “Just in case.”",
        "It rode to the Moon, bounced across the surface in a pocket that also did not exist, and came home without once being needed. The mission's report lists it under “morale.”",
        "The Bureau acquired it from a laundromat on the far side of the Moon, which closes early on Tuesdays. It is the only button in the collection that has seen the Earth from above, and it has not been the same since.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "This button went to the Moon on a suit with no buttons. Think about that preparation.",
      "It was never needed. Not once. And it went anyway. That's commitment, folks.",
      "It has seen the whole Earth from above. Your shirt buttons have seen your shirt.",
      "Sew it on. Don't sew it on. It's been to the Moon. It's fine either way.",
    ],
  },
  {
    slug: "time-travelers-bus-token",
    status: "pending",
    wing: "off-world",
    name: "The Time Traveler's Bus Token",
    exhibit: "AS-0006",
    tagline: "Good for one ride on a route that doesn't exist yet.",
    hook: "Found on a bus seat in 1964. Valid on Route 88, which opens in 2391.",
    estimatedValue: "One fare, adjusted for four centuries of inflation",
    artAlt:
      "Illustration of a brass transit token stamped with a small clock face, glowing on an evidence board.",
    priceCents: 14_900,
    specs: [
      { label: "Material", value: "Brass-colored metal (expected)" },
      { label: "Diameter", value: "About 2.3 cm (expected)" },
      { label: "Fare", value: "Not accepted on any bus currently in service." },
    ],
    story: {
      headline: "Exact Change, Wrong Century",
      paragraphs: [
        "In 1964, a driver on the last run of the night found this token on a seat, still warm. It is stamped “Route 88, Good For One Ride.” There was no Route 88. There still isn't.",
        "Bureau chronologists traced the route to the year 2391, when it will run hourly between a floating library and a soup restaurant shaped like a soup. The passenger who dropped it has, presumably, not yet been born, and is already late.",
        "The token keeps very slightly ahead of time. Leave it on a nightstand and it will be on the floor five minutes before you knock it off.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Route 88. Floating library to the soup restaurant. Every hour. Starting in 2391.",
      "Somebody from the future dropped this on a bus in 1964. They're going to want it back.",
      "It's always five minutes ahead. Your watch wishes it could be this token.",
      "Exact change, folks. Wrong century. Perfect gift.",
    ],
  },
];

/** Matches /items/<slug> and captures the slug. */
export const ITEM_PATH = /^\/items\/([a-z0-9-]+)$/;

/** Finds an item by slug, or `undefined` if the Bureau has no such thing. */
export function findItem(slug: string): Item | undefined {
  return CATALOG.find((item) => item.slug === slug);
}

/** Whether an item can be bought (and aired) right now. */
export function isAvailable(item: Item): boolean {
  return item.status === "available";
}

/** Finds an item that's for sale, or `undefined` (unknown, or acquisition pending). */
export function findAvailableItem(slug: string): Item | undefined {
  const item = findItem(slug);
  return item !== undefined && isAvailable(item) ? item : undefined;
}

/** The items for sale, in exhibit order. Never empty (a test checks). */
export const AVAILABLE_ITEMS = CATALOG.filter(isAvailable) as unknown as readonly [Item, ...Item[]];

/** A wing's exhibits, in exhibit order. */
export function wingItems(wing: WingId): readonly Item[] {
  return CATALOG.filter((item) => item.wing === wing);
}

/** The wings with all their exhibits, which are the ones with a commendation. */
export function fullWings(): readonly Wing[] {
  return WINGS.filter((wing) => wingItems(wing.id).length === WING_SIZE);
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Formats a price in cents as US dollars, e.g. 49900 → "$499.00". */
export function formatPrice(cents: number): string {
  return USD.format(cents / 100);
}
