/**
 * Production choice-stats contract.
 *
 * Single source of truth for permitted storyId → decisionId/choiceId
 * relationships. Browser catalog presentation and the optional service
 * validator must derive from this module (or a generated artifact of it).
 *
 * Aggregate provenance trust is also defined here so client and service
 * cannot drift on which sources may authorize Oracle / referee decisions.
 */

export interface ProductionChoiceStatsDecision {
  readonly storyId: string;
  readonly decisionId: string;
  readonly choiceIds: readonly string[];
}

/**
 * Permitted production stats keys only. Presentation (scene match labels)
 * lives in the browser package and must reference these IDs.
 */
export const PRODUCTION_CHOICE_STATS_CATALOG: readonly ProductionChoiceStatsDecision[] = [
  {
    storyId: "draft-ch01",
    decisionId: "d1_bones",
    choiceIds: ["d1_bones_accept", "d1_bones_cold"],
  },
  {
    storyId: "draft-ch01",
    decisionId: "d1_tell_breakup",
    choiceIds: ["d1_tell_flat", "d1_tell_hard"],
  },
  {
    storyId: "draft-ch02",
    decisionId: "d2_snack",
    choiceIds: ["d2_catch_firm", "d2_catch_soft"],
  },
  {
    storyId: "draft-ch02",
    decisionId: "d2_admit",
    choiceIds: ["d2_admit_me", "d2_admit_me_hard"],
  },
];

/**
 * Response `source` values the client may accept.
 * Unknown / missing / malformed values fail closed at parse time.
 */
export type ChoiceStatsAggregateSource = "anonymous-memory-aggregate";

/**
 * Sources that may drive Oracle prediction scoring or co-play referee
 * majority authority. Intentionally empty: no durable trusted aggregate
 * exists yet. Do not invent one.
 */
export const CHOICE_STATS_AUTHORITATIVE_SOURCES: ReadonlySet<ChoiceStatsAggregateSource> =
  new Set<ChoiceStatsAggregateSource>();

const KNOWN_SOURCES = new Set<string>(["anonymous-memory-aggregate"]);

const storyChoiceIndex: ReadonlyMap<string, ReadonlyMap<string, string>> = (() => {
  const stories = new Map<string, Map<string, string>>();
  for (const decision of PRODUCTION_CHOICE_STATS_CATALOG) {
    let choices = stories.get(decision.storyId);
    if (!choices) {
      choices = new Map<string, string>();
      stories.set(decision.storyId, choices);
    }
    for (const choiceId of decision.choiceIds) {
      choices.set(choiceId, decision.decisionId);
    }
  }
  return stories;
})();

export function listProductionStoryIds(): readonly string[] {
  return [...storyChoiceIndex.keys()];
}

export function isPermittedStoryId(storyId: string): boolean {
  return storyChoiceIndex.has(storyId.trim());
}

export function isPermittedChoiceOnStory(storyId: string, choiceId: string): boolean {
  const story = storyChoiceIndex.get(storyId.trim());
  if (!story) {
    return false;
  }
  return story.has(choiceId.trim());
}

export function decisionIdForPermittedChoice(storyId: string, choiceId: string): string | null {
  return storyChoiceIndex.get(storyId.trim())?.get(choiceId.trim()) ?? null;
}

export function permittedChoiceIdsForStory(storyId: string): ReadonlySet<string> {
  const story = storyChoiceIndex.get(storyId.trim());
  return story ? new Set(story.keys()) : new Set();
}

/** Hard upper bounds from the frozen catalog (no request-controlled growth). */
export function choiceStatsCatalogCardinalityBounds(): {
  readonly maxStories: number;
  readonly maxChoicesPerStory: number;
  readonly maxChoicesTotal: number;
} {
  let maxChoicesPerStory = 0;
  let maxChoicesTotal = 0;
  for (const choices of storyChoiceIndex.values()) {
    maxChoicesPerStory = Math.max(maxChoicesPerStory, choices.size);
    maxChoicesTotal += choices.size;
  }
  return {
    maxStories: storyChoiceIndex.size,
    maxChoicesPerStory,
    maxChoicesTotal,
  };
}

export function parseChoiceStatsAggregateSource(value: unknown): ChoiceStatsAggregateSource | null {
  if (typeof value !== "string") {
    return null;
  }
  if (!KNOWN_SOURCES.has(value)) {
    return null;
  }
  return value as ChoiceStatsAggregateSource;
}

export function isAuthoritativeChoiceStatsSource(
  source: ChoiceStatsAggregateSource | string | null | undefined,
): boolean {
  if (!source) {
    return false;
  }
  const parsed = typeof source === "string" ? parseChoiceStatsAggregateSource(source) : source;
  if (!parsed) {
    return false;
  }
  return CHOICE_STATS_AUTHORITATIVE_SOURCES.has(parsed);
}

/**
 * Product capability seam for UI/reward code. Intentionally false today.
 * Future trusted durable sources can be added to the allow-list without
 * teaching player surfaces about transport or storage details.
 */
export function hasAuthoritativeChoiceStatsCapability(): boolean {
  return CHOICE_STATS_AUTHORITATIVE_SOURCES.size > 0;
}
