/**
 * Pure decision / run-outcome projections.
 * Ending path copy, chapter-end visibility, and oracle option shape live here
 * so tests call production resolvers directly (no React, no I/O, no duplicated strings).
 */

import type { ChapterCheckpointKind } from "@supaluv/shared";
import type { EndingPathMeta } from "../../ChapterEndCard";
import type { OracleOptionView } from "../DialoguePanel";
import type { StatsDecisionDef } from "../../../stats/choiceStatsTypes";

/** Exact Chinese copy for chapter-clear / end-card path hint (AI branch used). */
export const ENDING_PATH_HINT_AI = "本局走过 AI 灵感旁支，并汇合作者主线。";

/** Exact Chinese copy for chapter-clear / end-card path hint (author options only). */
export const ENDING_PATH_HINT_AUTHOR = "本局仅走作者预写选项。";

export function resolveEndingPath(usedAiBranch: boolean): EndingPathMeta {
  return {
    usedAiBranch,
    pathHint: usedAiBranch ? ENDING_PATH_HINT_AI : ENDING_PATH_HINT_AUTHOR,
  };
}

/**
 * Chapter ended remains: snapshot.isEnded && typewriterComplete && !aiPlaying.
 */
export function resolveChapterEnded(input: {
  readonly isEnded: boolean;
  readonly typewriterComplete: boolean;
  readonly aiPlaying: boolean;
}): boolean {
  return input.isEnded && input.typewriterComplete && !input.aiPlaying;
}

export function resolveIsInterChapter(checkpointKind: ChapterCheckpointKind): boolean {
  return checkpointKind === "next_chapter";
}

/**
 * Host/solo terminal card: chapter ended and not an inter-chapter checkpoint.
 * Inter-chapter checkpoints never show a terminal card.
 */
export function resolveShowTerminalEndCard(input: {
  readonly chapterEnded: boolean;
  readonly isInterChapter: boolean;
}): boolean {
  return input.chapterEnded && !input.isInterChapter;
}

/**
 * ChapterEndCard `open` projection (guest uses remote end flag; host uses local chapter end).
 */
export function resolveEndCardOpen(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteIsEnded: boolean;
  readonly chapterEnded: boolean;
  readonly isInterChapter: boolean;
}): boolean {
  if (input.isGuestSpectator) {
    return input.remoteIsEnded && !input.isInterChapter;
  }
  return resolveShowTerminalEndCard({
    chapterEnded: input.chapterEnded,
    isInterChapter: input.isInterChapter,
  });
}

/**
 * Whether the dialogue panel should yield to the chapter-end surface.
 * Guest: remote end; host/solo: local chapterEnded.
 */
export function resolveDialogueYieldsToEnding(input: {
  readonly isGuestSpectator: boolean;
  readonly remoteIsEnded: boolean;
  readonly chapterEnded: boolean;
}): boolean {
  return input.isGuestSpectator ? input.remoteIsEnded : input.chapterEnded;
}

export function resolveOracleOptions(
  decision: StatsDecisionDef | null,
): readonly OracleOptionView[] {
  if (!decision) {
    return [];
  }
  return decision.options.map((o) => ({
    choiceId: o.choiceId,
    shortLabel: o.shortLabel,
    matchLabel: o.match,
  }));
}

export function resolveCheckpointFlags(checkpointKind: ChapterCheckpointKind): {
  readonly isInterChapter: boolean;
  readonly allowAiEnding: boolean;
  readonly draftEnd: boolean;
} {
  return {
    isInterChapter: resolveIsInterChapter(checkpointKind),
    allowAiEnding: checkpointKind === "ai_ending_allowed",
    draftEnd: checkpointKind === "draft_end",
  };
}
