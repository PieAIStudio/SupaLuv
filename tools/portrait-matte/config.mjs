import path from "node:path";

export const EXPECTED_WIDTH = 832;
export const EXPECTED_HEIGHT = 1248;

export const PORTRAIT_ROOT = "apps/web/public/assets/portraits";
export const RAW_ROOT = "packages/content/characters/suming/refs";

export const FIX_TARGETS = Object.freeze([
  { id: "suming-base", raw: "base.jpg", output: "suming-base.png" },
  { id: "suming-shame", raw: "shame-raw.jpg", output: "suming-shame.png" },
  { id: "suming-panic", raw: "panic-raw.jpg", output: "suming-panic.png" },
  { id: "suming-lonely", raw: "lonely-raw.jpg", output: "suming-lonely.png" },
  { id: "suming-tempted", raw: "tempted-raw.jpg", output: "suming-tempted.png" },
  { id: "suming-uncanny", raw: "uncanny-raw.jpg", output: "suming-uncanny.png" },
]);

export const ACCEPTED_BASELINES = Object.freeze([
  { id: "suming-committed", output: "suming-committed.png" },
  { id: "suming-restless", output: "suming-restless.png" },
]);

export const ALL_RUNTIME_PORTRAITS = Object.freeze([
  ...FIX_TARGETS.map(({ id, output }) => ({ id, output })),
  ...ACCEPTED_BASELINES,
]);

/**
 * Calibrated from the top 10% of all eight raw references and from the alpha
 * transition in the two accepted runtime portraits.
 *
 * Accepted baseline evidence:
 * - background alpha=0 key-ray distance p99: 5.36 (committed), 8.15 (restless)
 * - opaque subject key-ray distance p01: 39.23 (committed), 35.56 (restless)
 * - opaque subject magenta dominance p99: 6 for both baselines
 */
export const MATTE_PARAMETERS = Object.freeze({
  keySampleTopFraction: 0.1,
  backgroundNoisePadding: 4,
  minimumInnerRadius: 14,
  outerRadius: 48,
  minimumKeyScale: 0.25,
  maximumKeyScale: 1.5,
  foregroundMagentaDominanceCeiling: 12,
  blurSigma: 0.7,
  alphaZeroClamp: 3,
  alphaOpaqueClamp: 252,
  despillNeutralMargin: 15,
  despillStrength: 1,
  despillBoundaryRadius: 16,
});

/**
 * The locked bust composition occupies the two bottom canvas corners in both
 * accepted baselines. The four background-corner probes therefore use the two
 * top canvas corners plus the left/right side background above the shoulders.
 * Exact canvas-corner alpha is still recorded in every metrics report.
 */
export const GATE_PARAMETERS = Object.freeze({
  minimumTransparentCoverage: 0.34,
  minimumTopBandTransparentCoverage: 0.97,
  minimumSubjectCoverage: 0.54,
  maximumSubjectCoverage: 0.66,
  minimumPartialAlphaCoverage: 0.006,
  maximumPartialAlphaCoverage: 0.03,
  minimumLargestSubjectComponentRatio: 0.99,
  minimumDominantSubjectTopFraction: 0.1,
  maximumDominantSubjectTopFraction: 0.25,
  maximumEnclosedTransparentCoverage: 0.002,
  maximumLargestEnclosedTransparentPixels: 768,
  maximumBackgroundProbeAlpha: 0,
  edgeMagentaDominanceThreshold: 24,
  edgeRedBlueDifferenceMaximum: 80,
  edgeBoundaryRadius: 16,
  maximumMagentaEdgeRatio: 0.005,
});

export function resolveRawPath(workspaceRoot, target) {
  return path.join(workspaceRoot, RAW_ROOT, target.raw);
}

export function resolveRuntimePath(workspaceRoot, target) {
  return path.join(workspaceRoot, PORTRAIT_ROOT, target.output);
}
