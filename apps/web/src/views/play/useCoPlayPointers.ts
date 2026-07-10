/**
 * Co-play stage pointer publish — fine continuous cursor vs touch one-shot focus.
 */

import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  shouldPublishContinuousCursor,
  type PointerPresenceMode,
} from "../../coplay/pointerPolicy";
import type { CoPlaySessionApi } from "../../coplay/useCoPlaySession";

export function useCoPlayPointers(input: {
  readonly coPlay: CoPlaySessionApi | null;
  readonly pointerMode: PointerPresenceMode;
}): {
  readonly handleStagePointer: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly handleStageTouchFocus: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly publishContinuousCursor: boolean;
} {
  const { coPlay, pointerMode } = input;
  const publishContinuousCursor = shouldPublishContinuousCursor(pointerMode);

  const handleStagePointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!coPlay || !publishContinuousCursor) {
        return;
      }
      if (event.pointerType === "touch") {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const xNorm = (event.clientX - rect.left) / rect.width;
      const yNorm = (event.clientY - rect.top) / rect.height;
      coPlay.publishCursor(xNorm, yNorm);
    },
    [coPlay, publishContinuousCursor],
  );

  const handleStageTouchFocus = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!coPlay || pointerMode !== "touch_focus") {
        return;
      }
      if (event.pointerType !== "touch") {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const xNorm = (event.clientX - rect.left) / rect.width;
      const yNorm = (event.clientY - rect.top) / rect.height;
      coPlay.publishCursor(xNorm, yNorm);
    },
    [coPlay, pointerMode],
  );

  return { handleStagePointer, handleStageTouchFocus, publishContinuousCursor };
}
