/**
 * Product-facing API for chapter-end global choice echo.
 */

import { resolveStatsPick } from "./choiceStatsCatalog";
import { incrementLocalChoice, getLocalChoiceCounts } from "./choiceStatsLocal";
import { buildEchoRows, mergeCountMaps } from "./choiceStatsMath";
import { fetchRemoteChoiceCounts, postRemoteChoice } from "./choiceStatsRemote";
import { CHOICE_STATS_SEED } from "./choiceStatsSeed";
import type { ChoiceEchoRow, SessionChoicePick } from "./choiceStatsTypes";

export type { ChoiceEchoRow, SessionChoicePick } from "./choiceStatsTypes";

/** Record a stats-visible choice (local always; remote best-effort). */
export function recordStatsChoice(
  storyId: string,
  sceneId: string | null | undefined,
  choiceLabel: string,
): SessionChoicePick | null {
  const resolved = resolveStatsPick(storyId, sceneId, choiceLabel);
  if (!resolved) {
    return null;
  }
  const { decision, option } = resolved;
  incrementLocalChoice(option.choiceId);
  void postRemoteChoice(option.choiceId, storyId);
  return {
    decisionId: decision.decisionId,
    choiceId: option.choiceId,
    prompt: decision.prompt,
    shortLabel: option.shortLabel,
    sceneId: decision.sceneId,
  };
}

export async function loadChoiceEchoRows(
  storyId: string,
  picks: readonly SessionChoicePick[],
): Promise<ChoiceEchoRow[]> {
  if (picks.length === 0) {
    return [];
  }

  const local = getLocalChoiceCounts();
  const remote = await fetchRemoteChoiceCounts(storyId);
  const counts = mergeCountMaps(CHOICE_STATS_SEED, local, remote ?? {});
  const sourceNote = remote ? "含演示基线 · 本机 · 在线池" : "含演示基线 · 本机（在线池未连上）";

  return buildEchoRows({
    storyId,
    picks,
    counts,
    sourceNote,
  });
}
