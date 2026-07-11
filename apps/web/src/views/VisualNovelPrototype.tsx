import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import { CoPlayBanner } from "../coplay/CoPlayBanner";
import { CursorOverlay } from "../coplay/CursorOverlay";
import { RpsDuelOverlay } from "../coplay/RpsDuelOverlay";
import type { CoPlaySessionApi } from "../coplay/useCoPlaySession";
import { shouldShowRemoteCursors } from "../coplay/pointerPolicy";
import { useAuth } from "../auth/AuthContext";
import { useAiBranchSlot } from "../hooks/useAiBranchSlot";
import { useDialogueLog } from "../hooks/useDialogueLog";
import { useDialogueVoice } from "../hooks/useDialogueVoice";
import { useFullscreen } from "../hooks/useFullscreen";
import { useGameAudioSettings } from "../hooks/useGameAudioSettings";
import { useHostCoPlayMirror } from "../hooks/useHostCoPlayMirror";
import { usePlayInput } from "../hooks/usePlayInput";
import { usePointerPresenceMode } from "../hooks/usePointerPresenceMode";
import { useRpsGlobalLean } from "../hooks/useRpsGlobalLean";
import { useTypewriter } from "../hooks/useTypewriter";
import type { ManualSlotId } from "../persistence/gameSave";
import { DEFAULT_DISPLAY_NAMES, type DisplayNameMap } from "../persistence/displayNames";
import { EMPTY_PORTRAIT_PACK, type PortraitPackState } from "../persistence/portraitPack";
import { textSpeedToTypewriter, type GameSettings } from "../persistence/settings";
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
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { CharacterStudioScreen, type CharacterStudioSlot } from "./CharacterStudioScreen";
import { mapDialogueForPlayer, mapPortraitsForPlayer } from "./play/stagePresentation";
import { getScenePathMemory } from "../persistence/pathMemory";
import { findDecision } from "../stats/choiceStatsCatalog";
import type { SessionChoicePick } from "../stats/choiceStatsClient";
import { clearOracleGuesses, getOracleGuess, setOracleGuess } from "../stats/oracleMemory";
import { useCoPlayPointers } from "./play/useCoPlayPointers";
import { usePlayChoiceFlow } from "./play/usePlayChoiceFlow";
import { useStageMedia } from "./play/useStageMedia";
import { clampMeter, isContinueOnly, storyHasComedyMeters } from "./play/vnHelpers";

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
  const playerMode = storyId === "ch01";
  const debugToolsAvailable =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("debug") === "1";
  const typewriterOpts = textSpeedToTypewriter(textSpeed);

  const [showDevTools, setShowDevTools] = useState(!playerMode);
  const [saveFlash, setSaveFlash] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [localAutoPlay, setLocalAutoPlay] = useState(autoPlay);
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(stageRootRef);
  const loggedSceneRef = useRef<string | null>(null);
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

  const {
    entries: historyEntries,
    append: appendHistory,
    clear: clearHistory,
  } = useDialogueLog(storyId);

  const authoredLabels = useMemo(
    () => snapshot.choices.map((choice) => choice.text),
    [snapshot.choices],
  );

  const {
    slot: aiSlot,
    beginPlaying,
    advanceBeat,
    cancel: cancelAi,
  } = useAiBranchSlot({
    enabled: Boolean(currentScene?.aiBranch?.enabled) && !snapshot.isEnded,
    isSignedIn: auth.isSignedIn,
    accessToken: auth.session?.access_token ?? null,
    batteries: auth.batteries,
    storyId,
    sceneId: snapshot.sceneId,
    config: currentScene?.aiBranch,
    authoredChoiceLabels: authoredLabels,
    meters: snapshot.meters,
    locale: "zh-CN",
  });

  const aiPlaying = aiSlot.status === "playing";
  const activeAiBeat =
    aiPlaying && aiSlot.result.beats[aiSlot.beatIndex]
      ? aiSlot.result.beats[aiSlot.beatIndex]
      : null;

  const isGuestSpectator = coPlay?.role === "guest";
  const remoteStory = coPlay?.remoteStory ?? null;

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
    aiPlaying,
    isGuestSpectator,
    onCustomPackCgSkipped,
    onBedHeard,
  });

  const rawDisplayText = isGuestSpectator
    ? (remoteStory?.text ?? "等待房主开始游玩…（在另一标签页用同一房间码进入同玩）")
    : (activeAiBeat?.text ?? snapshot.text);
  const rawDisplaySpeaker = isGuestSpectator
    ? (remoteStory?.speaker ?? "同玩")
    : (activeAiBeat?.speaker ?? presentation.speaker);

  const voiceLineKey = isGuestSpectator
    ? `guest:${remoteStory?.sceneId ?? ""}:${remoteStory?.text?.slice(0, 24) ?? ""}`
    : aiPlaying
      ? `ai:${snapshot.sceneId}:${aiSlot.status === "playing" ? aiSlot.beatIndex : 0}`
      : `ink:${snapshot.sceneId}:${snapshot.text.slice(0, 24)}`;

  const { text: displayText, speaker: displaySpeaker } = mapDialogueForPlayer(
    rawDisplaySpeaker,
    rawDisplayText,
    displayNames,
  );

  useDialogueVoice({
    enabled: !isGuestSpectator && !activeCutscene && Boolean(rawDisplayText.trim()),
    isSignedIn: auth.isSignedIn,
    accessToken: auth.session?.access_token ?? null,
    text: isGuestSpectator ? "" : rawDisplayText,
    speaker: isGuestSpectator ? "" : rawDisplaySpeaker,
    language: "zh-CN",
    emotion: activeAiBeat?.mood,
    lineKey: voiceLineKey,
  });
  const displaySceneTitle = isGuestSpectator
    ? remoteStory?.sceneTitle || "同玩围观"
    : aiPlaying
      ? `${currentScene?.title ?? "旁支"} · AI`
      : (currentScene?.title ?? "场景");

  const guestChoices = useMemo(
    () => (isGuestSpectator ? (remoteStory?.choices ?? []) : snapshot.choices),
    [isGuestSpectator, remoteStory?.choices, snapshot.choices],
  );
  const panelIsComplete = isGuestSpectator ? Boolean(remoteStory?.isComplete) : undefined;
  const panelAiMode = isGuestSpectator ? Boolean(remoteStory?.aiMode) : undefined;

  const { visibleText, isComplete, revealAll } = useTypewriter({
    text: displayText,
    enabled: !isGuestSpectator || Boolean(remoteStory),
    ...typewriterOpts,
  });

  const dialogueComplete = isGuestSpectator ? (panelIsComplete ?? isComplete) : isComplete;

  const dignity = clampMeter(
    isGuestSpectator ? (remoteStory?.dignity ?? 50) : snapshot.meters.dignity,
  );
  const impulse = clampMeter(
    isGuestSpectator ? (remoteStory?.impulse ?? 50) : snapshot.meters.impulse,
  );
  const showComedyMeters = storyHasComedyMeters(storyId);

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

  useHostCoPlayMirror({
    coPlay,
    snapshot,
    sceneTitle: displaySceneTitle,
    speaker: rawDisplaySpeaker,
    text: rawDisplayText,
    isComplete,
    aiMode: aiPlaying,
  });

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
    setShowDevTools(!playerMode);
  }, [playerMode]);

  useEffect(() => {
    if (!isComplete || !displayText) {
      return;
    }
    const stamp = aiPlaying
      ? `ai:${snapshot.sceneId}:${aiSlot.status === "playing" ? aiSlot.beatIndex : 0}:${displayText}`
      : `${snapshot.sceneId}:${displayText}`;
    if (loggedSceneRef.current === stamp) {
      return;
    }
    loggedSceneRef.current = stamp;
    if (isGuestSpectator) {
      return;
    }
    appendHistory({
      speaker: displaySpeaker,
      meta: aiPlaying ? "AI 旁支" : (currentScene?.title ?? snapshot.sceneId ?? ""),
      text: displayText,
      kind: aiPlaying ? "mystery" : displaySpeaker === "旁白" ? "system" : "human",
    });
  }, [
    aiPlaying,
    aiSlot,
    appendHistory,
    currentScene?.title,
    displaySpeaker,
    displayText,
    isComplete,
    isGuestSpectator,
    snapshot.sceneId,
  ]);

  useEffect(() => {
    if (
      isGuestSpectator ||
      aiPlaying ||
      !localAutoPlay ||
      !isComplete ||
      activeCutscene ||
      snapshot.isEnded
    ) {
      return;
    }
    if (!isContinueOnly(snapshot)) {
      return;
    }
    const delay = textSpeed === "fast" ? 700 : textSpeed === "slow" ? 1600 : 1100;
    const timer = window.setTimeout(() => {
      onChoose(0);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    activeCutscene,
    aiPlaying,
    isComplete,
    isGuestSpectator,
    localAutoPlay,
    onChoose,
    snapshot,
    textSpeed,
  ]);

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

  const ensureAudioUnlocked = useCallback(() => {
    gameAudio.unlock();
  }, []);

  const dismissCutscene = useCallback(() => {
    ensureAudioUnlocked();
    setActiveCutscene(null);
    gameAudio.playSfx("ui-click", 0.4);
    gameAudio.resumeBedsAfterCutscene();
  }, [ensureAudioUnlocked, setActiveCutscene]);

  const handleDialogueActivate = useCallback(() => {
    ensureAudioUnlocked();
    if (!isComplete) {
      revealAll();
      gameAudio.playSfx("ui-click", 0.35);
    }
  }, [ensureAudioUnlocked, isComplete, revealAll]);

  const { handleChoose } = usePlayChoiceFlow({
    storyId,
    snapshot,
    coPlay,
    isGuestSpectator,
    guestChoices,
    remoteSceneId: remoteStory?.sceneId ?? null,
    sessionStatsPicksRef,
    setSessionStatsPicks,
    appendHistory,
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

  const handleChooseAi = useCallback(() => {
    if (aiSlot.status !== "ready") {
      return;
    }
    ensureAudioUnlocked();
    usedAiBranchRef.current = true;
    onAiBranchUsed?.();
    appendHistory({
      speaker: "你",
      meta: "AI 选择",
      text: aiSlot.result.choiceLabel,
      kind: "mystery",
    });
    gameAudio.playSfx("ui-choice", 0.5);
    beginPlaying(aiSlot.result);
  }, [aiSlot, appendHistory, beginPlaying, ensureAudioUnlocked, onAiBranchUsed]);

  const handleAdvanceAi = useCallback(() => {
    ensureAudioUnlocked();
    if (!isComplete) {
      revealAll();
      return;
    }
    const step = advanceBeat();
    if (!step) {
      return;
    }
    if (step.done) {
      gameAudio.playSfx("notify-soft", 0.4);
      onJumpTo(step.rejoinSceneId);
    } else {
      gameAudio.playSfx("ui-click", 0.3);
    }
  }, [advanceBeat, ensureAudioUnlocked, isComplete, onJumpTo, revealAll]);

  const handleMuteToggle = useCallback(() => {
    const next = !masterMuted;
    gameAudio.setMuted(next);
    onMasterMutedChange?.(next);
    ensureAudioUnlocked();
  }, [ensureAudioUnlocked, masterMuted, onMasterMutedChange]);

  const handleReset = useCallback(() => {
    resetMediaMemory();
    loggedSceneRef.current = null;
    cancelAi();
    clearHistory();
    clearOracleGuesses();
    setActiveCutscene(null);
    setSystemOpen(false);
    onReset();
  }, [cancelAi, clearHistory, onReset, resetMediaMemory, setActiveCutscene]);

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
    if (aiPlaying) {
      handleAdvanceAi();
      return;
    }
    if (snapshot.isEnded || !isContinueOnly(snapshot)) {
      return;
    }
    handleChoose(0);
  }, [activeCutscene, aiPlaying, dismissCutscene, handleAdvanceAi, handleChoose, snapshot]);

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

  const chapterEnded = snapshot.isEnded && isComplete && !aiPlaying;

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
    enabled: !isGuestSpectator && (!chapterEnded || Boolean(activeCutscene)),
    isComplete: Boolean(activeCutscene) || isComplete,
    canContinue: Boolean(activeCutscene) || aiPlaying || (!aiPlaying && isContinueOnly(snapshot)),
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
        data-ai-branch={aiPlaying ? "true" : "false"}
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
            dignity={dignity}
            impulse={impulse}
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
              围观中 · {dignity}/{impulse}
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

        {!(isGuestSpectator ? Boolean(remoteStory?.isEnded) : chapterEnded) ? (
          <DialoguePanel
            sceneTitle={displaySceneTitle}
            speaker={displaySpeaker}
            sceneId={isGuestSpectator ? (remoteStory?.sceneId ?? null) : snapshot.sceneId}
            visibleText={isGuestSpectator ? displayText : visibleText}
            isComplete={dialogueComplete}
            choices={
              isGuestSpectator
                ? guestChoices.map((c) => ({ index: c.index, text: c.text }))
                : snapshot.choices
            }
            seenChoiceLabels={isGuestSpectator ? [] : seenChoiceLabels}
            aiSlot={isGuestSpectator ? undefined : aiSlot}
            aiMode={isGuestSpectator ? Boolean(panelAiMode) : aiPlaying}
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
            onChooseAi={isGuestSpectator ? undefined : handleChooseAi}
            onAdvanceAi={isGuestSpectator ? undefined : handleAdvanceAi}
            onRequestAuth={
              isGuestSpectator
                ? undefined
                : () => {
                    void auth.signInGuest().catch(() => {
                      onOpenSettings();
                    });
                  }
            }
          />
        ) : null}

        <DialogueHistoryDrawer
          open={historyOpen}
          entries={historyEntries}
          onClose={() => setHistoryOpen(false)}
        />

        <ChapterEndCard
          open={isGuestSpectator ? Boolean(remoteStory?.isEnded) : chapterEnded}
          storyId={storyId}
          dignity={dignity}
          impulse={impulse}
          sessionStatsPicks={isGuestSpectator ? [] : sessionStatsPicks}
          displayNames={displayNames}
          characterBindings={characterBindings}
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
