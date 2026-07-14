import { useCallback, useEffect, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { findStoryInteractionChoice } from "./storyInteractionRegistry";

/**
 * Shared delayed choice commit for story-native interactions.
 * Does not change emotion-calibration behavior when used the same way.
 */
export function useInteractionChoiceCommit(
  snapshot: InkStorySnapshot,
  paused: boolean,
  onChoose: (index: number) => void,
) {
  const timerRef = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const snapshotTagsKey = snapshot.tags.join("|");

  useEffect(() => {
    setBusy(false);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [snapshot.sceneId, snapshotTagsKey]);

  const commitChoice = useCallback(
    (choiceId: string, delayMs: number, sfx: "notify-soft" | "ui-choice" = "ui-choice") => {
      if (paused || busy || timerRef.current !== null) {
        return false;
      }
      const choice = findStoryInteractionChoice(snapshot.choices, choiceId);
      if (!choice) {
        return false;
      }
      gameAudio.unlock();
      gameAudio.playSfx(sfx, 0.5);
      setBusy(true);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onChoose(choice.index);
      }, delayMs);
      return true;
    },
    [busy, onChoose, paused, snapshot.choices],
  );

  return { busy, commitChoice };
}
