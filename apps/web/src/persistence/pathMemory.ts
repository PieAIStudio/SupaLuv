/**
 * Light NG+ memory: which authored choice labels were used per scene.
 * Decoupled from achievements / AI — pure localStorage map.
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

export function getScenePathMemory(storyId: string, sceneId: string): readonly string[] {
  const all = loadAll();
  return all[`${storyId}:${sceneId}`] ?? [];
}

export function markChoiceTaken(storyId: string, sceneId: string, label: string): void {
  const all = loadAll();
  const key = `${storyId}:${sceneId}`;
  const prev = all[key] ?? [];
  if (prev.includes(label)) {
    return;
  }
  all[key] = [...prev, label];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function wasChoiceTaken(storyId: string, sceneId: string, label: string): boolean {
  return getScenePathMemory(storyId, sceneId).includes(label);
}
