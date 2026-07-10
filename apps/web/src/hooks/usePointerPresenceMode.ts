import { useEffect, useState } from "react";
import { detectPointerPresenceMode, type PointerPresenceMode } from "../coplay/pointerPolicy";

/** Reactive fine-pointer vs touch presence for co-play UI. */
export function usePointerPresenceMode(): PointerPresenceMode {
  const [mode, setMode] = useState<PointerPresenceMode>(() => detectPointerPresenceMode());

  useEffect(() => {
    const update = () => setMode(detectPointerPresenceMode());
    update();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const coarse = window.matchMedia("(pointer: coarse)");
    fine.addEventListener("change", update);
    coarse.addEventListener("change", update);
    return () => {
      fine.removeEventListener("change", update);
      coarse.removeEventListener("change", update);
    };
  }, []);

  return mode;
}
