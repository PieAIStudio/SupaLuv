/**
 * Dual-track stage beds: independent music + ambience buses, crossfades, now-playing.
 */

import { resolveBedCatalogEntry, type AudioBedCatalogEntry } from "../audioCatalog";
import { createEngineHowl, fadeHowl, stopAndUnload } from "../howlerEngine";
import { hasDedicatedKey } from "./helpers";
import { applyBedMix, resolveMix, resumeBedsIfAllowed } from "./mix";
import type {
  GameAudioRuntime,
  GameBedKey,
  NowPlayingListener,
  StageBedPlaybackResult,
  StageBedSelectionInput,
} from "./runtime";

export function playExclusiveBed(rt: GameAudioRuntime, key: GameBedKey | null | undefined): void {
  const entry = resolveBedCatalogEntry(key);
  if (!entry) {
    fadeStopMusic(rt);
    fadeStopAmbient(rt);
    return;
  }
  if (entry.kind === "music") {
    fadeStopAmbient(rt, false);
    playMusicEntry(rt, entry);
  } else {
    fadeStopMusic(rt, false);
    playAmbientEntry(rt, entry);
  }
  emitNowPlaying(rt);
}

export function playStageBeds(
  rt: GameAudioRuntime,
  input: StageBedSelectionInput,
): StageBedPlaybackResult {
  const dedicated = hasDedicatedKey(input.musicKey) || hasDedicatedKey(input.ambientKey);
  if (!dedicated) {
    const legacyKey = input.bgmKey ?? input.fallbackKey ?? "soft-piano";
    const entry = resolveBedCatalogEntry(legacyKey);
    const wasAlreadyActive = entry ? isBedEntryActive(rt, entry) : false;
    playExclusiveBed(rt, legacyKey);
    return {
      mode: "legacy",
      heardBedIds: entry && !wasAlreadyActive && isBedEntryActive(rt, entry) ? [entry.id] : [],
    };
  }

  const previousNowPlaying = getNowPlayingKey(rt);
  const previousMusicKey = rt.musicKey;
  const previousAmbientKey = rt.ambientKey;
  const heardBedIds: string[] = [];
  const musicEntry = resolveBedCatalogEntry(input.musicKey);
  if (musicEntry?.kind === "music") {
    playMusicEntry(rt, musicEntry);
    if (previousMusicKey !== musicEntry.id && rt.musicHowl && rt.musicKey === musicEntry.id) {
      heardBedIds.push(musicEntry.id);
    }
  } else {
    fadeStopMusic(rt, false);
  }

  const ambientEntry = resolveBedCatalogEntry(input.ambientKey);
  if (ambientEntry?.kind === "ambient") {
    playAmbientEntry(rt, ambientEntry);
    if (
      previousAmbientKey !== ambientEntry.id &&
      rt.ambientHowl &&
      rt.ambientKey === ambientEntry.id
    ) {
      heardBedIds.push(ambientEntry.id);
    }
  } else {
    fadeStopAmbient(rt, false);
  }

  emitNowPlayingIfChanged(rt, previousNowPlaying);
  return { mode: "dedicated", heardBedIds };
}

export function playBed(rt: GameAudioRuntime, key: GameBedKey | null | undefined): void {
  const entry = resolveBedCatalogEntry(key);
  if (!entry) {
    return;
  }
  if (entry.kind === "music") {
    playMusicEntry(rt, entry);
  } else {
    playAmbientEntry(rt, entry);
  }
  emitNowPlaying(rt);
}

export function playMusic(rt: GameAudioRuntime, key: GameBedKey | null | undefined): void {
  const entry = resolveBedCatalogEntry(key);
  if (!entry || entry.kind !== "music") {
    fadeStopMusic(rt);
    return;
  }
  playMusicEntry(rt, entry);
  emitNowPlaying(rt);
}

export function playAmbient(rt: GameAudioRuntime, key: GameBedKey | null | undefined): void {
  const entry = resolveBedCatalogEntry(key);
  if (!entry || entry.kind !== "ambient") {
    fadeStopAmbient(rt);
    return;
  }
  playAmbientEntry(rt, entry);
  emitNowPlaying(rt);
}

export function previewMusic(rt: GameAudioRuntime): void {
  if (!rt.musicKey) {
    playMusic(rt, "title-theme");
    return;
  }
  resumeBedsIfAllowed(rt);
}

export function previewAmbient(rt: GameAudioRuntime): void {
  if (!rt.ambientKey) {
    playAmbient(rt, "night-ambient");
    return;
  }
  resumeBedsIfAllowed(rt);
}

export function pauseBedsForCutscene(rt: GameAudioRuntime): void {
  if (rt.cutscenePaused) {
    return;
  }
  rt.cutscenePaused = true;
  cancelFadingBeds(rt);
  rt.musicHowl?.pause();
  rt.ambientHowl?.pause();
}

export function resumeBedsAfterCutscene(rt: GameAudioRuntime): void {
  if (!rt.cutscenePaused) {
    return;
  }
  rt.cutscenePaused = false;
  applyBedMix(rt);
  resumeBedsIfAllowed(rt);
}

export function stopMusic(rt: GameAudioRuntime): void {
  clearMusicFadingOut(rt);
  stopAndUnload(rt.musicHowl);
  rt.musicHowl = null;
  rt.musicKey = null;
  emitNowPlaying(rt);
}

export function stopAmbient(rt: GameAudioRuntime): void {
  clearAmbientFadingOut(rt);
  stopAndUnload(rt.ambientHowl);
  rt.ambientHowl = null;
  rt.ambientKey = null;
  emitNowPlaying(rt);
}

/** Stop both stage bed buses (music + ambient). */
export function stopAllBeds(rt: GameAudioRuntime): void {
  stopMusic(rt);
  stopAmbient(rt);
}

export function currentMusic(rt: GameAudioRuntime): string | null {
  return rt.musicKey;
}

export function currentAmbient(rt: GameAudioRuntime): string | null {
  return rt.ambientKey;
}

export function getNowPlayingKey(rt: GameAudioRuntime): string | null {
  return rt.musicKey ?? rt.ambientKey;
}

export function onNowPlayingChange(rt: GameAudioRuntime, listener: NowPlayingListener): () => void {
  rt.nowPlayingListeners.add(listener);
  listener(getNowPlayingKey(rt));
  return () => {
    rt.nowPlayingListeners.delete(listener);
  };
}

export function cancelFadingBeds(rt: GameAudioRuntime): void {
  clearMusicFadingOut(rt);
  clearAmbientFadingOut(rt);
}

function playMusicEntry(rt: GameAudioRuntime, entry: AudioBedCatalogEntry): void {
  if (rt.musicKey === entry.id && rt.musicHowl) {
    rt.musicHowl.volume(resolveMix(rt).music);
    resumeBedsIfAllowed(rt);
    return;
  }
  clearMusicFadingOut(rt);
  const previous = rt.musicHowl;
  let next: ReturnType<typeof createEngineHowl> | null = null;
  let failedSynchronously = false;
  const releaseFailed = () => {
    failedSynchronously = next === null;
    // Only clear if this instance is still the music owner (never clobber a newer Howl).
    if (next && rt.musicHowl === next && rt.musicKey === entry.id) {
      stopAndUnload(next);
      rt.musicHowl = null;
      rt.musicKey = null;
      emitNowPlaying(rt);
    }
  };
  next = createEngineHowl({
    src: entry.src,
    loop: true,
    volume: 0,
    reverb: rt.reverbAmount,
    onloaderror: releaseFailed,
    onplayerror: releaseFailed,
  });
  if (failedSynchronously) {
    stopAndUnload(next);
    rt.musicHowl = null;
    rt.musicKey = null;
    if (previous) {
      fadeOutMusicHowl(rt, previous, entry.fadeOutMs);
    }
    return;
  }
  rt.musicHowl = next;
  rt.musicKey = entry.id;
  const mix = resolveMix(rt);
  if (mix.bedsShouldPlay) {
    next.play();
    fadeHowl(next, 0, mix.music, entry.fadeInMs);
  } else {
    next.volume(mix.music);
  }
  if (previous) {
    fadeOutMusicHowl(rt, previous, entry.fadeOutMs);
  }
}

function playAmbientEntry(rt: GameAudioRuntime, entry: AudioBedCatalogEntry): void {
  if (rt.ambientKey === entry.id && rt.ambientHowl) {
    rt.ambientHowl.volume(resolveMix(rt).ambient);
    resumeBedsIfAllowed(rt);
    return;
  }
  clearAmbientFadingOut(rt);
  const previous = rt.ambientHowl;
  let next: ReturnType<typeof createEngineHowl> | null = null;
  let failedSynchronously = false;
  const releaseFailed = () => {
    failedSynchronously = next === null;
    if (next && rt.ambientHowl === next && rt.ambientKey === entry.id) {
      stopAndUnload(next);
      rt.ambientHowl = null;
      rt.ambientKey = null;
      emitNowPlaying(rt);
    }
  };
  next = createEngineHowl({
    src: entry.src,
    loop: true,
    volume: 0,
    reverb: rt.reverbAmount,
    onloaderror: releaseFailed,
    onplayerror: releaseFailed,
  });
  if (failedSynchronously) {
    stopAndUnload(next);
    rt.ambientHowl = null;
    rt.ambientKey = null;
    if (previous) {
      fadeOutAmbientHowl(rt, previous, entry.fadeOutMs);
    }
    return;
  }
  rt.ambientHowl = next;
  rt.ambientKey = entry.id;
  const mix = resolveMix(rt);
  if (mix.bedsShouldPlay) {
    next.play();
    fadeHowl(next, 0, mix.ambient, entry.fadeInMs);
  } else {
    next.volume(mix.ambient);
  }
  if (previous) {
    fadeOutAmbientHowl(rt, previous, entry.fadeOutMs);
  }
}

function fadeStopMusic(rt: GameAudioRuntime, emit = true): void {
  const howl = rt.musicHowl;
  const entry = resolveBedCatalogEntry(rt.musicKey);
  rt.musicHowl = null;
  rt.musicKey = null;
  if (howl) {
    fadeOutMusicHowl(rt, howl, entry?.fadeOutMs ?? 700);
  }
  if (emit) {
    emitNowPlaying(rt);
  }
}

function fadeStopAmbient(rt: GameAudioRuntime, emit = true): void {
  const howl = rt.ambientHowl;
  const entry = resolveBedCatalogEntry(rt.ambientKey);
  rt.ambientHowl = null;
  rt.ambientKey = null;
  if (howl) {
    fadeOutAmbientHowl(rt, howl, entry?.fadeOutMs ?? 700);
  }
  if (emit) {
    emitNowPlaying(rt);
  }
}

function fadeOutMusicHowl(
  rt: GameAudioRuntime,
  howl: NonNullable<GameAudioRuntime["musicHowl"]>,
  durationMs: number,
): void {
  clearMusicFadingOut(rt);
  if (!howl.playing() || rt.muted || rt.cutscenePaused) {
    stopAndUnload(howl);
    return;
  }
  const cancel = fadeHowl(howl, howl.volume(), 0, durationMs, () => {
    if (rt.musicFadingOut?.howl === howl) {
      stopAndUnload(howl);
      rt.musicFadingOut = null;
    }
  });
  rt.musicFadingOut = { howl, cancel };
}

function fadeOutAmbientHowl(
  rt: GameAudioRuntime,
  howl: NonNullable<GameAudioRuntime["ambientHowl"]>,
  durationMs: number,
): void {
  clearAmbientFadingOut(rt);
  if (!howl.playing() || rt.muted || rt.cutscenePaused) {
    stopAndUnload(howl);
    return;
  }
  const cancel = fadeHowl(howl, howl.volume(), 0, durationMs, () => {
    if (rt.ambientFadingOut?.howl === howl) {
      stopAndUnload(howl);
      rt.ambientFadingOut = null;
    }
  });
  rt.ambientFadingOut = { howl, cancel };
}

function clearMusicFadingOut(rt: GameAudioRuntime): void {
  if (!rt.musicFadingOut) {
    return;
  }
  rt.musicFadingOut.cancel();
  stopAndUnload(rt.musicFadingOut.howl);
  rt.musicFadingOut = null;
}

function clearAmbientFadingOut(rt: GameAudioRuntime): void {
  if (!rt.ambientFadingOut) {
    return;
  }
  rt.ambientFadingOut.cancel();
  stopAndUnload(rt.ambientFadingOut.howl);
  rt.ambientFadingOut = null;
}

function emitNowPlaying(rt: GameAudioRuntime): void {
  const key = getNowPlayingKey(rt);
  for (const listener of rt.nowPlayingListeners) {
    listener(key);
  }
}

function emitNowPlayingIfChanged(rt: GameAudioRuntime, previous: string | null): void {
  if (getNowPlayingKey(rt) !== previous) {
    emitNowPlaying(rt);
  }
}

function isBedEntryActive(rt: GameAudioRuntime, entry: AudioBedCatalogEntry): boolean {
  return entry.kind === "music"
    ? rt.musicKey === entry.id && Boolean(rt.musicHowl)
    : rt.ambientKey === entry.id && Boolean(rt.ambientHowl);
}
