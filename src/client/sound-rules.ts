/**
 * The sound script's rules (design note 0011), apart from the page and from
 * Web Audio: the mute setting, when a link waits for its sound, the wording.
 * Pure, so it's unit tested without a browser.
 */

/** The browser-local key for the shop-wide mute setting: the one thing stored. */
export const SOUND_MUTE_KEY = "bureau-sound-muted";

/** The Vault's setting before note 0011, read so nobody's choice is lost. Never written. */
export const LEGACY_MUTE_KEY = "bureau-vault-muted";

/** How long a link with a sound waits before navigating (ms). */
export const LINK_DELAY_MS = 180;

/** How long each host line stays lit once tuned in (ms). */
export const HOST_LINE_MS = 4000;

/** As much of localStorage as the setting needs. */
export interface MuteStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Whether sound is muted. On by default. `store` is called inside the try
 * because a browser that blocks storage throws on reaching for it at all.
 */
export function readMuted(store: () => MuteStore): boolean {
  try {
    const storage = store();
    return (storage.getItem(SOUND_MUTE_KEY) ?? storage.getItem(LEGACY_MUTE_KEY)) === "1";
  } catch {
    return false;
  }
}

/** Remembers the setting. If storage is blocked it just isn't remembered. */
export function writeMuted(store: () => MuteStore, muted: boolean): void {
  try {
    store().setItem(SOUND_MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Not remembered; the toggle still works for this page.
  }
}

/** The toggle's state, in words and for aria-pressed. */
export function toggleLabel(muted: boolean): {
  readonly text: string;
  readonly pressed: "true" | "false";
} {
  return muted ? { text: "Sound: off", pressed: "false" } : { text: "Sound: on", pressed: "true" };
}

/** A click with the main button and no modifier key: one that opens the link right here. */
export function isPlainClick(event: {
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly button: number;
}): boolean {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) && event.button === 0;
}

/**
 * Whether a clicked link should wait LINK_DELAY_MS so its sound is heard.
 * Never when muted, and never for a new tab, a modified click, or a click
 * something else already handled.
 */
export function linkWaits(click: {
  readonly href: string | null;
  readonly plain: boolean;
  readonly muted: boolean;
  readonly defaultPrevented: boolean;
  /** The link has a `target`. */
  readonly opensElsewhere: boolean;
}): boolean {
  return (
    click.href !== null &&
    click.href !== "" &&
    click.plain &&
    !click.muted &&
    !click.defaultPrevented &&
    !click.opensElsewhere
  );
}

/** Which of `count` host lines is lit after line `lit`; -1 means none yet. */
export function nextLine(lit: number, count: number): number {
  return (lit + 1) % count;
}

/** What the stamp says. A non-breaking hyphen keeps "AS-0001" on one line. */
export function stampText(certificate: string): string {
  return `Stamped: Bureau Certificate No. ${certificate.replace("-", "‑")}. Authenticity: Allegedly.`;
}
