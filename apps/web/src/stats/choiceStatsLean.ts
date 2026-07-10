/**
 * Community lean helpers for co-play referee + oracle.
 * Pure + async load of seed⊕local⊕remote counts.
 */

import { resolveStatsPick, decisionsForStory } from "./choiceStatsCatalog";
import { getLocalChoiceCounts } from "./choiceStatsLocal";
import { mergeCountMaps, percentForChoice } from "./choiceStatsMath";
import { fetchRemoteChoiceCounts } from "./choiceStatsRemote";
import { CHOICE_STATS_SEED } from "./choiceStatsSeed";
import type { ChoiceCountMap } from "./choiceStatsTypes";

export interface ChoiceLean {
  readonly choiceId: string;
  readonly shortLabel: string;
  readonly percent: number | null;
  readonly totalSamples: number;
}

export async function loadMergedCounts(storyId: string): Promise<ChoiceCountMap> {
  const local = getLocalChoiceCounts();
  const remote = await fetchRemoteChoiceCounts(storyId);
  return mergeCountMaps(CHOICE_STATS_SEED, local, remote ?? {});
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

/** Pick choice index with higher community %; null if not stats-tracked or tie/thin. */
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
      note: `全球回声：${hostLean.percent}% 站房主 · 「${hostLean.shortLabel}」`,
    };
  }
  return {
    index: args.guestIndex,
    note: `全球回声：${guestLean.percent}% 站客人 · 「${guestLean.shortLabel}」`,
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
  let best: { choiceId: string; shortLabel: string; percent: number | null } | null = null;
  for (const option of decision.options) {
    const { percent } = percentForChoice(counts, option.choiceId, siblingIds);
    if (!best || (percent ?? -1) > (best.percent ?? -1)) {
      best = { choiceId: option.choiceId, shortLabel: option.shortLabel, percent };
    }
  }
  return best;
}
