import {
  GameBadge,
  GameButton,
  GameModal,
  GameProgress,
  GameTextArea,
} from "@pieai/swimmer-ui-kit";
import { useState } from "react";
import { AiWaitInterstitial } from "../ai/AiWaitInterstitial";
import { useAuth } from "../auth/AuthContext";
import { useAiEndingSession } from "../ai-ending/useAiEndingSession";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { useLocale } from "../i18n";

export function AiEndingExperience({
  open,
  characterBindings,
  onClose,
}: {
  open: boolean;
  characterBindings: StoryCharacterBindings;
  onClose: () => void;
}) {
  const auth = useAuth();
  const { t, locale } = useLocale();
  const ending = useAiEndingSession({ getAccessToken: auth.getAccessToken, characterBindings });
  const [freeText, setFreeText] = useState("");
  const busy = ending.status === "loading";
  return (
    <GameModal
      open={open}
      title={t("aiEnding.title")}
      size="lg"
      closeLabel={t("aiEnding.close")}
      onClose={onClose}
      closeOnBackdrop={false}
    >
      <div className="ai-ending-experience" data-testid="ai-ending-experience">
        <div className="ai-ending-meta">
          <GameBadge tone="ai">{t("aiEnding.badge")}</GameBadge>
          <span>{t("aiEnding.cost")}</span>
        </div>
        {ending.segments.length === 0 ? (
          <div className="ai-ending-start">
            <p>{t("aiEnding.intro")}</p>
            <GameButton
              type="button"
              variant="primary"
              disabled={busy}
              onClick={() => void ending.start()}
            >
              {busy ? t("aiEnding.planning") : t("aiEnding.start")}
            </GameButton>
            {busy ? <AiWaitInterstitial locale={locale} /> : null}
          </div>
        ) : (
          <>
            <GameProgress
              label={`${t("aiEnding.progress")} ${ending.current?.sequence ?? 0}/8`}
              value={ending.current?.sequence ?? 0}
              max={8}
              tone="accent"
              showValue
            />
            <article className="ai-ending-segment" aria-live="polite">
              <span>SEGMENT {ending.current?.sequence}</span>
              <p>{ending.current?.text}</p>
            </article>
            {!ending.current?.terminal ? (
              <div className="ai-ending-actions">
                <div className="ai-ending-choices">
                  {ending.current?.choices.map((choice) => (
                    <GameButton
                      key={choice.id}
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void ending.advance({ kind: "choice", choiceId: choice.id })}
                    >
                      {choice.label}
                    </GameButton>
                  ))}
                </div>
                <label>
                  <span>{t("aiEnding.freeAction")}</span>
                  <GameTextArea
                    aria-label={t("aiEnding.freeActionAria")}
                    rows={3}
                    maxLength={1000}
                    value={freeText}
                    disabled={busy}
                    onChange={(event) => setFreeText(event.target.value)}
                  />
                </label>
                <GameButton
                  type="button"
                  variant="ghost"
                  disabled={busy || !freeText.trim()}
                  onClick={() => {
                    const text = freeText.trim();
                    setFreeText("");
                    void ending.advance({ kind: "free_text", text });
                  }}
                >
                  {t("aiEnding.submit")}
                </GameButton>
                {busy ? <AiWaitInterstitial locale={locale} /> : null}
              </div>
            ) : (
              <div className="ai-ending-terminal">
                <GameBadge tone="success">{t("aiEnding.generated")}</GameBadge>
                <p>
                  {t("aiEnding.direction")}
                  {ending.current.outcomeAnchor}
                </p>
              </div>
            )}
          </>
        )}
        {ending.error ? (
          <p className="character-studio-error" role="alert">
            {ending.error}
          </p>
        ) : null}
      </div>
    </GameModal>
  );
}
