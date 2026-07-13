import { gameAudio } from "./gameAudio";
import type { GameSettings } from "../persistence/settings";

export type GameAudioSettingsSlice = Pick<
  GameSettings,
  "masterMuted" | "musicVolume" | "ambientVolume" | "sfxVolume" | "voiceVolume"
>;

/**
 * Sole React-state → engine owner for the five persisted audio gain channels.
 * Settings UI may optimistically call the same setters for live previews;
 * App must still call this when settings state changes so non-play screens stay in sync.
 */
export function syncGameAudioFromSettings(settings: GameAudioSettingsSlice): void {
  gameAudio.setMuted(settings.masterMuted);
  gameAudio.setMusicVolume(settings.musicVolume);
  gameAudio.setAmbientVolume(settings.ambientVolume);
  gameAudio.setSfxVolume(settings.sfxVolume);
  gameAudio.setVoiceVolume(settings.voiceVolume);
}
