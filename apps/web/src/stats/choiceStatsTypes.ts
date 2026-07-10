/**
 * Chapter-end global choice echo — shared types.
 * IDs only; never store full dialogue text in analytics properties.
 */

export interface StatsOptionDef {
  /** Stable key for aggregation (never change when copy tweaks). */
  readonly choiceId: string;
  /** Substring to match Ink choice label. */
  readonly match: string;
  /** Short label on end card. */
  readonly shortLabel: string;
}

export interface StatsDecisionDef {
  readonly storyId: string;
  readonly sceneId: string;
  /** Groups options that sum to 100%. */
  readonly decisionId: string;
  /** Prompt shown above the bar. */
  readonly prompt: string;
  readonly options: readonly StatsOptionDef[];
}

export interface SessionChoicePick {
  readonly decisionId: string;
  readonly choiceId: string;
  readonly prompt: string;
  readonly shortLabel: string;
  readonly sceneId: string;
}

export type ChoiceCountMap = Readonly<Record<string, number>>;

export interface ChoiceEchoRow {
  readonly decisionId: string;
  readonly prompt: string;
  readonly yourLabel: string;
  readonly yourChoiceId: string;
  /** 0–100, or null when sample too small. */
  readonly percentSame: number | null;
  readonly totalSamples: number;
  readonly cohortKind: "majority" | "mid" | "minority" | "thin";
  readonly cohortLabel: string;
  readonly sourceNote: string;
}

export interface ChoiceStatsSnapshot {
  readonly storyId: string;
  readonly counts: ChoiceCountMap;
  readonly source: "local" | "merged" | "remote";
}
