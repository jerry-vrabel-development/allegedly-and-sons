import { describe, expect, it } from "vitest";
import { REEL_RARITIES } from "../src/client/reel";
import {
  HOST_LINE_MS,
  hostPose,
  LEGACY_MUTE_KEY,
  LINK_DELAY_MS,
  SOUND_MUTE_KEY,
  isPlainClick,
  linkWaits,
  nextLine,
  readMuted,
  stampText,
  toggleLabel,
  writeMuted,
} from "../src/client/sound-rules";
import { SOUNDS, SOUND_NAMES, isSoundName, soundLength } from "../src/client/sounds";

/** A stand-in for localStorage. */
function store(saved: Record<string, string> = {}) {
  const items = new Map(Object.entries(saved));
  const written: [string, string][] = [];
  return {
    items,
    written,
    get: () => ({
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => {
        written.push([key, value]);
        items.set(key, value);
      },
    }),
  };
}

const blocked = (): never => {
  throw new Error("storage is blocked");
};

describe("the sounds", () => {
  it("has a recipe for every name, and no others", () => {
    expect(Object.keys(SOUNDS).sort()).toEqual([...SOUND_NAMES].sort());
    for (const name of SOUND_NAMES) expect(SOUNDS[name].length, name).toBeGreaterThan(0);
  });

  it("keeps every sound under 3 seconds, as the Fine Print's design note promises", () => {
    for (const name of SOUND_NAMES) {
      expect(soundLength(name), name).toBeGreaterThan(0);
      expect(soundLength(name), name).toBeLessThan(3);
    }
    // The stamp plays the slam and the fanfare together.
    expect(Math.max(soundLength("slam"), soundLength("fanfare"))).toBeLessThan(3);
  });

  it("is made only of audible, sensible steps", () => {
    for (const name of SOUND_NAMES) {
      for (const step of SOUNDS[name]) {
        expect(step.start, name).toBeGreaterThanOrEqual(0);
        expect(step.length, name).toBeGreaterThan(0);
        expect(step.volume, name).toBeGreaterThan(0);
        expect(step.volume, name).toBeLessThanOrEqual(1);
        if (step.kind === "tone") {
          expect(step.frequency, name).toBeGreaterThanOrEqual(20);
          expect(step.frequency, name).toBeLessThanOrEqual(20_000);
        }
      }
    }
  });

  it("builds runs of notes one after another and chords all at once", () => {
    expect(SOUNDS.tick).toEqual([
      { kind: "tone", frequency: 1400, start: 0, length: 0.03, wave: "square", volume: 0.05 },
    ]);
    expect(SOUNDS.stinger.map((step) => step.start)).toEqual([0, 0.12, 0.24, 0.4, 0.4, 0.4]);
  });

  it("slides a note or sweeps a noise only where the recipe says so", () => {
    expect(SOUNDS.creak[0]).toMatchObject({ kind: "tone", frequency: 180, slideTo: 120 });
    expect(SOUNDS.whoosh).toEqual([
      { kind: "noise", start: 0, length: 0.35, volume: 0.25, from: 400, to: 3000 },
    ]);
  });

  it("gives the reel its own loud step, and keeps the quiet tick for the toggle and the host", () => {
    const loudest = (name: "tick" | "reel") => Math.max(...SOUNDS[name].map((step) => step.volume));
    expect(loudest("tick")).toBeLessThanOrEqual(0.05);
    expect(loudest("reel")).toBeGreaterThanOrEqual(0.25);
    // Short enough that the fastest steps of the spin (30 ms apart) don't smear.
    expect(soundLength("reel")).toBeLessThanOrEqual(0.06);
  });

  it("makes a rarer card a bigger moment: louder in all and longer", () => {
    const weight = (name: "Common" | "Uncommon" | "Rare") =>
      SOUNDS[name].reduce((sum, step) => sum + step.volume * step.length, 0);
    expect(weight("Uncommon")).toBeGreaterThan(weight("Common"));
    expect(weight("Rare")).toBeGreaterThan(weight("Uncommon"));
    expect(soundLength("Rare")).toBeGreaterThan(soundLength("Uncommon"));
    expect(soundLength("Uncommon")).toBeGreaterThan(soundLength("Common"));
  });

  it("knows its own names, and nothing an object happens to have", () => {
    for (const name of SOUND_NAMES) expect(isSoundName(name)).toBe(true);
    for (const other of ["", "nope", "constructor", "toString", "__proto__", null]) {
      expect(isSoundName(other), String(other)).toBe(false);
    }
  });

  it("has a sound for every rarity the reel can land on", () => {
    for (const rarity of REEL_RARITIES) expect(isSoundName(rarity)).toBe(true);
  });
});

describe("the mute setting", () => {
  it("is on (not muted) until someone turns it off", () => {
    expect(readMuted(store().get)).toBe(false);
    expect(readMuted(store({ [SOUND_MUTE_KEY]: "0" }).get)).toBe(false);
    expect(readMuted(store({ [SOUND_MUTE_KEY]: "1" }).get)).toBe(true);
  });

  it("carries over the Vault's old setting, unless the new one says otherwise", () => {
    expect(readMuted(store({ [LEGACY_MUTE_KEY]: "1" }).get)).toBe(true);
    expect(readMuted(store({ [LEGACY_MUTE_KEY]: "1", [SOUND_MUTE_KEY]: "0" }).get)).toBe(false);
  });

  it("saves one thing, under one key, and never writes the old key", () => {
    const off = store({ [LEGACY_MUTE_KEY]: "1" });
    writeMuted(off.get, false);
    writeMuted(off.get, true);
    expect(off.written).toEqual([
      [SOUND_MUTE_KEY, "0"],
      [SOUND_MUTE_KEY, "1"],
    ]);
    expect(readMuted(off.get)).toBe(true);
  });

  it("works, unremembered, when the browser blocks storage", () => {
    expect(readMuted(blocked)).toBe(false);
    expect(readMuted(() => ({ getItem: blocked, setItem: blocked }))).toBe(false);
    expect(() => {
      writeMuted(blocked, true);
      writeMuted(() => ({ getItem: blocked, setItem: blocked }), true);
    }).not.toThrow();
  });

  it("says the toggle's state in words and for aria-pressed", () => {
    expect(toggleLabel(false)).toEqual({ text: "Sound: on", pressed: "true" });
    expect(toggleLabel(true)).toEqual({ text: "Sound: off", pressed: "false" });
  });
});

describe("links with a sound", () => {
  const plain = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 };
  const click = {
    href: "/vault",
    plain: true,
    muted: false,
    defaultPrevented: false,
    opensElsewhere: false,
  };

  it("wait a beat, briefly, so the sound is heard", () => {
    expect(linkWaits(click)).toBe(true);
    expect(LINK_DELAY_MS).toBeGreaterThan(0);
    expect(LINK_DELAY_MS).toBeLessThanOrEqual(250);
  });

  it("never wait when there's nothing to hear or nowhere to go", () => {
    expect(linkWaits({ ...click, muted: true })).toBe(false);
    expect(linkWaits({ ...click, href: null })).toBe(false);
    expect(linkWaits({ ...click, href: "" })).toBe(false);
  });

  it("never hold up a new tab, a modified click or a click something else handled", () => {
    expect(linkWaits({ ...click, plain: false })).toBe(false);
    expect(linkWaits({ ...click, opensElsewhere: true })).toBe(false);
    expect(linkWaits({ ...click, defaultPrevented: true })).toBe(false);
  });

  it("count only an unmodified main-button click as plain", () => {
    expect(isPlainClick(plain)).toBe(true);
    for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(isPlainClick({ ...plain, [key]: true }), key).toBe(false);
    }
    expect(isPlainClick({ ...plain, button: 1 })).toBe(false);
  });
});

describe("the Broadcast's host lines", () => {
  it("light one at a time, in order, and go round again", () => {
    expect(nextLine(-1, 3)).toBe(0);
    expect(nextLine(0, 3)).toBe(1);
    expect(nextLine(2, 3)).toBe(0);
    expect(HOST_LINE_MS).toBeGreaterThanOrEqual(3000);
  });
});

describe("the Broadcast host's pose", () => {
  it("waits, pitches once you tune in, and reveals himself when the segment ends", () => {
    expect(hostPose({ tuned: false, ended: false })).toBe("waiting");
    expect(hostPose({ tuned: true, ended: false })).toBe("pitching");
    expect(hostPose({ tuned: true, ended: true })).toBe("sold");
    // The segment ends for everyone watching, tuned in or not.
    expect(hostPose({ tuned: false, ended: true })).toBe("sold");
  });
});

describe("the certificate stamp", () => {
  it("says the certificate number in words, kept on one line", () => {
    expect(stampText("AS-0001")).toBe(
      "Stamped: Bureau Certificate No. AS‑0001. Authenticity: Allegedly.",
    );
  });
});
