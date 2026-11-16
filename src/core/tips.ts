/**
 * Tips (design note 0018, build step 2): a contact's one line about an
 * exhibit that is on its way to the shop. Every pull of the Vault lever
 * carries one.
 *
 * Pure data and rules. A tip is a clue, never a claim: it says nothing about
 * price, stock, shipping or dates, and it gives no right to the item. Tips
 * touch no odds and are never won or missed: pull number n always shows the
 * same tip, in a fixed order that visits every inbound exhibit before any
 * repeats. A tip seen is recorded as an award named `tip:<exhibit>:<n>`, so
 * it follows the agent like every other award, but it does not count toward
 * rank (note 0020): tips are a record of what the agent has been told, not a
 * reward to collect.
 */

import { CATALOG, findItem, type Item } from "./catalog";

export interface Tip {
  /** The exhibit's slug. */
  readonly exhibit: string;
  /** Which of that exhibit's tips this is, from 1. */
  readonly n: number;
  /** A contact's name, as the Book of Contacts has it (see finds.ts). */
  readonly contact: string;
  readonly line: string;
}

/** Each exhibit's tips, in the order they are told. Contacts speak in their own voices (0016, 0018). */
const SOURCES: readonly {
  readonly exhibit: string;
  readonly lines: readonly (readonly [contact: string, line: string])[];
}[] = [
  {
    exhibit: "martian-rubber-band",
    lines: [
      [
        "Loupe",
        "Stretched across two planets and it still snapped back. In my trade that is called provenance, and it is the good kind.",
      ],
      [
        "The Courier",
        "Duluth. A desk drawer, under a stapler. I know the drawer. Nobody asks the stapler.",
      ],
    ],
  },
  {
    exhibit: "moonwalkers-spare-button",
    lines: [
      [
        "Ibid",
        "Item: one button, spare. Packed for a suit that had no buttons. See above. See also: nobody asked why.",
      ],
      [
        "Gerald",
        "Somebody packed a spare button for a suit with no buttons. I witnessed the packing. I am not a notary, but I was very moved.",
      ],
    ],
  },
  {
    exhibit: "time-travelers-bus-token",
    lines: [
      [
        "Nickel",
        "Found on a bus seat in 1964, good on a route that opens in 2391. Four hundred and twenty-seven years early. Someone owes the lost-and-found an apology.",
      ],
      [
        "Trixie Parallax",
        "A token for a bus that doesn’t exist YET, hon! Imagine the legroom. Imagine the delay notices. Applause!",
      ],
    ],
  },
  {
    exhibit: "bigfoots-lost-comb",
    lines: [
      [
        "Loupe",
        "Every photograph is blurry because he was mid-brush. I believed it the moment I saw the teeth on this comb.",
      ],
      [
        "The Courier",
        "Forest road. Dawn. Seven feet of someone, mid-brush. I looked away first. He waved with the comb hand.",
      ],
    ],
  },
  {
    exhibit: "loch-ness-bath-duck",
    lines: [
      [
        "Ibid",
        "Photographs of her on file: none that are clear. Photographs of the duck on file: many. Ibid.",
      ],
      [
        "Gerald",
        "I was asked to witness the two of them together. The Loch said nothing. The duck bobbed. I stamped the bobbing.",
      ],
    ],
  },
  {
    exhibit: "mothmans-night-light",
    lines: [
      [
        "Nickel",
        "Seven feet of moth, red eyes, a night-light. The thing in the dark is afraid of the dark. I call that a push.",
      ],
      [
        "Trixie Parallax",
        "He’s drawn to the light AND afraid of the dark, hon. That is simply a person. Applause for the night-light!",
      ],
    ],
  },
  {
    exhibit: "tooth-fairys-spare-change",
    lines: [
      [
        "Loupe",
        "Her float for the night shift, one molar short, under the wrong pillow. I value what can’t be valued. This I can’t even find.",
      ],
      [
        "The Courier",
        "I work nights too. Wrong house, wrong pillow, a small coin. She never came back for it. I did not ask. Nobody does.",
      ],
    ],
  },
  {
    exhibit: "atlantean-bottle-cap",
    lines: [
      [
        "Ibid",
        "Atlantis, lost in a single day. Its last soda, never opened. The cap, noted. The fizz, also noted, with concern.",
      ],
      [
        "Gerald",
        "I stood very still beside a sunken city once. Someone handed me a cap. It hissed. I am not a notary, and also not a diver.",
      ],
    ],
  },
  {
    exhibit: "rosetta-coaster",
    lines: [
      [
        "Nickel",
        "The same bar order in three dead languages. Centuries of scholars on the famous stone, and nobody lifted the drink.",
      ],
      [
        "Trixie Parallax",
        "It’s a bar order in three dead languages, darling. Same order. The classics never change. Applause!",
      ],
    ],
  },
  {
    exhibit: "pharaohs-spare-key",
    lines: [
      [
        "Loupe",
        "Forty years planning the afterlife, and the key is still under the mat. People are like that. Even pharaohs are like that.",
      ],
      [
        "The Courier",
        "Tomb door. Spare key. Under the mat, in case he locked himself in. I have been to worse addresses. I asked nothing.",
      ],
    ],
  },
  {
    exhibit: "last-dodos-feather",
    lines: [
      [
        "Ibid",
        "The last dodo left a note, and the note was a feather. Filed under: farewells, brief. See also: extinct.",
      ],
      [
        "Gerald",
        "I was asked to witness her goodbye. I said I am not a notary. She said, “Neither am I.” Then she left the feather.",
      ],
    ],
  },
  {
    exhibit: "emperors-lost-thimble",
    lines: [
      [
        "Nickel",
        "History keeps the battles. The tailor keeps the thimble. I tally both, and the thimble is the better story.",
      ],
      [
        "Trixie Parallax",
        "He conquered HALF a continent, hon, and then hemmed his own trousers. Honestly? Icon. Applause!",
      ],
    ],
  },
  {
    exhibit: "king-arthurs-lesser-pebble",
    lines: [
      [
        "Loupe",
        "Everyone tried the big stone. The pebble beside it never got a turn. In my trade, that is where the sleepers hide.",
      ],
      [
        "The Courier",
        "Wet morning. A crowd round the big stone. One small pebble by a boot, untouched. I picked nothing up. I noted it.",
      ],
    ],
  },
  {
    exhibit: "haunted-rubber-stamp",
    lines: [
      [
        "Ibid",
        "Stamps APPROVED on its own. Everything. Always. Clerk retired, 1958. Stamp not informed. Approved. Ibid.",
      ],
      [
        "Gerald",
        "I don’t stamp things, strictly. This one stamps itself. I asked it to stop, politely. It approved my request. Nothing changed.",
      ],
    ],
  },
  {
    exhibit: "bermuda-triangle-guitar-pick",
    lines: [
      [
        "Nickel",
        "Every pick you ever lost, all in one place. This one came back. The only one that did. Sorry about the rest.",
      ],
      [
        "Trixie Parallax",
        "Every lost pick, darling, in ONE place! This one was simply the only one who found a ride home. Applause!",
      ],
    ],
  },
  {
    exhibit: "marble-of-infinite-regret",
    lines: [
      [
        "Loupe",
        "Lost in a game in 1931 and still upset about it. Look closely and you can see it replaying the shot. I looked. I stopped.",
      ],
      [
        "The Courier",
        "A marble that won’t stop replaying one shot. 1931. I carried it a block, once. It did not enjoy the ride. Neither did I.",
      ],
    ],
  },
  {
    exhibit: "prototype-fortune-cookie-fortune",
    lines: [
      [
        "Ibid",
        "Before fortunes were vague, they were exact. This is the exact one. Filed under: reasons they stopped.",
      ],
      [
        "Gerald",
        "I was once handed a fortune that knew my name and my shoe size. I am not a notary, and I did not sign.",
      ],
    ],
  },
];

/** Every tip written, whether or not its exhibit is still on its way. */
export const ALL_TIPS: readonly Tip[] = SOURCES.flatMap(({ exhibit, lines }) =>
  lines.map(([contact, line], index) => ({ exhibit, n: index + 1, contact, line })),
);

/**
 * The tips about exhibits that are still pending (on their way), in the order
 * pulls hand them out: every exhibit's first tip, then every exhibit's second,
 * so the first pulls cover the most ground. When an exhibit goes on sale its
 * tips drop out of this list; the tips already seen stay in the agent's file.
 */
export function inboundTips(): readonly Tip[] {
  const pending = new Set(
    CATALOG.filter((item) => item.status === "pending").map((item) => item.slug),
  );
  const live = ALL_TIPS.filter((tip) => pending.has(tip.exhibit));
  const rounds = Math.max(0, ...live.map((tip) => tip.n));
  return Array.from({ length: rounds }, (_, round) =>
    live.filter((tip) => tip.n === round + 1),
  ).flat();
}

/** A tip's award id. */
export function tipAwardId(tip: Tip): string {
  return `tip:${tip.exhibit}:${String(tip.n)}`;
}

/** Whether `id` names a tip that was written (valid to record, even for an exhibit now on sale). */
export function isTipAward(id: string): boolean {
  return ALL_TIPS.some((tip) => tipAwardId(tip) === id);
}

/**
 * The tip a pull carries. `pull` is the agent's pull number, from 1 (daily and
 * bonus pulls count alike). The same pull always shows the same tip. Undefined
 * when no exhibit is on its way.
 */
export function tipForPull(pull: number, tips: readonly Tip[] = inboundTips()): Tip | undefined {
  if (!Number.isInteger(pull) || pull < 1) {
    throw new RangeError("a pull number is a whole number from 1");
  }
  return tips[(pull - 1) % tips.length];
}

/** The tip awards a pull records: its tip's, or none when no exhibit is on its way. */
export function tipAwardsForPull(
  pull: number,
  tips: readonly Tip[] = inboundTips(),
): readonly string[] {
  const tip = tipForPull(pull, tips);
  return tip === undefined ? [] : [tipAwardId(tip)];
}

/** The exhibit a tip is about. Every tip names one that exists, so an unknown one is a mistake in the data. */
export function tipExhibit(tip: Tip): Item {
  const item = findItem(tip.exhibit);
  if (item === undefined) throw new Error(`No exhibit called "${tip.exhibit}".`);
  return item;
}

/** The tips written about one exhibit, in the order they are told. */
export function tipsAbout(exhibit: string): readonly Tip[] {
  return ALL_TIPS.filter((tip) => tip.exhibit === exhibit);
}
