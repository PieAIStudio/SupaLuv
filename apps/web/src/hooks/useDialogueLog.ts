import { useCallback, useEffect, useState } from "react";
import type { GameUiHistoryEntry } from "@pieai/swimmer-ui-kit";

const HISTORY_PREFIX = "supaluv.history.v1.";
const MAX_ENTRIES = 200;

function storageKey(storyId: string): string {
  return `${HISTORY_PREFIX}${storyId}`;
}

function loadEntries(storyId: string): GameUiHistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(storyId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as GameUiHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persistEntries(storyId: string, entries: readonly GameUiHistoryEntry[]): void {
  try {
    localStorage.setItem(storageKey(storyId), JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearStoredDialogueLog(storyId: string): void {
  try {
    localStorage.removeItem(storageKey(storyId));
  } catch {
    // ignore
  }
}

export function useDialogueLog(storyId: string) {
  const [entries, setEntries] = useState<GameUiHistoryEntry[]>(() => loadEntries(storyId));

  // Reload when story package changes (dev tools switch).
  useEffect(() => {
    setEntries(loadEntries(storyId));
  }, [storyId]);

  const append = useCallback(
    (
      entry: Omit<GameUiHistoryEntry, "id" | "kind"> & {
        kind?: GameUiHistoryEntry["kind"];
      },
    ) => {
      setEntries((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          last.speaker === entry.speaker &&
          last.text === entry.text &&
          last.meta === entry.meta
        ) {
          return prev;
        }
        const next = [
          ...prev,
          {
            id: `h-${prev.length + 1}-${Date.now()}`,
            kind: entry.kind ?? "human",
            meta: entry.meta,
            speaker: entry.speaker,
            text: entry.text,
          },
        ].slice(-MAX_ENTRIES);
        persistEntries(storyId, next);
        return next;
      });
    },
    [storyId],
  );

  const clear = useCallback(() => {
    clearStoredDialogueLog(storyId);
    setEntries([]);
  }, [storyId]);

  return { entries, append, clear };
}
