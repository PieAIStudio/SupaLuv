/**
 * Continue-only autoplay eligibility and delay rules.
 * Pure — production hook and unit tests share this interface.
 */

import type { InkStorySnapshot } from "../../../story/inkStoryRunner";
import { isContinueOnly } from "../lib/vnHelpers";

export type TextSpeed = "slow" | "normal" | "fast";

export interface AutoplayEligibilityInput {
  readonly isGuestSpectator: boolean;
  readonly aiPlaying: boolean;
  readonly hasStoryInteraction: boolean;
  readonly autoPlay: boolean;
  readonly typewriterComplete: boolean;
  readonly activeCutscene: boolean;
  readonly snapshotIsEnded: boolean;
  readonly snapshot: Pick<InkStorySnapshot, "choices">;
}

export function resolveAutoplayEligibility(input: AutoplayEligibilityInput): boolean {
  if (
    input.isGuestSpectator ||
    input.aiPlaying ||
    input.hasStoryInteraction ||
    !input.autoPlay ||
    !input.typewriterComplete ||
    input.activeCutscene ||
    input.snapshotIsEnded
  ) {
    return false;
  }
  return isContinueOnly(input.snapshot);
}

/** Exact delay: fast 700 / normal 1100 / slow 1600 ms. */
export function resolveAutoplayDelayMs(textSpeed: TextSpeed): number {
  if (textSpeed === "fast") {
    return 700;
  }
  if (textSpeed === "slow") {
    return 1600;
  }
  return 1100;
}
