/**
 * Host / solo path: mark stats, path memory, history, then advance Ink.
 * Pure orchestration helper — no React.
 */

import { markChoiceTaken } from "../../persistence/pathMemory";
import { recordStatsChoice, type SessionChoicePick } from "../../stats/choiceStatsClient";
import type { InkStorySnapshot } from "../../story/inkStoryRunner";
import type { StoryId } from "../../story/storyMapAdapter";

export interface HostChoiceCommitInput {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly choiceIndex: number;
  readonly sessionPicks: readonly SessionChoicePick[];
  readonly appendHistory: (entry: {
    speaker: string;
    meta: string;
    text: string;
    kind: "human" | "system" | "mystery";
  }) => void;
  readonly onChoose: (index: number) => void;
  readonly clearVotes?: () => void;
}

export interface HostChoiceCommitResult {
  readonly sessionPicks: readonly SessionChoicePick[];
}

export function commitHostChoice(input: HostChoiceCommitInput): HostChoiceCommitResult {
  const choice = input.snapshot.choices[input.choiceIndex];
  let sessionPicks = input.sessionPicks;
  if (choice) {
    if (input.snapshot.sceneId) {
      markChoiceTaken(input.storyId, input.snapshot.sceneId, choice.text, choice.choiceId);
    }
    const statsPick = recordStatsChoice(input.storyId, input.snapshot.sceneId, choice.text);
    if (statsPick) {
      const already = sessionPicks.some((p) => p.decisionId === statsPick.decisionId);
      if (!already) {
        sessionPicks = [...sessionPicks, statsPick];
      }
    }
    input.appendHistory({
      speaker: "你",
      meta: "选择",
      text: choice.text,
      kind: "mystery",
    });
  }
  input.onChoose(input.choiceIndex);
  input.clearVotes?.();
  return { sessionPicks };
}
