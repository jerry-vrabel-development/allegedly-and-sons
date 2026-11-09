/**
 * The Vault Lever (design note 0003, G2): pure rules.
 *
 * One free pull a day per agent, plus bonus pulls earned by actions, never by
 * purchase. Each pull draws one vault card at the posted odds. Vault cards are
 * never for sale; each one unlocks a secret file. Prizes are cards and lore
 * only: no discount codes or anything of money value until there are written
 * official rules and a lawyer's review (note 0003, "Lines we don't cross").
 */

export type Rarity = "Common" | "Uncommon" | "Rare";

export interface VaultCard {
  /** URL-safe id; the award id is `vault:<id>`. */
  readonly id: string;
  /** Printed on the card, like an exhibit number. */
  readonly designation: string;
  readonly name: string;
  readonly rarity: Rarity;
  /** Chance out of VAULT_ODDS_TOTAL. These are the posted odds. */
  readonly weight: number;
  /** One line, shown on the card. */
  readonly summary: string;
  /** The secret file: shown only to agents who've pulled the card. */
  readonly secretFile: string;
}

/**
 * The vault, in the order the page shows it. Lore rule: outlandish, never
 * plausible. Weights add up to VAULT_ODDS_TOTAL (a test checks).
 */
export const VAULT_CARDS: readonly [VaultCard, ...VaultCard[]] = [
  {
    id: "left-sock-of-atlantis",
    designation: "V-001",
    name: "The Left Sock of Atlantis",
    rarity: "Common",
    weight: 40,
    summary: "The right one went down with the city.",
    secretFile:
      "Recovered from a dryer in Poughkeepsie that, according to the Bureau's plumber, connects directly to the Atlantic. Still damp. Always damp. The Atlanteans had no word for “pair.”",
  },
  {
    id: "yetis-library-card",
    designation: "V-002",
    name: "The Yeti's Library Card",
    rarity: "Uncommon",
    weight: 30,
    summary: "Fourteen centuries of overdue fines.",
    secretFile:
      "Issued in 611 by a mountain library that has since closed for lunch. The Yeti checked out one book, “Being Seen: A Guide,” and has not returned it. The fine is now larger than the mountain.",
  },
  {
    id: "jar-of-pre-owned-thunder",
    designation: "V-003",
    name: "A Jar of Pre-Owned Thunder",
    rarity: "Uncommon",
    weight: 20,
    summary: "Gently used. One previous storm.",
    secretFile:
      "Bottled during a storm so loud it was briefly elected mayor. Do not open indoors. Do not open outdoors. The Bureau's best guess is that you should not open it at all.",
  },
  {
    id: "the-moons-receipt",
    designation: "V-004",
    name: "The Moon's Receipt",
    rarity: "Rare",
    weight: 10,
    summary: "Proof of purchase. Returns not accepted.",
    secretFile:
      "The Moon was bought, used, in a transaction nobody remembers agreeing to. This is the receipt. It is itemized. Line three reads “tides (assorted).” The Bureau is keeping it in case anything goes wrong.",
  },
];

/** What all the weights add up to: the odds are each weight out of this. */
export const VAULT_ODDS_TOTAL = VAULT_CARDS.reduce((sum, card) => sum + card.weight, 0);

/** A vault card's award id in the dossier. */
export function vaultAwardId(id: string): string {
  return `vault:${id}`;
}

export function findVaultCard(id: string): VaultCard | undefined {
  return VAULT_CARDS.find((card) => card.id === id);
}

/** A card's posted chance, e.g. "40%". */
export function oddsLabel(card: VaultCard): string {
  const percent = (card.weight / VAULT_ODDS_TOTAL) * 100;
  return `${Number.isInteger(percent) ? String(percent) : percent.toFixed(1)}%`;
}

/** The card a roll draws. `roll` is a whole number in [0, VAULT_ODDS_TOTAL). */
export function cardForRoll(roll: number): VaultCard {
  if (!Number.isInteger(roll) || roll < 0 || roll >= VAULT_ODDS_TOTAL) {
    throw new RangeError(`a roll must be a whole number from 0 to ${String(VAULT_ODDS_TOTAL - 1)}`);
  }
  // Walk the cards, spending the roll; the card it runs out on is the draw.
  let rest = roll;
  let drawn: VaultCard = VAULT_CARDS[0];
  for (const card of VAULT_CARDS) {
    drawn = card;
    if (rest < card.weight) break;
    rest -= card.weight;
  }
  return drawn;
}

const UINT32_RANGE = 2 ** 32;

/**
 * A fair roll from random 32-bit numbers (crypto.getRandomValues in the
 * Worker). Rejects the top sliver of the range, so every card's chance is
 * exactly its posted odds, not a hair off from modulo bias.
 */
export function rollFrom(nextUint32: () => number): number {
  const limit = UINT32_RANGE - (UINT32_RANGE % VAULT_ODDS_TOTAL);
  for (;;) {
    const value = nextUint32();
    if (value < limit) return value % VAULT_ODDS_TOTAL;
  }
}

/**
 * Commendations that each earn one bonus pull, once. Never "acquirer", and
 * never cards (a card can come from a purchase): no purchase ever buys a pull.
 */
export const BONUS_BADGES = ["first-contact", "case-closed", "town-crier", "recruiter"] as const;

const DAY_SECONDS = 86_400;

/** The vault's day: whole UTC days since 1970. The free pull resets at midnight UTC. */
export function vaultDay(nowSeconds: number): number {
  return Math.floor(nowSeconds / DAY_SECONDS);
}

/** When the next free pull opens, in Unix seconds. */
export function nextDailyAt(nowSeconds: number): number {
  return (vaultDay(nowSeconds) + 1) * DAY_SECONDS;
}

/** "5 hours 12 minutes", "1 hour 1 minute", "under a minute". */
export function describeWait(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  if (minutes === 0) return "under a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const plural = (n: number, unit: string) => `${String(n)} ${unit}${n === 1 ? "" : "s"}`;
  if (hours === 0) return plural(rest, "minute");
  return rest === 0 ? plural(hours, "hour") : `${plural(hours, "hour")} ${plural(rest, "minute")}`;
}
