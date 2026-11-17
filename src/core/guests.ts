/**
 * The guest cast (design note 0018; 0022): visitors from across the universe
 * and its dimensions, each with a stake in one exhibit, who arrive with it.
 *
 * Pure data. A guest appears on their exhibit's page, on its Job Board card
 * and in its tips. They are characters in the story only: a guest never names
 * a price, promises anything, or holds or claims the item for a visitor. The
 * page says the plain things plainly.
 */

import { findItem, type Item } from "./catalog";

export interface Guest {
  /** The guest's slug, used for ids and their drawing's file. */
  readonly id: string;
  readonly name: string;
  /** What they do, in a few words. */
  readonly role: string;
  /** The exhibit they arrive with. */
  readonly exhibit: string;
  /** What they say on the exhibit's page, in order. */
  readonly lines: readonly string[];
  /** Their one line on the exhibit's Job Board card. */
  readonly board: string;
}

export const GUESTS: readonly Guest[] = [
  {
    id: "silt-prenderby",
    name: "Silt Prenderby",
    role: "Deep-sea salvage broker, from a trench two dimensions down.",
    exhibit: "atlantean-bottle-cap",
    lines: [
      "Silt Prenderby, deep-sea salvage. I sold the Bureau the diving rights to Atlantis. Ask anyone. Don’t ask the Bureau.",
      "Diving rights, a finder’s fee and the cap’s deposit. I’ve itemised the bubbles.",
      "Nine thousand years that fizz sat on the sea floor. I’d have charged it rent.",
    ],
    board:
      "Silt Prenderby says he brokered this one and is owed a cut. The Bureau says he didn’t, and he isn’t.",
  },
];

/** The guest who arrives with this exhibit, if there is one. */
export function guestFor(exhibit: string): Guest | undefined {
  return GUESTS.find((guest) => guest.exhibit === exhibit);
}

/** The exhibit a guest arrives with. Every guest names one that exists, so a missing one is a mistake in the data. */
export function guestExhibit(guest: Guest): Item {
  const item = findItem(guest.exhibit);
  if (item === undefined) throw new Error(`No exhibit called "${guest.exhibit}".`);
  return item;
}
