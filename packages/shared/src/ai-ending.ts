export interface AiEndingRange {
  readonly min: number;
  readonly max: number;
}

export interface AiEndingContract {
  readonly id: string;
  readonly storyId: string;
  readonly entryId: string;
  readonly allowedOutcomeAnchors: readonly string[];
  readonly requiredFacts: readonly string[];
  readonly unresolvedThreads: readonly string[];
  readonly characterInvariants: readonly string[];
  readonly toneConstraints: readonly string[];
  readonly forbiddenOutcomes: readonly string[];
  readonly allowedSlotIds: readonly string[];
  readonly allowedBackgrounds: readonly string[];
  readonly maxSegments: 8;
  readonly targetChoicePoints: AiEndingRange;
  readonly choicesPerPoint: AiEndingRange;
  readonly maxTotalCharacters: number;
  readonly maxOptionalStills: 2;
  readonly forceTerminalAtSegment: 8;
}

export interface AiEndingChoice {
  readonly id: string;
  readonly label: string;
  readonly actionSummary: string;
}

export interface AiEndingContinuity {
  readonly facts: readonly string[];
  readonly unresolvedThreads?: readonly string[];
  readonly relationshipChanges?: Readonly<Record<string, string>>;
}

export interface AiEndingSegment {
  readonly sequence: number;
  readonly text: string;
  readonly beats: readonly string[];
  readonly choices: readonly AiEndingChoice[];
  readonly continuity: AiEndingContinuity;
  readonly terminal: boolean;
  readonly outcomeAnchor?: string;
  readonly backgroundKey?: string;
  readonly stillCue?: string;
}

export type AiEndingSessionStatus =
  | "outline_pending"
  | "active"
  | "paused"
  | "completed"
  | "failed"
  | "deleted";

export type AiEndingPlayerAction =
  | { readonly kind: "choice"; readonly choiceId: string }
  | { readonly kind: "free_text"; readonly text: string };

export type AiEndingContractValidation =
  | { readonly valid: true; readonly value: AiEndingContract }
  | { readonly valid: false; readonly issues: readonly string[] };

export function validateAiEndingContract(
  input: unknown,
  availableBackgrounds: readonly string[],
): AiEndingContractValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, issues: ["contract must be an object"] };
  }
  const value = input as Partial<AiEndingContract> & Record<string, unknown>;
  const issues: string[] = [];
  if (!Array.isArray(value.allowedOutcomeAnchors) || value.allowedOutcomeAnchors.length < 2) {
    issues.push("at least two outcome anchors are required");
  }
  if (typeof value.maxSegments !== "number" || value.maxSegments < 1 || value.maxSegments > 8) {
    issues.push("maxSegments must be between 1 and 8");
  }
  if (value.forceTerminalAtSegment !== value.maxSegments) {
    issues.push("forceTerminalAtSegment must equal maxSegments");
  }
  if (
    !value.choicesPerPoint ||
    value.choicesPerPoint.min < 2 ||
    value.choicesPerPoint.max > 4 ||
    value.choicesPerPoint.min > value.choicesPerPoint.max
  ) {
    issues.push("choicesPerPoint must stay within 2–4");
  }
  for (const key of value.allowedBackgrounds ?? []) {
    if (!availableBackgrounds.includes(key)) issues.push(`unknown background: ${key}`);
  }
  for (const field of [
    "requiredFacts",
    "characterInvariants",
    "toneConstraints",
    "forbiddenOutcomes",
  ] as const) {
    if (!Array.isArray(value[field]) || value[field]!.length === 0) {
      issues.push(`${field} is required`);
    }
  }
  return issues.length > 0
    ? { valid: false, issues }
    : { valid: true, value: input as AiEndingContract };
}
