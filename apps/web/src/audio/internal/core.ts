/**
 * Unlock, mute, volume knobs, cutscene flag, preload, and aggregate stop.
 * Cross-calls into voice/beds/sfx with the same sequencing as the monolithic class.
 */

import { AUDIO_BED_CATALOG, AUDIO_SFX_CATALOG } from "../audioCatalog";
import { clamp01 } from "../audioMixState";
import {
  createEngineHowl,
  setGlobalReverbWet,
  setHowlerMasterMute,
  unlockHowler,
} from "../howlerEngine";
import { cancelFadingBeds, stopBgm } from "./beds";
import { applyBedMix, resolveMix, resumeBedsIfAllowed } from "./mix";
import type { AudioPlaybackSnapshot, GameAudioRuntime } from "./runtime";
import { stopSfx } from "./sfx";
import { stopVoice } from "./voice";

export function isMuted(rt: GameAudioRuntime): boolean {
  return rt.muted;
}

export function isUnlocked(rt: GameAudioRuntime): boolean {
  return rt.unlocked;
}

export function getMusicVolume(rt: GameAudioRuntime): number {
  return rt.musicVolume;
}

export function getAmbientVolume(rt: GameAudioRuntime): number {
  return rt.ambientVolume;
}

export function getSfxVolume(rt: GameAudioRuntime): number {
  return rt.sfxVolume;
}

export function getVoiceVolume(rt: GameAudioRuntime): number {
  return rt.voiceVolume;
}

export function getReverbAmount(rt: GameAudioRuntime): number {
  return rt.reverbAmount;
}

export function getBgmVolume(rt: GameAudioRuntime): number {
  return rt.musicVolume;
}

export function getPlaybackSnapshot(rt: GameAudioRuntime): AudioPlaybackSnapshot {
  return {
    muted: rt.muted,
    unlocked: rt.unlocked,
    cutscenePaused: rt.cutscenePaused,
    duckOwner: resolveMix(rt).duckOwner,
    musicKey: rt.musicKey,
    ambientKey: rt.ambientKey,
    voiceActive: rt.voiceActive,
  };
}

export function setMusicVolume(rt: GameAudioRuntime, next: number): void {
  rt.musicVolume = clamp01(next);
  applyBedMix(rt);
}

export function setAmbientVolume(rt: GameAudioRuntime, next: number): void {
  rt.ambientVolume = clamp01(next);
  applyBedMix(rt);
}

export function setSfxVolume(rt: GameAudioRuntime, next: number): void {
  rt.sfxVolume = clamp01(next);
}

export function setVoiceVolume(rt: GameAudioRuntime, next: number): void {
  rt.voiceVolume = clamp01(next);
  if (rt.voiceVolume === 0) {
    stopVoice(rt);
    return;
  }
  rt.voiceHowl?.volume(resolveMix(rt).voice);
}

export function setReverbAmount(rt: GameAudioRuntime, next: number): void {
  rt.reverbAmount = clamp01(next);
  setGlobalReverbWet(rt.reverbAmount);
}

export function setBgmVolume(rt: GameAudioRuntime, next: number): void {
  setMusicVolume(rt, next);
}

export function setMuted(rt: GameAudioRuntime, next: boolean): void {
  if (rt.muted === next) {
    return;
  }
  rt.muted = next;
  setHowlerMasterMute(next);
  if (next) {
    stopVoice(rt);
    cancelFadingBeds(rt);
    rt.musicHowl?.pause();
    rt.ambientHowl?.pause();
    return;
  }
  applyBedMix(rt);
  resumeBedsIfAllowed(rt);
}

export function unlock(rt: GameAudioRuntime): void {
  if (rt.unlocked) {
    return;
  }
  rt.unlocked = true;
  unlockHowler();
  // Re-assert product mute after context unlock; unlock must never unmute.
  setHowlerMasterMute(rt.muted);
  setGlobalReverbWet(rt.reverbAmount);
  applyBedMix(rt);
  resumeBedsIfAllowed(rt);
}

export function preload(): void {
  for (const entry of AUDIO_BED_CATALOG) {
    createEngineHowl({ src: entry.src, volume: 0, loop: true }).unload();
  }
  for (const entry of AUDIO_SFX_CATALOG) {
    createEngineHowl({ src: entry.src, volume: 0, loop: false }).unload();
  }
}

export function stopAll(rt: GameAudioRuntime): void {
  stopVoice(rt);
  stopBgm(rt);
  stopSfx(rt);
  rt.cutscenePaused = false;
}
