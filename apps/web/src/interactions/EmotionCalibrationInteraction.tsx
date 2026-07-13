import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAudio } from "../audio/gameAudio";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import {
  emotionCalibrationLevels,
  emotionCalibrationSamples,
  isCorrectEmotionCalibrationSelection,
  type EmotionCalibrationLevel,
} from "./emotionCalibration";
import { findStoryInteractionChoice } from "./storyInteractionRegistry";
import type { ActiveStoryInteraction } from "./types";

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
  const sample = emotionCalibrationSamples[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<SelectionFeedback | null>(null);

  const expectedLabel = useMemo(
    () => emotionCalibrationLevels.find((level) => level.id === sample?.expectedLevel)?.label ?? "",
    [sample?.expectedLevel],
  );

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
            ? "校准一致 · 样本已入列"
            : `已记录你的判断 · 系统基准：${expectedLabel}`,
        },
        760,
      );
    },
    [commitChoice, expectedLabel, sample],
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
        message: "已保留人工判断 · 主测照常继续",
      },
      480,
    );
  }, [commitChoice, sample]);

  if (!sample) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className="emotion-calibration"
      aria-labelledby="emotion-calibration-title"
      aria-describedby="emotion-calibration-instructions"
      data-testid="emotion-calibration"
      data-step={active.stepIndex + 1}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (paused || feedback) {
          return;
        }
        const level = emotionCalibrationLevels.find((entry) => entry.key === event.key);
        if (level) {
          event.preventDefault();
          selectLevel(level.id);
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          skip();
        }
      }}
    >
      <div className="emotion-calibration-scanline" aria-hidden="true" />
      <header className="emotion-calibration-header">
        <div>
          <p className="emotion-calibration-kicker">HEARTSYNC · 质检终端 04</p>
          <h2 id="emotion-calibration-title">{active.definition.title}</h2>
        </div>
        <div className="emotion-calibration-status" aria-label="本地预写样本，不会联网">
          <span aria-hidden="true" />
          本地样本
        </div>
      </header>

      <div className="emotion-calibration-progress" aria-label={`进度 ${active.stepIndex + 1}/3`}>
        <span>
          SAMPLE {String(active.stepIndex + 1).padStart(2, "0")} /{" "}
          {String(active.definition.stepCount).padStart(2, "0")}
        </span>
        <div className="emotion-calibration-progress-rail" aria-hidden="true">
          {emotionCalibrationSamples.map((entry, index) => (
            <i key={entry.id} className={index <= active.stepIndex ? "is-active" : undefined} />
          ))}
        </div>
      </div>

      <div className="emotion-calibration-sample" data-testid="emotion-calibration-sample">
        <p className="emotion-calibration-sender">{sample.sender} · 预写虚构聊天</p>
        <blockquote>{sample.message}</blockquote>
      </div>

      <p id="emotion-calibration-instructions" className="emotion-calibration-instructions">
        判断这条消息的情绪波动。按 1 / 2 / 3，或直接点击；S 跳过，不影响主线。
      </p>

      <div className="emotion-calibration-levels" aria-label="情绪档位">
        {emotionCalibrationLevels.map((level) => (
          <button
            key={level.id}
            type="button"
            className={feedback?.level === level.id ? "is-selected" : undefined}
            data-testid={`emotion-level-${level.id}`}
            disabled={paused || Boolean(feedback)}
            aria-keyshortcuts={level.key}
            onClick={() => selectLevel(level.id)}
          >
            <span className="emotion-calibration-key">{level.key}</span>
            <span>
              <strong>{level.label}</strong>
              <small>{level.description}</small>
            </span>
          </button>
        ))}
      </div>

      <footer className="emotion-calibration-footer">
        <p
          className="emotion-calibration-feedback"
          aria-live="polite"
          data-testid="emotion-feedback"
        >
          {feedback?.message ?? "系统基准只用于校准，不评价玩家。"}
        </p>
        <button
          type="button"
          className="emotion-calibration-skip"
          data-testid="emotion-calibration-skip"
          disabled={paused || Boolean(feedback)}
          aria-keyshortcuts="S"
          onClick={skip}
        >
          跳过校准 <span>S</span>
        </button>
      </footer>
    </section>
  );
}
