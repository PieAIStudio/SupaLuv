import {
  resolveCharacter,
  storyCatalog,
  type StoryCatalogEntry,
  type StoryCatalogId,
} from "@supaluv/content";
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

  // Explicit companion from scene metadata.
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

  // When an NPC speaks, keep 苏明 as dimmed listener on the left.
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

  // 旁白 with only ambient suming portrait from scene.
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
    /** Legacy single bed — runtime still accepts this. */
    bgmKey: scene?.bgmKey ?? null,
    /**
     * Explicit beds. If only bgmKey is set, runtime classifies:
     * title-theme/soft-piano/chapter-end → music; night-ambient/lonely-pad → ambient.
     */
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
