import type { InkStoryChoice, InkStorySnapshot } from "../story/inkStoryRunner";
import { emotionCalibrationInteraction } from "./emotionCalibration";
import type { ActiveStoryInteraction, StoryInteractionDefinition } from "./types";

const INTERACTION_TAG_PREFIX = "interaction:";
const INTERACTION_STEP_TAG_PREFIX = "interaction-step:";

const registry = new Map<string, StoryInteractionDefinition>();

export function registerStoryInteraction(definition: StoryInteractionDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(`Story interaction "${definition.id}" is already registered.`);
  }
  registry.set(definition.id, definition);
}

registerStoryInteraction(emotionCalibrationInteraction);

export function getStoryInteractionDefinition(id: string): StoryInteractionDefinition | null {
  return registry.get(id) ?? null;
}

/** Resolve only stable authored metadata; dialogue body text is never inspected. */
export function resolveStoryInteraction(
  snapshot: Pick<InkStorySnapshot, "tags">,
): ActiveStoryInteraction | null {
  const interactionTag = snapshot.tags.find((tag) => tag.startsWith(INTERACTION_TAG_PREFIX));
  const stepTag = snapshot.tags.find((tag) => tag.startsWith(INTERACTION_STEP_TAG_PREFIX));
  if (!interactionTag || !stepTag) {
    return null;
  }

  const id = interactionTag.slice(INTERACTION_TAG_PREFIX.length);
  const definition = getStoryInteractionDefinition(id);
  const authoredStep = Number(stepTag.slice(INTERACTION_STEP_TAG_PREFIX.length));
  if (
    !definition ||
    !Number.isInteger(authoredStep) ||
    authoredStep < 1 ||
    authoredStep > definition.stepCount
  ) {
    return null;
  }

  return {
    definition,
    stepIndex: authoredStep - 1,
  };
}

export function findStoryInteractionChoice(
  choices: readonly InkStoryChoice[],
  choiceId: string,
): InkStoryChoice | null {
  return choices.find((choice) => choice.choiceId === choiceId) ?? null;
}

export function listRegisteredStoryInteractions(): readonly StoryInteractionDefinition[] {
  return [...registry.values()];
}
