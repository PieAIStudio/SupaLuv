import { useEffect } from "react";

interface UsePlayInputOptions {
  readonly enabled: boolean;
  readonly isComplete: boolean;
  readonly canContinue: boolean;
  readonly overlaysOpen: boolean;
  readonly onReveal: () => void;
  readonly onContinue: () => void;
  readonly onEscape: () => void;
}

/**
 * Commercial VN keyboard feel:
 * - Space / Enter: finish typewriter, then advance continue-only beats
 * - Escape: close drawers / menus
 */
export function usePlayInput({
  enabled,
  isComplete,
  canContinue,
  overlaysOpen,
  onReveal,
  onContinue,
  onEscape,
}: UsePlayInputOptions): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onEscape();
        return;
      }

      if (overlaysOpen) {
        return;
      }

      if (event.key !== " " && event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      if (!isComplete) {
        onReveal();
        return;
      }
      if (canContinue) {
        onContinue();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canContinue, enabled, isComplete, onContinue, onEscape, onReveal, overlaysOpen]);
}
