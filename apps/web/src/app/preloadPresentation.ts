/**
 * Atomic presentation preload for title and story entry.
 * Behavior-preserving extract from App.tsx — owns module preloaders used by
 * both the shell and StorySession's preloadPresentation callback.
 */

import {
  createModulePreloader,
  preloadDecodedImage,
  preloadDecodedImages,
  TITLE_CRITICAL_ASSETS,
  waitForDocumentFonts,
} from "../loading/atomicLoading";
import type { StoryId } from "../story/storyMapAdapter";
import type { StoryRuntime } from "../story/session/storyRuntime";

export const loadTitleScreenModule = createModulePreloader(() => import("../views/TitleScreen"));

export const loadStoryMapPreviewModule = createModulePreloader(
  () => import("../views/StoryMapPreview"),
);

export const loadPlayerPathPanelModule = createModulePreloader(
  () => import("../views/PlayerPathPanel"),
);

export const loadVisualNovelModule = createModulePreloader(
  () => import("../views/VisualNovelPrototype"),
);

export const loadCharacterStudioModule = createModulePreloader(
  () => import("../views/CharacterStudioScreen"),
);

export async function preloadTitlePresentation(): Promise<void> {
  await Promise.all([
    loadTitleScreenModule(),
    preloadDecodedImages(TITLE_CRITICAL_ASSETS),
    waitForDocumentFonts(),
  ]);
}

export async function preloadStoryPresentation(
  runtime: StoryRuntime,
  nextStoryId: StoryId,
  sceneId: string | null,
): Promise<void> {
  const scene = runtime.getStoryScene(nextStoryId, sceneId);
  const artPromise = scene?.artKey
    ? preloadDecodedImage(`/assets/scenes/${scene.artKey}.jpg`)
    : Promise.resolve();
  await Promise.all([
    loadVisualNovelModule(),
    loadStoryMapPreviewModule(),
    loadPlayerPathPanelModule(),
    artPromise,
    waitForDocumentFonts(),
  ]);
}
