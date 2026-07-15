/**
 * Product-facing API for chapter-end global choice echo.
 */

import type { ChoiceStatsAggregateSource } from "@supaluv/shared/choice-stats-catalog";
import { resolveStatsPick } from "./choiceStatsCatalog";
import { incrementLocalChoice, getLocalChoiceCounts } from "./choiceStatsLocal";
import { buildEchoRows, mergeCountMaps } from "./choiceStatsMath";
import { fetchRemoteChoiceStats, postRemoteChoice } from "./choiceStatsRemote";
import { CHOICE_STATS_SEED } from "./choiceStatsSeed";
import type { ChoiceEchoRow, SessionChoicePick } from "./choiceStatsTypes";

export type { ChoiceEchoRow, SessionChoicePick } from "./choiceStatsTypes";

/**
 * Quiet, honest source notes. Process-memory aggregate is never framed as
 * community / global people truth.
 */
export function choiceStatsSourceNote(remoteSource: ChoiceStatsAggregateSource | null): string {
  if (remoteSource === "anonymous-memory-aggregate") {
    return "本机记录 + 本地演示样本（进程内存聚合，非社区/全球人数）";
  }
  return "本地样本（演示构造数据，非全球人数）+ 本机记录；在线聚合暂不可用";
}

/** Record a stats-visible choice (local immediately; remote fire-and-forget). */
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
  // The remote client always resolves to a boolean and owns timeout/backoff.
  // Do not await: authored Ink must advance independently of this enhancement.
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
  const remote = await fetchRemoteChoiceStats(storyId);
  // Process-memory may still enrich chapter-end display when labelled as a
  // local demo sample. Seed is used only when no remote snapshot is available.
  const counts = remote
    ? mergeCountMaps(local, remote.counts)
    : mergeCountMaps(CHOICE_STATS_SEED, local);
  const sourceNote = choiceStatsSourceNote(remote?.source ?? null);

  return buildEchoRows({
    storyId,
    picks,
    counts,
    sourceNote,
  });
}
