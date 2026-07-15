export const VOICE_MUSIC_DUCK = 0.34;
export const VOICE_AMBIENT_DUCK = 0.46;

export type AudioDuckOwner = "voice" | null;

export interface AudioMixState {
  readonly muted: boolean;
  readonly unlocked: boolean;
  readonly cutscenePaused: boolean;
  readonly voiceActive: boolean;
}

export interface AudioMixGains {
  readonly music: number;
  readonly ambient: number;
  readonly voice: number;
  readonly duckOwner: AudioDuckOwner;
  readonly bedsShouldPlay: boolean;
}

/**
 * One explicit ducking relationship only: active voice ducks both bed buses.
 * Cutscenes and master mute pause beds rather than adding another duck owner.
 */
export function resolveAudioMixGains(input: {
  readonly state: AudioMixState;
  readonly musicVolume: number;
  readonly ambientVolume: number;
  readonly voiceVolume: number;
}): AudioMixGains {
  const { state } = input;
  const duckOwner: AudioDuckOwner = state.voiceActive && !state.muted ? "voice" : null;
  return {
    music: clamp01(input.musicVolume) * (duckOwner ? VOICE_MUSIC_DUCK : 1),
    ambient: clamp01(input.ambientVolume) * (duckOwner ? VOICE_AMBIENT_DUCK : 1),
    voice: state.muted ? 0 : clamp01(input.voiceVolume),
    duckOwner,
    bedsShouldPlay: state.unlocked && !state.muted && !state.cutscenePaused,
  };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
