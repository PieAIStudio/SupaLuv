/**
 * Deep module: one call writes a complete local save (Ink + presentation).
 * Callers never assemble GameSavePayload field-by-field.
 */

import type { InkStoryRunner, InkStorySnapshot } from "../story/inkStoryRunner";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { getStoryDefinition, type StoryId } from "../story/storyMapAdapter";
import {
  presentationFromSnapshot,
  SAVE_VERSION,
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
  readonly inheritedVariables?: Readonly<Record<string, unknown>>;
}): SavePresentation {
  const presentation = presentationFromSnapshot(
    input.presentationSnapshot ?? input.runner.getSnapshot(),
  );
  const definition = getStoryDefinition(input.storyId);
  writeSave({
    version: SAVE_VERSION,
    slotId: input.slotId,
    storyId: input.storyId,
    packageId: definition.packageId,
    inkStateJson: input.runner.exportStateJson(),
    label: definition.label,
    savedAt: new Date().toISOString(),
    unlocks: input.unlocks,
    chapterHint: input.chapterHint ?? presentation.sceneId ?? undefined,
    presentation,
    ...(input.characterBindings ? { characterBindings: input.characterBindings } : {}),
    ...(input.inheritedVariables ? { inheritedVariables: input.inheritedVariables } : {}),
  });
  return presentation;
}
