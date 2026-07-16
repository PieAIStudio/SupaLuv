/**
 * Shell-owned settings / display-name / portrait-pack persistence effects.
 * Behavior-preserving extract from App.tsx.
 */

import { useEffect } from "react";
import { DialogueVoicePlaybackGuard } from "../audio/dialogueVoicePlaybackGuard";
import { syncGameAudioFromSettings } from "../audio/syncGameAudioFromSettings";
import type { AchievementId } from "../persistence/achievements";
import { saveDisplayNames, type DisplayNameMap } from "../persistence/displayNames";
import {
  hasCustomPortraitPack,
  savePortraitPack,
  type PortraitPackState,
} from "../persistence/portraitPack";
import { saveSettings, type GameSettings } from "../persistence/settings";

export function useShellPersistence(input: {
  readonly settings: GameSettings;
  readonly displayNames: DisplayNameMap;
  readonly portraitPack: PortraitPackState;
  readonly dialogueVoiceGuard: DialogueVoicePlaybackGuard;
  readonly dialogueVoiceRunKey: string;
  readonly tryAchievement: (id: AchievementId) => void;
}): void {
  const {
    settings,
    displayNames,
    portraitPack,
    dialogueVoiceGuard,
    dialogueVoiceRunKey,
    tryAchievement,
  } = input;
  const voiceEnabled = settings.voiceVolume > 0;

  useEffect(() => {
    // Required while Settings is mounted (player unmounted): zero still suppresses
    // the last observed line so remount cannot restart it.
    dialogueVoiceGuard.syncVolume({
      runKey: dialogueVoiceRunKey,
      voiceEnabled,
    });
  }, [dialogueVoiceGuard, dialogueVoiceRunKey, voiceEnabled]);

  useEffect(() => {
    syncGameAudioFromSettings(settings);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveDisplayNames(displayNames);
  }, [displayNames]);

  useEffect(() => {
    savePortraitPack(portraitPack);
    if (hasCustomPortraitPack(portraitPack)) {
      tryAchievement("custom_pack_active");
    }
  }, [portraitPack, tryAchievement]);
}
