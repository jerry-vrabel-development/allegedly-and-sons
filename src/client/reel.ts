/**
 * The Vault reel's rules (design note 0008), apart from the page: what the
 * pull's answer means, how the spin is paced, and what the result says. Pure,
 * so it's unit tested without a browser; src/client/entries/vault.ts wires it
 * to the lever and the dialog.
 *
 * Honest spins: the reel shows every card equally often and stops on the
 * server's draw. Its pace depends only on how far along it is, never on which
 * card is showing, so it can't slow near a rarer card to fake a near-miss
 * (note 0003).
 */

import { isRecord } from "../core/guards";

/** How long the reel spins (ms) before it lands, when motion is allowed. */
export const REEL_MS = 2400;

/** How many times the reel goes round every card before it stops. */
const REEL_ROUNDS = 4;

/** The rarities a card can have; each has its own reveal and sound. */
export const REEL_RARITIES = ["Common", "Uncommon", "Rare"] as const;
export type ReelRarity = (typeof REEL_RARITIES)[number];

export interface PulledCard {
  readonly designation: string;
  readonly name: string;
  readonly rarity: ReelRarity;
  readonly summary: string;
}

export interface ReachedMilestone {
  readonly days: number;
  readonly name: string;
}

/** As much of POST /vault/pull's answer as the reel shows. */
export interface Pull {
  readonly card: PulledCard;
  readonly duplicate: boolean;
  readonly bonusLeft: number;
  readonly streakDays: number;
  readonly milestone: ReachedMilestone | undefined;
}

/**
 * The card names in the page's `data-reel` attribute. Undefined unless it's a
 * list of at least one name; the script then leaves the plain lever alone.
 */
export function reelNamesFrom(attribute: string | null): readonly string[] | undefined {
  if (attribute === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(attribute);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
  const names = parsed.filter((name): name is string => typeof name === "string");
  return names.length === parsed.length ? names : undefined;
}

function isRarity(value: unknown): value is ReelRarity {
  return REEL_RARITIES.some((rarity) => rarity === value);
}

function cardFrom(value: unknown): PulledCard | undefined {
  if (!isRecord(value)) return undefined;
  const { designation, name, rarity, summary } = value;
  if (typeof designation !== "string" || typeof name !== "string") return undefined;
  if (typeof summary !== "string" || !isRarity(rarity)) return undefined;
  return { designation, name, rarity, summary };
}

function milestoneFrom(value: unknown): ReachedMilestone | undefined {
  if (!isRecord(value)) return undefined;
  const { days, name } = value;
  return typeof days === "number" && typeof name === "string" ? { days, name } : undefined;
}

/**
 * Reads the pull endpoint's JSON answer. Undefined for a refusal (`ok: false`)
 * or anything it doesn't understand; the script then reloads the Vault, which
 * shows whatever really happened.
 */
export function pullFrom(body: unknown): Pull | undefined {
  if (!isRecord(body) || body["ok"] !== true) return undefined;
  const { duplicate, streakDays, next, milestone: reached } = body;
  const card = cardFrom(body["card"]);
  if (card === undefined || typeof duplicate !== "boolean" || typeof streakDays !== "number") {
    return undefined;
  }
  if (!isRecord(next)) return undefined;
  const { bonusLeft } = next;
  if (typeof bonusLeft !== "number") return undefined;
  const milestone = milestoneFrom(reached);
  // No milestone arrives as null; anything else we couldn't read is a bad answer.
  if (milestone === undefined && reached !== null) return undefined;
  return { card, duplicate, bonusLeft, streakDays, milestone };
}

/** How many cards the reel shows: every card REEL_ROUNDS times, then on to the draw. */
export function reelSteps(names: readonly string[], drawnName: string): number {
  return names.length * REEL_ROUNDS + Math.max(names.indexOf(drawnName), 0);
}

/** The card showing after `step` steps. The reel starts on the first card. */
export function reelNameAt(names: readonly string[], step: number): string {
  return names[step % names.length] ?? "";
}

/**
 * How long (ms) to show the card at `step` before the next. Eases out: short
 * gaps first, long ones as it slows. A reel that has already run well past
 * REEL_MS (a busy phone, a background tab) stops waiting and finishes.
 */
export function reelGap(step: number, steps: number, elapsedMs: number): number {
  if (elapsedMs > REEL_MS * 1.5) return 0;
  return 30 + Math.pow(step / steps, 3) * 320;
}

function count(n: number, one: string, many: string): string {
  return `${String(n)} ${n === 1 ? one : many}`;
}

/** The result in words: the line above the card's name, and the notes below it. */
export function resultLines(pull: Pull): {
  readonly kicker: string;
  readonly notes: readonly string[];
} {
  const { card } = pull;
  const notes: string[] = [];
  if (pull.streakDays > 0) notes.push(`Duty streak: ${count(pull.streakDays, "day", "days")}.`);
  if (pull.bonusLeft > 0) {
    notes.push(`You have ${count(pull.bonusLeft, "bonus pull", "bonus pulls")} left.`);
  }
  return {
    // Rarity is always said in words too, never by color alone.
    kicker: `Vault card ${card.designation} · ${card.rarity} · ${
      pull.duplicate ? "Duplicate" : "New to your file"
    }`,
    notes,
  };
}

export function milestoneTitle(milestone: ReachedMilestone): string {
  return `Day ${String(milestone.days)}: you're ${milestone.name}.`;
}

/**
 * Where one piece of confetti flies: up to 120px either side, 60 to 180px up,
 * turning up to a full circle either way. `random` is Math.random in the page.
 */
export function confettiBit(random: () => number): {
  readonly x: string;
  readonly y: string;
  readonly r: string;
} {
  return {
    x: `${String(Math.round(random() * 240 - 120))}px`,
    y: `${String(Math.round(-60 - random() * 120))}px`,
    r: `${String(Math.round(random() * 720 - 360))}deg`,
  };
}
