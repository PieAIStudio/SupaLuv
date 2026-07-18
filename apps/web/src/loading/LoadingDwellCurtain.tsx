import { useEffect, useState } from "react";
import {
  clearLoadingHold,
  getLoadingHold,
  subscribeLoadingHold,
  type DwellHold,
} from "./loadingDwell";

/**
 * Always-mounted companion to AtomicLoadingOverlay. When a load finishes
 * before the minimum dwell, the overlay unmounts (Suspense controls that) and
 * this curtain keeps the same poster on screen for the remainder, then fades.
 * Distinct testid on purpose: e2e asserts overlays unmount on readiness.
 */
export function LoadingDwellCurtain() {
  const [hold, setHold] = useState<DwellHold | null>(() => getLoadingHold());

  useEffect(() => subscribeLoadingHold(setHold), []);

  useEffect(() => {
    if (!hold) {
      return;
    }
    const remaining = Math.max(0, hold.until - Date.now());
    const timer = window.setTimeout(() => clearLoadingHold(), remaining);
    return () => window.clearTimeout(timer);
  }, [hold]);

  if (!hold) {
    return null;
  }

  return (
    <div
      className="atomic-loading"
      data-testid="loading-dwell-curtain"
      data-poster={hold.posterSrc ? "true" : undefined}
      aria-hidden="true"
      onClick={() => clearLoadingHold()}
    >
      {hold.posterSrc ? (
        <img className="atomic-loading-poster" src={hold.posterSrc} alt="" />
      ) : null}
      <div className="atomic-loading-backdrop" />
      <div className="atomic-loading-curtain-meter">
        <div className="atomic-loading-meter">
          <span />
        </div>
      </div>
    </div>
  );
}
