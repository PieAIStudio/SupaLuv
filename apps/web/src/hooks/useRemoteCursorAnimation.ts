import { useEffect, useState } from "react";
import {
  interpolateRemoteCursor,
  type InterpolatedCursor,
  type RemoteCursorState,
} from "../coplay/cursorPresence";

/** RAF loop that smooths remote cursor maps into renderable positions. */
export function useRemoteCursorAnimation(
  enabled: boolean,
  remoteStates: ReadonlyMap<string, RemoteCursorState>,
): readonly InterpolatedCursor[] {
  const [remoteCursors, setRemoteCursors] = useState<InterpolatedCursor[]>([]);

  useEffect(() => {
    if (!enabled) {
      setRemoteCursors([]);
      return;
    }
    let raf = 0;
    const tick = () => {
      const nowMs = Date.now();
      const next: InterpolatedCursor[] = [];
      for (const state of remoteStates.values()) {
        next.push(interpolateRemoteCursor({ nowMs, state }));
      }
      setRemoteCursors(next);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, remoteStates]);

  return remoteCursors;
}
