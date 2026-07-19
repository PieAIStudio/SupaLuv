/**
 * Pure presentation remaps for the play stage.
 * Keeps VisualNovelPrototype from owning display-name / pack math inline.
 */

import { resolveCharacterDisplayName } from "@supaluv/content";
import {
  applyDisplayNamesInText,
  DEFAULT_DISPLAY_NAMES,
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
  locale = "zh-CN",
): StagePortrait[] {
  return portraits.map((p) => ({
    ...p,
    name: resolveLocalizedDisplaySpeaker(p.name, displayNames, locale),
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

/**
 * Locale-aware nameplate: registry enName for non-zh UI, then player lead renames.
 * Authored speaker strings stay Chinese (manifest SSOT).
 */
export function resolveLocalizedDisplaySpeaker(
  speaker: string,
  displayNames: DisplayNameMap,
  locale = "zh-CN",
): string {
  if (!speaker) {
    return speaker;
  }
  // Player renamed a lead away from the Chinese default — always honor that.
  if (
    (speaker === "苏明" || speaker === "suming") &&
    displayNames.suming !== DEFAULT_DISPLAY_NAMES.suming
  ) {
    return displayNames.suming;
  }
  if (
    (speaker === "石佩欣" ||
      speaker === "lin_xiaotang" ||
      speaker === "林晓棠" ||
      speaker === "周鹿") &&
    displayNames.lin_xiaotang !== DEFAULT_DISPLAY_NAMES.lin_xiaotang
  ) {
    return displayNames.lin_xiaotang;
  }
  if (speaker === displayNames.suming && displayNames.suming !== DEFAULT_DISPLAY_NAMES.suming) {
    return displayNames.suming;
  }
  if (
    speaker === displayNames.lin_xiaotang &&
    displayNames.lin_xiaotang !== DEFAULT_DISPLAY_NAMES.lin_xiaotang
  ) {
    return displayNames.lin_xiaotang;
  }
  const localized = resolveCharacterDisplayName(speaker, locale);
  if (localized) {
    return localized;
  }
  return resolveDisplaySpeaker(speaker, displayNames);
}

export function mapDialogueForPlayer(
  speaker: string,
  text: string,
  displayNames: DisplayNameMap,
  locale = "zh-CN",
): { speaker: string; text: string } {
  return {
    speaker: resolveLocalizedDisplaySpeaker(speaker, displayNames, locale),
    text: applyDisplayNamesInText(text, displayNames),
  };
}
