import { CoPlayBanner } from "../coplay/CoPlayBanner";
import { CursorOverlay } from "../coplay/CursorOverlay";
import { RpsDuelOverlay } from "../coplay/RpsDuelOverlay";
import { useLocale } from "../i18n";
import { StoryInteractionHost } from "../interactions/StoryInteractionHost";
import { DEFAULT_DISPLAY_NAMES } from "../persistence/displayNames";
import { EMPTY_PORTRAIT_PACK } from "../persistence/portraitPack";
import { getStoryDefinition, getStoryScene } from "../story/storyMapAdapter";
import { ChapterEndCard } from "./ChapterEndCard";
import { CharacterStudioScreen } from "./CharacterStudioScreen";
import { CutscenePlayer } from "./CutscenePlayer";
import { DialogueHistoryDrawer } from "./play/DialogueHistoryDrawer";
import { DialoguePanel } from "./play/DialoguePanel";
import { usePlayStageRuntime } from "./play/experience/usePlayStageRuntime";
import { usePlaySurfaceAudio } from "./play/experience/usePlaySurfaceAudio";
import { usePlaySurfaceChrome } from "./play/experience/usePlaySurfaceChrome";
import { pendingRobotSlotsForScene } from "./play/lib/pendingRobotSlots";
import { PlayHud } from "./play/PlayHud";
import { PortraitStage } from "./play/PortraitStage";
import { PropCutIn } from "./play/PropCutIn";
import type { VisualNovelPrototypeProps } from "./VisualNovelPrototype.props";

/** Play stage composition only — narrative/decision/media/chrome live under views/play/. */
export function VisualNovelPrototype(props: VisualNovelPrototypeProps) {
  const {
    storyId,
    snapshot,
    autoPlay,
    masterMuted,
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
  } = props;
  const { locale, t } = useLocale();
  const pendingRobotSlots = pendingRobotSlotsForScene(storyId, snapshot.sceneId, characterBindings);
  const storyLabel = getStoryDefinition(storyId).labels[locale === "zh-CN" ? "zh-CN" : "en"];
  const playerMode = getStoryDefinition(storyId).role === "production";
  const debugToolsAvailable =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get("debug") === "1";
  const currentScene = getStoryScene(storyId, snapshot.sceneId);

  const chrome = usePlaySurfaceChrome({
    playerMode,
    debugToolsAvailable,
    activeSaveSlot,
    onSave,
  });
  const audio = usePlaySurfaceAudio({
    autoPlay,
    masterMuted,
    onAutoPlayChange,
    onMasterMutedChange,
  });
  const r = usePlayStageRuntime({
    storyId,
    snapshot,
    textSpeed: props.textSpeed,
    masterMuted,
    voiceVolume: props.voiceVolume,
    dialogueVoiceGuard: props.dialogueVoiceGuard,
    dialogueVoiceRunKey: props.dialogueVoiceRunKey,
    displayNames,
    portraitPack,
    characterBindings,
    coPlay,
    onRpsResolvedAchievement: props.onRpsResolvedAchievement,
    onCustomPackCgSkipped: props.onCustomPackCgSkipped,
    onChoose,
    onJumpTo,
    onReset,
    onOpenSettings,
    onAiBranchUsed: props.onAiBranchUsed,
    onChapterClear: props.onChapterClear,
    onBedHeard: props.onBedHeard,
    localAutoPlay: audio.localAutoPlay,
    ensureAudioUnlocked: audio.ensureAudioUnlocked,
    systemOpen: chrome.systemOpen,
    historyOpen: chrome.historyOpen,
    closeHistory: chrome.closeHistory,
    closeSystem: chrome.closeSystem,
    closeChromeForReset: chrome.closeChromeForReset,
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
    <div className="game-viewport" data-testid="game-viewport" ref={r.stageRootRef}>
      <section
        className={`vn-stage${r.sceneFlash ? " is-scene-enter" : ""}`}
        aria-labelledby="prototype-title"
        data-background={r.presentation.backgroundKey}
        data-mood={r.activeAiBeat?.mood ?? r.presentation.mood}
        data-has-art={r.hasArt ? "true" : "false"}
        data-has-portrait={r.portraits.length > 0 ? "true" : "false"}
        data-player-mode={playerMode ? "true" : "false"}
        data-autoplay={audio.localAutoPlay ? "true" : "false"}
        data-ai-branch={r.frame.aiPlaying ? "true" : "false"}
        data-story-interaction={r.activeStoryInteraction?.definition.id ?? "none"}
        data-motion={r.activeAiBeat ? "none" : (currentScene?.stageMotion ?? "none")}
        data-coplay={coPlay ? coPlay.role : "off"}
        data-prop-cutin={r.propCutIn.requested ? (r.propCutIn.definition?.id ?? "pending") : "none"}
        data-testid="vn-stage"
        tabIndex={-1}
        data-pointer-mode={r.pointerMode}
        onPointerMove={coPlay ? r.handleStagePointer : undefined}
        onPointerDown={coPlay ? r.handleStageTouchFocus : undefined}
      >
        {r.artUrl && !r.isGuestSpectator ? (
          <div
            className="vn-stage-art"
            aria-hidden="true"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(4, 5, 8, 0.18) 0%, rgba(4, 5, 8, 0.35) 42%, rgba(4, 5, 8, 0.78) 100%), url(${r.artUrl})`,
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

        {coPlay && r.showRemoteCursors ? <CursorOverlay cursors={coPlay.remoteCursors} /> : null}

        {coPlay?.rpsView ? (
          <RpsDuelOverlay
            duel={coPlay.rpsView}
            role={coPlay.role}
            globalLean={r.decisionRps.globalLean}
            onThrow={(value) => coPlay.publishRpsThrow(value)}
            onGlobalReferee={r.decisionRps.onGlobalReferee}
          />
        ) : null}

        {r.activeCutscene && !r.isGuestSpectator ? (
          <CutscenePlayer
            videoKey={r.activeCutscene.key}
            url={r.activeCutscene.url}
            title={r.activeCutscene.title}
            onDismiss={r.dismissCutscene}
          />
        ) : null}

        {r.propCutInVisible && r.propCutIn.definition ? (
          <PropCutIn
            definition={r.propCutIn.definition}
            onDismiss={r.propCutIn.dismiss}
            onRestoreFocus={r.restorePropCutInFocus}
          />
        ) : null}

        {!r.isGuestSpectator ? (
          <PlayHud
            playerMode={playerMode}
            autoPlay={audio.localAutoPlay}
            showComedyMeters={r.showComedyMeters}
            mianzi={r.frame.mianzi}
            ai_score={r.frame.ai_score}
            saveFlash={chrome.saveFlash}
            showDevTools={chrome.showDevTools}
            storyId={storyId}
            storyLabel={storyLabel}
            nowPlayingBedId={audio.nowPlayingBedId}
            isFullscreen={r.isFullscreen}
            muted={masterMuted}
            systemOpen={chrome.systemOpen}
            activeSaveSlot={activeSaveSlot}
            onStoryChange={onStoryChange}
            onToggleFullscreen={() => void r.toggleFullscreen()}
            onToggleMute={audio.handleMuteToggle}
            onOpenHistory={chrome.openHistory}
            onToggleSystem={chrome.toggleSystem}
            onSave={chrome.handleSave}
            onToggleAutoPlay={audio.toggleAutoPlay}
            onReset={r.handleReset}
            onOpenGallery={onOpenGallery}
            onOpenSettings={onOpenSettings}
            onOpenHelp={onOpenHelp}
            onOpenAchievements={onOpenAchievements}
            onOpenTitle={onOpenTitle}
            onToggleDevTools={chrome.toggleDevTools}
            onOpenPlayerPath={onOpenPlayerPath}
            onOpenCreatorMap={onOpenCreatorMap}
          />
        ) : (
          <div className="coplay-guest-hud">
            <span>
              {t("play.spectator")} · {r.frame.mianzi}/{r.frame.ai_score}
            </span>
            <button type="button" className="coplay-banner-leave" onClick={onOpenTitle}>
              {t("play.title")}
            </button>
          </div>
        )}

        {!r.isGuestSpectator &&
        r.propCutIn.definition &&
        r.propCutIn.seen &&
        !r.propCutIn.requested &&
        !r.higherPriorityPropSurfaceOpen ? (
          <button
            ref={r.propReopenRef}
            type="button"
            className="prop-cutin-reopen"
            data-testid="prop-cutin-reopen"
            onClick={r.propCutIn.reopen}
          >
            {t("propCutIn.reopen")}
          </button>
        ) : null}

        {!r.isGuestSpectator ? (
          <PortraitStage
            portraits={r.portraits}
            hasArt={r.hasArt}
            mood={r.activeAiBeat?.mood ?? r.presentation.mood}
          />
        ) : null}

        {r.activeStoryInteraction && !r.propCutIn.requested ? (
          <StoryInteractionHost
            active={r.activeStoryInteraction}
            snapshot={snapshot}
            paused={
              chrome.historyOpen ||
              chrome.systemOpen ||
              Boolean(r.activeCutscene) ||
              r.propCutIn.requested
            }
            onChoose={r.handleChoose}
          />
        ) : null}

        {!r.activeStoryInteraction && !r.decisionEnding.dialogueYieldsToEnding ? (
          <DialoguePanel
            speaker={r.frame.displaySpeaker}
            sceneId={r.isGuestSpectator ? r.frame.remoteSceneId : snapshot.sceneId}
            visibleText={r.isGuestSpectator ? r.frame.displayText : r.frame.visibleText}
            isComplete={r.frame.dialogueComplete}
            choices={
              r.isGuestSpectator
                ? r.frame.choices.map((c) => ({
                    index: c.index,
                    text: c.text,
                    choiceId: c.choiceId ?? null,
                  }))
                : snapshot.choices
            }
            seenChoiceLabels={r.seenLabels}
            aiSlot={r.isGuestSpectator ? undefined : r.frame.aiSlot}
            aiMode={r.isGuestSpectator ? Boolean(r.frame.panelAiMode) : r.frame.aiPlaying}
            dialogueVoiceButton={
              r.isGuestSpectator
                ? undefined
                : {
                    visible: r.frame.dialogueVoiceButton.visible,
                    disabled: r.frame.dialogueVoiceButton.disabled,
                    tooltip: r.frame.dialogueVoiceButton.tooltipKey
                      ? t(r.frame.dialogueVoiceButton.tooltipKey)
                      : null,
                  }
            }
            oracleOptions={r.decisionOracle.options}
            oracleGuessLabel={r.decisionOracle.guessLabel}
            onOracleGuess={r.decisionOracle.onGuess}
            onDialogueActivate={r.isGuestSpectator ? () => undefined : r.handleDialogueActivate}
            onChoose={r.handleChoose}
            onChooseAi={r.isGuestSpectator ? undefined : r.handleChooseAi}
            onAdvanceAi={r.isGuestSpectator ? undefined : r.advanceAi}
            onRequestAuth={r.isGuestSpectator ? undefined : r.requestAiAuth}
          />
        ) : null}

        <DialogueHistoryDrawer
          open={chrome.historyOpen}
          entries={r.historyEntries}
          onClose={chrome.closeHistory}
        />

        <ChapterEndCard
          open={r.decisionEnding.endCardOpen}
          storyId={storyId}
          mianzi={r.frame.mianzi}
          ai_score={r.frame.ai_score}
          sessionStatsPicks={r.sessionStatsPicks}
          displayNames={displayNames}
          characterBindings={characterBindings}
          allowAiEnding={r.decisionEnding.allowAiEnding}
          draftEnd={r.decisionEnding.draftEnd}
          onRareEcho={onRareEcho}
          onReverseCurrent={onReverseCurrent}
          onOracleHit={onOracleHit}
          path={r.decisionEnding.path}
          onReplay={r.replayFromEndCard}
          onTitle={onOpenTitle}
        />
      </section>
    </div>
  );
}
