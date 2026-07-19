/**
 * Process-local anonymous aggregate for the optional choice-stats service.
 * Stores only storyId + stable choiceId counters; never per-user history.
 *
 * Non-durable, unauthenticated, and manipulable. Must never be treated as
 * Oracle/referee authority. Keys are bounded by the shared production catalog —
 * request-controlled IDs cannot grow nested maps.
 */

import {
  choiceStatsCatalogCardinalityBounds,
  isPermittedChoiceOnStory,
  isPermittedStoryId,
  listProductionStoryIds,
  permittedChoiceIdsForStory,
} from "@supaluv/shared/choice-stats-catalog";

const countsByStory = new Map<string, Map<string, number>>();

function normalizeId(value: string): string | null {
  const id = value.trim();
  if (!id || id.length > 96) {
    return null;
  }
  return id;
}

function ensureStoryBucket(storyId: string): Map<string, number> | null {
  if (!isPermittedStoryId(storyId)) {
    return null;
  }
  let storyCounts = countsByStory.get(storyId);
  if (!storyCounts) {
    const bounds = choiceStatsCatalogCardinalityBounds();
    if (countsByStory.size >= bounds.maxStories) {
      return null;
    }
    storyCounts = new Map<string, number>();
    countsByStory.set(storyId, storyCounts);
  }
  return storyCounts;
}

export function recordChoice(storyId: string, choiceId: string): number {
  const story = normalizeId(storyId);
  const choice = normalizeId(choiceId);
  if (!story || !choice) {
    return 0;
  }
  if (!isPermittedChoiceOnStory(story, choice)) {
    return 0;
  }
  const storyCounts = ensureStoryBucket(story);
  if (!storyCounts) {
    return 0;
  }
  const bounds = choiceStatsCatalogCardinalityBounds();
  if (!storyCounts.has(choice) && storyCounts.size >= bounds.maxChoicesPerStory) {
    return 0;
  }
  const next = (storyCounts.get(choice) ?? 0) + 1;
  storyCounts.set(choice, next);
  return next;
}

export function getCountsForStory(storyId: string): Record<string, number> {
  const story = normalizeId(storyId);
  if (!story || !isPermittedStoryId(story)) {
    return {};
  }
  const out: Record<string, number> = {};
  for (const [choiceKey, value] of countsByStory.get(story) ?? []) {
    if (isPermittedChoiceOnStory(story, choiceKey)) {
      out[choiceKey] = value;
    }
  }
  return out;
}

/** Test/observability: nested map sizes (never exceeds catalog bounds). */
export function choiceStatsStoreCardinality(): {
  readonly stories: number;
  readonly choicesTotal: number;
  readonly permittedStories: number;
  readonly permittedChoicesTotal: number;
} {
  let choicesTotal = 0;
  for (const storyCounts of countsByStory.values()) {
    choicesTotal += storyCounts.size;
  }
  const bounds = choiceStatsCatalogCardinalityBounds();
  return {
    stories: countsByStory.size,
    choicesTotal,
    permittedStories: listProductionStoryIds().length,
    permittedChoicesTotal: bounds.maxChoicesTotal,
  };
}

export function resetChoiceStatsForTesting(): void {
  countsByStory.clear();
}

/** Exposed for tests: every permitted production pair. */
export function listPermittedProductionPairsForTesting(): readonly {
  readonly storyId: string;
  readonly choiceId: string;
}[] {
  const pairs: { storyId: string; choiceId: string }[] = [];
  for (const storyId of listProductionStoryIds()) {
    for (const choiceId of permittedChoiceIdsForStory(storyId)) {
      pairs.push({ storyId, choiceId });
    }
  }
  return pairs;
}
