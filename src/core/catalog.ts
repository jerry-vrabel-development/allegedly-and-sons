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
  {
    slug: "atlantean-bottle-cap",
    status: "pending",
    wing: "lost-civilizations",
    name: "The Atlantean Bottle Cap",
    exhibit: "AS-0011",
    tagline: "The city sank. The soda stayed fizzy.",
    hook: "Atlantis went down in a day. Its last soda was never opened. Until now.",
    estimatedValue: "One sunken city's entire recycling deposit",
    artAlt:
      "Illustration of a crimped metal bottle cap resting on the sea floor among bubbles, with sunken columns behind it.",
    priceCents: 2_200,
    specs: [
      { label: "Material", value: "Metal crown cap (expected)" },
      { label: "Diameter", value: "About 2.6 cm (expected)" },
      { label: "Fizz", value: "Departed. Under investigation." },
    ],
    story: {
      headline: "The Last Soda of Atlantis",
      paragraphs: [
        "Atlantis had marble temples, crystal towers and, according to Bureau divers, an excellent soda fountain. On the day the city sank, one bottle was sitting on the counter, still sealed.",
        "It sank with everything else and stayed fizzy for nine thousand years. The divers who found it report that the bubbles were still rising, very slowly, in a single orderly line, as if waiting for someone to say it was all right to leave.",
        "The Bureau opened it. The fizz left. Nobody knows where it went, and the Bureau's best theory is that it simply went home. This cap is what remains.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Nine thousand years under the sea and that soda was still fizzy, folks. Still fizzy.",
      "We opened it. The bubbles left in an orderly line. Atlantis had manners.",
      "This cap held in a lost civilization's last refreshment. What does your cap hold in?",
      "A little piece of Atlantis for less than a sandwich. A small sandwich.",
    ],
  },
  {
    slug: "rosetta-coaster",
    status: "pending",
    wing: "lost-civilizations",
    name: "The Rosetta Coaster",
    exhibit: "AS-0012",
    tagline: "The same bar order, in three dead languages.",
    hook: "Scholars spent centuries on the famous stone. This was the one under the drinks.",
    estimatedValue: "A round for the entire ancient world",
    artAlt:
      "Illustration of a round cork coaster covered in three bands of ancient-looking writing, with a ring stain from a cup.",
    priceCents: 4_500,
    specs: [
      { label: "Material", value: "Cork coaster (expected)" },
      { label: "Diameter", value: "About 10 cm (expected)" },
      { label: "Translation", value: "“Two beers and whatever he's having.”" },
    ],
    story: {
      headline: "Under the Drinks",
      paragraphs: [
        "Everyone knows about the great carved stone that unlocked a dead language. Nobody asks where the scribes went after work. The Bureau asked. They went to a tavern, and they brought their habits with them.",
        "This coaster carries the same message three times, in three ancient scripts, so that any bartender of any empire could read it. Bureau linguists spent eleven years on the translation. It reads: “Two beers and whatever he's having.”",
        "Who “he” was remains the great unsolved question of the ancient world. The ring stain has been dated to a Thursday.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Three dead languages, folks. One message. And the message is a bar order.",
      "Eleven years of translation. “Two beers and whatever he's having.” Worth it.",
      "Who was he? What was he having? History won't say. This coaster knows.",
      "Put your drink on a piece of ancient scholarship. The scholars would have wanted that.",
    ],
  },
  {
    slug: "pharaohs-spare-key",
    status: "pending",
    wing: "lost-civilizations",
    name: "The Pharaoh's Spare Key",
    exhibit: "AS-0013",
    tagline: "For the tomb. In case he locked himself in.",
    hook: "He planned his afterlife for forty years. He still hid a key under the mat.",
    estimatedValue: "One pyramid, gently haunted",
    artAlt:
      "Illustration of an old-fashioned metal key lying on sand, with a small pyramid and a crescent moon in the background.",
    priceCents: 18_900,
    specs: [
      { label: "Material", value: "Old-style metal key (expected)" },
      { label: "Length", value: "About 6 cm (expected)" },
      { label: "Opens", value: "Nothing currently above ground." },
    ],
    story: {
      headline: "Under the Mat",
      paragraphs: [
        "A pharaoh spends his whole life preparing for the next one: the tomb, the treasures, the boats, the snacks. This one also worried, privately, about being locked out of it.",
        "So he had a spare key made and hid it where every homeowner in history has hidden one: under the mat, outside the front door of his pyramid. The mat has not survived. The key has.",
        "It was found by a Bureau agent who tripped over it while looking for a better parking spot. It has never been tried in the lock. The Bureau would rather not know what answers the door.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Forty years planning the afterlife, folks, and he still hid a spare under the mat.",
      "Every one of us has done it. A pharaoh did it first. That's royalty.",
      "It's never been tried in the lock. We'd rather not know who answers.",
      "Hang it by your door. Explain it to no one.",
    ],
  },
  {
    slug: "last-dodos-feather",
    status: "pending",
    wing: "lost-civilizations",
    name: "The Last Dodo's Feather",
    exhibit: "AS-0014",
    tagline: "She saw it coming. She left a note.",
    hook: "The very last dodo knew exactly what was happening. This was her goodbye.",
    estimatedValue: "An entire island's worth of regret",
    artAlt:
      "Illustration of a single grey-brown feather tucked into a folded note sealed with wax, on a dark evidence board.",
    priceCents: 29_900,
    specs: [
      { label: "Material", value: "Craft feather (expected)" },
      { label: "Length", value: "About 15 cm (expected)" },
      { label: "Note", value: "Not included. The Bureau is keeping the note." },
    ],
    story: {
      headline: "A Note from the Last of Them",
      paragraphs: [
        "History calls the dodo slow and trusting. The Bureau's files say otherwise. The last dodo was, by every account, the smartest bird on the island, and she was the first to notice that she was the last.",
        "She spent her final afternoon writing a short note in careful pencil, folded it, tucked this feather inside, and left it on a rock where she was sure someone would find it. It took the Bureau three hundred years. The rock was very patient.",
        "The note itself stays in the Bureau's archive, sealed. All the Bureau will say is that it ends, “Look after the others.” We are trying.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "She was the last one, folks, and she was the first to know it. Smartest bird on the island.",
      "Her final afternoon, she wrote a note. Folded it. Tucked this feather inside.",
      "The note stays in the archive. It ends, “Look after the others.” Heavy stuff for a bird.",
      "Our most serious exhibit. Treat it gently. We do.",
    ],
  },
  {
    slug: "emperors-lost-thimble",
    status: "pending",
    wing: "royal-legendary",
    name: "The Emperor's Lost Thimble",
    exhibit: "AS-0015",
    tagline: "He conquered half a continent. He hemmed his own trousers.",
    hook: "History remembers the battles. His tailor remembers the thimble.",
    estimatedValue: "Half a continent, slightly taken in at the waist",
    artAlt:
      "Illustration of a small silver thimble on a velvet cushion, with a crown and a threaded needle beside it.",
    priceCents: 4_900,
    specs: [
      { label: "Material", value: "Metal sewing thimble (expected)" },
      { label: "Height", value: "About 2 cm (expected)" },
      { label: "Fits", value: "Most fingers. One famous one." },
    ],
    story: {
      headline: "The Emperor's Secret Hobby",
      paragraphs: [
        "He crowned himself, redrew the map and was painted on a rearing horse. What the paintings leave out is that every evening, after the war councils, he sat by the fire and hemmed his own trousers.",
        "He trusted no tailor. Tailors talk. So he did his own alterations, by candlelight, wearing this thimble, and his trousers were, by every account, impeccable.",
        "He lost it during a hurried departure from an island, the second one. His last recorded words on the subject were “Find the thimble.” The Bureau did. It took a while.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "An emperor, folks. Conquered half a continent. Hemmed his own trousers every night.",
      "He trusted no tailor. Tailors talk. This thimble never said a word.",
      "His last order on the matter: “Find the thimble.” Mission accomplished.",
      "Royal craftsmanship for the price of a nice lunch. Put a crown on your sewing kit.",
    ],
  },
  {
    slug: "king-arthurs-lesser-pebble",
    status: "pending",
    wing: "royal-legendary",
    name: "King Arthur's Lesser Pebble",
    exhibit: "AS-0016",
    tagline: "The sword came out of the big rock. This is the small one.",
    hook: "Everyone tried the big stone. Nobody tried the pebble next to it.",
    estimatedValue: "One minor kingdom, with moat",
    artAlt:
      "Illustration of a small smooth pebble on grass, beside the base of a huge stone with a sword's slot in it.",
    priceCents: 34_900,
    specs: [
      { label: "Material", value: "Smooth natural stone (expected)" },
      { label: "Size", value: "About 4 cm across (expected)" },
      { label: "Sword", value: "None. Never had one. Doesn't want to talk about it." },
    ],
    story: {
      headline: "Whosoever Pulleth This Pebble",
      paragraphs: [
        "The legend is famous: a sword in a stone, and whoever pulled it would be king. What the legend leaves out is the pebble sitting right beside it, waiting with a much smaller sword slot that nobody noticed.",
        "For three hundred years knights lined up at the big stone. Not one of them looked down. The pebble, meanwhile, held a tiny sword that would have made someone king of a slightly smaller kingdom, with a moat and reasonable taxes.",
        "The tiny sword has since gone missing. The pebble remains, smooth and patient, still technically offering a crown to whoever asks it politely. Nobody has.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Everyone lined up for the big stone, folks. Nobody looked down. Nobody.",
      "This pebble held the other sword. Smaller kingdom. Moat. Reasonable taxes.",
      "It's still technically offering a crown. You just have to ask nicely. Nobody has.",
      "The Midnight Auction was made for this kind of legend. A lesser one. Ours.",
    ],
  },
  {
    slug: "haunted-rubber-stamp",
    status: "pending",
    wing: "unexplained",
    name: "The Haunted Rubber Stamp",
    exhibit: "AS-0017",
    tagline: "It stamps APPROVED on its own. Everything. Always.",
    hook: "A clerk retired in 1958. Nobody told the stamp.",
    estimatedValue: "Every permit ever filed, approved",
    artAlt:
      "Illustration of a wooden-handled rubber stamp hovering above a sheet of paper stamped APPROVED, with a faint ghostly glow around it.",
    priceCents: 9_900,
    specs: [
      { label: "Material", value: "Wood-handled rubber stamp (expected)" },
      { label: "Height", value: "About 7 cm (expected)" },
      { label: "Says", value: "APPROVED. It has opinions on nothing else." },
    ],
    story: {
      headline: "The Clerk Who Never Left",
      paragraphs: [
        "For forty years, a clerk at a small county office approved every form that crossed his desk. Permits, licenses, a request to keep a llama in an apartment. He believed in yes.",
        "He retired in 1958. Nobody told the stamp. It kept going: forms left on the desk overnight came back approved by morning, and so, eventually, did a napkin, a parking ticket and the office cat.",
        "The Bureau acquired it after it approved its own transfer. Keep it away from paperwork you have not decided about. It has decided.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "This stamp approves everything, folks. Forms. Napkins. A cat. It believes in yes.",
      "The clerk retired decades ago and the stamp just kept working. That's a work ethic.",
      "It approved its own transfer to the Bureau. We didn't even ask.",
      "Keep it away from anything you haven't decided on. It already has.",
    ],
  },
  {
    slug: "bermuda-triangle-guitar-pick",
    status: "pending",
    wing: "unexplained",
    name: "The Bermuda Triangle Guitar Pick",
    exhibit: "AS-0018",
    tagline: "Picks go missing everywhere. This is where they go.",
    hook: "Every pick you ever lost ended up in one place. This one came back.",
    estimatedValue: "Every pick you've ever lost, plus interest",
    artAlt:
      "Illustration of a triangular guitar pick floating over swirling sea water, with small silhouettes of other picks spiraling into the distance.",
    priceCents: 2_900,
    specs: [
      { label: "Material", value: "Plastic guitar pick (expected)" },
      { label: "Size", value: "Standard, about 3 cm (expected)" },
      { label: "Gauge", value: "Medium. Pulls slightly to the southeast." },
    ],
    story: {
      headline: "Where the Picks Go",
      paragraphs: [
        "Every guitarist knows the mystery. You set a pick down, you turn around, and it is gone. The Bureau traced the disappearances to a patch of ocean shaped, unsurprisingly, like a guitar pick.",
        "Down there, the Bureau's divers report, billions of lost picks drift in a slow spiral, quietly strumming the current. Ships that pass overhead report hearing a faint chord. It is usually G.",
        "This is the only pick ever known to come back. It washed up in a guitar case in a pawnshop, still warm, with sand in its grain. Hold onto it. It knows the way home.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "Every pick you've ever lost, folks. They all went to the same place. The Triangle.",
      "Billions of them down there, spiraling, strumming the current. Usually a G chord.",
      "This is the only one that ever came back. Washed up in a guitar case. Still warm.",
      "Hold on tight. It knows the way home and it is not afraid to use it.",
    ],
  },
  {
    slug: "marble-of-infinite-regret",
    status: "pending",
    wing: "unexplained",
    name: "The Marble of Infinite Regret",
    exhibit: "AS-0019",
    tagline: "Lost in a game in 1931. Still upset about it.",
    hook: "Look closely and it's still replaying the one shot it missed.",
    estimatedValue: "One playground championship, narrowly lost",
    artAlt:
      "Illustration of a glass marble with a swirl inside, sitting in a chalk circle on a playground, a faint loop of light circling within it.",
    priceCents: 15_900,
    specs: [
      { label: "Material", value: "Glass marble (expected)" },
      { label: "Diameter", value: "About 1.6 cm (expected)" },
      { label: "Mood", value: "Reflective. Literally." },
    ],
    story: {
      headline: "The Shot That Got Away",
      paragraphs: [
        "In the spring of 1931, in a chalk circle behind a schoolhouse, this marble had one job: knock its rival out of the ring and win the championship. It rolled. It curved. It stopped an inch short.",
        "It has not stopped thinking about it since. Hold it to the light and you can see the swirl inside, going round and round, replaying the shot. Same curve, same inch. Every time.",
        "The Bureau has consulted three therapists and a retired marbles referee. All agree it was a good shot. The marble does not agree. It is still working through it, and you can help by keeping it somewhere sunny.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "One inch, folks. In 1931. One inch from the championship. It's still thinking about it.",
      "Hold it to the light. That swirl? It's replaying the shot. Over and over.",
      "Three therapists and a retired referee say it was a good shot. The marble disagrees.",
      "Give it a sunny windowsill and a second chance. It's earned that much.",
    ],
  },
  {
    slug: "prototype-fortune-cookie-fortune",
    status: "pending",
    wing: "unexplained",
    name: "The Prototype Fortune Cookie Fortune",
    exhibit: "AS-0020",
    tagline: "The very first fortune. It was far too specific.",
    hook: "Before they were vague, fortunes were extremely precise. This is why they stopped.",
    estimatedValue: "One correctly predicted Tuesday",
    artAlt:
      "Illustration of a small slip of paper unfurling from a cracked fortune cookie, with tiny dense handwriting covering every inch.",
    priceCents: 2_400,
    specs: [
      { label: "Material", value: "Printed paper slip (expected)" },
      { label: "Size", value: "About 6 cm long (expected)" },
      { label: "Cookie", value: "Not included. It was eaten for science." },
    ],
    story: {
      headline: "Too Much Information",
      paragraphs: [
        "The first fortunes were not vague. The very first one, this one, predicted that its reader would lose a left glove on a Tuesday, find it the following Thursday under a bench, and sneeze twice on the way home. All of it happened.",
        "The reader was so unsettled that the cookie makers held an emergency meeting and agreed that all future fortunes should say things like “Good things are coming.” They have said things like that ever since.",
        "The original slip is covered on both sides in tiny, very confident handwriting. The Bureau has read only the first line. The rest, we are told, is about you.",
      ],
      author: THE_BUREAU,
    },
    pitch: [
      "The first fortune ever, folks. It predicted a lost glove, a bench and two sneezes. All true.",
      "It was so accurate they changed every fortune since to “Good things are coming.”",
      "Both sides, tiny handwriting. We read one line. The rest is about you.",
      "Read it. Or don't. It already knows which one you'll pick.",
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
