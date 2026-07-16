/**
 * Solo / host / guest choice + RPS conflict — kept out of VisualNovelPrototype.
 * Ink authority always stays with host/solo via onChoose.
 * Dialogue history shape is owned by narrative playback (`recordPlayerChoice`).
 */

import { useCallback, useEffect } from "react";
import { getNarrativeGraphPlayerSkeleton } from "@supaluv/content";
import { gameAudio } from "../../../audio/gameAudio";
import { shouldOpenRpsDuel } from "../../../coplay/rpsRules";
import type { CoPlaySessionApi } from "../../../coplay/useCoPlaySession";
import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import type { StoryId } from "../../../story/storyMapAdapter";
import type { SessionChoicePick } from "../../../stats/choiceStatsClient";
import { commitHostChoice as applyHostChoice } from "../lib/commitHostChoice";

const playerGraph = getNarrativeGraphPlayerSkeleton();
const pathScope = {
  packageId: playerGraph.packageId,
  revision: playerGraph.revision,
} as const;

export function usePlayChoiceFlow(input: {
  readonly storyId: StoryId;
  readonly snapshot: InkStorySnapshot;
  readonly coPlay: CoPlaySessionApi | null;
  readonly isGuestSpectator: boolean;
  readonly guestChoices: readonly { index: number; text: string }[];
  readonly remoteSceneId: string | null;
  readonly sessionStatsPicksRef: { current: SessionChoicePick[] };
  readonly setSessionStatsPicks: (next: SessionChoicePick[]) => void;
  readonly recordPlayerChoice: (text: string) => void;
  readonly onChoose: (index: number) => void;
  readonly cancelAi: () => void;
  readonly ensureAudioUnlocked: () => void;
  readonly onRpsResolvedAchievement?: () => void;
}): {
  readonly handleChoose: (index: number) => void;
  readonly commitHostChoice: (index: number) => void;
} {
  const {
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
  } = input;

  const commitHostChoice = useCallback(
    (index: number) => {
      cancelAi();
      const result = applyHostChoice({
        storyId,
        pathScope,
        snapshot,
        choiceIndex: index,
        sessionPicks: sessionStatsPicksRef.current,
        recordPlayerChoice,
        onChoose,
        clearVotes: coPlay?.clearVotes,
      });
      if (result.sessionPicks !== sessionStatsPicksRef.current) {
        sessionStatsPicksRef.current = [...result.sessionPicks];
        setSessionStatsPicks(sessionStatsPicksRef.current);
      }
      gameAudio.playSfx("ui-choice", 0.5);
    },
    [
      cancelAi,
      coPlay?.clearVotes,
      onChoose,
      recordPlayerChoice,
      sessionStatsPicksRef,
      setSessionStatsPicks,
      snapshot,
      storyId,
    ],
  );

  useEffect(() => {
    if (!coPlay || coPlay.role !== "host") {
      return;
    }
    coPlay.setOnRpsResolved((winningIndex) => {
      onRpsResolvedAchievement?.();
      commitHostChoice(winningIndex);
    });
    return () => coPlay.setOnRpsResolved(null);
  }, [coPlay, commitHostChoice, onRpsResolvedAchievement]);

  const handleChoose = useCallback(
    (index: number) => {
      ensureAudioUnlocked();

      if (isGuestSpectator && coPlay) {
        const choice = guestChoices.find((c) => c.index === index) ?? guestChoices[index];
        if (choice) {
          coPlay.publishVote({
            choiceIndex: choice.index,
            choiceText: choice.text,
            sceneId: remoteSceneId,
          });
          gameAudio.playSfx("ui-choice", 0.45);
        }
        return;
      }

      if (coPlay?.role === "host") {
        const hostChoice = snapshot.choices[index];
        if (
          hostChoice &&
          shouldOpenRpsDuel({
            hostChoiceIndex: hostChoice.index,
            guestVotes: coPlay.guestVotes,
            choiceCount: snapshot.choices.length,
          })
        ) {
          const guest = coPlay.guestVotes[0]!;
          coPlay.openRpsDuel({
            sceneId: snapshot.sceneId,
            hostChoiceIndex: hostChoice.index,
            hostChoiceText: hostChoice.text,
            guestChoiceIndex: guest.choiceIndex,
            guestChoiceText: guest.choiceText,
            guestPlayerId: guest.playerId,
          });
          gameAudio.playSfx("notify-soft", 0.45);
          return;
        }
      }

      commitHostChoice(index);
    },
    [
      coPlay,
      commitHostChoice,
      ensureAudioUnlocked,
      guestChoices,
      isGuestSpectator,
      remoteSceneId,
      snapshot.choices,
      snapshot.sceneId,
    ],
  );

  return { handleChoose, commitHostChoice };
}
