/**
 * Production-safe NarrativeGraph player skeleton loader.
 *
 * Imports only the spoiler-safe generated artifact. Never imports creator JSON,
 * raw .ink, or inkjs/full.
 */
import type { NarrativeGraphPlayerSkeleton } from "@supaluv/shared/narrative-graph";
import playerSkeletonJson from "../generated/narrative-graph-player.json";

export const narrativeGraphPlayerSkeleton = playerSkeletonJson as NarrativeGraphPlayerSkeleton;

export function getNarrativeGraphPlayerSkeleton(): NarrativeGraphPlayerSkeleton {
  return narrativeGraphPlayerSkeleton;
}
