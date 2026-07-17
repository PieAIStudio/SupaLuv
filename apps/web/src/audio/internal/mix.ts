/**
 * Mix resolution and bed volume application (voice duck owner → music + ambient).
 * Lives with bed howls on the shared runtime so duck attack/release timing stays exact.
 */

import { resolveAudioMixGains } from "../audioMixState";
import { fadeHowl, type EngineHowl } from "../howlerEngine";
import type { GameAudioRuntime } from "./runtime";

export function resolveMix(rt: GameAudioRuntime) {
  return resolveAudioMixGains({
    state: {
      muted: rt.muted,
      unlocked: rt.unlocked,
      cutscenePaused: rt.cutscenePaused,
      voiceActive: rt.voiceActive,
    },
    musicVolume: rt.musicVolume,
    ambientVolume: rt.ambientVolume,
    voiceVolume: rt.voiceVolume,
  });
}

export function applyBedMix(rt: GameAudioRuntime, durationMs = 0): void {
  const mix = resolveMix(rt);
  setHowlVolume(rt.musicHowl, mix.music, durationMs);
  setHowlVolume(rt.ambientHowl, mix.ambient, durationMs);
}

export function setHowlVolume(howl: EngineHowl | null, target: number, durationMs: number): void {
  if (!howl) {
    return;
  }
  if (durationMs > 0 && howl.playing()) {
    fadeHowl(howl, howl.volume(), target, durationMs);
    return;
  }
  howl.volume(target);
}

export function resumeBedsIfAllowed(rt: GameAudioRuntime): void {
  const mix = resolveMix(rt);
  if (!mix.bedsShouldPlay) {
    return;
  }
  if (rt.musicHowl && !rt.musicHowl.playing()) {
    rt.musicHowl.volume(mix.music);
    rt.musicHowl.play();
  }
  if (rt.ambientHowl && !rt.ambientHowl.playing()) {
    rt.ambientHowl.volume(mix.ambient);
    rt.ambientHowl.play();
  }
}
