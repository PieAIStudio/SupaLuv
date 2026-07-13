import { useCallback, useSyncExternalStore } from "react";
import type { StorySession, StorySessionState } from "./types";

/**
 * Thin React adapter over StorySession. Domain logic stays in createStorySession.
 */
export function useStorySession(session: StorySession): StorySessionState {
  const subscribe = useCallback(
    (onStoreChange: () => void) => session.subscribe(() => onStoreChange()),
    [session],
  );
  const getSnapshot = useCallback(() => session.getState(), [session]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
