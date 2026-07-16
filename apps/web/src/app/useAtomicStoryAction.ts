/**
 * Atomic story-action lock + loading overlay transition for the product shell.
 * Behavior-preserving extract from App.tsx — serializes story entry/transition
 * work and owns the AtomicLoadingOverlay error/retry surface.
 */

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useLocale } from "../i18n";
import type { AtomicLoadingKind } from "../loading/AtomicLoadingOverlay";

export type LoadingTransition = {
  kind: AtomicLoadingKind;
  error?: string | null;
  retry?: () => void;
  refresh?: () => void;
};

export type AtomicStoryAction = {
  readonly loadingTransition: LoadingTransition | null;
  readonly setLoadingTransition: Dispatch<SetStateAction<LoadingTransition | null>>;
  readonly runStoryAction: (action: () => Promise<void>, kind?: AtomicLoadingKind) => void;
};

export function useAtomicStoryAction(input: {
  readonly showUnlockToast: (message: string) => void;
}): AtomicStoryAction {
  const { showUnlockToast } = input;
  const { t } = useLocale();
  const [loadingTransition, setLoadingTransition] = useState<LoadingTransition | null>(null);
  const storyActionInFlight = useRef(false);

  function runStoryAction(action: () => Promise<void>, kind?: AtomicLoadingKind) {
    if (storyActionInFlight.current) {
      return;
    }
    storyActionInFlight.current = true;
    if (kind) {
      setLoadingTransition({ kind });
    }
    void action()
      .then(() => {
        if (kind) {
          setLoadingTransition(null);
        }
      })
      .catch(() => {
        const retry = () => {
          setLoadingTransition(null);
          storyActionInFlight.current = false;
          runStoryAction(action, kind);
        };
        if (kind) {
          setLoadingTransition({
            kind: "retry",
            error: t("common.transitionError"),
            retry,
            refresh: () => window.location.reload(),
          });
        } else {
          showUnlockToast(t("common.storyLoadError"));
        }
      })
      .finally(() => {
        storyActionInFlight.current = false;
      });
  }

  return { loadingTransition, setLoadingTransition, runStoryAction };
}
