import type { StoryInteractionDefinition } from "./types";

export const HOUSING_HOTSPOTS_VERSION = "housing-hotspots-v1";

export type HousingHotspotId = "wall" | "cat" | "stairwell";

export interface HousingHotspotDefinition {
  readonly id: HousingHotspotId;
  readonly inspectChoiceId: string;
}

/**
 * Three authored hotspots from the rental scene.
 * Ink steps advance when each is inspected; skip exits early.
 * Final step offers continue after all inspected, or skip.
 */
export const housingHotspots: readonly HousingHotspotDefinition[] = [
  { id: "wall", inspectChoiceId: "housing_hotspots_q1_wall" },
  { id: "cat", inspectChoiceId: "housing_hotspots_q2_cat" },
  { id: "stairwell", inspectChoiceId: "housing_hotspots_q3_stairwell" },
] as const;

export const housingHotspotsSkipChoiceIds = [
  "housing_hotspots_q1_skip",
  "housing_hotspots_q2_skip",
  "housing_hotspots_q3_skip",
] as const;

export const housingHotspotsInteraction: StoryInteractionDefinition = {
  id: HOUSING_HOTSPOTS_VERSION,
  type: "housing-hotspots",
  version: HOUSING_HOTSPOTS_VERSION,
  title: "看房热点",
  stepCount: housingHotspots.length,
};
