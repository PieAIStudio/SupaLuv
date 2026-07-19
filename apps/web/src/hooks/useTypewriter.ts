import { useCallback, useEffect, useMemo, useState } from "react";

interface UseTypewriterOptions {
  readonly text: string;
  readonly charsPerTick?: number;
  readonly tickMs?: number;
  readonly enabled?: boolean;
}

interface UseTypewriterResult {
  readonly visibleText: string;
  readonly isComplete: boolean;
  readonly revealAll: () => void;
}

/**
 * Lightweight dialogue reveal. No third-party typewriter lib needed —
 * the only requirement is "show text gradually, click to skip".
 *
 * Pace comes only from settings (charsPerTick / tickMs). Voice playback must
 * never clamp this cadence; revealAll finishes the line without stopping audio.
 */
export function useTypewriter({
  text,
  charsPerTick = 2,
  tickMs = 18,
  enabled = true,
}: UseTypewriterOptions): UseTypewriterResult {
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : text.length);

  useEffect(() => {
    setVisibleCount(enabled ? 0 : text.length);
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled || visibleCount >= text.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(text.length, count + charsPerTick));
    }, tickMs);

    return () => window.clearTimeout(timer);
  }, [charsPerTick, enabled, text, tickMs, visibleCount]);

  const visibleText = useMemo(() => text.slice(0, visibleCount), [text, visibleCount]);
  const isComplete = !enabled || visibleCount >= text.length;

  const revealAll = useCallback(() => {
    setVisibleCount(text.length);
  }, [text.length]);

  return {
    visibleText,
    isComplete,
    revealAll,
  };
}
