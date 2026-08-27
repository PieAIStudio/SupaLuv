import type { AiBranchSceneConfig } from "@supaluv/shared";

/** One short AI-authored dialogue beat inside a side branch. */
export interface AiBranchBeat {
  readonly speaker: string;
  readonly text: string;
  readonly artKey?: string;
  readonly portraitKey?: string;
  readonly mood?: string;
}

/**
 * Structured AI branch payload.
 * Contract: always includes a rejoin target that exists in authored content.
 */
export interface AiBranchResult {
  readonly choiceLabel: string;
  readonly beats: readonly AiBranchBeat[];
  readonly rejoinSceneId: string;
  /** Provider id for debugging (mock | openrouter | …). */
  readonly provider: string;
}

export interface AiBranchRequest {
  readonly storyId: string;
  readonly sceneId: string;
  readonly config: AiBranchSceneConfig;
  readonly authoredChoiceLabels: readonly string[];
  readonly meters?: { mianzi: number; ai_score: number };
  /** UI locale forwarded to the edge so generated prose matches the player language. */
  readonly locale?: string;
  /** SwimmerBackend access token — required for live AI (server enforces). */
  readonly accessToken?: string | null;
  readonly signal?: AbortSignal;
}

export interface AiBranchProvider {
  readonly id: string;
  generate(request: AiBranchRequest): Promise<AiBranchResult>;
}

export type AiChoiceSlotState =
  | { status: "idle" }
  | { status: "needs_auth"; message: string; pitch?: string }
  | { status: "needs_battery"; message: string; pitch: string }
  | { status: "loading"; waitLabel: string }
  | { status: "ready"; result: AiBranchResult }
  | { status: "error"; message: string }
  | { status: "playing"; result: AiBranchResult; beatIndex: number };
