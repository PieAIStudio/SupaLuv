/**
 * Deep module: one call writes a complete local save (Ink + presentation).
 * Callers never assemble GameSavePayload field-by-field.
 */

import type { InkStoryRunner, InkStorySnapshot } from "../story/inkStoryRunner";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { getStoryDefinition, type StoryId } from "../story/storyMapAdapter";
import {
  presentationFromSnapshot,
  writeSave,
  type GalleryUnlocks,
  type SavePresentation,
} from "./gameSave";

export function writeStorySave(input: {
  readonly runner: InkStoryRunner;
  readonly storyId: StoryId;
  readonly unlocks: GalleryUnlocks;
  readonly slotId: string;
  readonly chapterHint?: string;
  readonly presentationSnapshot?: InkStorySnapshot;
  readonly characterBindings?: StoryCharacterBindings;
}): SavePresentation {
  const presentation = presentationFromSnapshot(
    input.presentationSnapshot ?? input.runner.getSnapshot(),
  );
  writeSave({
    version: 1,
    slotId: input.slotId,
    storyId: input.storyId,
    inkStateJson: input.runner.exportStateJson(),
    label: getStoryDefinition(input.storyId).label,
    savedAt: new Date().toISOString(),
    unlocks: input.unlocks,
    chapterHint: input.chapterHint ?? presentation.sceneId ?? undefined,
    presentation,
    ...(input.characterBindings ? { characterBindings: input.characterBindings } : {}),
  });
  return presentation;
}
