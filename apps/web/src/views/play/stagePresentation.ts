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
import { resolveCharacterPortrait } from "../../characters/portraitResolver";
import type { StoryCharacterBindings } from "../../characters/characterPackTypes";
import type { StagePortrait } from "../../story/storyMapAdapter";

export type StageMotion = "slow_push" | "drift" | "flash" | "none";

export function resolveStageMotion(
  cue: Exclude<StageMotion, "none"> | undefined,
  prefersReducedMotion: boolean,
): StageMotion {
  return prefersReducedMotion ? "none" : (cue ?? "none");
}

export function mapPortraitsForPlayer(
  portraits: readonly StagePortrait[],
  displayNames: DisplayNameMap,
  portraitPack: PortraitPackState,
  characterBindings: StoryCharacterBindings = {},
): StagePortrait[] {
  return portraits.map((p) => ({
    ...p,
    name: resolveDisplaySpeaker(p.name, displayNames),
    fallbackUrl: rewritePortraitUrl(p.url, portraitPack),
    url: resolveBoundPortrait(p, characterBindings, rewritePortraitUrl(p.url, portraitPack)),
  }));
}

function resolveBoundPortrait(
  portrait: StagePortrait,
  bindings: StoryCharacterBindings,
  fallback: string,
): string {
  const stem = /\/([^/]+)\.png(?:[?#].*)?$/.exec(portrait.url)?.[1] ?? "";
  const slotId =
    portrait.name === "苏明" || stem.startsWith("suming")
      ? "lead_suming"
      : portrait.name === "周鹿" ||
          portrait.name === "林晓棠" ||
          stem.startsWith("zhou") ||
          stem.startsWith("lin")
        ? "lead_zhou_lu"
        : portrait.name === "艾拉" || stem.startsWith("aila")
          ? "robot_aila"
          : portrait.name === "凯" || stem.startsWith("kai")
            ? "robot_kai"
            : null;
  if (!slotId) return fallback;
  const mood =
    stem.includes("happy") || stem.includes("tempted")
      ? "happy"
      : stem.includes("shame") || stem.includes("awkward")
        ? "awkward"
        : stem.includes("panic") || stem.includes("surprise")
          ? "surprised"
          : stem.includes("lonely") || stem.includes("sad")
            ? "sad"
            : stem.includes("angry") || stem.includes("restless")
              ? "angry"
              : "neutral";
  return resolveCharacterPortrait(slotId, mood, bindings, fallback);
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
