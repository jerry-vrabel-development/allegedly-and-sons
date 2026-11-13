/**
 * The shop's sound (design note 0011): /assets/sound.js, first-party, never
 * inline. The Worker adds it to shop pages for the "fx" group only.
 *
 * - Synthesizes every sound with Web Audio from the recipes in ../sounds.ts:
 *   no files, nothing to license, every sound under 3 seconds. Browsers allow
 *   audio only after a click on the page, so sounds follow clicks, never page
 *   loads.
 * - Puts one "Sound: on / off" toggle in the site header, said in words,
 *   remembered in the browser. On by default; the Vault's old setting carries
 *   over.
 * - Gives the host's drawing its pose (note 0013) wherever he is: on the
 *   front page's stage and on the Broadcast. His motion starts on its own and
 *   goes on, so those pages also get a "Motion: on / off" toggle beside the
 *   sound one, remembered the same way (the two settings are all it stores).
 * - Plays the page's sounds: an element with data-sound="<name>" plays on
 *   click (a link waits LINK_DELAY_MS so it's heard; a modified click never
 *   waits), a case file creaks open, and the story script's "bureau:card"
 *   event stamps.
 * - The Broadcast's "Tune in" (PR 2): radio static and the station stinger,
 *   the host's lines lit one at a time, and a stinger when the segment ends.
 *   Tuning in is what makes the host pitch.
 * - "Stamp your certificate" on /thanks (PR 2): the vault door slams, a
 *   fanfare plays, and the certificate is stamped, in words.
 * - Exposes window.BureauSound.play(name) for the Vault's reel.
 *
 * Without the script, or without Web Audio, everything works the same in
 * silence. The rules are in ../sound-rules.ts and unit tested; this file wires
 * them to the page and to Web Audio.
 */

import { CARD_EVENT, SEGMENT_END_EVENT } from "../../core/dom-events";
import {
  HOST_LINE_MS,
  hostPose,
  LINK_DELAY_MS,
  isPlainClick,
  linkWaits,
  motionLabel,
  nextLine,
  readMuted,
  readStill,
  stampText,
  toggleLabel,
  writeMuted,
  writeStill,
} from "../sound-rules";
import { SOUNDS, isSoundName, type Noise, type Tone } from "../sounds";

function button(text: string): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "button";
  node.textContent = text;
  return node;
}

function start(): void {
  const store = (): Storage => window.localStorage;
  let muted = readMuted(store);

  // --- Web Audio -------------------------------------------------------------
  let audio: AudioContext | undefined;
  /** Where every sound goes: a limiter, so the loud moments don't crackle. */
  let output: AudioNode | undefined;
  const context = (): AudioContext | undefined => {
    if (muted) return undefined;
    if (audio === undefined) {
      // The types say AudioContext is always there; an old browser may have
      // only the prefixed one, or neither.
      const names: {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      } = window;
      const Ctor = names.AudioContext ?? names.webkitAudioContext;
      if (Ctor === undefined) return undefined;
      audio = new Ctor();
      const limiter = audio.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;
      limiter.connect(audio.destination);
      output = limiter;
    }
    if (audio.state === "suspended") void audio.resume();
    return audio;
  };

  const playTone = (step: Tone, pitch: number): void => {
    const a = context();
    if (a === undefined) return;
    const t = a.currentTime + step.start;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = step.wave;
    osc.frequency.setValueAtTime(step.frequency * pitch, t);
    if (step.slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(step.slideTo * pitch, t + step.length);
    }
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(step.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + step.length);
    osc.connect(gain);
    gain.connect(output ?? a.destination);
    osc.start(t);
    osc.stop(t + step.length + 0.02);
  };

  const playNoise = (step: Noise, pitch: number): void => {
    const a = context();
    if (a === undefined) return;
    const frames = Math.floor(a.sampleRate * step.length);
    const buffer = a.createBuffer(1, frames, a.sampleRate);
    const data = buffer.getChannelData(0);
    // White noise that fades out.
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const source = a.createBufferSource();
    const gain = a.createGain();
    gain.gain.value = step.volume;
    source.buffer = buffer;
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    const t = a.currentTime + step.start;
    filter.frequency.setValueAtTime(step.from * pitch, t);
    filter.frequency.exponentialRampToValueAtTime(step.to * pitch, t + step.length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output ?? a.destination);
    source.start(a.currentTime + step.start);
  };

  const play = (name: string | null, pitch = 1): void => {
    if (muted || !isSoundName(name)) return;
    try {
      for (const step of SOUNDS[name]) {
        if (step.kind === "tone") playTone(step, pitch);
        else playNoise(step, pitch);
      }
    } catch {
      // A sound that can't play is silence, never an error on the page.
    }
  };
  window.BureauSound = { play, isMuted: () => muted };

  // --- The toggle, in the site header ---------------------------------------
  const nav = document.querySelector("header.site nav ul");
  if (nav !== null) {
    const item = document.createElement("li");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sound-toggle";
    const label = (): void => {
      const { text, pressed } = toggleLabel(muted);
      toggle.textContent = text;
      toggle.setAttribute("aria-pressed", pressed);
    };
    label();
    toggle.addEventListener("click", () => {
      muted = !muted;
      writeMuted(store, muted);
      label();
      if (!muted) play("tick");
    });
    item.append(toggle);
    nav.append(item);
  }

  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- The host (note 0013), on the stage and on the Broadcast ----------------
  // He is drawn still; giving him a pose starts his motion. It starts on its
  // own and doesn't stop, so there is a toggle to hold him still (WCAG 2.2.2).
  const host = document.querySelector("[data-host]");
  let tuned = false;
  let ended = false;
  let still = readStill(store);
  const pose = (): void => {
    const now = hostPose({ tuned, ended, still });
    if (now === undefined) host?.removeAttribute("data-pose");
    else host?.setAttribute("data-pose", now);
  };
  if (host !== null) {
    pose();
    document.addEventListener(SEGMENT_END_EVENT, () => {
      ended = true;
      pose();
    });
    // With reduced motion nothing moves, so there is nothing to turn off.
    if (nav !== null && !reduced) {
      const item = document.createElement("li");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "sound-toggle";
      const label = (): void => {
        const { text, pressed } = motionLabel(still);
        toggle.textContent = text;
        toggle.setAttribute("aria-pressed", pressed);
      };
      label();
      toggle.addEventListener("click", () => {
        still = !still;
        writeStill(store, still);
        label();
        pose();
      });
      item.append(toggle);
      nav.append(item);
    }
  }

  // --- The page's sounds ------------------------------------------------------
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("[data-sound]") : null;
    if (target === null) return;
    play(target.getAttribute("data-sound"));
    // A link waits a beat so its sound is heard. New tabs and windows don't wait.
    const href = target.tagName === "A" ? target.getAttribute("href") : null;
    const waits = linkWaits({
      href,
      plain: isPlainClick(event),
      muted,
      defaultPrevented: event.defaultPrevented,
      opensElsewhere: target.hasAttribute("target"),
    });
    if (href !== null && waits) {
      event.preventDefault();
      setTimeout(() => {
        window.location.assign(href);
      }, LINK_DELAY_MS);
    }
  });

  const story = document.querySelector<HTMLDetailsElement>("details[data-story]");
  if (story !== null) {
    story.addEventListener("toggle", () => {
      if (story.open) play("creak");
    });
  }
  document.addEventListener(CARD_EVENT, () => {
    play("stamp");
  });

  // --- The Broadcast: "Tune in" -----------------------------------------------
  const show = document.querySelector("[data-broadcast]");
  const heading = show?.querySelector("h1") ?? null;
  if (show !== null && heading !== null) {
    const tune = button("Tune in");
    tune.classList.add("tune-in");
    tune.setAttribute("aria-pressed", "false");
    const lines = show.querySelectorAll(".patter p");
    let lit = -1;
    const lightNext = (): void => {
      if (lines.length === 0) return;
      lines[lit]?.classList.remove("speaking");
      lit = nextLine(lit, lines.length);
      lines[lit]?.classList.add("speaking");
      play("tick");
      setTimeout(lightNext, HOST_LINE_MS);
    };
    tune.addEventListener("click", () => {
      if (tuned) return;
      tuned = true;
      pose();
      tune.textContent = "Tuned in";
      tune.setAttribute("aria-pressed", "true");
      play("static");
      setTimeout(() => {
        play("stinger");
      }, 650);
      if (!reduced) setTimeout(lightNext, 1500);
    });
    heading.after(tune);
    document.addEventListener(SEGMENT_END_EVENT, () => {
      if (tuned) play("stinger");
    });
  }

  // --- /thanks: "Stamp your certificate" ---------------------------------------
  const moment = document.querySelector("[data-certificate]");
  if (moment !== null) {
    const certificate = moment.getAttribute("data-certificate") ?? "";
    const stamp = button("Stamp your certificate");
    const said = document.createElement("p");
    said.className = "stamp-mark";
    said.setAttribute("role", "status");
    stamp.addEventListener("click", () => {
      play("slam");
      play("fanfare");
      stamp.hidden = true;
      said.textContent = stampText(certificate);
      if (!reduced) said.classList.add("stamping");
    });
    moment.append(stamp, said);
  }
}

start();
