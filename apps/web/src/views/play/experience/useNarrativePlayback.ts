/**
 * Narrative playback phase: typewriter, TTS, host mirror, history, autoplay, commands.
 *
 * Must run after stage media so `activeCutscene` gates TTS/autoplay in the same render.
 * Source/AI slot ownership lives in useNarrativeSource (run before stage media).
 */

import { useCallback, useEffect, useRef } from "react";
import type { GameUiHistoryEntry } from "@pieai/swimmer-ui-kit";
import type { AiBranchBeat, AiChoiceSlotState } from "../../../ai/aiBranchTypes";
import type { DialogueVoicePlaybackGuardApi } from "../../../audio/dialogueVoicePlaybackGuard";
import { gameAudio } from "../../../audio/gameAudio";
import type { CoPlaySessionApi } from "../../../coplay/useCoPlaySession";
import { useDialogueLog } from "../../../hooks/useDialogueLog";
import { useDialogueVoice } from "../../../hooks/useDialogueVoice";
import { useHostCoPlayMirror } from "../../../hooks/useHostCoPlayMirror";
import { useTypewriter } from "../../../hooks/useTypewriter";
import { textSpeedToTypewriter, type GameSettings } from "../../../persistence/settings";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import { useLocale } from "../../../i18n";
import { resolveAutoplayDelayMs, resolveAutoplayEligibility } from "./resolveAutoplay";
import {
  buildDialogueLogStamp,
  resolveAiChoiceHistoryEntry,
  resolvePlayerChoiceHistoryEntry,
  resolveRevealedDialogueEntry,
  shouldConsiderDialogueLog,
} from "./resolveDialogueHistory";
import { resolveDialogueComplete } from "./resolvePlaybackSource";
import type { NarrativeSourceController } from "./useNarrativeSource";

export type NarrativePlayback = {
  readonly frame: {
    readonly displayText: string;
    readonly visibleText: string;
    readonly displaySpeaker: string;
    readonly sceneTitle: string;
    readonly choices: InkStorySnapshot["choices"];
    readonly dialogueComplete: boolean;
    readonly typewriterComplete: boolean;
    readonly aiPlaying: boolean;
    readonly activeAiBeat: AiBranchBeat | null;
    readonly aiSlot: AiChoiceSlotState;
    readonly mianzi: number;
    readonly ai_score: number;
    readonly remoteSceneId: string | null;
    readonly remoteIsEnded: boolean;
    readonly panelAiMode: boolean | undefined;
    /** Dialogue free-form TTS affordance (hidden when freeform is on). */
    readonly dialogueVoiceButton: {
      readonly visible: boolean;
      readonly disabled: boolean;
      readonly tooltipKey: "play.voiceBudgetCharging" | null;
    };
  };
  readonly history: {
    readonly entries: readonly GameUiHistoryEntry[];
  };
  readonly commands: {
    readonly reveal: () => void;
    /**
     * AI choice start. The run-marker callback fires after audio unlock and before
     * history append / SFX / beginPlaying (run marker + outward notification).
     */
    readonly chooseAi: (onAiBranchUsed: () => void) => void;
    readonly advanceAi: () => void;
    readonly requestAiAuth: () => void;
    readonly recordPlayerChoice: (text: string) => void;
    readonly cancelAi: () => void;
    readonly reset: () => void;
  };
};

export function useNarrativePlayback(input: {
  readonly sourceController: NarrativeSourceController;
  readonly playback: {
    readonly textSpeed: GameSettings["textSpeed"];
    readonly autoPlay: boolean;
    /** Real stage-media cutscene truth for this render (not a lagged mirror). */
    readonly activeCutscene: boolean;
    readonly hasStoryInteraction: boolean;
    /** Product master mute — cancels in-flight dialogue TTS when flipped on. */
    readonly masterMuted?: boolean;
    /** Reactive voice setting — zero cancels without replaying on restore. */
    readonly voiceVolume: GameSettings["voiceVolume"];
    /** App-owned opportunity memory that survives Settings remounts. */
    readonly dialogueVoiceGuard: DialogueVoicePlaybackGuardApi;
    /** `${storyRevision}:${storyId}` — resets opportunity memory on new run. */
    readonly dialogueVoiceRunKey: string;
  };
  readonly host: {
    readonly coPlay: CoPlaySessionApi | null;
  };
  readonly auth: {
    readonly isSignedIn: boolean;
    readonly accessToken: string | null;
    readonly signInGuest: () => Promise<unknown>;
  };
  readonly actions: {
    readonly onChoose: (index: number) => void;
    readonly onJumpTo: (path: string) => void;
    readonly onAuthFallback: () => void;
    readonly ensureAudioUnlocked: () => void;
  };
}): NarrativePlayback {
  const { locale, t } = useLocale();
  const { sourceController, playback, host, auth, actions } = input;
  const { identity, dialogue, ai, choices, meters, remote } = sourceController;
  const { snapshot, isGuestSpectator } = identity;

  const loggedSceneRef = useRef<string | null>(null);

  const {
    entries: historyEntries,
    append: appendHistory,
    clear: clearHistory,
  } = useDialogueLog(identity.storyId);

  // Text speed is settings-only: never derive cadence from voice duration.
  // "fast" stays ~instant; voice may still be speaking after full reveal.
  const typewriterOpts = textSpeedToTypewriter(playback.textSpeed);
  const {
    visibleText,
    isComplete: typewriterComplete,
    revealAll,
  } = useTypewriter({
    text: dialogue.displayText,
    enabled: dialogue.typewriterEnabled,
    ...typewriterOpts,
  });

  const dialogueComplete = resolveDialogueComplete({
    isGuestSpectator,
    remoteIsComplete: dialogue.remoteIsComplete,
    typewriterComplete,
  });

  // Same-render cutscene gate as pre-refactor (activeCutscene object truthiness).
  const dialogueVoice = useDialogueVoice({
    enabled:
      !isGuestSpectator &&
      !playback.activeCutscene &&
      !playback.hasStoryInteraction &&
      Boolean(dialogue.rawText.trim()),
    masterMuted: Boolean(playback.masterMuted),
    voiceVolume: playback.voiceVolume,
    dialogueVoiceGuard: playback.dialogueVoiceGuard,
    dialogueVoiceRunKey: playback.dialogueVoiceRunKey,
    isSignedIn: auth.isSignedIn,
    accessToken: auth.accessToken,
    text: isGuestSpectator ? "" : dialogue.rawText,
    speaker: isGuestSpectator ? "" : dialogue.rawSpeaker,
    language: locale === "zh-CN" ? "zh-CN" : "en",
    emotion: ai.beat?.mood,
    lineKey: dialogue.voiceLineKey,
  });

  useHostCoPlayMirror({
    coPlay: host.coPlay,
    snapshot,
    sceneTitle: dialogue.sceneTitle,
    speaker: dialogue.rawSpeaker,
    text: dialogue.rawText,
    isComplete: typewriterComplete,
    aiMode: ai.playing,
  });

  // History: once only after fully revealed non-interaction dialogue; guest never logs.
  useEffect(() => {
    if (
      !shouldConsiderDialogueLog({
        typewriterComplete,
        displayText: dialogue.displayText,
        hasStoryInteraction: playback.hasStoryInteraction,
      })
    ) {
      return;
    }
    const stamp = buildDialogueLogStamp({
      aiPlaying: ai.playing,
      snapshotSceneId: snapshot.sceneId,
      aiBeatIndex: ai.beatIndex,
      displayText: dialogue.displayText,
    });
    if (loggedSceneRef.current === stamp) {
      return;
    }
    loggedSceneRef.current = stamp;
    if (isGuestSpectator) {
      return;
    }
    appendHistory(
      resolveRevealedDialogueEntry({
        displaySpeaker: dialogue.displaySpeaker,
        displayText: dialogue.displayText,
        aiPlaying: ai.playing,
        sceneTitle: identity.authoredSceneTitle,
        snapshotSceneId: snapshot.sceneId,
        copy: {
          aiBranch: t("play.aiBranch"),
          you: t("play.you"),
          choice: t("play.choiceMeta"),
          aiChoice: t("play.aiChoiceMeta"),
        },
      }),
    );
  }, [
    ai.beatIndex,
    ai.playing,
    appendHistory,
    dialogue.displaySpeaker,
    dialogue.displayText,
    identity.authoredSceneTitle,
    isGuestSpectator,
    playback.hasStoryInteraction,
    snapshot.sceneId,
    t,
    typewriterComplete,
  ]);

  const onChoose = actions.onChoose;
  const onJumpTo = actions.onJumpTo;
  const onAuthFallback = actions.onAuthFallback;
  const ensureAudioUnlocked = actions.ensureAudioUnlocked;

  // Continue-only autoplay: exact delays; never guest/AI/interaction/cutscene/ended.
  useEffect(() => {
    if (
      !resolveAutoplayEligibility({
        isGuestSpectator,
        aiPlaying: ai.playing,
        hasStoryInteraction: playback.hasStoryInteraction,
        autoPlay: playback.autoPlay,
        typewriterComplete,
        activeCutscene: playback.activeCutscene,
        snapshotIsEnded: snapshot.isEnded,
        snapshot,
      })
    ) {
      return;
    }
    const delay = resolveAutoplayDelayMs(playback.textSpeed);
    const timer = window.setTimeout(() => {
      onChoose(0);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    ai.playing,
    isGuestSpectator,
    onChoose,
    playback.activeCutscene,
    playback.autoPlay,
    playback.hasStoryInteraction,
    playback.textSpeed,
    snapshot,
    typewriterComplete,
  ]);

  const reveal = useCallback(() => {
    revealAll();
  }, [revealAll]);

  const recordPlayerChoice = useCallback(
    (text: string) => {
      appendHistory(
        resolvePlayerChoiceHistoryEntry(text, {
          aiBranch: t("play.aiBranch"),
          you: t("play.you"),
          choice: t("play.choiceMeta"),
          aiChoice: t("play.aiChoiceMeta"),
        }),
      );
    },
    [appendHistory, t],
  );

  const beginPlaying = ai.beginPlaying;
  const advanceBeat = ai.advanceBeat;
  const cancelAi = ai.cancel;
  const aiSlot = ai.slot;

  const chooseAi = useCallback(
    (onAiBranchUsed: () => void) => {
      if (aiSlot.status !== "ready" || isGuestSpectator) {
        return;
      }
      ensureAudioUnlocked();
      // Exact prior order: unlock → run marker/outward notify → history → SFX → begin.
      onAiBranchUsed();
      appendHistory(
        resolveAiChoiceHistoryEntry(aiSlot.result.choiceLabel, {
          aiBranch: t("play.aiBranch"),
          you: t("play.you"),
          choice: t("play.choiceMeta"),
          aiChoice: t("play.aiChoiceMeta"),
        }),
      );
      gameAudio.playSfx("ui-choice", 0.5);
      beginPlaying(aiSlot.result);
    },
    [aiSlot, appendHistory, beginPlaying, ensureAudioUnlocked, isGuestSpectator, t],
  );

  const advanceAi = useCallback(() => {
    ensureAudioUnlocked();
    if (!typewriterComplete) {
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
  }, [advanceBeat, ensureAudioUnlocked, onJumpTo, revealAll, typewriterComplete]);

  const signInGuest = auth.signInGuest;
  const requestAiAuth = useCallback(() => {
    void signInGuest().catch(() => {
      onAuthFallback();
    });
  }, [onAuthFallback, signInGuest]);

  const reset = useCallback(() => {
    loggedSceneRef.current = null;
    cancelAi();
    clearHistory();
  }, [cancelAi, clearHistory]);

  return {
    frame: {
      displayText: dialogue.displayText,
      visibleText,
      displaySpeaker: dialogue.displaySpeaker,
      sceneTitle: dialogue.sceneTitle,
      choices,
      dialogueComplete,
      typewriterComplete,
      aiPlaying: ai.playing,
      activeAiBeat: ai.beat,
      aiSlot,
      mianzi: meters.mianzi,
      ai_score: meters.ai_score,
      remoteSceneId: remote.sceneId,
      remoteIsEnded: remote.isEnded,
      panelAiMode: remote.aiMode,
      dialogueVoiceButton: {
        visible: dialogueVoice.buttonVisible,
        disabled: dialogueVoice.buttonDisabled,
        tooltipKey: dialogueVoice.buttonTooltipKey,
      },
    },
    history: {
      entries: historyEntries,
    },
    commands: {
      reveal,
      chooseAi,
      advanceAi,
      requestAiAuth,
      recordPlayerChoice,
      cancelAi,
      reset,
    },
  };
}
