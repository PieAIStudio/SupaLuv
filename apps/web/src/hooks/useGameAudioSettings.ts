import { useEffect } from "react";
import { gameAudio } from "../audio/gameAudio";
import type { GameSettings } from "../persistence/settings";

/**
 * Keep the singleton gameAudio controller in sync with player settings.
 * Play orchestrator should not re-implement these four gain channels.
 */
export function useGameAudioSettings(input: {
  readonly masterMuted: boolean;
  readonly musicVolume: number;
  readonly ambientVolume: number;
  readonly sfxVolume: number;
  readonly voiceVolume: number;
}): void {
  useEffect(() => {
    gameAudio.setMuted(input.masterMuted);
  }, [input.masterMuted]);

  useEffect(() => {
    gameAudio.setMusicVolume(input.musicVolume);
  }, [input.musicVolume]);

  useEffect(() => {
    gameAudio.setAmbientVolume(input.ambientVolume);
  }, [input.ambientVolume]);

  useEffect(() => {
    gameAudio.setSfxVolume(input.sfxVolume);
  }, [input.sfxVolume]);

  useEffect(() => {
    gameAudio.setVoiceVolume(input.voiceVolume);
  }, [input.voiceVolume]);
}

export type AudioSettingsSlice = Pick<
  GameSettings,
  "masterMuted" | "musicVolume" | "ambientVolume" | "sfxVolume" | "voiceVolume"
>;
