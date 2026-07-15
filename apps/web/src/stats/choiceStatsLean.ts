/**
 * Lean helpers for co-play referee + oracle.
 *
 * Pure majority math is available for unit tests, but product authority paths
 * only consume explicitly trusted durable aggregate sources. Process-local
 * `anonymous-memory-aggregate`, seed, local, cache, and fallback sources all
 * fail closed for Oracle / referee authority.
 */

import { isAuthoritativeChoiceStatsSource } from "@supaluv/shared/choice-stats-catalog";
import { resolveStatsPick, decisionsForStory } from "./choiceStatsCatalog";
import { percentForChoice } from "./choiceStatsMath";
import { fetchAuthoritativeChoiceStats, fetchRemoteChoiceStats } from "./choiceStatsRemote";
import type { ChoiceCountMap } from "./choiceStatsTypes";

export interface ChoiceLean {
  readonly choiceId: string;
  readonly shortLabel: string;
  readonly percent: number | null;
  readonly totalSamples: number;
}

/**
 * Display-only counts. May include process-memory sample data.
 * Never use for Oracle prediction scoring or co-play referee majority.
 */
export async function loadDisplayCounts(storyId: string): Promise<ChoiceCountMap> {
  const snapshot = await fetchRemoteChoiceStats(storyId);
  return snapshot?.counts ?? {};
}

/**
 * Authority path. Returns empty unless a future trusted durable aggregate
 * source is present. Current process-memory source cannot authorize.
 */
export async function loadAuthoritativeCounts(storyId: string): Promise<ChoiceCountMap> {
  const snapshot = await fetchAuthoritativeChoiceStats(storyId);
  if (!snapshot || !isAuthoritativeChoiceStatsSource(snapshot.source)) {
    return {};
  }
  return snapshot.counts;
}

/**
 * @deprecated Prefer loadDisplayCounts or loadAuthoritativeCounts.
 * Kept as a display alias so existing call sites do not imply authority.
 */
export async function loadMergedCounts(storyId: string): Promise<ChoiceCountMap> {
  return loadDisplayCounts(storyId);
}

export function leanForChoiceLabel(
  storyId: string,
  sceneId: string | null | undefined,
  choiceLabel: string,
  counts: ChoiceCountMap,
): ChoiceLean | null {
  const resolved = resolveStatsPick(storyId, sceneId, choiceLabel);
  if (!resolved) {
    return null;
  }
  const siblingIds = resolved.decision.options.map((o) => o.choiceId);
  const { percent, total } = percentForChoice(counts, resolved.option.choiceId, siblingIds);
  return {
    choiceId: resolved.option.choiceId,
    shortLabel: resolved.option.shortLabel,
    percent,
    totalSamples: total,
  };
}

/**
 * Pure majority index helper. Product code must pass only authoritative counts
 * (today: always empty / unavailable).
 */
export function preferCommunityChoiceIndex(args: {
  readonly storyId: string;
  readonly sceneId: string | null;
  readonly hostLabel: string;
  readonly guestLabel: string;
  readonly hostIndex: number;
  readonly guestIndex: number;
  readonly counts: ChoiceCountMap;
}): { index: number; note: string } | null {
  const hostLean = leanForChoiceLabel(args.storyId, args.sceneId, args.hostLabel, args.counts);
  const guestLean = leanForChoiceLabel(args.storyId, args.sceneId, args.guestLabel, args.counts);
  if (!hostLean || !guestLean) {
    return null;
  }
  if (hostLean.percent === null || guestLean.percent === null) {
    return null;
  }
  if (hostLean.percent === guestLean.percent) {
    return null;
  }
  if (hostLean.percent > guestLean.percent) {
    return {
      index: args.hostIndex,
      note: `样本多数：${hostLean.percent}% 站房主 · 「${hostLean.shortLabel}」`,
    };
  }
  return {
    index: args.guestIndex,
    note: `样本多数：${guestLean.percent}% 站客人 · 「${guestLean.shortLabel}」`,
  };
}

export function majorityOptionForDecision(
  storyId: string,
  decisionId: string,
  counts: ChoiceCountMap,
): { choiceId: string; shortLabel: string; percent: number | null } | null {
  const decision = decisionsForStory(storyId).find((d) => d.decisionId === decisionId);
  if (!decision) {
    return null;
  }
  const siblingIds = decision.options.map((o) => o.choiceId);
  let best: { choiceId: string; shortLabel: string; percent: number } | null = null;
  let tied = false;
  for (const option of decision.options) {
    const { percent } = percentForChoice(counts, option.choiceId, siblingIds);
    if (percent === null) {
      continue;
    }
    if (!best || percent > best.percent) {
      best = { choiceId: option.choiceId, shortLabel: option.shortLabel, percent };
      tied = false;
    } else if (percent === best.percent) {
      tied = true;
    }
  }
  return tied ? null : best;
}
