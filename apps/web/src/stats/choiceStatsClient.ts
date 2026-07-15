/**
 * Product-facing API for chapter-end global choice echo.
 */

import {
  isAuthoritativeChoiceStatsSource,
  type ChoiceStatsAggregateSource,
} from "@supaluv/shared/choice-stats-catalog";
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
    return "本地演示样本：本机记录与可清空的进程内存计数；不用于奖励或裁判。";
  }
  return "本地演示样本：预设演示数据与本机记录；不用于奖励或裁判。";
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
  const authoritative = Boolean(remote && isAuthoritativeChoiceStatsSource(remote.source));
  // Trusted durable aggregates must stand alone. Demo-only sources may merge
  // local records solely for the chapter-end sample display.
  const counts = authoritative
    ? remote?.counts ?? {}
    : remote
      ? mergeCountMaps(local, remote.counts)
      : mergeCountMaps(CHOICE_STATS_SEED, local);

  return buildEchoRows({
    storyId,
    picks,
    counts,
    authority: authoritative ? "authoritative" : "demo-only",
    provenance: authoritative
      ? "trusted-durable-aggregate"
      : remote
        ? "local-demo-process-memory"
        : "local-demo-seed",
  });
}
