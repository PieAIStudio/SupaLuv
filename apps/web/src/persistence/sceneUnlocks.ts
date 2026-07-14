/**
 * Gallery unlocks derived from scene presentation — pure, no React.
 * App + future chapters call this when advancing scenes.
 */

import { getStoryScene, type StoryId } from "../story/storyMapAdapter";
import { archiveIdsForScene } from "./algorithmShameArchive";
import type { GalleryUnlocks } from "./gameSave";

export function unlocksFromScene(
  storyId: StoryId,
  sceneId: string | null,
): Partial<GalleryUnlocks> {
  const archive = [...archiveIdsForScene(sceneId)];
  const scene = getStoryScene(storyId, sceneId);
  if (!scene) {
    return archive.length > 0 ? { archive } : {};
  }
  return {
    images: scene.artKey ? [scene.artKey] : [],
    videos: scene.videoKey ? [scene.videoKey] : [],
    audio: [scene.bgmKey, scene.musicKey, scene.ambientKey, scene.sfxKey].filter(
      (value): value is string => Boolean(value),
    ),
    archive,
  };
}

export function unlockCount(unlocks: GalleryUnlocks): number {
  return (
    unlocks.images.length +
    unlocks.videos.length +
    unlocks.audio.length +
    (unlocks.archive?.length ?? 0)
  );
}
