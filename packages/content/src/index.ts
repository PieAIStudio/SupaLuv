import type {
  ChapterCheckpoint,
  PrototypeSceneCard,
  StoryCatalogRole,
  StoryPackageMeta,
  StorySeedManifest,
} from "@supaluv/shared";
import storyCatalogJson from "../catalog/story-catalog.json";

export const superLoverSeedManifest = {
  id: "super-lover-p0-seed",
  runtimeBaseline: "react-inkjs",
  visualCandidate: "react",
  sourceMaterial: {
    ipTitle: "超级爱人",
    projectPath: "docs/reference/source-material/super-lover-outline.md",
    canonicalLocation: "Obsidian vault source outline",
    readOnly: true,
  },
  boundary: {
    publicRuntimeAi: "out-of-scope-for-p0",
    accounts: "defer",
    payments: "defer",
    multiplayer: "not-applicable",
  },
} satisfies StorySeedManifest;

/** Production + dev selectable story ids. Legacy ch01 is intentionally excluded. */
export type StoryCatalogId =
  | "draft-ch01"
  | "draft-ch02"
  | "draft-ch03"
  | "prototype-act1"
  | "chapter-01-trial";

/** Retired production demo id — kept for save incompatibility detection only. */
export type RetiredStoryId = "ch01";

export type AnyKnownStoryId = StoryCatalogId | RetiredStoryId;

export const RETIRED_STORY_IDS = ["ch01"] as const satisfies readonly RetiredStoryId[];

/** Data-only catalog SSOT shared with the Node NarrativeGraph generator. */
export const storyCatalogDocument = storyCatalogJson;

export const DEFAULT_STORY_PACKAGE_ID = storyCatalogJson.defaultPackageId as "draft-2026-07";

/**
 * Lightweight catalog metadata only — no compiled JSON, raw Ink, or scene arrays.
 * Chapter payloads load through {@link loadStoryChapter}.
 */
export interface StoryCatalogMeta {
  readonly id: StoryCatalogId;
  readonly label: string;
  readonly packageId: string;
  readonly chapterIndex: number;
  readonly role: StoryCatalogRole;
  readonly checkpoint: ChapterCheckpoint;
  readonly inheritVariableNames: readonly string[];
}

/** Fully loaded chapter presentation + precompiled Ink JSON. */
export interface LoadedStoryChapter {
  readonly meta: StoryCatalogMeta;
  readonly scenes: readonly PrototypeSceneCard[];
  readonly compiledStoryJson: string;
}

/**
 * Backward-compatible catalog entry shape after a chapter is loaded.
 * Prefer {@link StoryCatalogMeta} + {@link loadStoryChapter} for new code.
 */
export interface StoryCatalogEntry extends StoryCatalogMeta {
  readonly scenes: readonly PrototypeSceneCard[];
  readonly compiledStoryJson: string | null;
  /** @deprecated Production never ships raw Ink; empty for production chapters. */
  readonly inkSource: string;
}

function asCompiledJson(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function toCatalogMeta(entry: {
  readonly id: string;
  readonly label: string;
  readonly packageId: string;
  readonly chapterIndex: number;
  readonly role: string;
  readonly checkpoint: { readonly kind: string; readonly nextChapterId?: string };
  readonly inheritVariableNames: readonly string[];
}): StoryCatalogMeta {
  return {
    id: entry.id as StoryCatalogId,
    label: entry.label,
    packageId: entry.packageId,
    chapterIndex: entry.chapterIndex,
    role: entry.role as StoryCatalogRole,
    checkpoint: entry.checkpoint as ChapterCheckpoint,
    inheritVariableNames: entry.inheritVariableNames,
  };
}

/** Player-facing production catalog (title / new game). No chapter payloads. */
export const productionStoryCatalog: readonly StoryCatalogMeta[] =
  storyCatalogJson.productionChapters.map((entry) => toCatalogMeta(entry));

/** Dev fixture metadata (debug selector only). */
export const devStoryCatalog: readonly StoryCatalogMeta[] = storyCatalogJson.devChapters.map(
  (entry) => toCatalogMeta(entry),
);

/** Full selectable catalog metadata; never includes retired ch01. */
export const storyCatalog: readonly StoryCatalogMeta[] = [
  ...productionStoryCatalog,
  ...devStoryCatalog,
] as const;

const defaultPackage =
  storyCatalogJson.packages.find((pkg) => pkg.packageId === storyCatalogJson.defaultPackageId) ??
  storyCatalogJson.packages[0];

if (!defaultPackage) {
  throw new Error("story-catalog.json: missing default package");
}

export const draft2026Package: StoryPackageMeta = {
  packageId: defaultPackage.packageId,
  label: defaultPackage.label,
  startChapterId: defaultPackage.startChapterId,
  chapterIds: defaultPackage.chapterIds,
};

export const DEFAULT_STORY_ID: StoryCatalogId = defaultPackage.startChapterId as StoryCatalogId;

const metaById = new Map<StoryCatalogId, StoryCatalogMeta>(
  storyCatalog.map((entry) => [entry.id, entry]),
);

type ChapterModule = {
  readonly scenes: readonly PrototypeSceneCard[];
  readonly compiled: unknown;
};

const chapterLoaders: Record<StoryCatalogId, () => Promise<ChapterModule>> = {
  "draft-ch01": () => import("./chapters/draft-ch01"),
  "draft-ch02": () => import("./chapters/draft-ch02"),
  "draft-ch03": () => import("./chapters/draft-ch03"),
  "prototype-act1": () => import("./chapters/prototype-act1"),
  "chapter-01-trial": () => import("./chapters/chapter-01-trial"),
};

const chapterCache = new Map<StoryCatalogId, LoadedStoryChapter>();

export function isProductionStoryId(id: string): id is StoryCatalogId {
  return productionStoryCatalog.some((entry) => entry.id === id);
}

export function isRetiredStoryId(id: string): id is RetiredStoryId {
  return (RETIRED_STORY_IDS as readonly string[]).includes(id);
}

export function getStoryCatalogMeta(id: StoryCatalogId): StoryCatalogMeta {
  const entry = metaById.get(id);
  if (!entry) {
    throw new Error(`Unknown story id: ${id}`);
  }
  return entry;
}

/** @deprecated Use {@link getStoryCatalogMeta}; does not include chapter payload. */
export function getStoryCatalogEntry(id: StoryCatalogId): StoryCatalogMeta {
  return getStoryCatalogMeta(id);
}

/**
 * Async load of one chapter's compiled Ink + presentation scenes.
 * Cached after first load; does not pull other chapters.
 */
export async function loadStoryChapter(id: StoryCatalogId): Promise<LoadedStoryChapter> {
  const cached = chapterCache.get(id);
  if (cached) {
    return cached;
  }
  const meta = getStoryCatalogMeta(id);
  const mod = await chapterLoaders[id]();
  const loaded: LoadedStoryChapter = {
    meta,
    scenes: mod.scenes,
    compiledStoryJson: asCompiledJson(mod.compiled),
  };
  chapterCache.set(id, loaded);
  return loaded;
}

/** Sync read of a previously loaded chapter (throws if not loaded). */
export function getLoadedStoryChapter(id: StoryCatalogId): LoadedStoryChapter {
  const cached = chapterCache.get(id);
  if (!cached) {
    throw new Error(`Story chapter "${id}" is not loaded yet. Call loadStoryChapter first.`);
  }
  return cached;
}

export function getCachedStoryChapter(id: StoryCatalogId): LoadedStoryChapter | null {
  return chapterCache.get(id) ?? null;
}

/** Test helper: clear chapter payload cache between cases. */
export function clearStoryChapterCache(): void {
  chapterCache.clear();
}

/**
 * Legacy demo package retained only for archive/tests — not selectable in production.
 * Raw Ink is not bundled here; tests read `ink/legacy/ch01.ink` from disk.
 */
export const legacyCh01Archive = {
  id: "ch01" as const,
  label: "（已退休）第01章 · 不会嫌弃你",
  role: "legacy" as const,
};

export type { StorySeedManifest } from "@supaluv/shared";
export {
  PROP_CUTIN_CATALOG,
  resolvePropCutIn,
  type PropCutInDefinition,
  type PropCutInId,
} from "./propCatalog";
export { CHARACTER_BY_NAME, resolveCharacter } from "../characters/registry";
export type { CharacterDef, PortraitSide } from "../characters/registry";
export { CHARACTER_SLOTS, INITIAL_CHARACTER_MOODS } from "../characters/slots";

/**
 * Production-safe NarrativeGraph skeleton only.
 * The full creator graph is Node/dev-only and is not re-exported here.
 */
export {
  getNarrativeGraphPlayerSkeleton,
  narrativeGraphPlayerSkeleton,
} from "./narrative-graph-player";
