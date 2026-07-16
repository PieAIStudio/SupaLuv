import { useCallback, useEffect, useRef } from "react";
import type { DialogueVoicePlaybackGuardApi } from "../audio/dialogueVoicePlaybackGuard";
import { gameAudio } from "../audio/gameAudio";
import { CoPlayBanner } from "../coplay/CoPlayBanner";
import { CursorOverlay } from "../coplay/CursorOverlay";
import { RpsDuelOverlay } from "../coplay/RpsDuelOverlay";
import type { CoPlaySessionApi } from "../coplay/useCoPlaySession";
import { shouldShowRemoteCursors } from "../coplay/pointerPolicy";
import { useAuth } from "../auth/AuthContext";
import { useLocale } from "../i18n";
import { useFullscreen } from "../hooks/useFullscreen";
import { usePlayInput } from "../hooks/usePlayInput";
import { usePointerPresenceMode } from "../hooks/usePointerPresenceMode";
import { StoryInteractionHost } from "../interactions/StoryInteractionHost";
import { resolveStoryInteraction } from "../interactions/storyInteractionRegistry";
import type { ManualSlotId } from "../persistence/gameSave";
import { DEFAULT_DISPLAY_NAMES, type DisplayNameMap } from "../persistence/displayNames";
import { EMPTY_PORTRAIT_PACK, type PortraitPackState } from "../persistence/portraitPack";
import type { GameSettings } from "../persistence/settings";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  getStoryDefinition,
  getStoryPresentation,
  getStoryScene,
  type StoryId,
} from "../story/storyMapAdapter";
import { ChapterEndCard, type EndingPathMeta } from "./ChapterEndCard";
import { CutscenePlayer } from "./CutscenePlayer";
import { DialogueHistoryDrawer } from "./play/DialogueHistoryDrawer";
import { DialoguePanel } from "./play/DialoguePanel";
import { PlayHud } from "./play/PlayHud";
import { PortraitStage } from "./play/PortraitStage";
import { PropCutIn } from "./play/PropCutIn";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { CharacterStudioScreen, type CharacterStudioSlot } from "./CharacterStudioScreen";
import { mapPortraitsForPlayer } from "./play/lib/stagePresentation";
import { shouldShowPropCutIn } from "./play/lib/propCutInState";
import { useCoPlayPointers } from "./play/hooks/useCoPlayPointers";
import { useDecisionExperience } from "./play/experience/useDecisionExperience";
import { useNarrativePlayback } from "./play/experience/useNarrativePlayback";
import { useNarrativeSource } from "./play/experience/useNarrativeSource";
import { usePlayPathTelemetry } from "./play/experience/usePlayPathTelemetry";
import { usePlaySurfaceAudio } from "./play/experience/usePlaySurfaceAudio";
import { usePlaySurfaceChrome } from "./play/experience/usePlaySurfaceChrome";
import { usePropCutIn } from "./play/hooks/usePropCutIn";
import { useStageMedia } from "./play/hooks/useStageMedia";
import { isContinueOnly, storyHasComedyMeters } from "./play/lib/vnHelpers";

interface VisualNovelPrototypeProps {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly textSpeed: GameSettings["textSpeed"];
  readonly autoPlay: boolean;
  readonly masterMuted: boolean;
  readonly voiceVolume: GameSettings["voiceVolume"];
  readonly dialogueVoiceGuard: DialogueVoicePlaybackGuardApi;
  readonly dialogueVoiceRunKey: string;
  readonly activeSaveSlot: ManualSlotId;
  readonly displayNames?: DisplayNameMap;
  readonly portraitPack?: PortraitPackState;
  readonly characterBindings?: StoryCharacterBindings;
  readonly onCharacterBindingsChange?: (bindings: StoryCharacterBindings) => void;
  readonly coPlay?: CoPlaySessionApi | null;
  readonly onLeaveCoPlay?: () => void;
  readonly onRareEcho?: () => void;
  readonly onReverseCurrent?: () => void;
  readonly onOracleHit?: () => void;
  readonly onRpsResolvedAchievement?: () => void;
  readonly onCustomPackCgSkipped?: () => void;
  readonly onStoryChange: (storyId: StoryId) => void;
  readonly onChoose: (index: number) => void;
  readonly onJumpTo: (path: string) => void;
  readonly onOpenPlayerPath: () => void;
  readonly onOpenCreatorMap: () => void;
  readonly onReset: () => void;
  readonly onSave: (slotId?: ManualSlotId) => void;
  readonly onOpenTitle: () => void;
  readonly onOpenGallery: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenHelp?: () => void;
  readonly onOpenAchievements?: () => void;
  readonly onAutoPlayChange?: (next: boolean) => void;
  readonly onMasterMutedChange?: (next: boolean) => void;
  readonly onAiBranchUsed?: () => void;
  readonly onChapterClear?: (path: EndingPathMeta) => void;
  /** First hear of a bed → gallery audio unlock. */
  readonly onBedHeard?: (bedId: string) => void;
}

export function VisualNovelPrototype({
  storyId,
  snapshot,
  textSpeed,
  autoPlay,
  masterMuted,
  voiceVolume,
  dialogueVoiceGuard,
  dialogueVoiceRunKey,
  activeSaveSlot,
  displayNames = DEFAULT_DISPLAY_NAMES,
  portraitPack = EMPTY_PORTRAIT_PACK,
  characterBindings = {},
  onCharacterBindingsChange,
  coPlay = null,
  onLeaveCoPlay,
  onRareEcho,
  onReverseCurrent,
  onOracleHit,
  onRpsResolvedAchievement,
  onCustomPackCgSkipped,
  onStoryChange,
  onChoose,
  onJumpTo,
  onOpenPlayerPath,
  onOpenCreatorMap,
  onReset,
  onSave,
  onOpenTitle,
  onOpenGallery,
  onOpenSettings,
  onOpenHelp,
  onOpenAchievements,
  onAutoPlayChange,
  onMasterMutedChange,
  onAiBranchUsed,
  onChapterClear,
  onBedHeard,
}: VisualNovelPrototypeProps) {
  const auth = useAuth();
  const { t } = useLocale();
  const currentScene = getStoryScene(storyId, snapshot.sceneId);
  const pendingRobotSlots = (currentScene?.characterSlotLock?.slotIds ?? [])
    .filter((slotId) => !characterBindings[slotId])
    .map<CharacterStudioSlot>((slotId) =>
      slotId === "robot_aila"
        ? {
            id: slotId,
            name: "艾拉",
            role: "女款机器人",
            roleKey: "characterStudio.femaleRobot",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          }
        : {
            id: slotId,
            name: "凯",
            role: "男款机器人",
            roleKey: "characterStudio.maleRobot",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          },
    );
  const presentation = getStoryPresentation(storyId, snapshot.sceneId);
  const storyLabel = getStoryDefinition(storyId).label;
  const playerMode = getStoryDefinition(storyId).role === "production";
  const debugToolsAvailable =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("debug") === "1";

  const chrome = usePlaySurfaceChrome({
    playerMode,
    debugToolsAvailable,
    activeSaveSlot,
    onSave,
  });
  const {
    showDevTools,
    saveFlash,
    systemOpen,
    historyOpen,
    openHistory,
    closeHistory,
    toggleSystem,
    closeSystem,
    toggleDevTools,
    handleSave,
    closeChromeForReset,
  } = chrome;
  const { nowPlayingBedId, localAutoPlay, ensureAudioUnlocked, toggleAutoPlay, handleMuteToggle } =
    usePlaySurfaceAudio({
      autoPlay,
      masterMuted,
      onAutoPlayChange,
      onMasterMutedChange,
    });
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const propReopenRef = useRef<HTMLButtonElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRootRef);

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

  if (pendingRobotSlots.length > 0) {
    return (
      <CharacterStudioScreen
        slots={pendingRobotSlots}
        initialBindings={characterBindings}
        allowCancel={false}
        onCancel={() => undefined}
        onComplete={(bindings) => onCharacterBindingsChange?.(bindings)}
      />
    );
  }

  return (
    <div className="game-viewport" data-testid="game-viewport" ref={stageRootRef}>
      <section
        className={`vn-stage${sceneFlash ? " is-scene-enter" : ""}`}
        aria-labelledby="prototype-title"
        data-background={presentation.backgroundKey}
        data-mood={activeAiBeat?.mood ?? presentation.mood}
        data-has-art={hasArt ? "true" : "false"}
        data-has-portrait={portraits.length > 0 ? "true" : "false"}
        data-player-mode={playerMode ? "true" : "false"}
        data-autoplay={localAutoPlay ? "true" : "false"}
        data-ai-branch={frame.aiPlaying ? "true" : "false"}
        data-story-interaction={activeStoryInteraction?.definition.id ?? "none"}
        data-motion={activeAiBeat ? "none" : (currentScene?.stageMotion ?? "none")}
        data-coplay={coPlay ? coPlay.role : "off"}
        data-prop-cutin={propCutIn.requested ? (propCutIn.definition?.id ?? "pending") : "none"}
        data-testid="vn-stage"
        tabIndex={-1}
        data-pointer-mode={pointerMode}
        onPointerMove={coPlay ? handleStagePointer : undefined}
        onPointerDown={coPlay ? handleStageTouchFocus : undefined}
      >
        {artUrl && !isGuestSpectator ? (
          <div
            className="vn-stage-art"
            aria-hidden="true"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(4, 5, 8, 0.18) 0%, rgba(4, 5, 8, 0.35) 42%, rgba(4, 5, 8, 0.78) 100%), url(${artUrl})`,
            }}
          />
        ) : null}
        <div className="vn-stage-backdrop" />
        <div className="vn-stage-vignette" aria-hidden="true" />
        <div className="vn-stage-flash" aria-hidden="true" />

        {coPlay ? (
          <CoPlayBanner
            roomCode={coPlay.roomCode}
            role={coPlay.role}
            peerCount={coPlay.peerCount}
            transportKind={coPlay.transportKind}
            guestVotes={coPlay.role === "host" ? coPlay.guestVotes : []}
            onLeave={onLeaveCoPlay}
          />
        ) : null}

        {coPlay && showRemoteCursors ? <CursorOverlay cursors={coPlay.remoteCursors} /> : null}

        {coPlay?.rpsView ? (
          <RpsDuelOverlay
            duel={coPlay.rpsView}
            role={coPlay.role}
            globalLean={decisionRps.globalLean}
            onThrow={(value) => coPlay.publishRpsThrow(value)}
            onGlobalReferee={decisionRps.onGlobalReferee}
          />
        ) : null}

        {activeCutscene && !isGuestSpectator ? (
          <CutscenePlayer
            videoKey={activeCutscene.key}
            url={activeCutscene.url}
            title={activeCutscene.title}
            onDismiss={dismissCutscene}
          />
        ) : null}

        {propCutInVisible && propCutIn.definition ? (
          <PropCutIn
            definition={propCutIn.definition}
            onDismiss={propCutIn.dismiss}
            onRestoreFocus={restorePropCutInFocus}
          />
        ) : null}

        {!isGuestSpectator ? (
          <PlayHud
            playerMode={playerMode}
            autoPlay={localAutoPlay}
            showComedyMeters={showComedyMeters}
            dignity={frame.dignity}
            impulse={frame.impulse}
            saveFlash={saveFlash}
            showDevTools={showDevTools}
            storyId={storyId}
            storyLabel={storyLabel}
            nowPlayingBedId={nowPlayingBedId}
            isFullscreen={isFullscreen}
            muted={masterMuted}
            systemOpen={systemOpen}
            activeSaveSlot={activeSaveSlot}
            onStoryChange={onStoryChange}
            onToggleFullscreen={() => void toggleFullscreen()}
            onToggleMute={handleMuteToggle}
            onOpenHistory={openHistory}
            onToggleSystem={toggleSystem}
            onSave={handleSave}
            onToggleAutoPlay={toggleAutoPlay}
            onReset={handleReset}
            onOpenGallery={onOpenGallery}
            onOpenSettings={onOpenSettings}
            onOpenHelp={onOpenHelp}
            onOpenAchievements={onOpenAchievements}
            onOpenTitle={onOpenTitle}
            onToggleDevTools={toggleDevTools}
            onOpenPlayerPath={onOpenPlayerPath}
            onOpenCreatorMap={onOpenCreatorMap}
          />
        ) : (
          <div className="coplay-guest-hud">
            <span>
              {t("play.spectator")} · {frame.dignity}/{frame.impulse}
            </span>
            <button type="button" className="coplay-banner-leave" onClick={onOpenTitle}>
              {t("play.title")}
            </button>
          </div>
        )}

        {!isGuestSpectator &&
        propCutIn.definition &&
        propCutIn.seen &&
        !propCutIn.requested &&
        !higherPriorityPropSurfaceOpen ? (
          <button
            ref={propReopenRef}
            type="button"
            className="prop-cutin-reopen"
            data-testid="prop-cutin-reopen"
            onClick={propCutIn.reopen}
          >
            {t("propCutIn.reopen")}
          </button>
        ) : null}

        {!isGuestSpectator ? (
          <PortraitStage
            portraits={portraits}
            hasArt={hasArt}
            mood={activeAiBeat?.mood ?? presentation.mood}
          />
        ) : null}

        {activeStoryInteraction && !propCutIn.requested ? (
          <StoryInteractionHost
            active={activeStoryInteraction}
            snapshot={snapshot}
            paused={historyOpen || systemOpen || Boolean(activeCutscene) || propCutIn.requested}
            onChoose={handleChoose}
          />
        ) : null}

        {!activeStoryInteraction && !decisionEnding.dialogueYieldsToEnding ? (
          <DialoguePanel
            sceneTitle={frame.sceneTitle}
            speaker={frame.displaySpeaker}
            sceneId={isGuestSpectator ? frame.remoteSceneId : snapshot.sceneId}
            visibleText={isGuestSpectator ? frame.displayText : frame.visibleText}
            isComplete={frame.dialogueComplete}
            choices={
              isGuestSpectator
                ? frame.choices.map((c) => ({
                    index: c.index,
                    text: c.text,
                    choiceId: c.choiceId ?? null,
                  }))
                : snapshot.choices
            }
            seenChoiceLabels={seenLabels}
            aiSlot={isGuestSpectator ? undefined : frame.aiSlot}
            aiMode={isGuestSpectator ? Boolean(frame.panelAiMode) : frame.aiPlaying}
            oracleOptions={decisionOracle.options}
            oracleGuessLabel={decisionOracle.guessLabel}
            onOracleGuess={decisionOracle.onGuess}
            onDialogueActivate={isGuestSpectator ? () => undefined : handleDialogueActivate}
            onChoose={handleChoose}
            onChooseAi={isGuestSpectator ? undefined : handleChooseAi}
            onAdvanceAi={isGuestSpectator ? undefined : advanceAi}
            onRequestAuth={isGuestSpectator ? undefined : requestAiAuth}
          />
        ) : null}

        <DialogueHistoryDrawer open={historyOpen} entries={historyEntries} onClose={closeHistory} />

        <ChapterEndCard
          open={decisionEnding.endCardOpen}
          storyId={storyId}
          dignity={frame.dignity}
          impulse={frame.impulse}
          sessionStatsPicks={sessionStatsPicks}
          displayNames={displayNames}
          characterBindings={characterBindings}
          allowAiEnding={decisionEnding.allowAiEnding}
          draftEnd={decisionEnding.draftEnd}
          onRareEcho={onRareEcho}
          onReverseCurrent={onReverseCurrent}
          onOracleHit={onOracleHit}
          path={decisionEnding.path}
          onReplay={replayFromEndCard}
          onTitle={onOpenTitle}
        />
      </section>
    </div>
  );
}
