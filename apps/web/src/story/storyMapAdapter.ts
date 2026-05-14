import { storyCatalog, type StoryCatalogEntry, type StoryCatalogId } from "@supaluv/content";
import {
  buildStoryMapFromScenes,
  toMermaidFlowchart,
  type PrototypeSceneCard,
  type StoryMap,
} from "@supaluv/shared";

export type StoryId = StoryCatalogId;

type StoryDefinition = StoryCatalogEntry;

const storyDefinitions = new Map<StoryId, StoryDefinition>(
  storyCatalog.map((story) => [story.id, story] as const),
);

export function getStoryDefinition(storyId: StoryId): StoryDefinition {
  const story = storyDefinitions.get(storyId);

  if (!story) {
    throw new Error(`Unknown story id: ${storyId}`);
  }

  return story;
}

export function getStoryScene(storyId: StoryId, sceneId: string | null): PrototypeSceneCard | null {
  if (!sceneId) {
    return null;
  }

  return getStoryDefinition(storyId).scenes.find((scene) => scene.id === sceneId) ?? null;
}

export function getStorySceneChoices(storyId: StoryId, sceneId: string | null) {
  return getStoryScene(storyId, sceneId)?.choices ?? [];
}

export function getStoryPresentation(storyId: StoryId, sceneId: string | null) {
  const scene = getStoryScene(storyId, sceneId);

  return {
    backgroundKey: scene?.backgroundKey ?? "office-night",
    speaker: scene?.speaker ?? "旁白",
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
