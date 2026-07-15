export type CoverageMappingDigestAnchor = {
  algorithm: "sha256";
  entryCount: number;
  value: string;
};

export type CoverageEntryContract = {
  id: string;
  chapterId: string;
  sceneId: string | null;
  textHash?: string;
};

export type FactMappingContract = {
  fact?: string;
  sourceSnippet: string;
  targetSnippet: string;
};

export type AdaptationReceiptContract = {
  sourceHash?: string;
  textHash?: string;
  sceneId: string;
  factMappings: FactMappingContract[];
  pacingRationale: string;
};

export function sha256Text(text: string): string;
export function normalizeSubstantiveText(value: unknown): string;
export function isPlaceholderText(value: unknown): boolean;
export function computeCoverageMappingDigest(entries: CoverageEntryContract[]): string;
export function validateCoverageMappingDigest(
  entries: CoverageEntryContract[],
  anchor: CoverageMappingDigestAnchor | null | undefined,
): { ok: boolean; errors: string[]; actualDigest: string };
export function isolateSceneKnots(
  inkSource: string,
  sceneId: string | null | undefined,
): Array<{ knotId: string; body: string }>;
export function extractInkPlayerText(knotBody: string): string;
export function validateAdaptationReceipt(input: {
  receipt: AdaptationReceiptContract | Record<string, unknown> | null | undefined;
  entry: { textHash: string; sceneId: string | null };
  sourceParagraph: string;
  inkSource: string;
}): { ok: boolean; errors: string[] };
