/**
 * Play-surface audio chrome: unlock gate, now-playing bed label, local autoplay mirror, mute toggle.
 * Does not own stage beds/cutscene timing (useStageMedia) or dialogue TTS (useNarrativePlayback).
 */

import { useCallback, useEffect, useState } from "react";
import { gameAudio } from "../../../audio/gameAudio";

export type PlaySurfaceAudio = {
  readonly nowPlayingBedId: string | null;
  readonly localAutoPlay: boolean;
  readonly ensureAudioUnlocked: () => void;
  readonly toggleAutoPlay: () => void;
  readonly handleMuteToggle: () => void;
};

export function usePlaySurfaceAudio(input: {
  readonly autoPlay: boolean;
  readonly masterMuted: boolean;
  readonly onAutoPlayChange?: (next: boolean) => void;
  readonly onMasterMutedChange?: (next: boolean) => void;
}): PlaySurfaceAudio {
  const { autoPlay, masterMuted, onAutoPlayChange, onMasterMutedChange } = input;

  const [localAutoPlay, setLocalAutoPlay] = useState(autoPlay);
  const [nowPlayingBedId, setNowPlayingBedId] = useState<string | null>(() =>
    gameAudio.getNowPlayingKey(),
  );

  useEffect(() => gameAudio.onNowPlayingChange(setNowPlayingBedId), []);

  useEffect(() => {
    setLocalAutoPlay(autoPlay);
  }, [autoPlay]);

  const ensureAudioUnlocked = useCallback(() => {
    gameAudio.unlock();
  }, []);

  const toggleAutoPlay = useCallback(() => {
    const next = !localAutoPlay;
    setLocalAutoPlay(next);
    onAutoPlayChange?.(next);
  }, [localAutoPlay, onAutoPlayChange]);

  const handleMuteToggle = useCallback(() => {
    const next = !masterMuted;
    gameAudio.setMuted(next);
    onMasterMutedChange?.(next);
    ensureAudioUnlocked();
  }, [ensureAudioUnlocked, masterMuted, onMasterMutedChange]);

  return {
    nowPlayingBedId,
    localAutoPlay,
    ensureAudioUnlocked,
    toggleAutoPlay,
    handleMuteToggle,
  };
}
