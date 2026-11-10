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
  {
    slug: "bigfoots-lost-comb",
    status: "pending",
    wing: "cryptid",
    name: "Bigfoot's Lost Comb",
    exhibit: "AS-0007",
    tagline: "He was never blurry. He was just mid-brush.",
    hook: "Every blurry photo of Bigfoot was taken while he was grooming. This is why.",
    estimatedValue: "Forty acres of very well-kept fur",
    artAlt:
      "Illustration of a large brown comb lying beside a giant footprint pressed into dark forest soil.",
    priceCents: 12_900,
    specs: [
      { label: "Material", value: "Plastic comb (expected)" },
      { label: "Length", value: "About 13 cm (expected)" },
      { label: "Teeth", value: "All present. Several have seen things." },
    ],
    story: {
      headline: "The Grooming Hypothesis",
      paragraphs: [
        "For decades, experts asked why every photo of Bigfoot is blurry. The Bureau has the answer: he is always combing. A creature with that much hair never stops. The blur is motion. The motion is vanity.",
        "This comb was dropped at a campsite in the deep woods during a hurried retreat from a family of four and their very loud cooler. Its teeth still hold seven distinct shades of brown and one strand that is, inexplicably, silver.",
        "Since losing it, Bigfoot has not been photographed at all. The Bureau believes he is embarrassed and will not be seen in public until it is returned. We are not returning it.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Folks, every blurry Bigfoot photo. Every one. He was brushing. That's the blur.",
      "He dropped this at a campsite running from a cooler. A cooler. Have some sympathy.",
      "He hasn't been seen since. He won't go out without it. You can see why.",
      "Seven shades of brown, one mystery silver. Comb your own legend tonight.",
    ],
  },
  {
    slug: "loch-ness-bath-duck",
    status: "pending",
    wing: "cryptid",
    name: "The Loch Ness Bath Duck",
    exhibit: "AS-0008",
    tagline: "The only creature she's ever let get close.",
    hook: "Nobody has a clear photo of her. This duck has a clear photo of nobody else.",
    estimatedValue: "One loch, slightly used, with monster",
    artAlt:
      "Illustration of a yellow rubber duck floating on a dark loch, with a long-necked silhouette rising from the water behind it.",
    priceCents: 3_400,
    specs: [
      { label: "Material", value: "Rubber duck (expected)" },
      { label: "Height", value: "About 9 cm (expected)" },
      { label: "Squeak", value: "Yes. It knows what it did." },
    ],
    story: {
      headline: "Bath Time in the Deep",
      paragraphs: [
        "She is a thousand feet long by some accounts and shy by all of them. What the accounts leave out is that she takes a bath every Thursday, in the loch, which is already a bath, and she likes company.",
        "For two hundred years her only companion was this rubber duck. It has floated beside her through storms, tour boats and a very tense afternoon with a submarine. It has seen her face clearly more times than anyone alive and has never once told.",
        "The duck washed up on a pebble beach in a bottle with a note reading “Please look after him. He is a good listener.” The Bureau has honored this request to the letter by putting him up for sale.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "This duck has seen her face. Up close. On a Thursday. And it has never talked.",
      "Two hundred years of bath time with the most famous shy creature in the world.",
      "Squeeze it. Go on. That squeak has echoed off a monster.",
      "She asked us to look after him. We're asking you to look after him. It's basically the same.",
    ],
  },
  {
    slug: "mothmans-night-light",
    status: "pending",
    wing: "cryptid",
    name: "The Mothman's Night-Light",
    exhibit: "AS-0009",
    tagline: "Drawn to the light. Also afraid of the dark.",
    hook: "Seven feet tall, red eyes, huge wings. Sleeps with this on.",
    estimatedValue: "One full night of uninterrupted sleep",
    artAlt:
      "Illustration of a small glowing candle-style light, with the dark silhouette of a winged figure with red eyes looming behind it.",
    priceCents: 17_900,
    specs: [
      { label: "Material", value: "Battery-powered LED tea light (expected)" },
      { label: "Height", value: "About 4 cm (expected)" },
      { label: "Battery", value: "Included (expected). Moth not included." },
    ],
    story: {
      headline: "A Light for the Dark Ones",
      paragraphs: [
        "The Mothman is seven feet tall, has wings like a barn door and eyes like brake lights. He is also, the Bureau can now confirm, extremely afraid of the dark.",
        "Being a moth, he cannot sleep near any light without circling it until dawn. So he had this one made: a light just small enough to comfort him and just dim enough not to keep him up. It took four hundred prototypes and one very patient lamp shop.",
        "He traded it to a Bureau agent for a lamp with a brighter bulb, which he has been circling, happily and without rest, ever since. He seemed fine with the deal. He seemed very fine.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Seven feet tall. Glowing red eyes. Wings like a barn door. Scared of the dark, folks.",
      "Four hundred prototypes to get this glow just right for a giant moth to sleep by.",
      "He traded it for a brighter bulb and he hasn't stopped circling since. Happy man. Moth.",
      "Put it by your bed. If something enormous taps the window, that's just a review.",
    ],
  },
  {
    slug: "tooth-fairys-spare-change",
    status: "pending",
    wing: "cryptid",
    name: "The Tooth Fairy's Spare Change",
    exhibit: "AS-0010",
    tagline: "Her float for the night shift. Short one molar.",
    hook: "She dropped it under the wrong pillow and never came back for it.",
    estimatedValue: "Three wisdom teeth at the overnight rate",
    artAlt:
      "Illustration of three small coins and a tiny white tooth scattered on a pillow, sprinkled with sparkles.",
    priceCents: 1_900,
    specs: [
      { label: "Contents", value: "Three assorted small coins (expected)" },
      { label: "Material", value: "Metal coins in a small cloth pouch (expected)" },
      { label: "Legal tender", value: "Somewhere, probably. Not for teeth." },
    ],
    story: {
      headline: "The Night Shift Float",
      paragraphs: [
        "The Tooth Fairy works one long night that lasts all year. She carries a float of spare change so she can pay for any tooth on the spot, at rates set by an exchange nobody has ever seen.",
        "One night, somewhere around the four-millionth pillow, she slipped this pouch under the wrong one: an adult's, belonging to a man who had lost no teeth and was very confused in the morning. She never came back for it. Bureau accountants say she wrote it off.",
        "The pouch is still exactly one molar short of balancing. The Bureau has made no attempt to fix this and asks that you don't either.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "The Tooth Fairy's own float, folks. Spare change for the night shift.",
      "She slipped it under a grown man's pillow by mistake. He's still thinking about it.",
      "One molar short of balancing. Her accountants wrote it off. We wrote it up.",
      "The smallest price in the shop for the most magical pocket change you'll ever hold.",
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
