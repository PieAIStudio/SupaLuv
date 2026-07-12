import {
  getCachedStoryChapter,
  getStoryCatalogMeta,
  loadStoryChapter,
  productionStoryCatalog,
  storyCatalog,
  type LoadedStoryChapter,
  type StoryCatalogId,
  type StoryCatalogMeta,
} from "@supaluv/content";
import {
  buildStoryMapFromScenes,
  toMermaidFlowchart,
  type PrototypeSceneCard,
  type StoryMap,
} from "@supaluv/shared";
import { resolveCharacter } from "@supaluv/content";

export type StoryId = StoryCatalogId;

/** Loaded chapter definition used by play surface (meta + presentation). */
export type StoryDefinition = StoryCatalogMeta & {
  readonly scenes: readonly PrototypeSceneCard[];
  readonly compiledStoryJson: string;
};

export function listProductionStoryIds(): readonly StoryId[] {
  return productionStoryCatalog.map((entry) => entry.id);
}

export function listSelectableStoryIds(includeDev: boolean): readonly StoryId[] {
  if (includeDev) {
    return storyCatalog.map((entry) => entry.id);
  }
  return listProductionStoryIds();
}

/**
 * Ensure chapter presentation + compiled JSON are loaded into the content cache.
 * Call from async story actions (new game / continue / chapter advance) — never from render.
 */
export async function ensureStoryLoaded(storyId: StoryId): Promise<LoadedStoryChapter> {
  return loadStoryChapter(storyId);
}

export function getStoryDefinition(storyId: StoryId): StoryDefinition {
  const meta = getStoryCatalogMeta(storyId);
  const loaded = getCachedStoryChapter(storyId);
  if (!loaded) {
    throw new Error(
      `Story presentation for "${storyId}" is not loaded. Call ensureStoryLoaded / createInkStoryRunnerForId first.`,
    );
  }
  return {
    ...meta,
    scenes: loaded.scenes,
    compiledStoryJson: loaded.compiledStoryJson,
  };
}

/** Meta-only fields that do not require chapter payload (label, checkpoint, inherit vars). */
export function getStoryMeta(storyId: StoryId): StoryCatalogMeta {
  return getStoryCatalogMeta(storyId);
}

export function getStoryScene(storyId: StoryId, sceneId: string | null): PrototypeSceneCard | null {
  if (!sceneId) {
    return null;
  }
  return getStoryDefinition(storyId).scenes.find((scene) => scene.id === sceneId) ?? null;
}

export function getStorySceneChoices(storyId: StoryId, sceneId: string | null) {
  // Topology lives in Ink; manifests no longer hand-author edges for production drafts.
  return getStoryScene(storyId, sceneId)?.choices ?? [];
}

export function getChapterCheckpoint(storyId: StoryId) {
  return getStoryMeta(storyId).checkpoint;
}

export interface StagePortrait {
  readonly name: string;
  readonly url: string;
  readonly side: "left" | "right";
  readonly active: boolean;
  readonly fallbackUrl?: string;
}

function portraitUrl(stem: string): string {
  return `/assets/portraits/${stem}.png`;
}

export function getStoryPresentation(storyId: StoryId, sceneId: string | null) {
  const scene = getStoryScene(storyId, sceneId);
  const artKey = scene?.artKey;
  const videoKey = scene?.videoKey;
  const speaker = scene?.speaker ?? "旁白";
  const primaryChar = resolveCharacter(speaker);
  const portraits: StagePortrait[] = [];

  if (primaryChar) {
    const moodKey =
      primaryChar.id === "suming" && scene?.portraitKey?.startsWith("suming")
        ? scene.portraitKey
        : primaryChar.defaultPortrait;
    portraits.push({
      name: primaryChar.name,
      url: portraitUrl(moodKey),
      side: primaryChar.side,
      active: true,
    });
  } else if (scene?.portraitKey) {
    portraits.push({
      name: speaker,
      url: portraitUrl(scene.portraitKey),
      side: "left",
      active: true,
    });
  }

  if (scene?.companionPortraitKey) {
    const companionName = scene.companionSpeaker ?? "同伴";
    const companionChar = resolveCharacter(companionName);
    portraits.push({
      name: companionName,
      url: portraitUrl(scene.companionPortraitKey),
      side: companionChar?.side ?? "right",
      active: false,
    });
  }

  if (speaker !== "苏明" && speaker !== "旁白") {
    const suming = resolveCharacter("苏明");
    if (suming && !portraits.some((portrait) => portrait.name === "苏明")) {
      const moodKey =
        scene?.portraitKey?.startsWith("suming") && speaker !== "苏明"
          ? scene.portraitKey
          : suming.defaultPortrait;
      portraits.push({
        name: suming.name,
        url: portraitUrl(moodKey),
        side: "left",
        active: false,
      });
    }
  }

  if (speaker === "旁白" && scene?.portraitKey?.startsWith("suming")) {
    if (!portraits.some((portrait) => portrait.name === "苏明")) {
      portraits.push({
        name: "苏明",
        url: portraitUrl(scene.portraitKey),
        side: "left",
        active: true,
      });
    }
  }

  return {
    backgroundKey: scene?.backgroundKey ?? "office-night",
    artUrl: artKey ? `/assets/scenes/${artKey}.jpg` : null,
    portraitUrl: scene?.portraitKey ? portraitUrl(scene.portraitKey) : null,
    portraits,
    videoUrl: videoKey ? `/assets/video/${videoKey}.mp4` : null,
    cutsceneTitle: scene?.cutsceneTitle ?? "事件 CG",
    bgmKey: scene?.bgmKey ?? null,
    musicKey: scene?.musicKey ?? null,
    ambientKey: scene?.ambientKey ?? null,
    sfxKey: scene?.sfxKey ?? null,
    speaker,
    mood: scene?.mood ?? "neutral",
  };
}

export function getStoryMapPreview(storyId: StoryId): {
  readonly map: StoryMap;
  readonly mermaid: string;
} {
  const map = buildStoryMapFromScenes(getStoryDefinition(storyId).scenes);
  return {
    map,
    mermaid: toMermaidFlowchart(map),
  };
}

export { getStoryCatalogMeta as getStoryCatalogEntry };
