import { useEffect, useMemo, useRef, useState } from "react";
import {
  getInterstitialText,
  INTERSTITIAL_LINES,
  resolveInterstitialLang,
} from "./interstitialLines";
import {
  INTERSTITIAL_ROTATE_MS,
  sequenceFromSeed,
  sequenceStepIndex,
} from "./interstitialRotation";

const FADE_MS = 280;

interface AiWaitInterstitialProps {
  /** App locale (zh-CN → Chinese lines; otherwise English). */
  readonly locale: string;
  /**
   * Optional fixed seed for tests. Production omits this and uses a random seed
   * once per mount (once per wait session).
   */
  readonly seed?: number;
  /** Override rotate interval (ms). Production uses INTERSTITIAL_ROTATE_MS. */
  readonly rotateMs?: number;
}

/**
 * Decorative Heartbeat Engine line carousel under AI wait UI.
 * Mount only while waiting; unmount immediately when the real result is ready —
 * never delay delivery of the AI response.
 */
export function AiWaitInterstitial({
  locale,
  seed,
  rotateMs = INTERSTITIAL_ROTATE_MS,
}: AiWaitInterstitialProps) {
  const lang = resolveInterstitialLang(locale);
  const sequence = useMemo(() => {
    const resolvedSeed =
      seed !== undefined ? seed : Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    return sequenceFromSeed(resolvedSeed, INTERSTITIAL_LINES.length);
  }, [seed]);

  const [step, setStep] = useState(0);
  const [fadedIn, setFadedIn] = useState(true);
  const fadeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (sequence.length <= 1 || rotateMs <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setFadedIn(false);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
      }
      fadeTimerRef.current = window.setTimeout(() => {
        setStep((current) => current + 1);
        setFadedIn(true);
        fadeTimerRef.current = null;
      }, FADE_MS);
    }, rotateMs);

    return () => {
      window.clearInterval(intervalId);
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, [rotateMs, sequence.length]);

  const lineIndex = sequenceStepIndex(sequence, step);
  const line = INTERSTITIAL_LINES[lineIndex]!;
  const text = getInterstitialText(line, lang);

  return (
    <div
      className="ai-wait-interstitial"
      aria-hidden="true"
      data-testid="ai-wait-interstitial"
      data-interstitial-id={line.id}
    >
      <p
        className={`ai-wait-interstitial-line${fadedIn ? " is-visible" : ""}`}
        data-testid="ai-wait-interstitial-line"
      >
        {text}
      </p>
    </div>
  );
}
