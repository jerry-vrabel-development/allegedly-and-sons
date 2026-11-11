/**
 * Every sound the shop can play (design note 0011), as recipes: the tones and
 * bursts of noise each one is made of. Pure data, unit tested; the sound
 * script (src/client/entries/sound.ts) turns the steps into Web Audio.
 *
 * No files and nothing to license: every sound is synthesized, and every one
 * is under 3 seconds.
 */

/** One oscillator note: fades in fast and out over `length` seconds. */
export interface Tone {
  readonly kind: "tone";
  /** Hz. */
  readonly frequency: number;
  /** Seconds after the sound begins. */
  readonly start: number;
  /** Seconds. */
  readonly length: number;
  readonly wave: "sine" | "square" | "sawtooth" | "triangle";
  /** Peak gain, 0 to 1. */
  readonly volume: number;
  /** If set, the pitch slides to this frequency (Hz) over the note. */
  readonly slideTo?: number;
}

/** A burst of white noise that fades out, swept through a band-pass filter. */
export interface Noise {
  readonly kind: "noise";
  readonly start: number;
  readonly length: number;
  readonly volume: number;
  /** The filter's starting frequency (Hz). */
  readonly from: number;
  /** Where the filter sweeps to (Hz). */
  readonly to: number;
}

export type SoundStep = Tone | Noise;

function tone(
  frequency: number,
  start: number,
  length: number,
  wave: Tone["wave"],
  volume: number,
  slideTo?: number,
): Tone {
  const step = { kind: "tone", frequency, start, length, wave, volume } as const;
  return slideTo === undefined ? step : { ...step, slideTo };
}

function noise(start: number, length: number, volume: number, sweep: [number, number]): Noise {
  return { kind: "noise", start, length, volume, from: sweep[0], to: sweep[1] };
}

/** Notes one after another, `gap` seconds apart, beginning at `start`. */
function run(
  frequencies: readonly number[],
  start: number,
  gap: number,
  length: number,
  wave: Tone["wave"],
  volume: number,
): Tone[] {
  return frequencies.map((frequency, i) => tone(frequency, start + i * gap, length, wave, volume));
}

/** Notes all at once. */
function chord(
  frequencies: readonly number[],
  start: number,
  length: number,
  wave: Tone["wave"],
  volume: number,
): Tone[] {
  return run(frequencies, start, 0, length, wave, volume);
}

/** The low knock a card lands with, under its notes. */
const THUNK: readonly SoundStep[] = [
  tone(150, 0, 0.14, "sine", 0.6, 70),
  noise(0, 0.05, 0.4, [1200, 300]),
];

export const SOUNDS = {
  // The back room: brass, stamps, drawers, vault mechanics.
  creak: [
    tone(180, 0, 0.45, "sawtooth", 0.05, 120),
    tone(240, 0.05, 0.4, "sawtooth", 0.03, 150),
    noise(0, 0.3, 0.08, [600, 300]),
  ],
  stamp: [
    noise(0, 0.08, 0.6, [900, 200]),
    tone(110, 0, 0.18, "sine", 0.6),
    tone(82, 0.04, 0.22, "sine", 0.4),
  ],
  whoosh: [noise(0, 0.35, 0.25, [400, 3000])],
  kachunk: [
    noise(0, 0.05, 0.4, [2000, 800]),
    tone(140, 0, 0.12, "square", 0.08),
    noise(0.12, 0.08, 0.5, [600, 200]),
    tone(70, 0.12, 0.3, "sine", 0.5),
    tone(2093, 0.22, 0.4, "sine", 0.06),
    tone(2637, 0.26, 0.5, "sine", 0.05),
  ],
  // A small click: the sound toggle, and the Broadcast host's lines. Quiet on
  // purpose, because the host's lines repeat.
  tick: [tone(1400, 0, 0.03, "square", 0.05)],
  // The Vault's lever: the thud, a spring, three ratchet clicks.
  clunk: [
    noise(0, 0.18, 0.8, [900, 90]),
    tone(65, 0, 0.4, "sine", 0.9),
    tone(130, 0, 0.12, "square", 0.15),
    tone(420, 0.05, 0.28, "sawtooth", 0.12, 140),
    noise(0.1, 0.02, 0.35, [3000, 2000]),
    noise(0.15, 0.02, 0.3, [3000, 2000]),
    noise(0.2, 0.02, 0.25, [3000, 2000]),
  ],
  // Each card the reel passes: a click, a knock and a low tock. Short, so the
  // fastest steps don't smear; the reel raises its pitch as it slows.
  reel: [
    noise(0, 0.025, 0.35, [2600, 1400]),
    tone(1100, 0, 0.05, "square", 0.14),
    tone(275, 0, 0.06, "sine", 0.25),
  ],
  // The landings grow with rarity: a bell, a climbing run, the jackpot.
  Common: [
    ...THUNK,
    ...run([784, 1047], 0.02, 0.09, 0.35, "triangle", 0.3),
    tone(1568, 0.2, 0.6, "sine", 0.14),
    tone(2093, 0.2, 0.5, "sine", 0.07),
  ],
  Uncommon: [
    ...THUNK,
    ...run([523, 659, 784, 1047], 0.02, 0.08, 0.3, "triangle", 0.28),
    ...chord([1047, 1319, 1568], 0.36, 0.9, "triangle", 0.16),
    ...run([2093, 2637, 3136], 0.42, 0.07, 0.2, "sine", 0.08),
  ],
  // A sub thump, a fast climb, a held chord and ringing bells.
  Rare: [
    tone(55, 0, 0.5, "sine", 0.9),
    noise(0, 0.3, 0.3, [300, 4000]),
    ...run([523, 659, 784, 1047, 1319, 1568], 0, 0.07, 0.4, "sawtooth", 0.14),
    ...chord([523, 784, 1047, 1319, 1568], 0.45, 1.9, "triangle", 0.14),
    ...run([2093, 2637, 2093, 2637, 2093, 2637, 2093, 2637], 0.5, 0.09, 0.12, "sine", 0.09),
    ...run([3136, 3520, 4186], 1.3, 0.08, 0.3, "sine", 0.06),
  ],
  sparkle: run([2637, 3136, 3520, 4186], 0, 0.05, 0.22, "sine", 0.09),
  milestone: [
    tone(60, 0, 0.5, "sine", 0.8),
    ...run([392, 523, 659, 784, 1047, 1319], 0, 0.08, 0.4, "square", 0.09),
    ...chord([523, 659, 784, 1047, 1319], 0.52, 1.6, "triangle", 0.13),
    ...run([2093, 2637, 3136, 4186], 0.6, 0.09, 0.3, "sine", 0.07),
  ],
  // The Broadcast: a dial finding the station, then the station's brass sting.
  static: [noise(0, 0.7, 0.12, [1800, 900]), tone(440, 0.1, 0.5, "sine", 0.03, 880)],
  stinger: [
    ...run([196, 247, 294], 0, 0.12, 0.3, "sawtooth", 0.09),
    ...chord([392, 494, 587], 0.4, 0.9, "sawtooth", 0.07),
  ],
  // /thanks: the vault door (two hits, a long rumble, a metal ring), then the fanfare.
  slam: [
    noise(0, 0.45, 0.9, [700, 60]),
    tone(45, 0, 0.9, "sine", 1),
    tone(90, 0, 0.35, "square", 0.12),
    noise(0.14, 0.2, 0.6, [400, 70]),
    tone(50, 0.14, 0.6, "sine", 0.8),
    tone(220, 0.02, 0.7, "triangle", 0.06),
    tone(277, 0.02, 0.6, "triangle", 0.05),
  ],
  fanfare: [
    ...run([392, 523, 659, 784], 0.4, 0.1, 0.28, "sawtooth", 0.12),
    ...run([784, 1047, 1319, 1568], 0.4, 0.1, 0.28, "square", 0.05),
    ...chord([523, 659, 784, 1047, 1319], 0.85, 1.7, "sawtooth", 0.08),
    ...chord([523, 784, 1047], 0.85, 1.7, "triangle", 0.14),
    ...run([2093, 2637, 3136, 4186], 0.95, 0.1, 0.3, "sine", 0.07),
    tone(65, 0.85, 0.8, "sine", 0.6),
  ],
} as const satisfies Record<string, readonly SoundStep[]>;

export type SoundName = keyof typeof SOUNDS;

/** Every sound's name. */
export const SOUND_NAMES = Object.keys(SOUNDS) as SoundName[];

/** Own names only: "constructor" and the like aren't sounds. */
export function isSoundName(name: string | null): name is SoundName {
  return name !== null && Object.prototype.hasOwnProperty.call(SOUNDS, name);
}

/** How long a sound lasts, in seconds: when its last step ends. */
export function soundLength(name: SoundName): number {
  return Math.max(...SOUNDS[name].map((step: SoundStep) => step.start + step.length));
}

/** What the sound script offers other scripts on the page (the Vault's reel). */
export interface BureauSound {
  /** Plays a sound, unless muted. `pitch` scales its frequencies (1 is as written). */
  play(name: SoundName, pitch?: number): void;
  isMuted(): boolean;
}

declare global {
  interface Window {
    /** Set by the sound script when it's on the page. */
    BureauSound?: BureauSound;
  }
}
