import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../i18n";
import type { InkStorySnapshot } from "../story/inkStoryRunner";
import { protocolTestClauses, type ProtocolTestResponse } from "./protocolTest";
import type { ActiveStoryInteraction } from "./types";
import { useInteractionChoiceCommit } from "./useInteractionChoiceCommit";

interface ProtocolTestInteractionProps {
  readonly active: ActiveStoryInteraction;
  readonly snapshot: InkStorySnapshot;
  readonly paused: boolean;
  readonly onChoose: (index: number) => void;
}

export function ProtocolTestInteraction({
  active,
  snapshot,
  paused,
  onChoose,
}: ProtocolTestInteractionProps) {
  const { t } = useLocale();
  const clause = protocolTestClauses[active.stepIndex];
  const panelRef = useRef<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { busy, commitChoice } = useInteractionChoiceCommit(snapshot, paused, onChoose);

  useEffect(() => {
    setFeedback(null);
    if (!paused) {
      panelRef.current?.focus();
    }
  }, [paused, clause?.id]);

  const respond = useCallback(
    (response: ProtocolTestResponse) => {
      if (!clause || busy || feedback) {
        return;
      }
      const choiceId = response === "skip" ? clause.skipChoiceId : clause.choiceIds[response];
      const message =
        response === "skip"
          ? t("interaction.protocol.feedbackSkip")
          : response === "literal"
            ? t("interaction.protocol.feedbackLiteral")
            : t("interaction.protocol.feedbackModel");
      setFeedback(message);
      commitChoice(
        choiceId,
        response === "skip" ? 420 : 720,
        response === "model" ? "notify-soft" : "ui-choice",
      );
    },
    [busy, clause, commitChoice, feedback, t],
  );

  if (!clause) {
    return null;
  }

  const step = active.stepIndex + 1;
  const disabled = paused || busy || Boolean(feedback);

  return (
    <section
      ref={panelRef}
      className="story-interaction protocol-test"
      aria-labelledby="protocol-test-title"
      aria-describedby="protocol-test-instructions"
      data-testid="protocol-test"
      data-story-interaction-id={active.definition.id}
      data-step={step}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }
        if (event.key === "1") {
          event.preventDefault();
          respond("literal");
        } else if (event.key === "2") {
          event.preventDefault();
          respond("model");
        } else if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          respond("skip");
        }
      }}
    >
      <header className="story-interaction-header">
        <div>
          <p className="story-interaction-kicker">{t("interaction.protocol.kicker")}</p>
          <h2 id="protocol-test-title">{t("interaction.protocol.title")}</h2>
        </div>
        <div className="story-interaction-status" aria-label={t("interaction.protocol.localOnly")}>
          <span aria-hidden="true" />
          {t("interaction.protocol.localOnly")}
        </div>
      </header>

      <div
        className="story-interaction-progress"
        aria-label={t("interaction.progressLabel", `Progress ${step}/3`)
          .replace("{step}", String(step))
          .replace("{total}", "3")}
      >
        <span>CLAUSE {String(step).padStart(2, "0")} / 03</span>
        <div className="story-interaction-progress-rail" aria-hidden="true">
          {protocolTestClauses.map((entry, index) => (
            <i key={entry.id} className={index <= active.stepIndex ? "is-active" : undefined} />
          ))}
        </div>
      </div>

      <article className="protocol-test-card" data-testid="protocol-test-card">
        <p className="protocol-test-card-label">{t("interaction.protocol.clauseLabel")}</p>
        <blockquote>{t(`interaction.protocol.clause.${clause.clauseKey}`)}</blockquote>
      </article>

      <p id="protocol-test-instructions" className="story-interaction-instructions">
        {t("interaction.protocol.instructions")}
      </p>

      <div className="protocol-test-actions" aria-label={t("interaction.protocol.actionsLabel")}>
        <button
          type="button"
          data-testid="protocol-literal"
          disabled={disabled}
          aria-keyshortcuts="1"
          onClick={() => respond("literal")}
        >
          <span className="story-interaction-key">1</span>
          <span>{t("interaction.protocol.literal")}</span>
        </button>
        <button
          type="button"
          data-testid="protocol-model"
          disabled={disabled}
          aria-keyshortcuts="2"
          onClick={() => respond("model")}
        >
          <span className="story-interaction-key">2</span>
          <span>{t("interaction.protocol.model")}</span>
        </button>
      </div>

      <footer className="story-interaction-footer">
        <p
          className="story-interaction-feedback"
          aria-live="polite"
          data-testid="protocol-feedback"
        >
          {feedback ?? t("interaction.protocol.feedbackIdle")}
        </p>
        <button
          type="button"
          className="story-interaction-skip"
          data-testid="protocol-test-skip"
          disabled={disabled}
          aria-keyshortcuts="S"
          onClick={() => respond("skip")}
        >
          {t("interaction.skip")} <span>S</span>
        </button>
      </footer>
    </section>
  );
}
