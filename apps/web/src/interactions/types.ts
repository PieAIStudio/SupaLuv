export type StoryInteractionType = "emotion-calibration";

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
}
