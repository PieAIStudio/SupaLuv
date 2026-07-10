/**
 * In-memory shared choice counts for demo co-device global echo.
 * Process-local only — swap for PostHog rollup / Core later.
 */

const counts = new Map<string, number>();

export function recordChoice(choiceId: string): number {
  const id = choiceId.trim();
  if (!id || id.length > 96) {
    return 0;
  }
  const next = (counts.get(id) ?? 0) + 1;
  counts.set(id, next);
  return next;
}

export function getCountsForStory(storyId: string): Record<string, number> {
  const prefix = `${storyId}_`;
  const out: Record<string, number> = {};
  for (const [key, value] of counts) {
    // Catalog ids look like ch01_delete_or_shot.delete — filter by story prefix.
    if (key.startsWith(storyId) || key.startsWith(prefix)) {
      out[key] = value;
    }
  }
  return out;
}

export function resetChoiceStatsForTesting(): void {
  counts.clear();
}
