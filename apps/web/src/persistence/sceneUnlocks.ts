/**
 * Gallery unlocks derived from scene presentation — pure, no React.
 * App + future chapters call this when advancing scenes.
 */

import { getStoryScene, type StoryId } from "../story/storyMapAdapter";
import type { GalleryUnlocks } from "./gameSave";

export function unlocksFromScene(
  storyId: StoryId,
  sceneId: string | null,
): Partial<GalleryUnlocks> {
  const scene = getStoryScene(storyId, sceneId);
  if (!scene) {
    return {};
  }
  return {
    images: scene.artKey ? [scene.artKey] : [],
    videos: scene.videoKey ? [scene.videoKey] : [],
    audio: [scene.bgmKey, scene.musicKey, scene.ambientKey, scene.sfxKey].filter(
      (value): value is string => Boolean(value),
    ),
  };
}

export function unlockCount(unlocks: GalleryUnlocks): number {
  return unlocks.images.length + unlocks.videos.length + unlocks.audio.length;
}
