import { useEffect } from "react";
import type { CoPlaySessionApi } from "../coplay/useCoPlaySession";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { clampMeter } from "../lib/meters";

/**
 * Host-only: mirror presentation snapshot to guests + clear votes on scene change.
 * Guests never run Ink; they render remoteStory from this mirror.
 */
export function useHostCoPlayMirror(input: {
  readonly coPlay: CoPlaySessionApi | null;
  readonly snapshot: InkStorySnapshot;
  readonly sceneTitle: string;
  readonly speaker: string;
  readonly text: string;
  readonly isComplete: boolean;
  readonly aiMode: boolean;
}): void {
  const publishStory = input.coPlay?.publishStory;
  const clearVotes = input.coPlay?.clearVotes;
  const role = input.coPlay?.role;

  useEffect(() => {
    if (role !== "host" || !publishStory) {
      return;
    }
    publishStory({
      sceneId: input.snapshot.sceneId,
      sceneTitle: input.sceneTitle,
      speaker: input.speaker,
      text: input.text,
      isComplete: input.isComplete,
      isEnded: input.snapshot.isEnded,
      choices: input.snapshot.choices.map((c) => ({ index: c.index, text: c.text })),
      mianzi: clampMeter(input.snapshot.meters.mianzi),
      ai_score: clampMeter(input.snapshot.meters.ai_score),
      aiMode: input.aiMode,
    });
  }, [
    input.aiMode,
    input.isComplete,
    input.sceneTitle,
    input.snapshot.choices,
    input.snapshot.isEnded,
    input.snapshot.meters.mianzi,
    input.snapshot.meters.ai_score,
    input.snapshot.sceneId,
    input.speaker,
    input.text,
    publishStory,
    role,
  ]);

  useEffect(() => {
    if (role === "host" && clearVotes) {
      clearVotes();
    }
  }, [clearVotes, role, input.snapshot.sceneId]);
}
