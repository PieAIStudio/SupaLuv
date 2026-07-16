/**
 * Pure presentation remaps for the play stage.
 * Keeps VisualNovelPrototype from owning display-name / pack math inline.
 */

import {
  applyDisplayNamesInText,
  resolveDisplaySpeaker,
  type DisplayNameMap,
} from "../../../persistence/displayNames";
import { rewritePortraitUrl, type PortraitPackState } from "../../../persistence/portraitPack";
import { resolveCharacterPortrait } from "../../../characters/portraitResolver";
import type { StoryCharacterBindings } from "../../../characters/characterPackTypes";
import type { StagePortrait } from "../../../story/storyMapAdapter";

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
  // Bind the player's cast actor by canonical character NAME only. File-stem
  // matching over-reached: NPCs (雷欧/老板娘/陈佳) reusing zhou*/lin* placeholder
  // art inherited the female lead's face — with real-person uploads that leaks
  // the player's photo onto unrelated characters.
  const slotId =
    portrait.name === "苏明"
      ? "lead_suming"
      : portrait.name === "石佩欣" || portrait.name === "周鹿" || portrait.name === "林晓棠"
        ? "lead_zhou_lu"
        : portrait.name === "艾拉"
          ? "robot_aila"
          : portrait.name === "凯"
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
