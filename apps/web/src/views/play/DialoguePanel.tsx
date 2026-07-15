import { GameButton, GameCallout, GamePanel } from "@pieai/swimmer-ui-kit";
import type { AiChoiceSlotState } from "../../ai/aiBranchTypes";
import { useLocale } from "../../i18n";
import type { InkStorySnapshot } from "../../story/inkStoryRunner";
import {
  AUTHORED_CHOICES_LABEL_ID,
  formatAuthoredChoiceAccessibleName,
  formatOracleChoiceAccessibleName,
  ORACLE_CHOICES_LABEL_ID,
} from "./choiceAccessibility";

export interface OracleOptionView {
  readonly choiceId: string;
  readonly shortLabel: string;
  readonly matchLabel: string;
}

interface DialoguePanelProps {
  readonly sceneTitle: string;
  readonly speaker: string;
  readonly sceneId: string | null;
  readonly visibleText: string;
  readonly isComplete: boolean;
  readonly choices: InkStorySnapshot["choices"];
  /** Labels already taken in prior runs (NG+ memory). */
  readonly seenChoiceLabels?: readonly string[];
  readonly aiSlot?: AiChoiceSlotState;
  readonly aiMode?: boolean;
  /** Stats-tracked decision options for 预言家 guess UI. */
  readonly oracleOptions?: readonly OracleOptionView[];
  readonly oracleGuessLabel?: string | null;
  readonly onOracleGuess?: (option: OracleOptionView) => void;
  readonly onDialogueActivate: () => void;
  readonly onChoose: (index: number) => void;
  readonly onChooseAi?: () => void;
  readonly onAdvanceAi?: () => void;
  readonly onRequestAuth?: () => void;
}

export function DialoguePanel({
  sceneTitle,
  speaker,
  sceneId,
  visibleText,
  isComplete,
  choices,
  seenChoiceLabels = [],
  aiSlot,
  aiMode = false,
  oracleOptions = [],
  oracleGuessLabel = null,
  onOracleGuess,
  onDialogueActivate,
  onChoose,
  onChooseAi,
  onAdvanceAi,
  onRequestAuth,
}: DialoguePanelProps) {
  const { t } = useLocale();
  const hasOracleChoices =
    isComplete && !aiMode && oracleOptions.length > 0 && onOracleGuess !== undefined;
  return (
    <GamePanel
      className={`dialogue-box${hasOracleChoices ? " has-oracle" : ""}`}
      aria-labelledby="prototype-title"
      data-testid="dialogue-box"
    >
      <div className="dialogue-meta">
        <p className="scene-chip">
          {sceneTitle}
          {aiMode ? ` · ${t("play.aiBranch")}` : ""}
        </p>
        <h1 id="prototype-title" className="nameplate">
          {speaker}
        </h1>
      </div>

      <div
        className="story-copy"
        data-testid="story-copy"
        onClick={aiMode && isComplete ? onAdvanceAi : onDialogueActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (aiMode && isComplete) {
              onAdvanceAi?.();
            } else {
              onDialogueActivate();
            }
          }
        }}
        role={isComplete && !aiMode ? undefined : "button"}
        tabIndex={isComplete && !aiMode ? undefined : 0}
        aria-label={
          aiMode ? t("play.continueAi") : isComplete ? undefined : t("play.revealDialogue")
        }
      >
        {visibleText
          .split("\n\n")
          .filter((paragraph) => paragraph.length > 0)
          .map((paragraph, index) => (
            <p key={`${sceneId ?? "unknown"}-${index}`}>{paragraph}</p>
          ))}
        {!isComplete ? <span className="typewriter-caret" aria-hidden="true" /> : null}
        {isComplete &&
        (aiMode ||
          choices.length > 0 ||
          aiSlot?.status === "ready" ||
          aiSlot?.status === "loading") ? (
          <span className="continue-hint" aria-hidden="true" data-testid="continue-hint">
            ▼
          </span>
        ) : null}
      </div>

      {isComplete && !aiMode ? (
        <div
          className={`choice-stack${hasOracleChoices ? " has-oracle" : ""}`}
          aria-label={t("play.choices")}
        >
          {oracleOptions.length > 0 && onOracleGuess ? (
            <div
              className="oracle-row"
              role="group"
              aria-labelledby={ORACLE_CHOICES_LABEL_ID}
              data-testid="oracle-row"
              data-choice-group="oracle"
            >
              <div className="oracle-copy">
                <p id={ORACLE_CHOICES_LABEL_ID} className="oracle-lead" data-testid="oracle-choices-label">
                  {t("play.oracle")}
                  {oracleGuessLabel
                    ? ` · ${t("play.oraclePicked")}${oracleGuessLabel}`
                    : ` · ${t("play.oracleGuess")}`}
                </p>
                <p className="oracle-instruction" data-testid="oracle-instruction">
                  {t("play.oracleDoesNotAdvance")}
                </p>
              </div>
              <div className="oracle-buttons">
                {oracleOptions.map((option) => (
                  <GameButton
                    key={option.choiceId}
                    type="button"
                    variant={oracleGuessLabel === option.shortLabel ? "primary" : "ghost"}
                    onClick={() => onOracleGuess(option)}
                    data-testid={`oracle-${option.choiceId}`}
                    aria-label={formatOracleChoiceAccessibleName(
                      t("play.oracleChoiceAria"),
                      option.shortLabel,
                    )}
                  >
                    {option.shortLabel}
                  </GameButton>
                ))}
              </div>
            </div>
          ) : null}

          {choices.length > 0 ? (
            <div
              className="authored-choice-group"
              role="group"
              aria-labelledby={AUTHORED_CHOICES_LABEL_ID}
              data-testid="authored-choice-group"
              data-choice-group="authored"
            >
              <p
                id={AUTHORED_CHOICES_LABEL_ID}
                className="authored-choice-lead"
                data-testid="authored-choice-lead"
              >
                {t("play.authoredChoices")}
              </p>
              {choices.map((choice, index) => {
                const choiceId =
                  "choiceId" in choice && typeof choice.choiceId === "string"
                    ? choice.choiceId
                    : null;
                const seen =
                  seenChoiceLabels.includes(choice.text) ||
                  (choiceId ? seenChoiceLabels.includes(`id:${choiceId}`) : false) ||
                  seenChoiceLabels.includes(`label:${choice.text}`);
                return (
                  <GameButton
                    key={`${sceneId ?? "unknown"}-${choice.index}-${choice.choiceId ?? choice.text}`}
                    type="button"
                    className={`choice-button${seen ? " is-seen-path" : ""}`}
                    variant={index === 0 ? "primary" : "secondary"}
                    onClick={() => onChoose(choice.index)}
                    aria-label={formatAuthoredChoiceAccessibleName(
                      t("play.authoredChoiceAria"),
                      choice.text,
                    )}
                  >
                    <span className="choice-label">
                      {seen ? <span className="seen-path-tag">{t("play.seenChoice")}</span> : null}
                      {choice.text}
                    </span>
                  </GameButton>
                );
              })}
            </div>
          ) : null}

          {aiSlot?.status === "loading" ? (
            <GameButton
              type="button"
              className="choice-button ai-choice-button is-waiting"
              variant="ghost"
              disabled
              data-testid="ai-choice-waiting"
            >
              <span className="choice-label">{aiSlot.waitLabel}</span>
            </GameButton>
          ) : null}

          {aiSlot?.status === "needs_auth" ? (
            <GameButton
              type="button"
              className="choice-button ai-choice-button"
              variant="secondary"
              onClick={() => onRequestAuth?.()}
              data-testid="ai-choice-needs-auth"
            >
              <span className="choice-label">
                <span className="ai-choice-tag">AI</span>
                {t("play.aiAuth")}
              </span>
            </GameButton>
          ) : null}

          {aiSlot?.status === "needs_battery" ? (
            <GameButton
              type="button"
              className="choice-button ai-choice-button"
              variant="secondary"
              onClick={() => onRequestAuth?.()}
              data-testid="ai-choice-needs-battery"
            >
              <span className="choice-label">
                <span className="ai-choice-tag">AI</span>
                {aiSlot.message}
              </span>
            </GameButton>
          ) : null}

          {aiSlot?.status === "ready" ? (
            <GameButton
              type="button"
              className="choice-button ai-choice-button"
              variant="secondary"
              onClick={() => onChooseAi?.()}
              data-testid="ai-choice-ready"
            >
              <span className="choice-label">
                <span className="ai-choice-tag">AI</span>
                {aiSlot.result.choiceLabel}
              </span>
            </GameButton>
          ) : null}

          {aiSlot?.status === "error" ? (
            <p className="ai-choice-error" data-testid="ai-choice-error">
              {t("play.aiErrorPrefix")} {aiSlot.message} {t("play.aiErrorSuffix")}
            </p>
          ) : null}

          {aiSlot?.status === "needs_auth" || aiSlot?.status === "needs_battery" ? (
            <GameCallout
              className="ai-battery-pitch"
              data-testid="ai-battery-pitch"
              tone="warning"
              heading={aiSlot.message}
            >
              {aiSlot.pitch ?? null}
            </GameCallout>
          ) : null}
        </div>
      ) : null}

      {isComplete && aiMode ? (
        <div className="choice-stack" aria-label={t("play.aiContinueChoices")}>
          <GameButton
            type="button"
            className="choice-button"
            variant="primary"
            onClick={() => onAdvanceAi?.()}
            data-testid="ai-branch-continue"
          >
            <span className="choice-label">{t("play.continue")}</span>
          </GameButton>
        </div>
      ) : null}
    </GamePanel>
  );
}
