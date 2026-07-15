/**
 * Decision and run-outcome lifecycle ownership.
 *
 * Single owner for: session stats picks, choice flow composition, seen-choice
 * labels, oracle guess lifecycle, RPS global lean/referee, AI-branch run marker,
 * one-shot chapter-clear, terminal/inter-chapter end-card projection, and
 * end-card replay bookkeeping. Media/narrative/app reset is injected.
 *
 * Nested return: choice / oracle / rps / ending / commands — not a flat bag.
 * Construction input is concept-grouped: source / viewer / narrative / actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../../../audio/gameAudio";
import type { CoPlaySessionApi } from "../../../coplay/useCoPlaySession";
import type { GlobalLeanHint } from "../../../coplay/RpsDuelOverlay";
import { useRpsGlobalLean } from "../../../hooks/useRpsGlobalLean";
import { getScenePathMemory } from "../../../persistence/pathMemory";
import { findDecision } from "../../../stats/choiceStatsCatalog";
import type { SessionChoicePick } from "../../../stats/choiceStatsClient";
import { clearOracleGuesses, getOracleGuess, setOracleGuess } from "../../../stats/oracleMemory";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import { getChapterCheckpoint, type StoryId } from "../../../story/storyMapAdapter";
import type { EndingPathMeta } from "../../ChapterEndCard";
import type { OracleOptionView } from "../DialoguePanel";
import { usePlayChoiceFlow } from "../usePlayChoiceFlow";
import {
  resolveChapterEnded,
  resolveCheckpointFlags,
  resolveDialogueYieldsToEnding,
  resolveEndCardOpen,
  resolveEndingPath,
  resolveOracleOptions,
} from "./resolveDecisionOutcome";

export type DecisionExperience = {
  readonly choice: {
    readonly handleChoose: (index: number) => void;
    /** Path-memory labels for the active scene (empty for guest). */
    readonly seenLabels: readonly string[];
    /** Session stats picks for end-card echo (empty for guest). */
    readonly sessionStatsPicks: readonly SessionChoicePick[];
  };
  readonly oracle: {
    readonly options: readonly OracleOptionView[];
    readonly guessLabel: string | null;
    readonly onGuess: ((option: OracleOptionView) => void) | undefined;
  };
  readonly rps: {
    /** Host-only global lean; null for guest or when no duel. */
    readonly globalLean: GlobalLeanHint | null;
    readonly onGlobalReferee: (() => void) | undefined;
  };
  readonly ending: {
    readonly chapterEnded: boolean;
    readonly endCardOpen: boolean;
    /** True when dialogue should hide for the ending surface. */
    readonly dialogueYieldsToEnding: boolean;
    readonly allowAiEnding: boolean;
    readonly draftEnd: boolean;
    readonly path: EndingPathMeta;
  };
  readonly commands: {
    /** Mark AI branch used this run + outward notification. */
    readonly notifyAiBranchUsed: () => void;
    /** Ordinary reset: clear oracle guesses only (explicit command). */
    readonly clearOracleForReset: () => void;
    /**
     * End-card replay: guest no-op; unlock audio; clear run markers / chapter-clear
     * marker / session picks; then injected external reset (media/narrative/app).
     */
    readonly replayFromEndCard: () => void;
  };
};

export type DecisionExperienceInput = {
  /** Authored story + co-play session identity for this run. */
  readonly source: {
    readonly storyId: StoryId;
    readonly snapshot: InkStorySnapshot;
    readonly coPlay: CoPlaySessionApi | null;
  };
  /** Host/solo vs guest spectator view of remote state. */
  readonly viewer: {
    readonly isGuestSpectator: boolean;
    readonly guestChoices: readonly { index: number; text: string }[];
    readonly remoteSceneId: string | null;
    readonly remoteIsEnded: boolean;
  };
  /** Live narrative playback signals and history/AI control seams. */
  readonly narrative: {
    readonly typewriterComplete: boolean;
    readonly aiPlaying: boolean;
    readonly recordPlayerChoice: (text: string) => void;
    readonly cancelAi: () => void;
  };
  /** Outward app/parent callbacks and injected surface reset. */
  readonly actions: {
    readonly onChoose: (index: number) => void;
    readonly onRpsResolvedAchievement?: () => void;
    readonly onAiBranchUsed?: () => void;
    readonly onChapterClear?: (path: EndingPathMeta) => void;
    readonly ensureAudioUnlocked: () => void;
    /**
     * Media / narrative / app reset only.
     * Oracle clearing is owned by this module (`clearOracleForReset` / replay path).
     */
    readonly performExternalReset: () => void;
  };
};

export function useDecisionExperience(input: DecisionExperienceInput): DecisionExperience {
  const { source, viewer, narrative, actions } = input;
  const { storyId, snapshot, coPlay } = source;
  const { isGuestSpectator, guestChoices, remoteSceneId, remoteIsEnded } = viewer;
  const { typewriterComplete, aiPlaying, recordPlayerChoice, cancelAi } = narrative;
  const {
    onChoose,
    onRpsResolvedAchievement,
    onAiBranchUsed,
    onChapterClear,
    ensureAudioUnlocked,
    performExternalReset,
  } = actions;

  const usedAiBranchRef = useRef(false);
  const chapterClearReportedRef = useRef(false);
  /** Stats-visible picks this run (chapter-end global echo). */
  const sessionStatsPicksRef = useRef<SessionChoicePick[]>([]);
  const [sessionStatsPicks, setSessionStatsPicks] = useState<SessionChoicePick[]>([]);
  /** Bump to re-render after in-memory oracle guess writes. */
  const [oracleTick, setOracleTick] = useState(0);

  const notifyAiBranchUsed = useCallback(() => {
    usedAiBranchRef.current = true;
    onAiBranchUsed?.();
  }, [onAiBranchUsed]);

  const clearOracleForReset = useCallback(() => {
    clearOracleGuesses();
  }, []);

  const { handleChoose } = usePlayChoiceFlow({
    storyId,
    snapshot,
    coPlay,
    isGuestSpectator,
    guestChoices,
    remoteSceneId,
    sessionStatsPicksRef,
    setSessionStatsPicks,
    recordPlayerChoice,
    onChoose,
    cancelAi,
    ensureAudioUnlocked,
    onRpsResolvedAchievement,
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

  const onGlobalReferee = useCallback(() => {
    if (!coPlay || coPlay.role !== "host" || !refereePick) {
      return;
    }
    coPlay.resolveRpsWithGlobal(refereePick.index, refereePick.note);
    gameAudio.playSfx("notify-soft", 0.5);
  }, [coPlay, refereePick]);

  const oracleDecision =
    !isGuestSpectator && snapshot.sceneId ? findDecision(storyId, snapshot.sceneId) : null;
  const oracleOptions = useMemo(() => resolveOracleOptions(oracleDecision), [oracleDecision]);
  // oracleTick forces re-read after setOracleGuess (module memory, not React state).
  const oracleGuessLabel =
    oracleDecision && oracleOptions.length > 0
      ? (getOracleGuess(oracleDecision.decisionId)?.predictedLabel ?? null)
      : null;
  void oracleTick;

  const onOracleGuess = useCallback(
    (option: OracleOptionView) => {
      if (!oracleDecision || oracleOptions.length === 0) {
        return;
      }
      setOracleGuess({
        decisionId: oracleDecision.decisionId,
        predictedChoiceId: option.choiceId,
        predictedLabel: option.shortLabel,
        sceneId: oracleDecision.sceneId,
      });
      setOracleTick((n) => n + 1);
      gameAudio.playSfx("ui-click", 0.35);
    },
    [oracleDecision, oracleOptions.length],
  );

  // Path memory is module I/O — read here, not in pure resolvers.
  const seenLabelsRaw = snapshot.sceneId ? getScenePathMemory(storyId, snapshot.sceneId) : [];
  const seenLabels = isGuestSpectator ? [] : seenLabelsRaw;
  const sessionStatsPicksForUi = isGuestSpectator ? [] : sessionStatsPicks;

  const checkpoint = getChapterCheckpoint(storyId);
  const { isInterChapter, allowAiEnding, draftEnd } = resolveCheckpointFlags(checkpoint.kind);

  const chapterEnded = resolveChapterEnded({
    isEnded: snapshot.isEnded,
    typewriterComplete,
    aiPlaying,
  });

  const endCardOpen = resolveEndCardOpen({
    isGuestSpectator,
    remoteIsEnded,
    chapterEnded,
    isInterChapter,
  });

  const dialogueYieldsToEnding = resolveDialogueYieldsToEnding({
    isGuestSpectator,
    remoteIsEnded,
    chapterEnded,
  });

  const path = resolveEndingPath(usedAiBranchRef.current);

  useEffect(() => {
    if (isGuestSpectator || !chapterEnded || chapterClearReportedRef.current) {
      return;
    }
    chapterClearReportedRef.current = true;
    onChapterClear?.(resolveEndingPath(usedAiBranchRef.current));
  }, [chapterEnded, isGuestSpectator, onChapterClear]);

  const replayFromEndCard = useCallback(() => {
    if (isGuestSpectator) {
      return;
    }
    ensureAudioUnlocked();
    usedAiBranchRef.current = false;
    chapterClearReportedRef.current = false;
    sessionStatsPicksRef.current = [];
    setSessionStatsPicks([]);
    // Same as ordinary reset: oracle is owned here; surface reset is injected.
    clearOracleGuesses();
    performExternalReset();
  }, [ensureAudioUnlocked, isGuestSpectator, performExternalReset]);

  return {
    choice: {
      handleChoose,
      seenLabels,
      sessionStatsPicks: sessionStatsPicksForUi,
    },
    oracle: {
      options: isGuestSpectator ? [] : oracleOptions,
      guessLabel: isGuestSpectator ? null : oracleGuessLabel,
      onGuess:
        isGuestSpectator || !oracleDecision || oracleOptions.length === 0
          ? undefined
          : onOracleGuess,
    },
    rps: {
      globalLean: coPlay?.role === "host" ? rpsGlobalLean : null,
      onGlobalReferee: coPlay?.role === "host" && refereePick ? onGlobalReferee : undefined,
    },
    ending: {
      chapterEnded,
      endCardOpen,
      dialogueYieldsToEnding,
      allowAiEnding,
      draftEnd,
      path,
    },
    commands: {
      notifyAiBranchUsed,
      clearOracleForReset,
      replayFromEndCard,
    },
  };
}
