/**
 * Play-surface chrome UI: system menu, dialogue history drawer, dev tools, save flash.
 * Behavior-preserving extract from VisualNovelPrototype — no stage media or narrative ownership.
 */

import { useCallback, useEffect, useState } from "react";
import { gameAudio } from "../../../audio/gameAudio";
import type { ManualSlotId } from "../../../persistence/gameSave";

export type PlaySurfaceChrome = {
  readonly showDevTools: boolean;
  readonly saveFlash: boolean;
  readonly systemOpen: boolean;
  readonly historyOpen: boolean;
  readonly openHistory: () => void;
  readonly closeHistory: () => void;
  readonly toggleSystem: () => void;
  readonly closeSystem: () => void;
  readonly toggleDevTools: (() => void) | undefined;
  readonly handleSave: (slotId?: ManualSlotId) => void;
  /** Used by surface reset so the system drawer closes with the rest of the stage. */
  readonly closeChromeForReset: () => void;
};

export function usePlaySurfaceChrome(input: {
  readonly playerMode: boolean;
  readonly debugToolsAvailable: boolean;
  readonly activeSaveSlot: ManualSlotId;
  readonly onSave: (slotId?: ManualSlotId) => void;
}): PlaySurfaceChrome {
  const { playerMode, debugToolsAvailable, activeSaveSlot, onSave } = input;

  const [showDevTools, setShowDevTools] = useState(!playerMode || debugToolsAvailable);
  const [saveFlash, setSaveFlash] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    // Production stories hide tools by default; ?debug=1 keeps them available.
    setShowDevTools(!playerMode || debugToolsAvailable);
  }, [playerMode, debugToolsAvailable]);

  useEffect(() => {
    if (!systemOpen) {
      return;
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".system-menu-wrap")) {
        return;
      }
      setSystemOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [systemOpen]);

  const openHistory = useCallback(() => {
    setSystemOpen(false);
    setHistoryOpen(true);
  }, []);

  const closeHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  const toggleSystem = useCallback(() => {
    setSystemOpen((value) => !value);
  }, []);

  const closeSystem = useCallback(() => {
    setSystemOpen(false);
  }, []);

  const toggleDevTools = debugToolsAvailable ? () => setShowDevTools((value) => !value) : undefined;

  const handleSave = useCallback(
    (slotId?: ManualSlotId) => {
      onSave(slotId ?? activeSaveSlot);
      setSaveFlash(true);
      setSystemOpen(false);
      window.setTimeout(() => setSaveFlash(false), 1400);
      gameAudio.playSfx("notify-soft", 0.4);
    },
    [activeSaveSlot, onSave],
  );

  const closeChromeForReset = useCallback(() => {
    setSystemOpen(false);
  }, []);

  return {
    showDevTools,
    saveFlash,
    systemOpen,
    historyOpen,
    openHistory,
    closeHistory,
    toggleSystem,
    closeSystem,
    toggleDevTools,
    handleSave,
    closeChromeForReset,
  };
}
