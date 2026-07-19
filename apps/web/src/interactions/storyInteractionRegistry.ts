import type { InkStoryChoice, InkStorySnapshot } from "../story/inkStoryRunner";
import { barcodeSweepInteraction } from "./barcodeSweep";
import { emotionCalibrationInteraction } from "./emotionCalibration";
import { housingHotspotsInteraction } from "./housingHotspots";
import { mobileQuestionnaireInteraction } from "./mobileQuestionnaire";
import { protocolTestInteraction } from "./protocolTest";
import type { ActiveStoryInteraction, StoryInteractionDefinition } from "./types";

const INTERACTION_TAG_PREFIX = "interaction:";
const INTERACTION_STEP_TAG_PREFIX = "interaction-step:";
/** Per-scene content payload; omit for type default (backward compatible). */
const INTERACTION_VARIANT_TAG_PREFIX = "interaction-variant:";

const registry = new Map<string, StoryInteractionDefinition>();

export function registerStoryInteraction(definition: StoryInteractionDefinition): void {
  if (registry.has(definition.id)) {
    throw new Error(`Story interaction "${definition.id}" is already registered.`);
  }
  registry.set(definition.id, definition);
}

registerStoryInteraction(emotionCalibrationInteraction);
registerStoryInteraction(protocolTestInteraction);
registerStoryInteraction(barcodeSweepInteraction);
registerStoryInteraction(housingHotspotsInteraction);
registerStoryInteraction(mobileQuestionnaireInteraction);

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

  const variantTag = snapshot.tags.find((tag) => tag.startsWith(INTERACTION_VARIANT_TAG_PREFIX));
  const variantRaw = variantTag?.slice(INTERACTION_VARIANT_TAG_PREFIX.length).trim() ?? "";
  const variant = variantRaw.length > 0 ? variantRaw : null;

  return {
    definition,
    stepIndex: authoredStep - 1,
    variant,
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
