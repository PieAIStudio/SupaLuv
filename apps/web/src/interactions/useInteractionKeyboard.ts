import { useEffect } from "react";

/**
 * Window-level digit/skip shortcuts for story interactions.
 *
 * Section onKeyDown alone fails when prop cut-in restore-focus steals focus
 * after dismiss (protocol-test is the known case). Listen on window while the
 * interaction is armed so 1/2/3/S work without the panel owning document focus.
 */
export function useInteractionKeyboard(enabled: boolean, handler: (key: string) => boolean): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (handler(event.key)) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handler]);
}
