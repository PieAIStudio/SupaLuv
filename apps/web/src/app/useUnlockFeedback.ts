/**
 * Global unlock toast + achievement celebration for the product shell.
 * Behavior-preserving extract from App.tsx.
 */

import { useCallback, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";
import {
  unlockAchievement,
  type AchievementDef,
  type AchievementId,
} from "../persistence/achievements";

export type UnlockFeedback = {
  readonly unlockToast: string | null;
  readonly showUnlockToast: (message: string) => void;
  readonly tryAchievement: (id: AchievementId) => void;
};

export function useUnlockFeedback(): UnlockFeedback {
  const { t } = useLocale();
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const unlockToastTimer = useRef<number | null>(null);

  const showUnlockToast = useCallback((message: string) => {
    setUnlockToast(message);
    if (unlockToastTimer.current !== null) {
      window.clearTimeout(unlockToastTimer.current);
    }
    unlockToastTimer.current = window.setTimeout(() => setUnlockToast(null), 2400);
  }, []);

  const tryAchievement = useCallback(
    (id: AchievementId) => {
      const def: AchievementDef | null = unlockAchievement(id);
      if (def) {
        showUnlockToast(
          `${t("common.achievement")} · ${t(`achievements.items.${id}.title`, def.title)}`,
        );
        gameAudio.playSfx("notify-soft", 0.4);
      }
    },
    [showUnlockToast, t],
  );

  return { unlockToast, showUnlockToast, tryAchievement };
}
