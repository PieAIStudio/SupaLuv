import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../i18n";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { resolveBarcodeSweepPayload } from "./barcodeSweep";
import type { ActiveStoryInteraction } from "./types";
import { useInteractionChoiceCommit } from "./useInteractionChoiceCommit";
import { useInteractionKeyboard } from "./useInteractionKeyboard";

interface BarcodeSweepInteractionProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

export function BarcodeSweepInteraction({
  active,
  snapshot,
  paused,
  onChoose,
}: BarcodeSweepInteractionProps) {
  const { t } = useLocale();
  const payload = useMemo(() => resolveBarcodeSweepPayload(active.variant), [active.variant]);
  const round = payload.rounds[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const [nextIndex, setNextIndex] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { busy, commitChoice } = useInteractionChoiceCommit(snapshot, paused, onChoose);
  const i18nPrefix = `interaction.barcode.variant.${payload.variant}`;

  useEffect(() => {
    setNextIndex(0);
    setFeedback(null);
    if (!paused) {
      panelRef.current?.focus();
    }
  }, [paused, round?.id]);

  const completeRound = useCallback(
    (completedSegments = nextIndex) => {
      if (!round || busy || completedSegments < round.segments.length) {
        return;
      }
      setFeedback(t("interaction.barcode.feedbackOk"));
      commitChoice(round.completeChoiceId, 520, "notify-soft");
    },
    [busy, commitChoice, nextIndex, round, t],
  );

  const skip = useCallback(() => {
    if (!round || busy || nextIndex >= round.segments.length) {
      return;
    }
    setFeedback(t("interaction.barcode.feedbackSkip"));
    commitChoice(round.skipChoiceId, 420, "ui-choice");
  }, [busy, commitChoice, nextIndex, round, t]);

  const tapSegment = useCallback(
    (segment: string) => {
      if (!round || busy || paused || nextIndex >= round.segments.length) {
        return;
      }
      const expected = round.segments[nextIndex];
      if (segment !== expected) {
        setFeedback(t("interaction.barcode.feedbackWrong"));
        window.setTimeout(() => setFeedback(null), 600);
        return;
      }
      const advanced = nextIndex + 1;
      if (advanced >= round.segments.length) {
        setNextIndex(advanced);
        completeRound(advanced);
        return;
      }
      setNextIndex(advanced);
      setFeedback(t("interaction.barcode.feedbackSegment").replace("{n}", String(advanced)));
    },
    [busy, completeRound, nextIndex, paused, round, t],
  );

  const step = active.stepIndex + 1;
  const finished = Boolean(round && nextIndex >= round.segments.length);
  const disabled = paused || busy || finished;

  const onKeyboard = useCallback(
    (key: string) => {
      if (paused || busy || !round) {
        return false;
      }
      if (key === "1" || key === "2" || key === "3") {
        const map = { "1": "a", "2": "b", "3": "c" } as const;
        tapSegment(map[key]);
        return true;
      }
      if (key.toLowerCase() === "s") {
        skip();
        return true;
      }
      return false;
    },
    [busy, paused, round, skip, tapSegment],
  );
  useInteractionKeyboard(!paused && !busy, onKeyboard);

  if (!round) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className="story-interaction barcode-sweep"
      aria-labelledby="barcode-sweep-title"
      aria-describedby="barcode-sweep-instructions"
      data-testid="barcode-sweep"
      data-story-interaction-id={active.definition.id}
      data-interaction-variant={payload.variant}
      data-step={step}
      tabIndex={-1}
    >
      <header className="story-interaction-header">
        <div>
          <p className="story-interaction-kicker">{t(`${i18nPrefix}.kicker`)}</p>
          <h2 id="barcode-sweep-title">{t(`${i18nPrefix}.title`)}</h2>
        </div>
        <div className="story-interaction-status">{t("interaction.barcode.localOnly")}</div>
      </header>

      <div
        className="story-interaction-progress"
        aria-live="polite"
        aria-label={t("interaction.progressLabel")
          .replace("{step}", String(step))
          .replace("{total}", "3")}
      >
        <span>
          SCAN {String(step).padStart(2, "0")} / 03 · SEG {Math.min(nextIndex + 1, 3)}/3
        </span>
        <div className="story-interaction-progress-rail" aria-hidden="true">
          {payload.rounds.map((entry, index) => (
            <i key={entry.id} className={index <= active.stepIndex ? "is-active" : undefined} />
          ))}
        </div>
      </div>

      <div className="barcode-sweep-product" data-testid="barcode-sweep-product">
        <p className="barcode-sweep-product-name">
          {t(`${i18nPrefix}.product.${round.productKey}`)}
        </p>
        <div className="barcode-sweep-bars" aria-hidden="true">
          {round.segments.map((segment, index) => (
            <button
              key={segment}
              type="button"
              className={
                index < nextIndex ? "is-done" : index === nextIndex ? "is-next" : undefined
              }
              data-testid={`barcode-segment-${segment}`}
              disabled={disabled || index !== nextIndex}
              aria-label={t("interaction.barcode.segmentLabel").replace("{n}", String(index + 1))}
              onClick={() => tapSegment(segment)}
            />
          ))}
        </div>
        <p className="barcode-sweep-hint">{t(`${i18nPrefix}.sequenceHint`)}</p>
      </div>

      <p id="barcode-sweep-instructions" className="story-interaction-instructions">
        {t(`${i18nPrefix}.instructions`)}
      </p>

      <footer className="story-interaction-footer">
        <p className="story-interaction-feedback" aria-live="polite" data-testid="barcode-feedback">
          {feedback ?? t("interaction.barcode.feedbackIdle")}
        </p>
        <button
          type="button"
          className="story-interaction-skip"
          data-testid="barcode-sweep-skip"
          disabled={paused || busy}
          aria-keyshortcuts="S"
          onClick={skip}
        >
          {t("interaction.skip")} <span>S</span>
        </button>
      </footer>
    </section>
  );
}
