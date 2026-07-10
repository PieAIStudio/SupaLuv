/**
 * Pure presentation remaps for the play stage.
 * Keeps VisualNovelPrototype from owning display-name / pack math inline.
 */

import {
  applyDisplayNamesInText,
  resolveDisplaySpeaker,
  type DisplayNameMap,
} from "../../persistence/displayNames";
import { rewritePortraitUrl, type PortraitPackState } from "../../persistence/portraitPack";
import type { StagePortrait } from "../../story/storyMapAdapter";

export function mapPortraitsForPlayer(
  portraits: readonly StagePortrait[],
  displayNames: DisplayNameMap,
  portraitPack: PortraitPackState,
): StagePortrait[] {
  return portraits.map((p) => ({
    ...p,
    name: resolveDisplaySpeaker(p.name, displayNames),
    url: rewritePortraitUrl(p.url, portraitPack),
  }));
}

export function mapDialogueForPlayer(
  speaker: string,
  text: string,
  displayNames: DisplayNameMap,
): { speaker: string; text: string } {
  return {
    speaker: resolveDisplaySpeaker(speaker, displayNames),
    text: applyDisplayNamesInText(text, displayNames),
  };
}
