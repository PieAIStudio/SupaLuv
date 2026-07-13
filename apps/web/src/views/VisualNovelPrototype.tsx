import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import { CoPlayBanner } from "../coplay/CoPlayBanner";
import { CursorOverlay } from "../coplay/CursorOverlay";
import { RpsDuelOverlay } from "../coplay/RpsDuelOverlay";
import type { CoPlaySessionApi } from "../coplay/useCoPlaySession";
import { shouldShowRemoteCursors } from "../coplay/pointerPolicy";
import { useAuth } from "../auth/AuthContext";
import { useFullscreen } from "../hooks/useFullscreen";
import { useGameAudioSettings } from "../hooks/useGameAudioSettings";
import { usePlayInput } from "../hooks/usePlayInput";
import { usePointerPresenceMode } from "../hooks/usePointerPresenceMode";
import { useRpsGlobalLean } from "../hooks/useRpsGlobalLean";
import { EmotionCalibrationInteraction } from "../interactions/EmotionCalibrationInteraction";
import { resolveStoryInteraction } from "../interactions/storyInteractionRegistry";
import type { ManualSlotId } from "../persistence/gameSave";
import { DEFAULT_DISPLAY_NAMES, type DisplayNameMap } from "../persistence/displayNames";
import { EMPTY_PORTRAIT_PACK, type PortraitPackState } from "../persistence/portraitPack";
import type { GameSettings } from "../persistence/settings";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  getChapterCheckpoint,
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
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { CharacterStudioScreen, type CharacterStudioSlot } from "./CharacterStudioScreen";
import { mapPortraitsForPlayer } from "./play/stagePresentation";
import { getScenePathMemory } from "../persistence/pathMemory";
import { findDecision } from "../stats/choiceStatsCatalog";
import type { SessionChoicePick } from "../stats/choiceStatsClient";
import { clearOracleGuesses, getOracleGuess, setOracleGuess } from "../stats/oracleMemory";
import { useCoPlayPointers } from "./play/useCoPlayPointers";
import { useNarrativePlayback } from "./play/experience/useNarrativePlayback";
import { useNarrativeSource } from "./play/experience/useNarrativeSource";
import { usePlayChoiceFlow } from "./play/usePlayChoiceFlow";
import { useStageMedia } from "./play/useStageMedia";
import { isContinueOnly, storyHasComedyMeters } from "./play/vnHelpers";

interface VisualNovelPrototypeProps {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly textSpeed: GameSettings["textSpeed"];
  readonly autoPlay: boolean;
  readonly masterMuted: boolean;
  readonly musicVolume: number;
  readonly ambientVolume: number;
  readonly sfxVolume: number;
  readonly voiceVolume: number;
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
  readonly onOpenMap: () => void;
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
  musicVolume,
  ambientVolume,
  sfxVolume,
  voiceVolume,
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
  onOpenMap,
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
  const currentScene = getStoryScene(storyId, snapshot.sceneId);
  const pendingRobotSlots = (currentScene?.characterSlotLock?.slotIds ?? [])
    .filter((slotId) => !characterBindings[slotId])
    .map<CharacterStudioSlot>((slotId) =>
      slotId === "robot_aila"
        ? {
            id: slotId,
            name: "艾拉",
            role: "女款机器人",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          }
        : {
            id: slotId,
            name: "凯",
            role: "男款机器人",
            kind: "robot",
            official: "/assets/portraits/demo-ui.png",
          },
    );
  const presentation = getStoryPresentation(storyId, snapshot.sceneId);
  const storyLabel = getStoryDefinition(storyId).label;
  const playerMode = getStoryDefinition(storyId).role === "production";
  const debugToolsAvailable =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("debug") === "1";

  const [showDevTools, setShowDevTools] = useState(!playerMode || debugToolsAvailable);
  const [saveFlash, setSaveFlash] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [localAutoPlay, setLocalAutoPlay] = useState(autoPlay);
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRootRef);
  const usedAiBranchRef = useRef(false);
  const chapterClearReportedRef = useRef(false);
  /** Stats-visible picks this run (chapter-end global echo). */
  const sessionStatsPicksRef = useRef<SessionChoicePick[]>([]);
  const [sessionStatsPicks, setSessionStatsPicks] = useState<SessionChoicePick[]>([]);
  /** Bump to re-render after in-memory oracle guess writes. */
  const [oracleTick, setOracleTick] = useState(0);
  const [nowPlayingBedId, setNowPlayingBedId] = useState<string | null>(() =>
    gameAudio.getNowPlayingKey(),
  );

  useEffect(() => gameAudio.onNowPlayingChange(setNowPlayingBedId), []);

  const isGuestSpectator = coPlay?.role === "guest";
  const remoteStory = coPlay?.remoteStory ?? null;
  const activeStoryInteraction = !isGuestSpectator ? resolveStoryInteraction(snapshot) : null;

  const ensureAudioUnlocked = useCallback(() => {
    gameAudio.unlock();
  }, []);

  const handleAiBranchUsed = useCallback(() => {
    usedAiBranchRef.current = true;
    onAiBranchUsed?.();
  }, [onAiBranchUsed]);

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
      activeCutscene: Boolean(activeCutscene),
      hasStoryInteraction: Boolean(activeStoryInteraction),
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
      onAiBranchUsed: handleAiBranchUsed,
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
    setLocalAutoPlay(autoPlay);
  }, [autoPlay]);

  useGameAudioSettings({
    masterMuted,
    musicVolume,
    ambientVolume,
    sfxVolume,
    voiceVolume,
  });

  const rpsOpen = coPlay?.rpsDuel?.open ?? null;
  const { lean: rpsGlobalLean, refereePick } = useRpsGlobalLean({
    enabled: Boolean(rpsOpen && coPlay?.role === "host"),
    storyId,
    sceneId: rpsOpen?.sceneId ?? null,
    hostLabel: rpsOpen?.hostChoiceText ?? "",
    guestLabel: rpsOpen?.guestChoiceText ?? "",
    hostIndex: rpsOpen?.hostChoiceIndex ?? 0,
    guestIndex: rpsOpen?.guestChoiceIndex ?? 0,
  });

  const oracleDecision =
    !isGuestSpectator && snapshot.sceneId ? findDecision(storyId, snapshot.sceneId) : null;
  const oracleOptions = useMemo(
    () =>
      oracleDecision
        ? oracleDecision.options.map((o) => ({
            choiceId: o.choiceId,
            shortLabel: o.shortLabel,
            matchLabel: o.match,
          }))
        : [],
    [oracleDecision],
  );
  // oracleTick forces re-read after setOracleGuess (module memory, not React state).
  const oracleGuessLabel = oracleDecision
    ? (getOracleGuess(oracleDecision.decisionId)?.predictedLabel ?? null)
    : null;
  void oracleTick;

  useEffect(() => {
    // Production stories hide tools by default; ?debug=1 keeps them available.
    setShowDevTools(!playerMode || debugToolsAvailable);
  }, [playerMode, debugToolsAvailable]);

  useEffect(() => {
    if (!systemOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".system-menu-wrap")) {
        return;
      }
      setSystemOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [systemOpen]);

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

  const { handleChoose } = usePlayChoiceFlow({
    storyId,
    snapshot,
    coPlay,
    isGuestSpectator,
    guestChoices: frame.choices,
    remoteSceneId: frame.remoteSceneId,
    sessionStatsPicksRef,
    setSessionStatsPicks,
    recordPlayerChoice,
    onChoose,
    cancelAi,
    ensureAudioUnlocked,
    onRpsResolvedAchievement,
  });

  const pointerMode = usePointerPresenceMode();
  const showRemoteCursors = shouldShowRemoteCursors(pointerMode);
  const { handleStagePointer, handleStageTouchFocus } = useCoPlayPointers({
    coPlay,
    pointerMode,
  });

  const seenChoiceLabels = snapshot.sceneId ? getScenePathMemory(storyId, snapshot.sceneId) : [];

  const handleMuteToggle = useCallback(() => {
    const next = !masterMuted;
    gameAudio.setMuted(next);
    onMasterMutedChange?.(next);
    ensureAudioUnlocked();
  }, [ensureAudioUnlocked, masterMuted, onMasterMutedChange]);

  const handleReset = useCallback(() => {
    resetMediaMemory();
    resetNarrative();
    clearOracleGuesses();
    setActiveCutscene(null);
    setSystemOpen(false);
    onReset();
  }, [onReset, resetMediaMemory, resetNarrative, setActiveCutscene]);

  const handleSave = useCallback(
    (slotId?: ManualSlotId) => {
      onSave(slotId ?? activeSaveSlot);
      setSaveFlash(true);
      setSystemOpen(false);
      window.setTimeout(() => setSaveFlash(false), 1400);
      gameAudio.playSfx("notify-soft", 0.4);
    },
    [activeSaveSlot, onSave],
  );

  const toggleAutoPlay = useCallback(() => {
    const next = !localAutoPlay;
    setLocalAutoPlay(next);
    onAutoPlayChange?.(next);
  }, [localAutoPlay, onAutoPlayChange]);

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
      setHistoryOpen(false);
      return;
    }
    if (systemOpen) {
      setSystemOpen(false);
      return;
    }
    if (activeCutscene) {
      dismissCutscene();
    }
  }, [activeCutscene, dismissCutscene, historyOpen, systemOpen]);

  const checkpoint = getChapterCheckpoint(storyId);
  const isInterChapter = checkpoint.kind === "next_chapter";
  const chapterEnded = snapshot.isEnded && frame.typewriterComplete && !frame.aiPlaying;
  /** Draft package chapter 1 auto-advances; only terminal draft_end / ai_ending show the end card. */
  const showChapterEndCard = chapterEnded && !isInterChapter;

  useEffect(() => {
    if (isGuestSpectator || !chapterEnded || chapterClearReportedRef.current) {
      return;
    }
    chapterClearReportedRef.current = true;
    onChapterClear?.({
      usedAiBranch: usedAiBranchRef.current,
      pathHint: usedAiBranchRef.current
        ? "本局走过 AI 灵感旁支，并汇合作者主线。"
        : "本局仅走作者预写选项。",
    });
  }, [chapterEnded, isGuestSpectator, onChapterClear]);

  usePlayInput({
    enabled:
      !isGuestSpectator && !activeStoryInteraction && (!chapterEnded || Boolean(activeCutscene)),
    isComplete: Boolean(activeCutscene) || frame.typewriterComplete,
    canContinue:
      Boolean(activeCutscene) || frame.aiPlaying || (!frame.aiPlaying && isContinueOnly(snapshot)),
    overlaysOpen: historyOpen || systemOpen,
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
        data-testid="vn-stage"
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
            globalLean={coPlay.role === "host" ? rpsGlobalLean : null}
            onThrow={(value) => coPlay.publishRpsThrow(value)}
            onGlobalReferee={
              coPlay.role === "host" && refereePick
                ? () => {
                    coPlay.resolveRpsWithGlobal(refereePick.index, refereePick.note);
                    gameAudio.playSfx("notify-soft", 0.5);
                  }
                : undefined
            }
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
            onOpenHistory={() => {
              setSystemOpen(false);
              setHistoryOpen(true);
            }}
            onToggleSystem={() => setSystemOpen((value) => !value)}
            onSave={handleSave}
            onToggleAutoPlay={toggleAutoPlay}
            onReset={handleReset}
            onOpenGallery={onOpenGallery}
            onOpenSettings={onOpenSettings}
            onOpenHelp={onOpenHelp}
            onOpenAchievements={onOpenAchievements}
            onOpenTitle={onOpenTitle}
            onToggleDevTools={
              debugToolsAvailable ? () => setShowDevTools((value) => !value) : undefined
            }
            onOpenMap={onOpenMap}
          />
        ) : (
          <div className="coplay-guest-hud">
            <span>
              围观中 · {frame.dignity}/{frame.impulse}
            </span>
            <button type="button" className="coplay-banner-leave" onClick={onOpenTitle}>
              回标题
            </button>
          </div>
        )}

        {!isGuestSpectator ? (
          <PortraitStage
            portraits={portraits}
            hasArt={hasArt}
            mood={activeAiBeat?.mood ?? presentation.mood}
          />
        ) : null}

        {activeStoryInteraction ? (
          <EmotionCalibrationInteraction
            key={`${activeStoryInteraction.definition.id}-${activeStoryInteraction.stepIndex}`}
            active={activeStoryInteraction}
            snapshot={snapshot}
            paused={historyOpen || systemOpen || Boolean(activeCutscene)}
            onChoose={handleChoose}
          />
        ) : null}

        {!activeStoryInteraction && !(isGuestSpectator ? frame.remoteIsEnded : chapterEnded) ? (
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
            seenChoiceLabels={isGuestSpectator ? [] : seenChoiceLabels}
            aiSlot={isGuestSpectator ? undefined : frame.aiSlot}
            aiMode={isGuestSpectator ? Boolean(frame.panelAiMode) : frame.aiPlaying}
            oracleOptions={isGuestSpectator ? [] : oracleOptions}
            oracleGuessLabel={isGuestSpectator ? null : oracleGuessLabel}
            onOracleGuess={
              isGuestSpectator || !oracleDecision
                ? undefined
                : (option) => {
                    setOracleGuess({
                      decisionId: oracleDecision.decisionId,
                      predictedChoiceId: option.choiceId,
                      predictedLabel: option.shortLabel,
                      sceneId: oracleDecision.sceneId,
                    });
                    setOracleTick((n) => n + 1);
                    gameAudio.playSfx("ui-click", 0.35);
                  }
            }
            onDialogueActivate={isGuestSpectator ? () => undefined : handleDialogueActivate}
            onChoose={handleChoose}
            onChooseAi={isGuestSpectator ? undefined : chooseAi}
            onAdvanceAi={isGuestSpectator ? undefined : advanceAi}
            onRequestAuth={isGuestSpectator ? undefined : requestAiAuth}
          />
        ) : null}

        <DialogueHistoryDrawer
          open={historyOpen}
          entries={historyEntries}
          onClose={() => setHistoryOpen(false)}
        />

        <ChapterEndCard
          open={isGuestSpectator ? frame.remoteIsEnded && !isInterChapter : showChapterEndCard}
          storyId={storyId}
          dignity={frame.dignity}
          impulse={frame.impulse}
          sessionStatsPicks={isGuestSpectator ? [] : sessionStatsPicks}
          displayNames={displayNames}
          characterBindings={characterBindings}
          allowAiEnding={checkpoint.kind === "ai_ending_allowed"}
          draftEnd={checkpoint.kind === "draft_end"}
          onRareEcho={onRareEcho}
          onReverseCurrent={onReverseCurrent}
          onOracleHit={onOracleHit}
          path={{
            usedAiBranch: usedAiBranchRef.current,
            pathHint: usedAiBranchRef.current
              ? "本局走过 AI 灵感旁支，并汇合作者主线。"
              : "本局仅走作者预写选项。",
          }}
          onReplay={() => {
            if (isGuestSpectator) {
              return;
            }
            ensureAudioUnlocked();
            usedAiBranchRef.current = false;
            chapterClearReportedRef.current = false;
            sessionStatsPicksRef.current = [];
            setSessionStatsPicks([]);
            handleReset();
          }}
          onTitle={onOpenTitle}
        />
      </section>
    </div>
  );
}
