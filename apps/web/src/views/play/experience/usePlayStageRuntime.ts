/**
 * Play-stage runtime orchestration after chrome/audio surface hooks:
 * prop cut-in, narrative source → stage media → playback, decision lifecycle,
 * path telemetry, surface reset, stage commands, and keyboard input.
 *
 * VisualNovelPrototype stays composition-only: wire chrome/audio + this runtime + JSX.
 */

import { useCallback, useEffect, useRef } from "react";
import { gameAudio } from "../../../audio/gameAudio";
import type { DialogueVoicePlaybackGuardApi } from "../../../audio/dialogueVoicePlaybackGuard";
import type { CoPlaySessionApi } from "../../../coplay/useCoPlaySession";
import { shouldShowRemoteCursors } from "../../../coplay/pointerPolicy";
import { useAuth } from "../../../auth/AuthContext";
import { useFullscreen } from "../../../hooks/useFullscreen";
import { usePlayInput } from "../../../hooks/usePlayInput";
import { usePointerPresenceMode } from "../../../hooks/usePointerPresenceMode";
import { resolveStoryInteraction } from "../../../interactions/storyInteractionRegistry";
import type { DisplayNameMap } from "../../../persistence/displayNames";
import type { PortraitPackState } from "../../../persistence/portraitPack";
import type { GameSettings } from "../../../persistence/settings";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import { getStoryPresentation, getStoryScene, type StoryId } from "../../../story/storyMapAdapter";
import type { EndingPathMeta } from "../../ChapterEndCard";
import type { StoryCharacterBindings } from "../../../characters/characterPackTypes";
import { mapPortraitsForPlayer } from "../lib/stagePresentation";
import { shouldShowPropCutIn } from "../lib/propCutInState";
import { useCoPlayPointers } from "../hooks/useCoPlayPointers";
import { usePropCutIn } from "../hooks/usePropCutIn";
import { useStageMedia } from "../hooks/useStageMedia";
import { isContinueOnly, storyHasComedyMeters } from "../lib/vnHelpers";
import { useDecisionExperience } from "./useDecisionExperience";
import { useNarrativePlayback } from "./useNarrativePlayback";
import { useNarrativeSource } from "./useNarrativeSource";
import { usePlayPathTelemetry } from "./usePlayPathTelemetry";

export function usePlayStageRuntime(input: {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly textSpeed: GameSettings["textSpeed"];
  readonly masterMuted: boolean;
  readonly voiceVolume: GameSettings["voiceVolume"];
  readonly dialogueVoiceGuard: DialogueVoicePlaybackGuardApi;
  readonly dialogueVoiceRunKey: string;
  readonly displayNames: DisplayNameMap;
  readonly portraitPack: PortraitPackState;
  readonly characterBindings: StoryCharacterBindings;
  readonly coPlay: CoPlaySessionApi | null;
  readonly onRpsResolvedAchievement?: () => void;
  readonly onCustomPackCgSkipped?: () => void;
  readonly onChoose: (index: number) => void;
  readonly onJumpTo: (path: string) => void;
  readonly onReset: () => void;
  readonly onOpenSettings: () => void;
  readonly onAiBranchUsed?: () => void;
  readonly onChapterClear?: (path: EndingPathMeta) => void;
  readonly onBedHeard?: (bedId: string) => void;
  readonly localAutoPlay: boolean;
  readonly ensureAudioUnlocked: () => void;
  readonly systemOpen: boolean;
  readonly historyOpen: boolean;
  readonly closeHistory: () => void;
  readonly closeSystem: () => void;
  readonly closeChromeForReset: () => void;
}) {
  const {
    storyId,
    snapshot,
    textSpeed,
    masterMuted,
    voiceVolume,
    dialogueVoiceGuard,
    dialogueVoiceRunKey,
    displayNames,
    portraitPack,
    characterBindings,
    coPlay,
    onRpsResolvedAchievement,
    onCustomPackCgSkipped,
    onChoose,
    onJumpTo,
    onReset,
    onOpenSettings,
    onAiBranchUsed,
    onChapterClear,
    onBedHeard,
    localAutoPlay,
    ensureAudioUnlocked,
    systemOpen,
    historyOpen,
    closeHistory,
    closeSystem,
    closeChromeForReset,
  } = input;

  const auth = useAuth();
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const propReopenRef = useRef<HTMLButtonElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRootRef);

  const currentScene = getStoryScene(storyId, snapshot.sceneId);
  const presentation = getStoryPresentation(storyId, snapshot.sceneId);
  const isGuestSpectator = coPlay?.role === "guest";
  const remoteStory = coPlay?.remoteStory ?? null;
  const activeStoryInteraction = !isGuestSpectator ? resolveStoryInteraction(snapshot) : null;
  const propCutIn = usePropCutIn({
    storyId,
    sceneId: snapshot.sceneId,
    isGuestSpectator,
  });

  const restorePropCutInFocus = useCallback((previousFocus: HTMLElement | null) => {
    if (propReopenRef.current?.isConnected) {
      propReopenRef.current.focus();
    } else if (previousFocus?.isConnected) {
      previousFocus.focus();
    } else {
      stageRootRef.current?.focus();
    }
  }, []);

  // Order: narrative source → stage media → narrative playback (same-render cutscene gates).
  const narrativeSource = useNarrativeSource({
    source: {
      storyId,
      snapshot,
      sceneTitle: currentScene?.title,
      presentationSpeaker: presentation.speaker,
      aiBranchConfig: currentScene?.aiBranch,
      aiBranchEnabled: Boolean(currentScene?.aiBranch?.enabled) && !snapshot.isEnded,
    },
    viewer: {
      isGuestSpectator,
      remoteStory,
      displayNames,
    },
    auth: {
      isSignedIn: auth.isSignedIn,
      accessToken: auth.session?.access_token ?? null,
      batteries: auth.batteries,
    },
  });

  const { activeCutscene, setActiveCutscene, sceneFlash, resetMediaMemory } = useStageMedia({
    sceneId: snapshot.sceneId,
    videoKey: currentScene?.videoKey,
    presentation: {
      videoUrl: presentation.videoUrl,
      cutsceneTitle: presentation.cutsceneTitle,
      musicKey: presentation.musicKey,
      ambientKey: presentation.ambientKey,
      bgmKey: presentation.bgmKey,
      sfxKey: presentation.sfxKey,
    },
    portraitPack,
    aiPlaying: narrativeSource.stage.aiPlaying,
    isGuestSpectator,
    onCustomPackCgSkipped,
    onBedHeard,
  });

  const narrative = useNarrativePlayback({
    sourceController: narrativeSource.controller,
    playback: {
      textSpeed,
      autoPlay: localAutoPlay,
      activeCutscene: Boolean(activeCutscene) || propCutIn.requested,
      hasStoryInteraction: Boolean(activeStoryInteraction),
      masterMuted,
      voiceVolume,
      dialogueVoiceGuard,
      dialogueVoiceRunKey,
    },
    host: {
      coPlay,
    },
    auth: {
      isSignedIn: auth.isSignedIn,
      accessToken: auth.session?.access_token ?? null,
      signInGuest: auth.signInGuest,
    },
    actions: {
      onChoose,
      onJumpTo,
      onAuthFallback: onOpenSettings,
      ensureAudioUnlocked,
    },
  });

  const { frame, history, commands: narrativeCommands } = narrative;
  const historyEntries = history.entries;
  const {
    reveal: revealDialogue,
    chooseAi,
    advanceAi,
    requestAiAuth,
    recordPlayerChoice,
    cancelAi,
    reset: resetNarrative,
  } = narrativeCommands;

  const performPlaySurfaceReset = useCallback(() => {
    propCutIn.resetMemory();
    resetMediaMemory();
    resetNarrative();
    setActiveCutscene(null);
    closeChromeForReset();
    onReset();
  }, [
    closeChromeForReset,
    onReset,
    propCutIn,
    resetMediaMemory,
    resetNarrative,
    setActiveCutscene,
  ]);

  const decision = useDecisionExperience({
    source: {
      storyId,
      snapshot,
      coPlay,
    },
    viewer: {
      isGuestSpectator,
      guestChoices: frame.choices,
      remoteSceneId: frame.remoteSceneId,
      remoteIsEnded: frame.remoteIsEnded,
    },
    narrative: {
      typewriterComplete: frame.typewriterComplete,
      aiPlaying: frame.aiPlaying,
      recordPlayerChoice,
      cancelAi,
    },
    actions: {
      onChoose,
      onRpsResolvedAchievement,
      onAiBranchUsed,
      onChapterClear,
      ensureAudioUnlocked,
      performExternalReset: performPlaySurfaceReset,
    },
  });

  const {
    choice: decisionChoice,
    oracle: decisionOracle,
    rps: decisionRps,
    ending: decisionEnding,
    commands: decisionCommands,
  } = decision;
  const { handleChoose, seenLabels, sessionStatsPicks } = decisionChoice;
  const { notifyAiBranchUsed, clearOracleForReset, replayFromEndCard } = decisionCommands;
  const { handleChooseAi } = usePlayPathTelemetry({
    storyId,
    snapshot,
    isGuestSpectator,
    activeStoryInteraction,
    dialogueComplete: frame.dialogueComplete,
    sceneTitle: frame.sceneTitle,
    chooseAi,
    notifyAiBranchUsed,
  });

  const higherPriorityPropSurfaceOpen =
    Boolean(activeCutscene) ||
    systemOpen ||
    historyOpen ||
    decisionEnding.endCardOpen ||
    Boolean(coPlay?.rpsView);
  const propCutInVisible = shouldShowPropCutIn({
    requested: propCutIn.requested,
    higherPrioritySurfaceOpen: higherPriorityPropSurfaceOpen,
  });

  const showComedyMeters = storyHasComedyMeters(storyId);
  const activeAiBeat = frame.activeAiBeat;

  const artUrl = activeAiBeat?.artKey
    ? `/assets/scenes/${activeAiBeat.artKey}.jpg`
    : presentation.artUrl;
  const hasArt = Boolean(artUrl);

  const basePortraits = activeAiBeat?.portraitKey
    ? [
        {
          name: activeAiBeat.speaker,
          url: `/assets/portraits/${activeAiBeat.portraitKey}.png`,
          side: "left" as const,
          active: true,
        },
      ]
    : presentation.portraits;
  const portraits = mapPortraitsForPlayer(
    basePortraits,
    displayNames,
    portraitPack,
    characterBindings,
  );

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !new URLSearchParams(window.location.search).has("prop-stage-fixture")
    ) {
      return;
    }
    const testWindow = window as Window & {
      __SUPALUV_PROP_STAGE_TEST__?: { jumpTo: (sceneId: string) => void };
    };
    testWindow.__SUPALUV_PROP_STAGE_TEST__ = { jumpTo: onJumpTo };
    return () => {
      delete testWindow.__SUPALUV_PROP_STAGE_TEST__;
    };
  }, [onJumpTo]);

  const dismissCutscene = useCallback(() => {
    ensureAudioUnlocked();
    setActiveCutscene(null);
    gameAudio.playSfx("ui-click", 0.4);
    gameAudio.resumeBedsAfterCutscene();
  }, [ensureAudioUnlocked, setActiveCutscene]);

  const handleDialogueActivate = useCallback(() => {
    ensureAudioUnlocked();
    if (!frame.typewriterComplete) {
      revealDialogue();
      gameAudio.playSfx("ui-click", 0.35);
    }
  }, [ensureAudioUnlocked, frame.typewriterComplete, revealDialogue]);

  const pointerMode = usePointerPresenceMode();
  const showRemoteCursors = shouldShowRemoteCursors(pointerMode);
  const { handleStagePointer, handleStageTouchFocus } = useCoPlayPointers({
    coPlay,
    pointerMode,
  });

  const handleReset = useCallback(() => {
    clearOracleForReset();
    performPlaySurfaceReset();
  }, [clearOracleForReset, performPlaySurfaceReset]);

  const handleKeyboardContinue = useCallback(() => {
    if (activeCutscene) {
      dismissCutscene();
      return;
    }
    if (frame.aiPlaying) {
      advanceAi();
      return;
    }
    if (snapshot.isEnded || !isContinueOnly(snapshot)) {
      return;
    }
    handleChoose(0);
  }, [activeCutscene, advanceAi, dismissCutscene, frame.aiPlaying, handleChoose, snapshot]);

  const handleEscape = useCallback(() => {
    if (historyOpen) {
      closeHistory();
      return;
    }
    if (systemOpen) {
      closeSystem();
      return;
    }
    if (activeCutscene) {
      dismissCutscene();
    }
  }, [activeCutscene, closeHistory, closeSystem, dismissCutscene, historyOpen, systemOpen]);

  usePlayInput({
    enabled:
      !isGuestSpectator &&
      !propCutIn.requested &&
      !activeStoryInteraction &&
      (!decisionEnding.chapterEnded || Boolean(activeCutscene)),
    isComplete: Boolean(activeCutscene) || frame.typewriterComplete,
    canContinue:
      Boolean(activeCutscene) || frame.aiPlaying || (!frame.aiPlaying && isContinueOnly(snapshot)),
    overlaysOpen: historyOpen || systemOpen || propCutIn.requested,
    onReveal: handleDialogueActivate,
    onContinue: handleKeyboardContinue,
    onEscape: handleEscape,
  });

  return {
    stageRootRef,
    propReopenRef,
    isFullscreen,
    toggleFullscreen,
    currentScene,
    presentation,
    isGuestSpectator,
    activeStoryInteraction,
    propCutIn,
    restorePropCutInFocus,
    activeCutscene,
    sceneFlash,
    frame,
    historyEntries,
    advanceAi,
    requestAiAuth,
    handleChoose,
    seenLabels,
    sessionStatsPicks,
    decisionOracle,
    decisionRps,
    decisionEnding,
    replayFromEndCard,
    handleChooseAi,
    higherPriorityPropSurfaceOpen,
    propCutInVisible,
    showComedyMeters,
    activeAiBeat,
    artUrl,
    hasArt,
    portraits,
    dismissCutscene,
    handleDialogueActivate,
    pointerMode,
    showRemoteCursors,
    handleStagePointer,
    handleStageTouchFocus,
    handleReset,
  };
}
