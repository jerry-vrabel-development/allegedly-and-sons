/**
 * Finds and contacts (design note 0018, build step 1): small things hidden
 * around the shop that introduce a member of the cast.
 *
 * Pure data and rules. Each find is one hidden control on one page. Pressing
 * it asks the Worker to record the find in the agent's dossier (an award named
 * `find:<id>`); the contact is met once the find is held, so a contact is
 * worked out from the awards and never stored. Finds are free and cosmetic:
 * nothing here has money value, and nothing is for sale.
 */

import { BROADCAST_PATH, DISCLAIMER_PATH, DOSSIER_PATH, HOME_PATH, VAULT_PATH } from "./paths";

export interface Find {
  /** The find's slug, used in its address and its award id. */
  readonly id: string;
  /** The contact it introduces, as the Book of Contacts names them. */
  readonly contact: string;
  /** What the contact does, from the cast sheet (note 0016). */
  readonly role: string;
  /** The hidden control's words. It is a real button, so it always says what it does. */
  readonly label: string;
  /** A nudge shown in the Book while the contact is unmet. It never names the page. */
  readonly hint: string;
  /** What the contact says when you find them. */
  readonly reaction: string;
  /** Where the find's page sends you back, and what to call that page. */
  readonly from: string;
  readonly fromName: string;
}

/**
 * The finds, in the order the Book shows them. Tone follows note 0018: noir for
 * the ones who know things, a wink for the ones who keep the ceremony. The
 * contacts talk about themselves and the story only: never a price, a promise
 * about delivery, or a claim on any exhibit.
 */
export const FINDS: readonly Find[] = [
  {
    id: "loose-brick",
    contact: "Loupe",
    role: "The Appraiser. Values what can't be valued, and runs the Vault.",
    label: "Press the loose brick",
    hint: "Vaults have walls. Walls have bricks.",
    reaction:
      "Loupe’s eye swivels slowly round to find you. “You found the brick. Everyone else looks at the door.” The lens clicks. “I value things for a living. I have not yet decided what you are.”",
    from: VAULT_PATH,
    fromName: "the Vault",
  },
  {
    id: "parcel",
    contact: "The Courier",
    role: "Delivers. Nobody asks the Courier questions.",
    label: "Pick up the parcel beside the fine print",
    hint: "Somebody left something where nobody reads.",
    reaction:
      "A coat, a satchel, and then nobody. The parcel holds only a slip: “Delivered. Asking discouraged.” It is addressed, in a hand with too many fingers, to you.",
    from: DISCLAIMER_PATH,
    fromName: "the Fine Print",
  },
  {
    id: "misfiled-card",
    contact: "Ibid",
    role: "The Archivist. Undersells what the host oversells.",
    label: "Pull the misfiled card",
    hint: "Your own file has a drawer. Something sits behind it.",
    reaction:
      "Ibid looks up from the drawer. “Misfiled,” he says. “Ibid.” He files the card again, in the same wrong place. “You are the first to notice. See above.”",
    from: DOSSIER_PATH,
    fromName: "your Dossier",
  },
  {
    id: "lost-stamp",
    contact: "Gerald",
    role: "Witnesses things. Is not a notary.",
    label: "Return the stamp left under the seal",
    hint: "Somebody witnessed the fine print and left in a hurry.",
    reaction:
      "“Oh! My stamp,” says Gerald, glowing a little. “Thank you. I should say that I am not a notary, in case that looked official.” The stamp rises slowly through him. “Please don’t tell anyone I lost it.”",
    from: DISCLAIMER_PATH,
    fromName: "the Fine Print",
  },
  {
    id: "ticker-tape",
    contact: "Nickel",
    role: "Rings up the jokes. Tallies the favors.",
    label: "Pick up the strip of ticker tape",
    hint: "Something has been printing under the counter.",
    reaction:
      "Nickel’s drawer bangs open. “Ha! My tape!” The bell on his head rings, and he laughs first, as always. “Every joke on it is mine. One of them is even good.”",
    from: BROADCAST_PATH,
    fromName: "the Broadcast",
  },
  {
    id: "fallen-feather",
    contact: "Trixie Parallax",
    role: "The Showgirl. Presents the exhibit as if it were a crown.",
    label: "Pick up the fallen feather",
    hint: "Somebody's headdress is shedding near the stage.",
    reaction:
      "“Hon! My feather!” Trixie’s arms flutter in several directions at once. “Keep it, I have simply tons. Now, what was I presenting? Never mind. Applause!”",
    from: HOME_PATH,
    fromName: "the front page",
  },
];

/** The find with this id, if there is one. */
export function findById(id: string): Find | undefined {
  return FINDS.find((find) => find.id === id);
}

/** A find's award id, as stored in the dossier. */
export function findAwardId(id: string): string {
  return `find:${id}`;
}

/** Whether `id` is a real find's award id (`find:` and a find that exists). */
export function isFindAward(id: string): boolean {
  return id.startsWith("find:") && findById(id.slice("find:".length)) !== undefined;
}

/** Where a find is pressed (POST) and where its reaction is read (GET). */
export function findPathFor(id: string): string {
  return `/find/${id}`;
}

/** Matches a find's address; the slug is group 1. Whether it exists is `findById`'s call. */
export const FIND_PATH = /^\/find\/([a-z][a-z-]{0,39})$/;
