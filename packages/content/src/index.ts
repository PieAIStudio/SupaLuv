import type {
  ChapterCheckpoint,
  PrototypeSceneCard,
  StoryCatalogRole,
  StoryPackageMeta,
  StorySeedManifest,
} from "@supaluv/shared";

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
export type StoryCatalogId = "draft-ch01" | "draft-ch02" | "prototype-act1" | "chapter-01-trial";

/** Retired production demo id — kept for save incompatibility detection only. */
export type RetiredStoryId = "ch01";

export type AnyKnownStoryId = StoryCatalogId | RetiredStoryId;

export const RETIRED_STORY_IDS = ["ch01"] as const satisfies readonly RetiredStoryId[];

export const DEFAULT_STORY_PACKAGE_ID = "draft-2026-07" as const;
export const DEFAULT_STORY_ID: StoryCatalogId = "draft-ch01";

const SHARED_INHERIT_VARS = [
  "dignity",
  "impulse",
  "told_breakup_flat",
  "closed_membership",
  "budget_900",
  "paid_snack",
  "admitted_breakup",
  "asked_guest",
  "applied_robot",
  "clue_subsidy_sms",
  "clue_rental_receipt",
  "clue_nda",
  "clue_pass_sms",
] as const;

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

/** Player-facing production catalog (title / new game). No chapter payloads. */
export const productionStoryCatalog: readonly StoryCatalogMeta[] = [
  {
    id: "draft-ch01",
    label: "第01章 · 你有病吧",
    packageId: DEFAULT_STORY_PACKAGE_ID,
    chapterIndex: 1,
    role: "production",
    checkpoint: { kind: "next_chapter", nextChapterId: "draft-ch02" },
    inheritVariableNames: SHARED_INHERIT_VARS,
  },
  {
    id: "draft-ch02",
    label: "第02章 · 她不会评判你",
    packageId: DEFAULT_STORY_PACKAGE_ID,
    chapterIndex: 2,
    role: "production",
    checkpoint: { kind: "draft_end" },
    inheritVariableNames: SHARED_INHERIT_VARS,
  },
] as const;

/** Dev fixture metadata (debug selector only). */
export const devStoryCatalog: readonly StoryCatalogMeta[] = [
  {
    id: "prototype-act1",
    label: "Prototype Act 1 · Comedy Beat Lab",
    packageId: "dev-prototype",
    chapterIndex: 1,
    role: "dev",
    checkpoint: { kind: "ai_ending_allowed" },
    inheritVariableNames: ["dignity", "impulse"],
  },
  {
    id: "chapter-01-trial",
    label: "Chapter 01 Trial / 管线dummy",
    packageId: "dev-trial",
    chapterIndex: 1,
    role: "dev",
    checkpoint: { kind: "ai_ending_allowed" },
    inheritVariableNames: ["dignity", "impulse"],
  },
] as const;

/** Full selectable catalog metadata; never includes retired ch01. */
export const storyCatalog: readonly StoryCatalogMeta[] = [
  ...productionStoryCatalog,
  ...devStoryCatalog,
] as const;

export const draft2026Package: StoryPackageMeta = {
  packageId: DEFAULT_STORY_PACKAGE_ID,
  label: "草稿两章 · 2026-07",
  startChapterId: "draft-ch01",
  chapterIds: ["draft-ch01", "draft-ch02"],
};

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
export { CHARACTER_BY_NAME, resolveCharacter } from "../characters/registry";
export type { CharacterDef, PortraitSide } from "../characters/registry";
export { CHARACTER_SLOTS, INITIAL_CHARACTER_MOODS } from "../characters/slots";
