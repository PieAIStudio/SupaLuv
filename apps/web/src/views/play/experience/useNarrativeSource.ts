/**
 * Narrative source phase: AI slot + authored/guest/AI source precedence.
 *
 * Must run before stage media so `aiPlaying` is same-render accurate.
 * Does not own typewriter, TTS, history, autoplay, or cutscene gates.
 */

import { useMemo } from "react";
import type { AiBranchSceneConfig } from "@supaluv/shared";
import type { AiBranchBeat, AiBranchResult, AiChoiceSlotState } from "../../../ai/aiBranchTypes";
import { useAiBranchSlot } from "../../../hooks/useAiBranchSlot";
import type { DisplayNameMap } from "../../../persistence/displayNames";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import type { StoryId } from "../../../story/storyMapAdapter";
import { useLocale } from "../../../i18n";
import { mapDialogueForPlayer } from "../lib/stagePresentation";
import { resolveActiveAiBeat } from "./resolveActiveAiBeat";
import {
  resolvePlaybackSource,
  type PlaybackSourceProjection,
  type RemoteStorySource,
} from "./resolvePlaybackSource";

export type NarrativeSourceController = {
  readonly identity: {
    readonly storyId: StoryId;
    readonly snapshot: InkStorySnapshot;
    readonly isGuestSpectator: boolean;
    readonly authoredSceneTitle: string | null | undefined;
  };
  readonly dialogue: {
    readonly rawText: string;
    readonly rawSpeaker: string;
    readonly displayText: string;
    readonly displaySpeaker: string;
    readonly sceneTitle: string;
    readonly voiceLineKey: string;
    readonly typewriterEnabled: boolean;
    readonly remoteIsComplete: boolean | undefined;
  };
  readonly ai: {
    readonly playing: boolean;
    readonly beat: AiBranchBeat | null;
    readonly beatIndex: number;
    readonly slot: AiChoiceSlotState;
    readonly beginPlaying: (result: AiBranchResult) => void;
    readonly advanceBeat: () => { done: boolean; rejoinSceneId: string } | null;
    readonly cancel: () => void;
  };
  readonly choices: PlaybackSourceProjection["choices"];
  readonly meters: {
    readonly dignity: number;
    readonly impulse: number;
  };
  readonly remote: {
    readonly sceneId: string | null;
    readonly isEnded: boolean;
    readonly aiMode: boolean | undefined;
  };
};

export type NarrativeSource = {
  /**
   * Stage-media inputs that must be available before cutscenes resolve.
   * Same-render truth — not a mirrored lag state.
   */
  readonly stage: {
    readonly aiPlaying: boolean;
    readonly activeAiBeat: AiBranchBeat | null;
  };
  /** Opaque to VisualNovel UI; consumed only by useNarrativePlayback. */
  readonly controller: NarrativeSourceController;
};

export function useNarrativeSource(input: {
  readonly source: {
    readonly storyId: StoryId;
    readonly snapshot: InkStorySnapshot;
    readonly sceneTitle: string | null | undefined;
    readonly presentationSpeaker: string;
    readonly aiBranchConfig: AiBranchSceneConfig | undefined;
    readonly aiBranchEnabled: boolean;
  };
  readonly viewer: {
    readonly isGuestSpectator: boolean;
    readonly remoteStory: RemoteStorySource | null;
    readonly displayNames: DisplayNameMap;
  };
  readonly auth: {
    readonly isSignedIn: boolean;
    readonly accessToken: string | null;
    readonly batteries: number | null;
  };
}): NarrativeSource {
  const { locale, t } = useLocale();
  const { source, viewer, auth } = input;
  const { snapshot } = source;
  const { isGuestSpectator, remoteStory, displayNames } = viewer;

  const authoredLabels = useMemo(
    () => snapshot.choices.map((choice) => choice.text),
    [snapshot.choices],
  );

  // Guest never starts a hidden AI request or battery charge.
  const {
    slot: aiSlot,
    beginPlaying,
    advanceBeat,
    cancel: cancelAi,
  } = useAiBranchSlot({
    enabled: source.aiBranchEnabled && !isGuestSpectator,
    isSignedIn: auth.isSignedIn,
    accessToken: auth.accessToken,
    batteries: auth.batteries,
    storyId: source.storyId,
    sceneId: snapshot.sceneId,
    config: source.aiBranchConfig,
    authoredChoiceLabels: authoredLabels,
    meters: snapshot.meters,
    locale,
  });

  const { aiPlaying, activeAiBeat, aiBeatIndex } = resolveActiveAiBeat(aiSlot);

  const projection = resolvePlaybackSource({
    isGuestSpectator,
    remoteStory,
    aiPlaying,
    activeAiBeat,
    snapshotText: snapshot.text,
    presentationSpeaker: source.presentationSpeaker,
    sceneTitle: source.sceneTitle,
    snapshotSceneId: snapshot.sceneId,
    snapshotDignity: snapshot.meters.dignity,
    snapshotImpulse: snapshot.meters.impulse,
    snapshotChoices: snapshot.choices,
    aiBeatIndex,
    copy: {
      guestWaitText: t("play.guestWaitText"),
      guestWaitSpeaker: t("play.guestWaitSpeaker"),
      guestWaitScene: t("play.guestWaitScene"),
      branchScene: t("play.branchScene"),
      scene: t("play.scene"),
    },
  });

  const { text: displayText, speaker: displaySpeaker } = mapDialogueForPlayer(
    projection.rawSpeaker,
    projection.rawText,
    displayNames,
  );

  const controller: NarrativeSourceController = {
    identity: {
      storyId: source.storyId,
      snapshot,
      isGuestSpectator,
      authoredSceneTitle: source.sceneTitle,
    },
    dialogue: {
      rawText: projection.rawText,
      rawSpeaker: projection.rawSpeaker,
      displayText,
      displaySpeaker,
      sceneTitle: projection.sceneTitle,
      voiceLineKey: projection.voiceLineKey,
      typewriterEnabled: projection.typewriterEnabled,
      remoteIsComplete: projection.remoteIsComplete,
    },
    ai: {
      playing: aiPlaying,
      beat: activeAiBeat,
      beatIndex: aiBeatIndex,
      slot: aiSlot,
      beginPlaying,
      advanceBeat,
      cancel: cancelAi,
    },
    choices: projection.choices,
    meters: {
      dignity: projection.dignity,
      impulse: projection.impulse,
    },
    remote: {
      sceneId: projection.remoteSceneId,
      isEnded: projection.remoteIsEnded,
      aiMode: projection.remoteAiMode,
    },
  };

  return {
    stage: {
      aiPlaying,
      activeAiBeat,
    },
    controller,
  };
}
