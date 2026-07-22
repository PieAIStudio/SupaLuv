import type {
  ChapterCheckpoint,
  PrototypeSceneCard,
  StoryCatalogRole,
  StoryPackageMeta,
  StorySeedManifest,
} from "@supaluv/shared";
import storyCatalogJson from "../catalog/story-catalog.json";
import {
  DEFAULT_STORY_ID as GENERATED_DEFAULT_STORY_ID,
  DEFAULT_STORY_PACKAGE_ID as GENERATED_DEFAULT_STORY_PACKAGE_ID,
  DEV_STORY_CATALOG_IDS,
  PRODUCTION_STORY_CATALOG_IDS,
  STORY_CATALOG_IDS,
  type ProductionStoryCatalogId,
  type StoryCatalogId,
  type StoryPackageId,
} from "./story-catalog.generated";

export type { ProductionStoryCatalogId, StoryCatalogId, StoryPackageId };

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

/** Retired production demo id — kept for save incompatibility detection only. */
export type RetiredStoryId = "ch01";

export type AnyKnownStoryId = StoryCatalogId | RetiredStoryId;

export const RETIRED_STORY_IDS = ["ch01"] as const satisfies readonly RetiredStoryId[];

function assertStringArrayEquals(
  label: string,
  actual: readonly string[],
  expected: readonly string[],
): void {
  if (
    actual.length !== expected.length ||
    actual.some((value, index) => value !== expected[index])
  ) {
    throw new Error(
      `story-catalog.json: ${label} disagrees with story-catalog.generated.ts; regenerate catalog types`,
    );
  }
}

assertStringArrayEquals(
  "production chapter ids",
  storyCatalogJson.productionChapters.map((entry) => entry.id),
  PRODUCTION_STORY_CATALOG_IDS,
);
assertStringArrayEquals(
  "dev chapter ids",
  storyCatalogJson.devChapters.map((entry) => entry.id),
  DEV_STORY_CATALOG_IDS,
);
if (storyCatalogJson.defaultPackageId !== GENERATED_DEFAULT_STORY_PACKAGE_ID) {
  throw new Error(
    "story-catalog.json: defaultPackageId disagrees with story-catalog.generated.ts; regenerate catalog types",
  );
}

const storyCatalogIdSet: ReadonlySet<string> = new Set(STORY_CATALOG_IDS);
const productionStoryCatalogIdSet: ReadonlySet<string> = new Set(PRODUCTION_STORY_CATALOG_IDS);

function isStoryCatalogId(id: string): id is StoryCatalogId {
  return storyCatalogIdSet.has(id);
}

/** Data-only catalog SSOT shared with the Node NarrativeGraph generator. */
export const storyCatalogDocument = storyCatalogJson;

export const DEFAULT_STORY_PACKAGE_ID = GENERATED_DEFAULT_STORY_PACKAGE_ID;

/** Locale variants that authored chapter packages may ship. */
export type StoryContentLocale = "zh-CN" | "en";

/**
 * Lightweight catalog metadata only — no compiled JSON, raw Ink, or scene arrays.
 * Chapter payloads load through {@link loadStoryChapter}.
 */
export interface StoryCatalogMeta {
  readonly id: StoryCatalogId;
  /** Default zh-CN label retained for backward-compatible internal consumers. */
  readonly label: string;
  readonly labels: Readonly<Record<StoryContentLocale, string>>;
  readonly packageId: string;
  readonly chapterIndex: number;
  readonly role: StoryCatalogRole;
  readonly features: {
    readonly comedyMeters: boolean;
  };
  readonly voiceLanguages: readonly StoryContentLocale[];
  readonly inkFile: string;
  readonly manifestFile: string;
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

function toStoryCatalogRole(role: string, entryId: string): StoryCatalogRole {
  if (role === "production" || role === "dev" || role === "legacy") {
    return role;
  }
  throw new Error(`story-catalog.json: ${entryId} has unsupported role ${JSON.stringify(role)}`);
}

function toStoryContentLocale(language: string, entryId: string): StoryContentLocale {
  if (language === "zh-CN" || language === "en") {
    return language;
  }
  throw new Error(
    `story-catalog.json: ${entryId} has unsupported voice language ${JSON.stringify(language)}`,
  );
}

function toChapterCheckpoint(
  checkpoint: { readonly kind: string; readonly nextChapterId?: string },
  entryId: string,
): ChapterCheckpoint {
  if (checkpoint.kind === "next_chapter") {
    if (!checkpoint.nextChapterId || !isStoryCatalogId(checkpoint.nextChapterId)) {
      throw new Error(
        `story-catalog.json: ${entryId} next_chapter checkpoint must target a registered chapter`,
      );
    }
    return { kind: checkpoint.kind, nextChapterId: checkpoint.nextChapterId };
  }
  if (checkpoint.kind === "draft_end" || checkpoint.kind === "ai_ending_allowed") {
    return { kind: checkpoint.kind };
  }
  throw new Error(
    `story-catalog.json: ${entryId} has unsupported checkpoint kind ${JSON.stringify(checkpoint.kind)}`,
  );
}

function toCatalogMeta(entry: {
  readonly id: string;
  readonly labels: Readonly<Record<StoryContentLocale, string>>;
  readonly packageId: string;
  readonly chapterIndex: number;
  readonly role: string;
  readonly features: { readonly comedyMeters: boolean };
  readonly voice: { readonly languages: readonly string[] };
  readonly inkFile: string;
  readonly manifestFile: string;
  readonly checkpoint: { readonly kind: string; readonly nextChapterId?: string };
  readonly inheritVariableNames: readonly string[];
}): StoryCatalogMeta {
  if (!isStoryCatalogId(entry.id)) {
    throw new Error(
      `story-catalog.json: ${entry.id} is absent from story-catalog.generated.ts; regenerate catalog types`,
    );
  }
  if (!entry.labels["zh-CN"] || !entry.labels.en) {
    throw new Error(`story-catalog.json: ${entry.id} must define zh-CN and en labels`);
  }
  const role = toStoryCatalogRole(entry.role, entry.id);
  const voiceLanguages = entry.voice.languages.map((language) =>
    toStoryContentLocale(language, entry.id),
  );
  const checkpoint = toChapterCheckpoint(entry.checkpoint, entry.id);
  return {
    id: entry.id,
    label: entry.labels["zh-CN"],
    labels: entry.labels,
    packageId: entry.packageId,
    chapterIndex: entry.chapterIndex,
    role,
    features: entry.features,
    voiceLanguages,
    inkFile: entry.inkFile,
    manifestFile: entry.manifestFile,
    checkpoint,
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
  storyCatalogJson.packages.find((pkg) => pkg.packageId === GENERATED_DEFAULT_STORY_PACKAGE_ID) ??
  null;

if (!defaultPackage) {
  throw new Error("story-catalog.json: missing default package");
}
if (defaultPackage.startChapterId !== GENERATED_DEFAULT_STORY_ID) {
  throw new Error(
    "story-catalog.json: default startChapterId disagrees with story-catalog.generated.ts; regenerate catalog types",
  );
}

export const draft2026Package: StoryPackageMeta = {
  packageId: defaultPackage.packageId,
  label: defaultPackage.label,
  startChapterId: defaultPackage.startChapterId,
  chapterIds: defaultPackage.chapterIds,
};

export const DEFAULT_STORY_ID = GENERATED_DEFAULT_STORY_ID;

const metaById = new Map<StoryCatalogId, StoryCatalogMeta>(
  storyCatalog.map((entry) => [entry.id, entry]),
);

export function resolveStoryContentLocale(locale?: string | null): StoryContentLocale {
  if (!locale) {
    return "zh-CN";
  }
  const normalized = locale.trim().toLowerCase();
  if (normalized === "zh-cn" || normalized.startsWith("zh")) {
    return "zh-CN";
  }
  return "en";
}

export function getStoryLabel(id: StoryCatalogId, locale?: string | null): string {
  return getStoryCatalogMeta(id).labels[resolveStoryContentLocale(locale)];
}

type ChapterModule = {
  readonly scenes: readonly PrototypeSceneCard[];
  readonly compiled: unknown;
  /** English compiled Ink JSON when a translation ships; omit → fall back to Chinese. */
  readonly compiledEn?: unknown;
};

/**
 * Vite supports one-level variable dynamic imports. Keeping chapter modules named
 * after their catalog ids means catalog registration no longer needs a second
 * hand-maintained loader map; the explicit `.ts` suffix also works under tsx.
 */
function loadChapterModule(id: StoryCatalogId): Promise<ChapterModule> {
  return import(`./chapters/${id}.ts`) as Promise<ChapterModule>;
}

/** Cache key is `${storyId}::${contentLocale}` so zh/en payloads coexist. */
const chapterCache = new Map<string, LoadedStoryChapter>();

function chapterCacheKey(id: StoryCatalogId, contentLocale: StoryContentLocale): string {
  return `${id}::${contentLocale}`;
}

export function isProductionStoryId(id: string): id is ProductionStoryCatalogId {
  return productionStoryCatalogIdSet.has(id);
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
 * Cached per (chapter, content locale). English requests fall back to Chinese
 * when that chapter has no `compiledEn` (e.g. prototype-act1).
 */
export async function loadStoryChapter(
  id: StoryCatalogId,
  locale: string = "zh-CN",
): Promise<LoadedStoryChapter> {
  const contentLocale = resolveStoryContentLocale(locale);
  const cacheKey = chapterCacheKey(id, contentLocale);
  const cached = chapterCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const meta = getStoryCatalogMeta(id);
  const mod = await loadChapterModule(id);
  const compiledPayload =
    contentLocale === "en" && mod.compiledEn !== undefined ? mod.compiledEn : mod.compiled;
  const loaded: LoadedStoryChapter = {
    meta,
    scenes: mod.scenes,
    compiledStoryJson: asCompiledJson(compiledPayload),
  };
  chapterCache.set(cacheKey, loaded);
  return loaded;
}

/** Sync read of a previously loaded chapter (throws if not loaded for that locale). */
export function getLoadedStoryChapter(
  id: StoryCatalogId,
  locale: string = "zh-CN",
): LoadedStoryChapter {
  const cached = getCachedStoryChapter(id, locale);
  if (!cached) {
    throw new Error(
      `Story chapter "${id}" (${resolveStoryContentLocale(locale)}) is not loaded yet. Call loadStoryChapter first.`,
    );
  }
  return cached;
}

/**
 * Sync peek of a cached chapter.
 * When locale is omitted, prefers zh-CN then any loaded locale (scenes are shared).
 */
export function getCachedStoryChapter(
  id: StoryCatalogId,
  locale?: string,
): LoadedStoryChapter | null {
  if (locale !== undefined) {
    return chapterCache.get(chapterCacheKey(id, resolveStoryContentLocale(locale))) ?? null;
  }
  return (
    chapterCache.get(chapterCacheKey(id, "zh-CN")) ??
    chapterCache.get(chapterCacheKey(id, "en")) ??
    null
  );
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
export {
  CHARACTER_BY_NAME,
  resolveCharacter,
  resolveCharacterDisplayName,
} from "../characters/registry";
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
