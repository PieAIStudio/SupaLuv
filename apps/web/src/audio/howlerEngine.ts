/**
 * Howler-backed engine: mature Web Audio game audio (fade, loop, stereo pan).
 * Reverb via a shared ConvolverNode bus (synthetic impulse — no asset required).
 *
 * gameAudio.ts stays the product façade; this module is the only Howler import.
 */

import { Howl, Howler } from "howler";

export type StereoPan = number; // -1 left … 1 right

export interface EngineHowlOptions {
  readonly src: string | string[];
  readonly loop?: boolean;
  readonly volume?: number;
  readonly pan?: StereoPan;
  /** 0 = dry only, 1 = full reverb send (clamped). */
  readonly reverb?: number;
  readonly html5?: boolean;
  /** Required for blob: URLs (Howler cannot sniff format from object URLs). */
  readonly format?: string | string[];
  readonly onend?: () => void;
}

let reverbReady = false;
let reverbGain: GainNode | null = null;
let masterDry: GainNode | null = null;

function ensureReverbGraph(): void {
  if (reverbReady || !Howler.ctx) {
    return;
  }
  const ctx = Howler.ctx;
  // Howler masterGain is the final bus; insert wet parallel carefully.
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulseResponse(ctx, 1.6, 2.2);
  reverbGain = ctx.createGain();
  reverbGain.gain.value = 0.22;
  masterDry = ctx.createGain();
  masterDry.gain.value = 1;

  // Route: howler master → dry + convolver → destination (already wired via Howler).
  // We attach reverb as a tap by connecting from Howler's masterGain if available.
  const master = (Howler as unknown as { masterGain?: GainNode }).masterGain;
  if (master) {
    try {
      master.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(ctx.destination);
    } catch {
      // Some browsers / Howler versions already fully connected — soft fail.
    }
  }
  reverbReady = true;
}

/** Cheap synthetic IR for plate-ish room (not a recorded hall). */
function makeImpulseResponse(ctx: AudioContext, durationSec: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * durationSec));
  const impulse = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
}

export function unlockHowler(): void {
  try {
    Howler.mute(false);
    // Resume audio context on user gesture.
    void Howler.ctx?.resume?.();
    ensureReverbGraph();
  } catch {
    // ignore
  }
}

export function setHowlerMasterMute(muted: boolean): void {
  Howler.mute(muted);
}

export function createEngineHowl(options: EngineHowlOptions): Howl {
  ensureReverbGraph();
  const howl = new Howl({
    src: Array.isArray(options.src) ? options.src : [options.src],
    loop: options.loop ?? false,
    volume: options.volume ?? 1,
    html5: options.html5 ?? false,
    format: options.format,
    // stereo requires webaudio path
    onend: options.onend,
  });

  if (typeof options.pan === "number" && Number.isFinite(options.pan)) {
    try {
      howl.stereo(Math.max(-1, Math.min(1, options.pan)));
    } catch {
      // ignore unsupported
    }
  }

  // Per-sound reverb is approximated by global wet bus level; product can set wet.
  if (typeof options.reverb === "number" && reverbGain) {
    reverbGain.gain.value = Math.max(0, Math.min(0.55, options.reverb * 0.45));
  }

  return howl;
}

export function setGlobalReverbWet(amount01: number): void {
  ensureReverbGraph();
  if (reverbGain) {
    reverbGain.gain.value = Math.max(0, Math.min(0.55, amount01 * 0.45));
  }
}

export function fadeHowl(
  howl: Howl,
  from: number,
  to: number,
  durationMs: number,
  onDone?: () => void,
): void {
  howl.fade(from, to, durationMs);
  if (onDone) {
    window.setTimeout(onDone, durationMs + 16);
  }
}

export function stopAndUnload(howl: Howl | null | undefined): void {
  if (!howl) {
    return;
  }
  try {
    howl.stop();
    howl.unload();
  } catch {
    // ignore
  }
}

/** Map character / stage side to stereo pan for VO. */
export function panForSpeaker(speaker: string, side?: "left" | "right" | "center"): number {
  if (side === "left") {
    return -0.45;
  }
  if (side === "right") {
    return 0.45;
  }
  if (side === "center") {
    return 0;
  }
  if (/林|lin|女/i.test(speaker)) {
    return 0.35;
  }
  if (/苏|suming|男/i.test(speaker)) {
    return -0.35;
  }
  return 0;
}
