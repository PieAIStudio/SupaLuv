import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  emotionCalibrationLevels,
  emotionCalibrationSamples,
  isCorrectEmotionCalibrationSelection,
  type EmotionCalibrationLevel,
} from "./emotionCalibration";
import { findStoryInteractionChoice } from "./storyInteractionRegistry";
import type { ActiveStoryInteraction } from "./types";
import { useInteractionKeyboard } from "./useInteractionKeyboard";

interface EmotionCalibrationInteractionProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

interface SelectionFeedback {
  readonly level: EmotionCalibrationLevel | null;
  readonly message: string;
  readonly correct: boolean | null;
}

export function EmotionCalibrationInteraction({
  active,
  snapshot,
  paused,
  onChoose,
}: EmotionCalibrationInteractionProps) {
  const { t } = useLocale();
  const sample = emotionCalibrationSamples[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<SelectionFeedback | null>(null);

  const expectedLabel = useMemo(() => {
    if (!sample) {
      return "";
    }
    return t(`interaction.emotion.level.${sample.expectedLevel}.label`);
  }, [sample, t]);

  useEffect(() => {
    setFeedback(null);
    if (!paused) {
      panelRef.current?.focus();
    }
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [paused, sample?.id]);

  const commitChoice = useCallback(
    (choiceId: string, nextFeedback: SelectionFeedback, delayMs: number) => {
      if (paused || feedback || timerRef.current !== null) {
        return;
      }
      const choice = findStoryInteractionChoice(snapshot.choices, choiceId);
      if (!choice) {
        return;
      }

      gameAudio.unlock();
      gameAudio.playSfx(nextFeedback.correct ? "notify-soft" : "ui-choice", 0.5);
      setFeedback(nextFeedback);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        onChoose(choice.index);
      }, delayMs);
    },
    [feedback, onChoose, paused, snapshot.choices],
  );

  const selectLevel = useCallback(
    (level: EmotionCalibrationLevel) => {
      if (!sample) {
        return;
      }
      const correct = isCorrectEmotionCalibrationSelection(sample, level);
      commitChoice(
        sample.choiceIds[level],
        {
          level,
          correct,
          message: correct
            ? t("interaction.emotion.feedbackMatch")
            : t("interaction.emotion.feedbackRecorded").replace("{label}", expectedLabel),
        },
        760,
      );
    },
    [commitChoice, expectedLabel, sample, t],
  );

  const skip = useCallback(() => {
    if (!sample) {
      return;
    }
    commitChoice(
      sample.skipChoiceId,
      {
        level: null,
        correct: null,
        message: t("interaction.emotion.feedbackSkip"),
      },
      480,
    );
  }, [commitChoice, sample, t]);

  const disabled = paused || Boolean(feedback);
  const onKeyboard = useCallback(
    (key: string) => {
      if (disabled) {
        return false;
      }
      const level = emotionCalibrationLevels.find((entry) => entry.key === key);
      if (level) {
        selectLevel(level.id);
        return true;
      }
      if (key.toLowerCase() === "s") {
        skip();
        return true;
      }
      return false;
    },
    [disabled, selectLevel, skip],
  );
  useInteractionKeyboard(!disabled, onKeyboard);

  if (!sample) {
    return null;
  }

  const sampleIndex = active.stepIndex + 1;
  const sampleLetter = String.fromCharCode(64 + sampleIndex); // A/B/C

  return (
    <section
      ref={panelRef}
      className="emotion-calibration"
      aria-labelledby="emotion-calibration-title"
      aria-describedby="emotion-calibration-instructions"
      data-testid="emotion-calibration"
      data-step={sampleIndex}
      tabIndex={-1}
    >
      <div className="emotion-calibration-scanline" aria-hidden="true" />
      <header className="emotion-calibration-header">
        <div>
          <p className="emotion-calibration-kicker">{t("interaction.emotion.kicker")}</p>
          <h2 id="emotion-calibration-title">{t("interaction.emotion.title")}</h2>
        </div>
        <div className="emotion-calibration-status" aria-label={t("interaction.emotion.localOnly")}>
          <span aria-hidden="true" />
          {t("interaction.emotion.localOnly")}
        </div>
      </header>

      <div
        className="emotion-calibration-progress"
        aria-label={t("interaction.progressLabel")
          .replace("{step}", String(sampleIndex))
          .replace("{total}", String(active.definition.stepCount))}
      >
        <span>
          SAMPLE {String(sampleIndex).padStart(2, "0")} /{" "}
          {String(active.definition.stepCount).padStart(2, "0")}
        </span>
        <div className="emotion-calibration-progress-rail" aria-hidden="true">
          {emotionCalibrationSamples.map((entry, index) => (
            <i key={entry.id} className={index <= active.stepIndex ? "is-active" : undefined} />
          ))}
        </div>
      </div>

      <div className="emotion-calibration-sample" data-testid="emotion-calibration-sample">
        <p className="emotion-calibration-sender">
          {t("interaction.emotion.sampleSender")
            .replace("{letter}", sampleLetter)
            .replace("{n}", String(sampleIndex))}
        </p>
        <blockquote>{t(`interaction.emotion.sample.${sample.id}`)}</blockquote>
      </div>

      <p id="emotion-calibration-instructions" className="emotion-calibration-instructions">
        {t("interaction.emotion.instructions")}
      </p>

      <div className="emotion-calibration-levels" aria-label={t("interaction.emotion.levelsLabel")}>
        {emotionCalibrationLevels.map((level) => {
          const label = t(`interaction.emotion.level.${level.id}.label`);
          const description = t(`interaction.emotion.level.${level.id}.description`);
          return (
            <button
              key={level.id}
              type="button"
              className={feedback?.level === level.id ? "is-selected" : undefined}
              data-testid={`emotion-level-${level.id}`}
              disabled={disabled}
              aria-label={`${label} — ${description}`}
              aria-keyshortcuts={level.key}
              onClick={() => selectLevel(level.id)}
            >
              <span className="emotion-calibration-key">{level.key}</span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </button>
          );
        })}
      </div>

      <footer className="emotion-calibration-footer">
        <p
          className="emotion-calibration-feedback"
          aria-live="polite"
          data-testid="emotion-feedback"
        >
          {feedback?.message ?? t("interaction.emotion.feedbackIdle")}
        </p>
        <button
          type="button"
          className="emotion-calibration-skip"
          data-testid="emotion-calibration-skip"
          disabled={disabled}
          aria-keyshortcuts="S"
          onClick={skip}
        >
          {t("interaction.emotion.skip")} <span>S</span>
        </button>
      </footer>
    </section>
  );
}
