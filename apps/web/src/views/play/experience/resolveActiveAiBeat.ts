import type { AiBranchBeat, AiChoiceSlotState } from "../../../ai/aiBranchTypes";

/**
 * AI slot → playing flag + active beat projection.
 * `aiPlaying` is true whenever the slot status is `playing` (even if a beat is missing).
 */
export function resolveActiveAiBeat(slot: AiChoiceSlotState): {
  readonly aiPlaying: boolean;
  readonly activeAiBeat: AiBranchBeat | null;
  readonly aiBeatIndex: number;
} {
  if (slot.status === "playing") {
    const beat = slot.result.beats[slot.beatIndex];
    return {
      aiPlaying: true,
      activeAiBeat: beat ?? null,
      aiBeatIndex: slot.beatIndex,
    };
  }
  return {
    aiPlaying: false,
    activeAiBeat: null,
    aiBeatIndex: 0,
  };
}
