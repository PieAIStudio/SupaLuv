import { narrativeSceneNodeId, type PlayerGraphObservation } from "@supaluv/shared/narrative-graph";

export const PATH_MEMORY_V1_KEY = "supaluv.path-memory.v1";
export const PATH_MEMORY_KEY = "supaluv.path-memory.v2";

const PATH_MEMORY_VERSION = 2 as const;

export interface PlayerPathScope {
  readonly packageId: string;
  readonly revision: string;
}

/** Origin of a path-memory choice fact. Missing/legacy values default to authored. */
export type PlayerPathChoiceSource = "authored" | "ai";

export interface PlayerPathChoiceFact {
  readonly choiceId: string | null;
  readonly label: string | null;
  readonly observedAt: string;
  readonly selectedAt: string | null;
  /**
   * Explicit choice origin. Omitted on pre-source historical data — treat as
   * `authored` unless a narrowly documented legacy migration proves otherwise.
   */
  readonly source?: PlayerPathChoiceSource;
}

export interface PlayerPathSceneFact {
  readonly storyId: string;
  readonly sceneId: string;
  readonly title: string | null;
  readonly summary: string | null;
  readonly firstVisitedAt: string;
  readonly lastVisitedAt: string;
  readonly choices: readonly PlayerPathChoiceFact[];
}

export interface PlayerPathRouteMemory extends PlayerPathScope {
  readonly scenes: Readonly<Record<string, PlayerPathSceneFact>>;
  readonly current: {
    readonly storyId: string;
    readonly sceneId: string;
    readonly observedAt: string;
  } | null;
}

interface PlayerPathStore {
  readonly version: typeof PATH_MEMORY_VERSION;
  readonly routes: Readonly<Record<string, PlayerPathRouteMemory>>;
}

export interface ScenePresentedFact {
  readonly storyId: string;
  readonly sceneId: string;
  readonly title?: string | null;
  readonly summary?: string | null;
  readonly choices?: readonly {
    readonly choiceId: string | null;
    readonly label: string;
    readonly source?: PlayerPathChoiceSource;
  }[];
  readonly observedAt?: string;
}

export interface ChoiceSelectedFact {
  readonly storyId: string;
  readonly sceneId: string;
  readonly choiceId: string | null;
  readonly label: string;
  readonly selectedAt?: string;
  /** Defaults to `authored` when omitted (backward-compatible). */
  readonly source?: PlayerPathChoiceSource;
}

export interface AiBranchSelectionFact {
  readonly storyId: string;
  readonly sceneId: string;
  /** Localized AI-branch copy (e.g. `play.aiBranch`), not free-form model prose. */
  readonly label: string;
  readonly selectedAt?: string;
}

/** Stable path-memory id for a ready AI branch taken at a scene. */
export function aiBranchChoiceId(storyId: string, sceneId: string): string {
  return `ai-branch:${storyId}:${sceneId}`;
}

export function resolveChoiceSource(
  source: PlayerPathChoiceSource | undefined | null,
): PlayerPathChoiceSource {
  return source === "ai" ? "ai" : "authored";
}

export type PlayerPathRouteResult =
  | { readonly status: "ready"; readonly memory: PlayerPathRouteMemory }
  | { readonly status: "empty" | "incompatible"; readonly memory: null };

type V1MemoryMap = Record<string, readonly string[]>;

function timestamp(value?: string): string {
  return value ?? new Date().toISOString();
}

function routeKey(scope: PlayerPathScope): string {
  return `${scope.packageId}@${scope.revision}`;
}

function sceneKey(storyId: string, sceneId: string): string {
  return `${storyId}:${sceneId}`;
}

function emptyStore(): PlayerPathStore {
  return { version: PATH_MEMORY_VERSION, routes: {} };
}

function loadStore(): PlayerPathStore {
  try {
    const raw = localStorage.getItem(PATH_MEMORY_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as Partial<PlayerPathStore>;
    if (parsed.version !== PATH_MEMORY_VERSION || !parsed.routes) {
      return emptyStore();
    }
    return parsed as PlayerPathStore;
  } catch {
    return emptyStore();
  }
}

function saveStore(store: PlayerPathStore): void {
  localStorage.setItem(PATH_MEMORY_KEY, JSON.stringify(store));
}

function parseV1Key(key: string): { storyId: string; sceneId: string } | null {
  const separator = key.indexOf(":");
  if (separator <= 0 || separator >= key.length - 1) {
    return null;
  }
  return { storyId: key.slice(0, separator), sceneId: key.slice(separator + 1) };
}

function migrateV1(scope: PlayerPathScope, store: PlayerPathStore): PlayerPathStore {
  if (store.routes[routeKey(scope)]) {
    return store;
  }
  let legacy: V1MemoryMap;
  try {
    const raw = localStorage.getItem(PATH_MEMORY_V1_KEY);
    if (!raw) {
      return store;
    }
    legacy = JSON.parse(raw) as V1MemoryMap;
  } catch {
    return store;
  }

  const migratedAt = new Date().toISOString();
  const scenes: Record<string, PlayerPathSceneFact> = {};
  for (const [key, tokens] of Object.entries(legacy)) {
    const parsed = parseV1Key(key);
    if (!parsed || !Array.isArray(tokens)) {
      continue;
    }
    const choices: PlayerPathChoiceFact[] = [];
    for (const token of tokens) {
      if (typeof token !== "string") {
        continue;
      }
      if (token.startsWith("id:") && token.length > 3) {
        choices.push({
          choiceId: token.slice(3),
          label: null,
          observedAt: migratedAt,
          selectedAt: migratedAt,
        });
      } else {
        const label = token.startsWith("label:") ? token.slice(6) : token;
        choices.push({
          choiceId: null,
          label,
          observedAt: migratedAt,
          selectedAt: migratedAt,
        });
      }
    }
    scenes[key] = {
      ...parsed,
      title: null,
      summary: null,
      firstVisitedAt: migratedAt,
      lastVisitedAt: migratedAt,
      choices,
    };
  }

  const route: PlayerPathRouteMemory = {
    ...scope,
    scenes,
    current: null,
  };
  const next: PlayerPathStore = {
    version: PATH_MEMORY_VERSION,
    routes: { ...store.routes, [routeKey(scope)]: route },
  };
  saveStore(next);
  localStorage.removeItem(PATH_MEMORY_V1_KEY);
  return next;
}

function loadStoreWithMigration(scope: PlayerPathScope): PlayerPathStore {
  return migrateV1(scope, loadStore());
}

function createRoute(scope: PlayerPathScope): PlayerPathRouteMemory {
  return { ...scope, scenes: {}, current: null };
}

function updateRoute(
  scope: PlayerPathScope,
  update: (route: PlayerPathRouteMemory) => PlayerPathRouteMemory,
): PlayerPathRouteMemory {
  const store = loadStoreWithMigration(scope);
  const key = routeKey(scope);
  const route = store.routes[key] ?? createRoute(scope);
  const nextRoute = update(route);
  saveStore({
    version: PATH_MEMORY_VERSION,
    routes: { ...store.routes, [key]: nextRoute },
  });
  return nextRoute;
}

export function getPlayerPathRoute(scope: PlayerPathScope): PlayerPathRouteResult {
  const store = loadStoreWithMigration(scope);
  const exact = store.routes[routeKey(scope)];
  if (exact) {
    return { status: "ready", memory: exact };
  }
  const hasOtherRevision = Object.values(store.routes).some(
    (route) => route.packageId === scope.packageId && route.revision !== scope.revision,
  );
  return { status: hasOtherRevision ? "incompatible" : "empty", memory: null };
}

export function recordScenePresented(scope: PlayerPathScope, fact: ScenePresentedFact): void {
  if (!fact.storyId || !fact.sceneId) {
    return;
  }
  const observedAt = timestamp(fact.observedAt);
  updateRoute(scope, (route) => {
    const key = sceneKey(fact.storyId, fact.sceneId);
    const previous = route.scenes[key];
    const choices = [...(previous?.choices ?? [])];
    for (const choice of fact.choices ?? []) {
      if (!choice.choiceId) {
        continue;
      }
      if (choices.some((entry) => entry.choiceId === choice.choiceId)) {
        continue;
      }
      choices.push({
        choiceId: choice.choiceId,
        label: choice.label,
        observedAt,
        selectedAt: null,
        source: resolveChoiceSource(choice.source),
      });
    }
    const scene: PlayerPathSceneFact = {
      storyId: fact.storyId,
      sceneId: fact.sceneId,
      title: previous?.title ?? fact.title ?? null,
      summary: previous?.summary ?? fact.summary ?? null,
      firstVisitedAt: previous?.firstVisitedAt ?? observedAt,
      lastVisitedAt: observedAt,
      choices,
    };
    return {
      ...route,
      scenes: { ...route.scenes, [key]: scene },
      current: { storyId: fact.storyId, sceneId: fact.sceneId, observedAt },
    };
  });
}

export function recordChoiceSelected(scope: PlayerPathScope, fact: ChoiceSelectedFact): void {
  if (!fact.storyId || !fact.sceneId || !fact.choiceId) {
    return;
  }
  const selectedAt = timestamp(fact.selectedAt);
  const source = resolveChoiceSource(fact.source);
  updateRoute(scope, (route) => {
    const key = sceneKey(fact.storyId, fact.sceneId);
    const previous = route.scenes[key];
    const choices = [...(previous?.choices ?? [])];
    const choiceIndex = choices.findIndex((choice) => choice.choiceId === fact.choiceId);
    if (choiceIndex >= 0) {
      const choice = choices[choiceIndex]!;
      const nextChoice: PlayerPathChoiceFact = {
        ...choice,
        // Prefer explicit selection source; keep prior source if selection omits one.
        source: fact.source ? source : resolveChoiceSource(choice.source),
      };
      if (!choice.selectedAt) {
        choices[choiceIndex] = { ...nextChoice, selectedAt };
      } else {
        choices[choiceIndex] = nextChoice;
      }
    } else {
      choices.push({
        choiceId: fact.choiceId,
        label: fact.label,
        observedAt: selectedAt,
        selectedAt,
        source,
      });
    }
    const scene: PlayerPathSceneFact = previous ?? {
      storyId: fact.storyId,
      sceneId: fact.sceneId,
      title: null,
      summary: null,
      firstVisitedAt: selectedAt,
      lastVisitedAt: selectedAt,
      choices: [],
    };
    return {
      ...route,
      scenes: { ...route.scenes, [key]: { ...scene, choices } },
    };
  });
}

/**
 * Runtime helper for ready AI-branch selection in VisualNovelPrototype.
 * Writes a deterministic AI fact (`source: "ai"`) for the current story/scene
 * before playback begins. Call path must be shared with tests.
 */
export function recordAiBranchSelection(scope: PlayerPathScope, fact: AiBranchSelectionFact): void {
  if (!fact.storyId || !fact.sceneId || !fact.label) {
    return;
  }
  recordChoiceSelected(scope, {
    storyId: fact.storyId,
    sceneId: fact.sceneId,
    choiceId: aiBranchChoiceId(fact.storyId, fact.sceneId),
    label: fact.label,
    selectedAt: fact.selectedAt,
    source: "ai",
  });
}

const EMPTY_OBSERVATION: PlayerGraphObservation = {
  visitedNodeIds: [],
  currentNodeId: null,
  observedChoices: [],
  selectedChoiceIds: [],
  seenSceneLabels: {},
  seenSceneExcerpts: {},
};

export function getPlayerPathObservation(scope: PlayerPathScope): PlayerGraphObservation {
  const result = getPlayerPathRoute(scope);
  if (result.status !== "ready") {
    return EMPTY_OBSERVATION;
  }
  const visitedNodeIds: string[] = [];
  const observedChoices: Array<{
    choiceId: string;
    storyId?: string | null;
    label?: string | null;
  }> = [];
  const selectedChoiceIds: Array<string | { choiceId: string; storyId?: string | null }> = [];
  const seenSceneLabels: Record<string, string> = {};
  const seenSceneExcerpts: Record<string, string> = {};

  for (const scene of Object.values(result.memory.scenes)) {
    const nodeId = narrativeSceneNodeId(scene.storyId, scene.sceneId);
    visitedNodeIds.push(nodeId);
    if (scene.title) {
      seenSceneLabels[nodeId] = scene.title;
    }
    if (scene.summary) {
      seenSceneExcerpts[nodeId] = scene.summary;
    }
    for (const choice of scene.choices) {
      if (!choice.choiceId) {
        continue;
      }
      observedChoices.push({
        storyId: scene.storyId,
        choiceId: choice.choiceId,
        label: choice.label,
      });
      if (choice.selectedAt) {
        selectedChoiceIds.push({ storyId: scene.storyId, choiceId: choice.choiceId });
      }
    }
  }

  return {
    visitedNodeIds,
    currentNodeId: result.memory.current
      ? narrativeSceneNodeId(result.memory.current.storyId, result.memory.current.sceneId)
      : null,
    observedChoices,
    selectedChoiceIds,
    seenSceneLabels,
    seenSceneExcerpts,
  };
}

/** Compatibility for the existing choice-history surface. */
export function getScenePathMemory(storyId: string, sceneId: string): readonly string[] {
  const key = sceneKey(storyId, sceneId);
  const selected = new Set<string>();
  for (const route of Object.values(loadStore().routes)) {
    for (const choice of route.scenes[key]?.choices ?? []) {
      if (!choice.selectedAt) {
        continue;
      }
      if (choice.choiceId) {
        selected.add(`id:${choice.choiceId}`);
      } else if (choice.label) {
        selected.add(choice.label);
      }
    }
  }
  try {
    const legacy = JSON.parse(localStorage.getItem(PATH_MEMORY_V1_KEY) ?? "{}") as V1MemoryMap;
    for (const token of legacy[key] ?? []) {
      if (typeof token === "string") {
        selected.add(token);
      }
    }
  } catch {
    // Corrupt legacy memory is ignored; v2 facts remain authoritative.
  }
  return [...selected];
}

export function wasChoiceTaken(
  storyId: string,
  sceneId: string,
  label: string,
  choiceId?: string | null,
): boolean {
  const memory = getScenePathMemory(storyId, sceneId);
  return (
    Boolean(choiceId && memory.includes(`id:${choiceId}`)) ||
    memory.includes(label) ||
    memory.includes(`label:${label}`)
  );
}
