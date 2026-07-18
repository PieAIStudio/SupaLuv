/**
 * Pure rotation helpers for Heartbeat Engine wait interstitials.
 * Seed → ordered index sequence (no immediate repeat within a full cycle).
 */

/** Interval between line changes during a wait session (ms). */
export const INTERSTITIAL_ROTATE_MS = 4000;

/**
 * Normalize a numeric seed into a start index in `[0, length)`.
 * Stable for the same seed + length pair.
 */
export function startIndexFromSeed(seed: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  // Floor + positive mod so negative seeds still land in range.
  const floored = Math.floor(seed);
  return ((floored % length) + length) % length;
}

/**
 * Full cycle of line indices starting at `startIndex`, walking forward and wrapping.
 * Length equals `lineCount`. Within one cycle each index appears once, so there is
 * no immediate adjacent repeat when `lineCount > 1`. After the cycle, replaying
 * continues with the same order (last → first is only a seam if you concatenate
 * cycles; the UI steps one index at a time via offset).
 */
export function buildInterstitialSequence(startIndex: number, lineCount: number): number[] {
  if (lineCount <= 0) {
    return [];
  }
  const start = startIndexFromSeed(startIndex, lineCount);
  return Array.from({ length: lineCount }, (_, offset) => (start + offset) % lineCount);
}

/**
 * Deterministic seed → full rotation order of indices.
 * Same seed always yields the same sequence.
 */
export function sequenceFromSeed(seed: number, lineCount: number): number[] {
  return buildInterstitialSequence(startIndexFromSeed(seed, lineCount), lineCount);
}

/** Index into the sequence for the n-th step of a wait session (0-based). */
export function sequenceStepIndex(sequence: readonly number[], step: number): number {
  if (sequence.length === 0) {
    return 0;
  }
  const safeStep = ((Math.floor(step) % sequence.length) + sequence.length) % sequence.length;
  return sequence[safeStep]!;
}
