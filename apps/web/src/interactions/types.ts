export type StoryInteractionType =
  | "emotion-calibration"
  | "protocol-test"
  | "barcode-sweep"
  | "housing-hotspots"
  | "mobile-questionnaire";

/**
 * Optional per-scene payload selector for shared interaction types.
 * Parsed from `# interaction-variant:<id>` Ink tags.
 * Missing / unknown → type default payload (ch02 behavior stays bit-identical).
 */
export type StoryInteractionVariantId = string;

export interface StoryInteractionDefinition {
  readonly id: string;
  readonly type: StoryInteractionType;
  readonly version: string;
  readonly title: string;
  readonly stepCount: number;
}

export interface ActiveStoryInteraction {
  readonly definition: StoryInteractionDefinition;
  /** Zero-based authored step, parsed from stable Ink metadata. */
  readonly stepIndex: number;
  /**
   * Payload variant from `# interaction-variant:<id>`, or null when absent
   * (use type default content).
   */
  readonly variant: StoryInteractionVariantId | null;
}
