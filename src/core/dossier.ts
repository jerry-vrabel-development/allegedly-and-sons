/**
 * The Agent Dossier (design note 0003, G1): badges, cards, ranks, codenames.
 *
 * Pure rules. Awards come only from events the Worker recorded itself (a
 * finished case file, a share, a visit someone's share brought in, a paid
 * order), never from anything the browser claims.
 */

import type { AnalyticsEvent } from "./analytics";
import { CATALOG, findItem, fullWings, wingItems, type Wing, type WingId } from "./catalog";
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
  // Duty streaks (G4): days in a row at the vault lever. See core/streak.ts.
  {
    id: "streak-regular",
    name: "Regular",
    earned: "Three days running at the vault. The Bureau noticed.",
    hint: "Show up three days running.",
  },
  {
    id: "streak-made",
    name: "Made",
    earned: "A week without missing a day. You're one of us now.",
    hint: "Seven days. No excuses.",
  },
  {
    id: "streak-fixer",
    name: "Fixer",
    earned: "Two straight weeks. People come to you now.",
    hint: "Fourteen days. Ask around.",
  },
  {
    id: "streak-kingpin",
    name: "Kingpin",
    earned: "Thirty days. The vault answers to you.",
    hint: "Thirty days. Nobody's done it twice.",
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

/** A wing commendation's award id. */
export function wingAwardId(wing: WingId): string {
  return `wing:${wing}`;
}

/**
 * The full wings' commendations (note 0010): one for holding every exhibit
 * card in a wing. Worked out from the cards, never stored or granted, so it
 * can't drift; a wing without all its exhibits has none yet.
 */
export function wingCommendations(): readonly Wing[] {
  return fullWings();
}

/** Everything an agent holds: their stored awards plus the wings those cards complete. */
export function withWingAwards(stored: Iterable<string>): ReadonlySet<string> {
  const held = new Set(stored);
  for (const wing of wingCommendations()) {
    if (wingItems(wing.id).every((item) => held.has(cardId(item.slug)))) {
      held.add(wingAwardId(wing.id));
    }
  }
  return held;
}

/**
 * How many awards there are to earn in all: badges, wing commendations,
 * exhibit cards and vault cards.
 */
export const TOTAL_AWARDS =
  BADGES.length + wingCommendations().length + CATALOG.length + VAULT_CARDS.length;

export interface Rank {
  readonly title: string;
  /** Awards needed to hold this rank. */
  readonly at: number;
}

const FIRST_RANK: Rank = { title: "Civilian Informant", at: 0 };

/**
 * The ladder below the top. Thresholds never move down or get reused, so no
 * agent ever loses a rank (note 0010); a rank only appears once there are
 * more awards than it needs.
 */
const LADDER: readonly Rank[] = [
  FIRST_RANK,
  { title: "Junior Field Agent", at: 1 },
  { title: "Field Agent", at: 3 },
  { title: "Senior Field Agent", at: 5 },
  { title: "Senior Treasure Hunter", at: 6 },
  { title: "Case Officer", at: 10 },
  { title: "Station Chief", at: 15 },
  { title: "Keeper of the Back Room", at: 22 },
  { title: "Deputy Director", at: 30 },
];

/** Ranks by awards earned, lowest first. The top rank is the full set. */
export const RANKS: readonly Rank[] = [
  ...LADDER.filter((rank) => rank.at < TOTAL_AWARDS),
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
