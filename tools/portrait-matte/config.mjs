import path from "node:path";

export const EXPECTED_WIDTH = 832;
export const EXPECTED_HEIGHT = 1248;

export const PORTRAIT_ROOT = "apps/web/public/assets/portraits";

/**
 * ADR-0006 CG portraits (2026-07-17): pure green #00B140 key plates.
 * Paths are workspace-relative; resolveRawPath joins them as-is.
 * - suming 8 moods → suming-<mood>.png
 * - shipeixin neutral → zhou-neutral.png (stable runtime key, zero consumer renames)
 * - shipeixin 3 extra moods → shipeixin-{calm-smile,guarded,hurt}.png (new keys)
 * - NPC 11 plates → apps/web/public/assets/portraits/<name>.png
 */
export const FIX_TARGETS = Object.freeze([
  {
    id: "suming-base",
    raw: "packages/content/characters/suming/refs/base-green.png",
    output: "suming-base.png",
  },
  {
    id: "suming-committed",
    raw: "packages/content/characters/suming/refs/committed-green.png",
    output: "suming-committed.png",
  },
  {
    id: "suming-lonely",
    raw: "packages/content/characters/suming/refs/lonely-green.png",
    output: "suming-lonely.png",
  },
  {
    id: "suming-panic",
    raw: "packages/content/characters/suming/refs/panic-green.png",
    output: "suming-panic.png",
  },
  {
    id: "suming-restless",
    raw: "packages/content/characters/suming/refs/restless-green.png",
    output: "suming-restless.png",
  },
  {
    id: "suming-shame",
    raw: "packages/content/characters/suming/refs/shame-green.png",
    output: "suming-shame.png",
  },
  {
    id: "suming-tempted",
    raw: "packages/content/characters/suming/refs/tempted-green.png",
    output: "suming-tempted.png",
  },
  {
    id: "suming-uncanny",
    raw: "packages/content/characters/suming/refs/uncanny-green.png",
    output: "suming-uncanny.png",
  },
  {
    id: "zhou-neutral",
    raw: "packages/content/characters/shipeixin/refs/neutral-green.png",
    output: "zhou-neutral.png",
  },
  {
    id: "shipeixin-calm-smile",
    raw: "packages/content/characters/shipeixin/refs/calm-smile-green.png",
    output: "shipeixin-calm-smile.png",
  },
  {
    id: "shipeixin-guarded",
    raw: "packages/content/characters/shipeixin/refs/guarded-green.png",
    output: "shipeixin-guarded.png",
  },
  {
    id: "shipeixin-hurt",
    raw: "packages/content/characters/shipeixin/refs/hurt-green.png",
    output: "shipeixin-hurt.png",
  },
  // NPC CG batch 2026-07-17 (11 plates)
  {
    id: "leo-neutral",
    raw: "packages/content/characters/npc/refs/leo-neutral-green.png",
    output: "leo-neutral.png",
  },
  {
    id: "leo-annoyed",
    raw: "packages/content/characters/npc/refs/leo-annoyed-green.png",
    output: "leo-annoyed.png",
  },
  {
    id: "chenjia-neutral",
    raw: "packages/content/characters/npc/refs/chenjia-neutral-green.png",
    output: "chenjia-neutral.png",
  },
  {
    id: "shopowner-neutral",
    raw: "packages/content/characters/npc/refs/shopowner-neutral-green.png",
    output: "shopowner-neutral.png",
  },
  {
    id: "staff-neutral",
    raw: "packages/content/characters/npc/refs/staff-neutral-green.png",
    output: "staff-neutral.png",
  },
  {
    id: "stafflead-neutral",
    raw: "packages/content/characters/npc/refs/stafflead-neutral-green.png",
    output: "stafflead-neutral.png",
  },
  {
    id: "zhuzhu-neutral",
    raw: "packages/content/characters/npc/refs/zhuzhu-neutral-green.png",
    output: "zhuzhu-neutral.png",
  },
  {
    id: "huanglaotai-neutral",
    raw: "packages/content/characters/npc/refs/huanglaotai-neutral-green.png",
    output: "huanglaotai-neutral.png",
  },
  {
    id: "police-neutral",
    raw: "packages/content/characters/npc/refs/police-neutral-green.png",
    output: "police-neutral.png",
  },
  {
    id: "gridworker-neutral",
    raw: "packages/content/characters/npc/refs/gridworker-neutral-green.png",
    output: "gridworker-neutral.png",
  },
  {
    id: "courier-neutral",
    raw: "packages/content/characters/npc/refs/courier-neutral-green.png",
    output: "courier-neutral.png",
  },
]);

/** All CG plates are re-matted; no pre-accepted baseline portraits remain. */
export const ACCEPTED_BASELINES = Object.freeze([]);

export const ALL_RUNTIME_PORTRAITS = Object.freeze([
  ...FIX_TARGETS.map(({ id, output }) => ({ id, output })),
  ...ACCEPTED_BASELINES,
]);

/**
 * Calibrated 2026-07-17 from the twelve #00B140 green plates
 * (normalize cover-crop 864×1152 → 832×1248; top-strip key sample).
 *
 * Raw key evidence (`calibrate.mjs --report`, all 12 plates):
 * - key RGB = [0, 177, 64] (#00B140); greenDominance = G - max(R,B) = 113
 * - top-strip greenDominance p50/p99 = 113 (flat flood-filled key)
 * - top-strip key-ray distance p99: 0 on pure plates; up to ~41 when hair
 *   enters the sample band after cover-crop (innerRadius max(14, p99+4)
 *   → 14…45). outerRadius stays 48 so soft band remains above noise floor.
 *
 * Despill / foreground lock switched from magenta (min(R,B)-G) to green
 * (G - max(R,B)). Ceiling 12 force-opaques non-green subject. despill
 * margin 12 / strength 1 pulls residual G toward max(R,B) in the 16px band.
 *
 * First green matte pass metrics (candidate out-dir):
 * - subject coverage 0.570–0.623
 * - transparent coverage 0.377–0.430
 * - partial alpha 0.0067–0.0120
 * - dominant subject top fraction 0.069–0.091 (CG heads sit higher than
 *   the old photoreal magenta set)
 * - green edge ratio 0 on all twelve after despill
 */
export const MATTE_PARAMETERS = Object.freeze({
  keySampleTopFraction: 0.1,
  backgroundNoisePadding: 4,
  minimumInnerRadius: 14,
  outerRadius: 48,
  minimumKeyScale: 0.25,
  maximumKeyScale: 1.5,
  /** Force opaque when greenDominance = G - max(R,B) is at or below this. */
  foregroundGreenDominanceCeiling: 12,
  blurSigma: 0.7,
  alphaZeroClamp: 3,
  alphaOpaqueClamp: 252,
  despillNeutralMargin: 12,
  despillStrength: 1,
  despillBoundaryRadius: 16,
});

/**
 * Background probes: top canvas corners + left/right side above shoulders.
 * Exact canvas-corner alpha is still recorded in every metrics report.
 * Edge spill detector uses green dominance (not magenta).
 */
export const GATE_PARAMETERS = Object.freeze({
  minimumTransparentCoverage: 0.32,
  minimumTopBandTransparentCoverage: 0.97,
  minimumSubjectCoverage: 0.42,
  maximumSubjectCoverage: 0.66,
  minimumPartialAlphaCoverage: 0.005,
  maximumPartialAlphaCoverage: 0.035,
  minimumLargestSubjectComponentRatio: 0.99,
  minimumDominantSubjectTopFraction: 0.06,
  maximumDominantSubjectTopFraction: 0.28,
  maximumEnclosedTransparentCoverage: 0.002,
  maximumLargestEnclosedTransparentPixels: 768,
  maximumBackgroundProbeAlpha: 0,
  edgeGreenDominanceThreshold: 24,
  edgeRedBlueDifferenceMaximum: 80,
  edgeBoundaryRadius: 16,
  maximumGreenEdgeRatio: 0.005,
});

export function resolveRawPath(workspaceRoot, target) {
  return path.join(workspaceRoot, target.raw);
}

export function resolveRuntimePath(workspaceRoot, target) {
  return path.join(workspaceRoot, PORTRAIT_ROOT, target.output);
}
