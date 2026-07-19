import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "../i18n";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { resolveMobileQuestionnairePayload } from "./mobileQuestionnaire";
import type { ActiveStoryInteraction } from "./types";
import { useInteractionChoiceCommit } from "./useInteractionChoiceCommit";
import { useInteractionKeyboard } from "./useInteractionKeyboard";

interface MobileQuestionnaireInteractionProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

export function MobileQuestionnaireInteraction({
  active,
  snapshot,
  paused,
  onChoose,
}: MobileQuestionnaireInteractionProps) {
  const { t } = useLocale();
  const payload = useMemo(
    () => resolveMobileQuestionnairePayload(active.variant),
    [active.variant],
  );
  const question = payload.questions[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { busy, commitChoice } = useInteractionChoiceCommit(snapshot, paused, onChoose);
  const i18nPrefix = `interaction.mobile.variant.${payload.variant}`;

  useEffect(() => {
    setFeedback(null);
    if (!paused) {
      panelRef.current?.focus();
    }
  }, [paused, question?.id]);

  const answer = useCallback(
    (choiceId: string, optionId: string) => {
      if (!question || busy || feedback || paused) {
        return;
      }
      setFeedback(
        t("interaction.mobile.feedbackPicked").replace(
          "{option}",
          t(`${i18nPrefix}.option.${question.questionKey}.${optionId}`),
        ),
      );
      commitChoice(choiceId, 560, "notify-soft");
    },
    [busy, commitChoice, feedback, i18nPrefix, paused, question, t],
  );

  const skip = useCallback(() => {
    if (!question || busy || feedback || paused) {
      return;
    }
    setFeedback(t("interaction.mobile.feedbackSkip"));
    commitChoice(question.skipChoiceId, 420, "ui-choice");
  }, [busy, commitChoice, feedback, paused, question, t]);

  const step = active.stepIndex + 1;
  const disabled = paused || busy || Boolean(feedback);

  const onKeyboard = useCallback(
    (key: string) => {
      if (disabled || !question) {
        return false;
      }
      const index = Number(key) - 1;
      if (index >= 0 && index < question.options.length) {
        const option = question.options[index]!;
        answer(option.choiceId, option.id);
        return true;
      }
      if (key.toLowerCase() === "s") {
        skip();
        return true;
      }
      return false;
    },
    [answer, disabled, question, skip],
  );
  useInteractionKeyboard(!disabled, onKeyboard);

  if (!question) {
    return null;
  }

  return (
    <section
      ref={panelRef}
      className="story-interaction mobile-questionnaire"
      aria-labelledby="mobile-questionnaire-title"
      aria-describedby="mobile-questionnaire-instructions"
      data-testid="mobile-questionnaire"
      data-story-interaction-id={active.definition.id}
      data-interaction-variant={payload.variant}
      data-step={step}
      tabIndex={-1}
    >
      <header className="story-interaction-header">
        <div>
          <p className="story-interaction-kicker">{t(`${i18nPrefix}.kicker`)}</p>
          <h2 id="mobile-questionnaire-title">{t(`${i18nPrefix}.title`)}</h2>
        </div>
        <div className="story-interaction-status">{t("interaction.mobile.localOnly")}</div>
      </header>

      <div
        className="story-interaction-progress"
        aria-live="polite"
        aria-label={t("interaction.progressLabel")
          .replace("{step}", String(step))
          .replace("{total}", "3")}
      >
        <span>Q {String(step).padStart(2, "0")} / 03</span>
        <div className="story-interaction-progress-rail" aria-hidden="true">
          {payload.questions.map((entry, index) => (
            <i key={entry.id} className={index <= active.stepIndex ? "is-active" : undefined} />
          ))}
        </div>
      </div>

      <div className="mobile-questionnaire-phone" data-testid="mobile-questionnaire-phone">
        <p className="mobile-questionnaire-app">{t(`${i18nPrefix}.appLabel`)}</p>
        <h3 className="mobile-questionnaire-prompt">
          {t(`${i18nPrefix}.question.${question.questionKey}`)}
        </h3>
        <div
          className="mobile-questionnaire-options"
          role="group"
          aria-label={t("interaction.mobile.optionsLabel")}
        >
          {question.options.map((option, index) => {
            const label = t(`${i18nPrefix}.option.${question.questionKey}.${option.id}`);
            return (
              <button
                key={option.id}
                type="button"
                data-testid={`mobile-option-${option.id}`}
                disabled={disabled}
                aria-label={label}
                aria-keyshortcuts={String(index + 1)}
                onClick={() => answer(option.choiceId, option.id)}
              >
                <span className="story-interaction-key">{index + 1}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p id="mobile-questionnaire-instructions" className="story-interaction-instructions">
        {t(`${i18nPrefix}.instructions`)}
      </p>

      <footer className="story-interaction-footer">
        <p className="story-interaction-feedback" aria-live="polite" data-testid="mobile-feedback">
          {feedback ?? t("interaction.mobile.feedbackIdle")}
        </p>
        <button
          type="button"
          className="story-interaction-skip"
          data-testid="mobile-questionnaire-skip"
          disabled={disabled}
          aria-keyshortcuts="S"
          onClick={skip}
        >
          {t("interaction.skip")} <span>S</span>
        </button>
      </footer>
    </section>
  );
}
