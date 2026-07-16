import { useCallback, useMemo, useState } from "react";
import { resolvePropCutIn, type PropCutInDefinition } from "@supaluv/content";
import {
  createEmptyPropCutInSeenMemory,
  hasSeenPropCutIn,
  markPropCutInSeen,
  propCutInSceneKey,
  shouldRequestPropCutIn,
} from "./propCutInState";

interface UsePropCutInInput {
  readonly storyId: string;
  readonly sceneId: string | null;
  readonly isGuestSpectator: boolean;
}
export interface PropCutInController {
  readonly definition: PropCutInDefinition | null;
  readonly requested: boolean;
  readonly seen: boolean;
  readonly dismiss: () => void;
  readonly reopen: () => void;
  readonly resetMemory: () => void;
}

export function usePropCutIn({
  storyId,
  sceneId,
  isGuestSpectator,
}: UsePropCutInInput): PropCutInController {
  const definition = useMemo(() => resolvePropCutIn(storyId, sceneId), [sceneId, storyId]);
  const [seenMemory, setSeenMemory] = useState(createEmptyPropCutInSeenMemory);
  const [manualOpenKey, setManualOpenKey] = useState<string | null>(null);
  const seen = definition ? hasSeenPropCutIn(seenMemory, definition) : false;
  const requested = shouldRequestPropCutIn({
    definition,
    isGuestSpectator,
    seenMemory,
    manualOpenKey,
  });

  const dismiss = useCallback(() => {
    if (definition) {
      setSeenMemory((memory) => markPropCutInSeen(memory, definition));
    }
    setManualOpenKey(null);
  }, [definition]);

  const reopen = useCallback(() => {
    if (!definition || isGuestSpectator) {
      return;
    }
    setManualOpenKey(propCutInSceneKey(definition));
  }, [definition, isGuestSpectator]);

  const resetMemory = useCallback(() => {
    setSeenMemory(createEmptyPropCutInSeenMemory());
    setManualOpenKey(null);
  }, []);

  return { definition, requested, seen, dismiss, reopen, resetMemory };
}
