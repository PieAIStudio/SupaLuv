/**
 * Co-play presence policy:
 * - Fine pointer (mouse / trackpad): publish + show remote cursors (whiteboard style).
 * - Coarse / touch: do not fake a mouse; optionally show a short-lived touch focus ring.
 */

export type PointerPresenceMode = "fine_cursor" | "touch_focus" | "none";

/** Minimal matchMedia surface (real Window or test fake). */
export interface PointerMediaSurface {
  matchMedia(query: string): { matches: boolean };
}

export function detectPointerPresenceMode(
  win: PointerMediaSurface | null | undefined = typeof window !== "undefined" ? window : null,
): PointerPresenceMode {
  if (!win?.matchMedia) {
    return "fine_cursor";
  }
  // Prefer explicit fine pointer (mouse). Hover helps exclude pure touch tablets.
  if (win.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return "fine_cursor";
  }
  if (win.matchMedia("(pointer: coarse)").matches) {
    return "touch_focus";
  }
  if (win.matchMedia("(pointer: fine)").matches) {
    return "fine_cursor";
  }
  return "none";
}

export function shouldPublishContinuousCursor(mode: PointerPresenceMode): boolean {
  return mode === "fine_cursor";
}

export function shouldShowRemoteCursors(mode: PointerPresenceMode): boolean {
  // Touch devices still *see* remote desktop cursors (host with mouse).
  // They just don't emit a continuous local cursor stream.
  return mode === "fine_cursor" || mode === "touch_focus";
}
