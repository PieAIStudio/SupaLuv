/**
 * Light NG+ memory: which authored choices were used per scene.
 * Prefer stable choiceId over display label so punctuation edits do not break memory.
 */

const KEY = "supaluv.path-memory.v1";

export type PathMemoryMap = Record<string, readonly string[]>;

function loadAll(): PathMemoryMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as PathMemoryMap;
  } catch {
    return {};
  }
}

function memoryToken(choiceId: string | null | undefined, label: string): string {
  return choiceId && choiceId.length > 0 ? `id:${choiceId}` : `label:${label}`;
}

export function getScenePathMemory(storyId: string, sceneId: string): readonly string[] {
  const all = loadAll();
  return all[`${storyId}:${sceneId}`] ?? [];
}

export function markChoiceTaken(
  storyId: string,
  sceneId: string,
  label: string,
  choiceId?: string | null,
): void {
  const all = loadAll();
  const key = `${storyId}:${sceneId}`;
  const prev = all[key] ?? [];
  const token = memoryToken(choiceId, label);
  if (prev.includes(token) || prev.includes(label)) {
    return;
  }
  all[key] = [...prev, token];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function wasChoiceTaken(
  storyId: string,
  sceneId: string,
  label: string,
  choiceId?: string | null,
): boolean {
  const memory = getScenePathMemory(storyId, sceneId);
  const token = memoryToken(choiceId, label);
  return memory.includes(token) || memory.includes(label);
}
