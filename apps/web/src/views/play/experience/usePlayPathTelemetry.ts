/**
 * Player path-memory telemetry for the play surface: scene-presented recording
 * and ready AI-branch selection facts. Behavior-preserving extract from VisualNovelPrototype.
 */

import { useCallback, useEffect, useRef } from "react";
import { getNarrativeGraphPlayerSkeleton } from "@supaluv/content";
import { recordAiBranchSelection, recordScenePresented } from "../../../persistence/pathMemory";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import type { StoryId } from "../../../story/storyMapAdapter";
import { useLocale } from "../../../i18n";

const playerGraph = getNarrativeGraphPlayerSkeleton();
const playerPathScope = {
  packageId: playerGraph.packageId,
  revision: playerGraph.revision,
} as const;

function observedSummary(text: string): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }
  return normalized.length > 180 ? `${normalized.slice(0, 177)}…` : normalized;
}

export type PlayPathTelemetry = {
  /**
   * Ready AI branch selection: write a deterministic path-memory AI fact for the
   * current story/scene, then keep the existing run-marker + playback path.
   * Uses the shared `recordAiBranchSelection` helper (same call path as unit tests).
   */
  readonly handleChooseAi: () => void;
};

export function usePlayPathTelemetry(input: {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly isGuestSpectator: boolean;
  readonly activeStoryInteraction: {
    readonly definition: { readonly id: string };
    readonly stepIndex: number;
  } | null;
  readonly dialogueComplete: boolean;
  readonly sceneTitle: string;
  readonly chooseAi: (notifyAiBranchUsed: () => void) => void;
  readonly notifyAiBranchUsed: () => void;
}): PlayPathTelemetry {
  const {
    storyId,
    snapshot,
    isGuestSpectator,
    activeStoryInteraction,
    dialogueComplete,
    sceneTitle,
    chooseAi,
    notifyAiBranchUsed,
  } = input;
  const { t } = useLocale();
  const recordedPresentationRef = useRef<string>("");

  useEffect(() => {
    if (isGuestSpectator || !snapshot.sceneId) {
      return;
    }
    const dialoguePresented = !activeStoryInteraction && dialogueComplete;
    const interactionPresented = Boolean(activeStoryInteraction);
    if (!dialoguePresented && !interactionPresented) {
      return;
    }
    const choices =
      dialoguePresented || interactionPresented
        ? snapshot.choices.map((choice) => ({
            choiceId: choice.choiceId ?? null,
            label: choice.text,
          }))
        : [];
    const signature = JSON.stringify({
      storyId,
      sceneId: snapshot.sceneId,
      dialoguePresented,
      interaction: activeStoryInteraction?.definition.id ?? null,
      interactionStep: activeStoryInteraction?.stepIndex ?? null,
      title: dialoguePresented ? sceneTitle : null,
      summary: dialoguePresented ? snapshot.text : null,
      choices,
    });
    if (recordedPresentationRef.current === signature) {
      return;
    }
    recordedPresentationRef.current = signature;
    recordScenePresented(playerPathScope, {
      storyId,
      sceneId: snapshot.sceneId,
      title: dialoguePresented ? sceneTitle : null,
      summary: dialoguePresented ? observedSummary(snapshot.text) : null,
      choices,
    });
  }, [
    activeStoryInteraction,
    dialogueComplete,
    sceneTitle,
    isGuestSpectator,
    snapshot.choices,
    snapshot.sceneId,
    snapshot.text,
    storyId,
  ]);

  const handleChooseAi = useCallback(() => {
    if (snapshot.sceneId) {
      recordAiBranchSelection(playerPathScope, {
        storyId,
        sceneId: snapshot.sceneId,
        label: t("play.aiBranch"),
      });
    }
    chooseAi(notifyAiBranchUsed);
  }, [chooseAi, notifyAiBranchUsed, snapshot.sceneId, storyId, t]);

  return { handleChooseAi };
}
