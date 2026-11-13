/**
 * The Bureau's wire (design note 0014): the lore lines on the stage's ticker,
 * as plain data. The rules for which lines run are in ticker.ts.
 *
 * The lines every bulletin keeps (notes 0003, 0009 and 0014; a test checks):
 * - It is lore, and reads as lore: outlandish, never plausible.
 * - It never fakes activity: nobody bought anything, nobody is watching,
 *   nothing is selling fast or running out.
 * - No numerals at all. Every number on the ticker belongs to a FACT line,
 *   so a number is always true.
 * - No prices, and no real people.
 *
 * To add bulletins: add them here. The rules need no change.
 */

import { THE_BUREAU, type Author } from "./catalog";

/** Who wrote the wire. A partnered writer's bulletins can replace the house's later (note 0002). */
export const WIRE_AUTHOR: Author = THE_BUREAU;

export const WIRE_LINES: readonly [string, ...string[]] = [
  "Bureau denies owning a second moon. Declines to say whose it is.",
  "Field agent returns from the Triangle with a tan and no explanation.",
  "Customs at the Outer Belt reports a suspicious coat. Coat reports suspicious customs.",
  "Gopher retained as tax consultant. Results described as “underground.”",
  "Weather on the far side of the Moon: laundry, drying slowly.",
  "Archive misplaces the Department of Misplaced Things. Search ongoing.",
  "Local pebble declines crown for the three-hundredth year running.",
  "Atlantis issues correction: it is not lost. It knows exactly where it is.",
  "Stapler still not commenting.",
  "Pigeons deny everything. Pigeons unavailable for follow-up.",
  "Notary certifies own signature. Says it looks legitimate.",
  "Time traveler late for the meeting about punctuality. Again. Previously.",
  "Bureau reminds agents: the Vault is not a lunch fridge.",
  "Haunted stamp approves this bulletin.",
  "Host's hair seeks separate representation.",
  "Mothman sighted in the lighting aisle. Staff asked to be supportive.",
  "Dragon's hoard declared full. Dragon declares otherwise.",
  "Unverifiable claims up sharply. Verification department still at lunch.",
  "Bureau map updated: “here be dragons” now reads “here be a dragon, he's fine.”",
  "Rubber band supplies stretched thin. Bureau regrets the wording.",
  "Fog lifts over the back room. Reveals more back room.",
  "Left sock found. Right sock says it saw nothing.",
  "Agent promoted for showing up. Vikings “not surprised.”",
  "Loch reports calm waters and one very discreet duck.",
  "Bureau scientists confirm: the object is an object.",
  "Back door still the back door. Knock twice.",
  "Fortune cookie industry reassures public: good things are coming.",
  "Smugglers' union votes to remain unlisted.",
  "Lost-and-found reunites umbrella with a different rain.",
  "Raccoons in trench coat pass as one adult for another season.",
  "Hold music enters its second century. Critics call it “familiar.”",
  "Receipt for the receipt located. Receipt for that one still missing.",
  "Crystal ball recalled after showing mostly reruns.",
  "Certificate certified. Certifier certified. It goes all the way up.",
  "Bigfoot briefly in focus. Photographer blurry with excitement.",
  "Lesser kingdom announces reasonable taxes and a modest moat.",
  "Bureau denies the host is anything but an ordinary human man. Statement unusually long.",
  "Marble's therapist reports a good week.",
  "Saucer double-parked behind the shop. Owner asked to move it, eventually.",
  "Wire operator asks whoever keeps sending “coo” to please stop.",
];
