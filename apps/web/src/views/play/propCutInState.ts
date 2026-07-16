import type { PropCutInDefinition } from "@supaluv/content";

export type PropCutInSeenMemory = ReadonlySet<string>;

export function propCutInSceneKey(definition: PropCutInDefinition): string {
  return `${definition.storyId}/${definition.sceneId}/${definition.id}`;
}
export function createEmptyPropCutInSeenMemory(): PropCutInSeenMemory {
  return new Set<string>();
}

export function markPropCutInSeen(
  memory: PropCutInSeenMemory,
  definition: PropCutInDefinition,
): PropCutInSeenMemory {
  const next = new Set(memory);
  next.add(propCutInSceneKey(definition));
  return next;
}

export function hasSeenPropCutIn(
  memory: PropCutInSeenMemory,
  definition: PropCutInDefinition,
): boolean {
  return memory.has(propCutInSceneKey(definition));
}

export function shouldRequestPropCutIn(input: {
  readonly definition: PropCutInDefinition | null;
  readonly isGuestSpectator: boolean;
  readonly seenMemory: PropCutInSeenMemory;
  readonly manualOpenKey: string | null;
}): boolean {
  const { definition } = input;
  if (!definition || input.isGuestSpectator) {
    return false;
  }
  const key = propCutInSceneKey(definition);
  return input.manualOpenKey === key || !input.seenMemory.has(key);
}

export function shouldShowPropCutIn(input: {
  readonly requested: boolean;
  readonly higherPrioritySurfaceOpen: boolean;
}): boolean {
  return input.requested && !input.higherPrioritySurfaceOpen;
}
