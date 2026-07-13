/**
 * Dialogue history stamp, append gate, and entry shape for narrative playback.
 */

export type DialogueHistoryKind = "human" | "system" | "mystery";

export interface DialogueHistoryEntryDraft {
  readonly speaker: string;
  readonly meta: string;
  readonly text: string;
  readonly kind: DialogueHistoryKind;
}

export interface DialogueHistoryCopy {
  readonly aiBranch: string;
  readonly you: string;
  readonly choice: string;
  readonly aiChoice: string;
}

const DEFAULT_DIALOGUE_HISTORY_COPY: DialogueHistoryCopy = {
  aiBranch: "AI 旁支",
  you: "你",
  choice: "选择",
  aiChoice: "AI 选择",
};

export function buildDialogueLogStamp(input: {
  readonly aiPlaying: boolean;
  readonly snapshotSceneId: string | null;
  readonly aiBeatIndex: number;
  readonly displayText: string;
}): string {
  if (input.aiPlaying) {
    return `ai:${input.snapshotSceneId}:${input.aiBeatIndex}:${input.displayText}`;
  }
  return `${input.snapshotSceneId}:${input.displayText}`;
}

/** True when fully revealed non-interaction dialogue may append (before guest gate). */
export function shouldConsiderDialogueLog(input: {
  readonly typewriterComplete: boolean;
  readonly displayText: string;
  readonly hasStoryInteraction: boolean;
}): boolean {
  return Boolean(input.typewriterComplete && input.displayText && !input.hasStoryInteraction);
}

export function resolveRevealedDialogueEntry(input: {
  readonly displaySpeaker: string;
  readonly displayText: string;
  readonly aiPlaying: boolean;
  readonly sceneTitle: string | null | undefined;
  readonly snapshotSceneId: string | null;
  readonly copy?: DialogueHistoryCopy;
}): DialogueHistoryEntryDraft {
  const copy = input.copy ?? DEFAULT_DIALOGUE_HISTORY_COPY;
  return {
    speaker: input.displaySpeaker,
    meta: input.aiPlaying ? copy.aiBranch : (input.sceneTitle ?? input.snapshotSceneId ?? ""),
    text: input.displayText,
    kind: input.aiPlaying ? "mystery" : input.displaySpeaker === "旁白" ? "system" : "human",
  };
}

export function resolvePlayerChoiceHistoryEntry(
  text: string,
  copy: DialogueHistoryCopy = DEFAULT_DIALOGUE_HISTORY_COPY,
): DialogueHistoryEntryDraft {
  return {
    speaker: copy.you,
    meta: copy.choice,
    text,
    kind: "mystery",
  };
}

export function resolveAiChoiceHistoryEntry(
  choiceLabel: string,
  copy: DialogueHistoryCopy = DEFAULT_DIALOGUE_HISTORY_COPY,
): DialogueHistoryEntryDraft {
  return {
    speaker: copy.you,
    meta: copy.aiChoice,
    text: choiceLabel,
    kind: "mystery",
  };
}
