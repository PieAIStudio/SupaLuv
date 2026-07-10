/**
 * Cutscene trigger + exclusive beds + one-shot scene SFX for the play stage.
 * Preserves prior VisualNovelPrototype side-effect order (behavior-preserving extract).
 */

import { useEffect, useRef, useState } from "react";
import { gameAudio, isSceneCueSfx } from "../../audio/gameAudio";
import { hasCustomPortraitPack, type PortraitPackState } from "../../persistence/portraitPack";

export interface StageMediaPresentation {
  readonly videoUrl?: string | null;
  readonly cutsceneTitle?: string;
  readonly musicKey?: string | null;
  readonly ambientKey?: string | null;
  readonly bgmKey?: string | null;
  readonly sfxKey?: string | null;
}

export function useStageMedia(input: {
  readonly sceneId: string | null;
  readonly videoKey: string | null | undefined;
  readonly presentation: StageMediaPresentation;
  readonly portraitPack: PortraitPackState;
  readonly aiPlaying: boolean;
  readonly isGuestSpectator: boolean;
  readonly onCustomPackCgSkipped?: () => void;
  readonly onBedHeard?: (bedId: string) => void;
}): {
  readonly activeCutscene: { url: string; title: string; key: string } | null;
  readonly setActiveCutscene: (next: { url: string; title: string; key: string } | null) => void;
  readonly sceneFlash: boolean;
  readonly playedCutscenesRef: React.MutableRefObject<Set<string>>;
  readonly resetMediaMemory: () => void;
} {
  const {
    sceneId,
    videoKey,
    presentation,
    portraitPack,
    aiPlaying,
    isGuestSpectator,
    onCustomPackCgSkipped,
    onBedHeard,
  } = input;

  const [sceneFlash, setSceneFlash] = useState(false);
  const [activeCutscene, setActiveCutscene] = useState<{
    url: string;
    title: string;
    key: string;
  } | null>(null);
  const playedCutscenesRef = useRef(new Set<string>());
  const lastSfxSceneRef = useRef<string | null>(null);

  useEffect(() => {
    setSceneFlash(true);
    const timer = window.setTimeout(() => setSceneFlash(false), 420);
    return () => window.clearTimeout(timer);
  }, [sceneId, aiPlaying]);

  // ADR-0002: custom lead faces → skip official lead-face Event CG (soft degrade).
  useEffect(() => {
    const key = videoKey;
    const url = presentation.videoUrl;
    if (!key || !url || playedCutscenesRef.current.has(key) || aiPlaying || isGuestSpectator) {
      return;
    }
    playedCutscenesRef.current.add(key);
    if (hasCustomPortraitPack(portraitPack)) {
      onCustomPackCgSkipped?.();
      return;
    }
    setActiveCutscene({
      key,
      url,
      title: presentation.cutsceneTitle ?? key,
    });
  }, [
    aiPlaying,
    isGuestSpectator,
    onCustomPackCgSkipped,
    portraitPack,
    presentation.cutsceneTitle,
    presentation.videoUrl,
    sceneId,
    videoKey,
  ]);

  // Exclusive bed: Lyria tracks are full mixes — never stack two scores.
  useEffect(() => {
    const exclusive =
      presentation.musicKey ?? presentation.ambientKey ?? presentation.bgmKey ?? "soft-piano";
    gameAudio.playExclusiveBed(exclusive);
    if (exclusive) {
      onBedHeard?.(exclusive);
    }
  }, [onBedHeard, presentation.ambientKey, presentation.bgmKey, presentation.musicKey]);

  useEffect(() => {
    if (activeCutscene) {
      gameAudio.pauseBedsForCutscene();
    } else {
      gameAudio.resumeBedsAfterCutscene();
    }
  }, [activeCutscene]);

  useEffect(() => {
    const sceneStamp = sceneId ?? "";
    if (
      activeCutscene ||
      !isSceneCueSfx(presentation.sfxKey) ||
      lastSfxSceneRef.current === sceneStamp ||
      !gameAudio.isUnlocked()
    ) {
      return;
    }
    lastSfxSceneRef.current = sceneStamp;
    gameAudio.playSfx(presentation.sfxKey, presentation.sfxKey === "payment-chime" ? 0.85 : 0.55);
  }, [activeCutscene, presentation.sfxKey, sceneId]);

  function resetMediaMemory(): void {
    playedCutscenesRef.current = new Set();
    lastSfxSceneRef.current = null;
  }

  return {
    activeCutscene,
    setActiveCutscene,
    sceneFlash,
    playedCutscenesRef,
    resetMediaMemory,
  };
}
