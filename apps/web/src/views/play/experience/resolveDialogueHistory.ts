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
}): DialogueHistoryEntryDraft {
  return {
    speaker: input.displaySpeaker,
    meta: input.aiPlaying ? "AI 旁支" : (input.sceneTitle ?? input.snapshotSceneId ?? ""),
    text: input.displayText,
    kind: input.aiPlaying ? "mystery" : input.displaySpeaker === "旁白" ? "system" : "human",
  };
}

export function resolvePlayerChoiceHistoryEntry(text: string): DialogueHistoryEntryDraft {
  return {
    speaker: "你",
    meta: "选择",
    text,
    kind: "mystery",
  };
}

export function resolveAiChoiceHistoryEntry(choiceLabel: string): DialogueHistoryEntryDraft {
  return {
    speaker: "你",
    meta: "AI 选择",
    text: choiceLabel,
    kind: "mystery",
  };
}
