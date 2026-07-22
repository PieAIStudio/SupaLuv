export type CoverageMappingDigestAnchor = {
  algorithm: "sha256";
  contractVersion?: 1 | 2;
  entryCount: number;
  value: string;
};

export type CoverageEntryContract = {
  id: string;
  sourceId?: string;
  paragraphIndex?: number;
  chapterId: string;
  sceneId: string | null;
  textHash?: string;
  status?: string;
  notes?: string;
  dialogueQuotes?: string[];
  adaptationReceipt?: AdaptationReceiptContract;
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
export function parseSourceBlocks(raw: unknown): string[];
export function isSourceStructureBlock(paragraph: unknown): boolean;
export function stripInkLineComments(inkSource: unknown): string;
export function listInkScenes(inkSource: unknown): Array<{
  sceneId: string;
  bodies: string[];
  knotIds: Array<string | undefined>;
}>;
export function findExactSourceSceneIds(inkSource: unknown, sourceParagraph: unknown): string[];
export function validateExactOccurrenceMappings(input: {
  entries: CoverageEntryContract[];
  sourceParagraphs: string[];
  inkSource: string;
}): { ok: boolean; errors: string[] };
export function normalizeSubstantiveText(value: unknown): string;
export function isPlaceholderText(value: unknown): boolean;
export function computeCoverageMappingDigest(
  entries: CoverageEntryContract[],
  contractVersion?: 1 | 2,
): string;
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
