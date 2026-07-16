/**
 * Host / solo path: mark stats, path memory, history, then advance Ink.
 * Pure orchestration helper — no React.
 */

import { recordChoiceSelected, type PlayerPathScope } from "../../../persistence/pathMemory";
import { recordStatsChoice, type SessionChoicePick } from "../../../stats/choiceStatsClient";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import type { StoryId } from "../../../story/storyMapAdapter";

export interface HostChoiceCommitInput {
  readonly storyId: StoryId;
  readonly pathScope: PlayerPathScope;
  readonly snapshot: InkStorySnapshot;
  readonly choiceIndex: number;
  readonly sessionPicks: readonly SessionChoicePick[];
  /** Narrative command — records the player choice line; no history shape leakage. */
  readonly recordPlayerChoice: (text: string) => void;
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
      recordChoiceSelected(input.pathScope, {
        storyId: input.storyId,
        sceneId: input.snapshot.sceneId,
        label: choice.text,
        choiceId: choice.choiceId ?? null,
      });
    }
    const statsPick = recordStatsChoice(input.storyId, input.snapshot.sceneId, choice.text);
    if (statsPick) {
      const already = sessionPicks.some((p) => p.decisionId === statsPick.decisionId);
      if (!already) {
        sessionPicks = [...sessionPicks, statsPick];
      }
    }
    input.recordPlayerChoice(choice.text);
  }
  input.onChoose(input.choiceIndex);
  input.clearVotes?.();
  return { sessionPicks };
}
