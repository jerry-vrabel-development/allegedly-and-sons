/**
 * The Agent Dossier (design note 0003, G1): badges, cards, ranks, codenames.
 *
 * Pure rules. Awards come only from events the Worker recorded itself (a
 * finished case file, a share, a visit someone's share brought in, a paid
 * order), never from anything the browser claims.
 */

import type { AnalyticsEvent } from "./analytics";
import { CATALOG, findItem } from "./catalog";
import { findVaultCard, VAULT_CARDS } from "./vault";

export interface Badge {
  readonly id: string;
  readonly name: string;
  /** What earned it, shown once earned. */
  readonly earned: string;
  /** A hint at how to earn it, shown while it's locked. */
  readonly hint: string;
}

/** Badges in the order the dossier shows them. */
export const BADGES: readonly Badge[] = [
  {
    id: "first-contact",
    name: "First Contact",
    earned: "Opened your first case file.",
    hint: "Some files are thicker than they look.",
  },
  {
    id: "case-closed",
    name: "Case Closed",
    earned: "Read a case file to the very last line.",
    hint: "Agents finish what they start.",
  },
  {
    id: "town-crier",
    name: "Town Crier",
    earned: "Shared an exhibit with the outside world.",
    hint: "Word travels. Help it.",
  },
  {
    id: "recruiter",
    name: "Recruiter",
    earned: "Someone came to the Bureau through your share.",
    hint: "Bring someone in.",
  },
  {
    id: "acquirer",
    name: "Acquirer",
    earned: "Made your first acquisition.",
    hint: "Some relics must be held to be believed.",
  },
];

const BADGE_IDS = new Set(BADGES.map((badge) => badge.id));

/** A card's award id. One card per item: finish its case file, or acquire it. */
export function cardId(slug: string): string {
  return `card:${slug}`;
}

export function isAward(id: string): boolean {
  if (BADGE_IDS.has(id)) return true;
  if (id.startsWith("vault:")) return findVaultCard(id.slice("vault:".length)) !== undefined;
  return id.startsWith("card:") && findItem(id.slice("card:".length)) !== undefined;
}

/** How many awards (badges, exhibit cards and vault cards) there are to earn in all. */
export const TOTAL_AWARDS = BADGES.length + CATALOG.length + VAULT_CARDS.length;

export interface Rank {
  readonly title: string;
  /** Awards needed to hold this rank. */
  readonly at: number;
}

const FIRST_RANK: Rank = { title: "Civilian Informant", at: 0 };

/** Ranks by awards earned, lowest first. */
export const RANKS: readonly Rank[] = [
  FIRST_RANK,
  { title: "Junior Field Agent", at: 1 },
  { title: "Field Agent", at: 3 },
  { title: "Senior Field Agent", at: 5 },
  { title: "Senior Treasure Hunter", at: 6 },
  { title: "Director of Improbable Acquisitions", at: TOTAL_AWARDS },
];

/** The rank for `count` awards, and the next one up (undefined at the top). */
export function rankFor(count: number): { rank: Rank; next: Rank | undefined } {
  const reached = RANKS.filter((rank) => count >= rank.at);
  return {
    rank: reached[reached.length - 1] ?? FIRST_RANK,
    next: RANKS.find((rank) => rank.at > count),
  };
}

const ADJECTIVES = [
  "Velvet",
  "Silent",
  "Crimson",
  "Midnight",
  "Copper",
  "Gilded",
  "Lunar",
  "Rusty",
  "Phantom",
  "Brass",
  "Ivory",
  "Smoky",
  "Electric",
  "Dusty",
  "Polar",
  "Amber",
] as const;

const NOUNS = [
  "Platypus",
  "Heron",
  "Badger",
  "Walrus",
  "Lantern",
  "Compass",
  "Mongoose",
  "Sphinx",
  "Pelican",
  "Abacus",
  "Marmot",
  "Kettle",
  "Narwhal",
  "Teaspoon",
  "Gargoyle",
  "Ferret",
] as const;

/** An agent's codename, chosen from their visitor id so it never changes. */
export function codenameFor(visitorId: string): string {
  const a = Number.parseInt(visitorId.slice(0, 2), 16) % ADJECTIVES.length;
  const n = Number.parseInt(visitorId.slice(2, 4), 16) % NOUNS.length;
  return `${ADJECTIVES[a] ?? "Velvet"} ${NOUNS[n] ?? "Platypus"}`;
}

/**
 * The awards a recorded event earns its own visitor. (A shared visit also
 * earns the *sharer* the Recruiter badge; that needs a lookup, so the Worker
 * handles it.)
 */
export function awardsForEvent(event: AnalyticsEvent): readonly string[] {
  switch (event.event) {
    case "lore_expanded":
      return event.readDepth === "finished"
        ? ["case-closed", cardId(event.itemSlug)]
        : ["first-contact"];
    case "share_clicked":
      return ["town-crier"];
    default:
      return [];
  }
}

/** The awards a paid order earns its buyer. */
export function awardsForOrder(itemSlug: string): readonly string[] {
  return ["acquirer", cardId(itemSlug)];
}
