/**
 * Shared mutable runtime for GameAudioController facets.
 * Module-local to the audio package; not a public API.
 */

import type { AudioBedId, AudioBedKind, AudioSfxId } from "../audioCatalog";
import type { AudioDuckOwner } from "../audioMixState";
import type { CancelEngineFade, EngineHowl } from "../howlerEngine";

export const VOICE_DUCK_ATTACK_MS = 160;
export const VOICE_DUCK_RELEASE_MS = 260;

export type GameSfxKey = AudioSfxId | string;
export type GameBedKey = AudioBedId | string;
export type GameBgmKey = GameBedKey;
export type { AudioBedKind };

export interface StageBedSelectionInput {
  readonly musicKey?: GameBedKey | null;
  readonly ambientKey?: GameBedKey | null;
  readonly bgmKey?: GameBedKey | null;
  readonly fallbackKey?: GameBedKey | null;
}

export interface StageBedPlaybackResult {
  readonly mode: "dedicated" | "legacy";
  readonly heardBedIds: readonly string[];
}

export interface AudioPlaybackSnapshot {
  readonly muted: boolean;
  readonly unlocked: boolean;
  readonly cutscenePaused: boolean;
  readonly duckOwner: AudioDuckOwner;
  readonly musicKey: string | null;
  readonly ambientKey: string | null;
  readonly voiceActive: boolean;
}

export type NowPlayingListener = (key: string | null) => void;

export interface FadingPlayback {
  readonly howl: EngineHowl;
  readonly cancel: CancelEngineFade;
}

export interface GameAudioRuntime {
  muted: boolean;
  unlocked: boolean;
  cutscenePaused: boolean;
  voiceActive: boolean;

  musicVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  reverbAmount: number;

  musicHowl: EngineHowl | null;
  musicKey: string | null;
  musicFadingOut: FadingPlayback | null;

  ambientHowl: EngineHowl | null;
  ambientKey: string | null;
  ambientFadingOut: FadingPlayback | null;

  voiceHowl: EngineHowl | null;
  voiceObjectUrl: string | null;

  readonly nowPlayingListeners: Set<NowPlayingListener>;
  readonly sfxCache: Map<string, EngineHowl>;
}

export function createGameAudioRuntime(): GameAudioRuntime {
  return {
    muted: false,
    unlocked: false,
    cutscenePaused: false,
    voiceActive: false,

    musicVolume: 0.42,
    ambientVolume: 0.28,
    sfxVolume: 0.72,
    voiceVolume: 0.8,
    reverbAmount: 0.28,

    musicHowl: null,
    musicKey: null,
    musicFadingOut: null,

    ambientHowl: null,
    ambientKey: null,
    ambientFadingOut: null,

    voiceHowl: null,
    voiceObjectUrl: null,

    nowPlayingListeners: new Set<NowPlayingListener>(),
    sfxCache: new Map<string, EngineHowl>(),
  };
}
