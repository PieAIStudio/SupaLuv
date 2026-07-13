import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useLocale } from "../i18n";
import { createAiSpendClient, type AiSpendAnalysis } from "../commerce/aiSpendClient";

function formatBatteries(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

export function AiSpendAnalysisScreen({ onBack }: { readonly onBack: () => void }) {
  const auth = useAuth();
  const { t } = useLocale();
  const client = useMemo(
    () => createAiSpendClient({ getAccessToken: auth.getAccessToken }),
    [auth.getAccessToken],
  );
  const [analysis, setAnalysis] = useState<AiSpendAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(auth.isSignedIn);

  useEffect(() => {
    if (!auth.isSignedIn) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void client
      .getAnalysis(controller.signal)
      .then(setAnalysis)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "SPEND_ANALYSIS_UNAVAILABLE");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.isSignedIn, client]);

  return (
    <div className="meta-screen ai-spend-screen" data-testid="ai-spend-screen">
      <header className="meta-header">
        <div>
          <p className="meta-kicker">BATTERY LEDGER</p>
          <h1>{t("aiSpend.title")}</h1>
        </div>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </GameButton>
      </header>

      <p className="meta-lead">{t("aiSpend.lead")}</p>

      {!auth.isSignedIn ? (
        <GameEmptyState
          title={t("aiSpend.needsLogin")}
          description={t("aiSpend.needsLoginDescription")}
        />
      ) : loading ? (
        <p className="meta-lead" role="status">
          {t("aiSpend.loading")}
        </p>
      ) : error ? (
        <GameEmptyState
          title={t("aiSpend.unavailable")}
          description={t("aiSpend.unavailableDescription")}
        />
      ) : !analysis || analysis.items.length === 0 ? (
        <GameEmptyState title={t("aiSpend.empty")} description={t("aiSpend.emptyDescription")} />
      ) : (
        <>
          <GamePanel className="ai-spend-total" tone="strong">
            <span>{t("aiSpend.total")}</span>
            <strong data-testid="ai-spend-total">{formatBatteries(analysis.totalBatteries)}</strong>
            <GameBadge tone="ai">{t("common.batteries")}</GameBadge>
          </GamePanel>
          <div className="ai-spend-list" data-testid="ai-spend-list">
            {analysis.items.map((item) => (
              <article className="ai-spend-row" key={item.id}>
                <div>
                  <strong>{t(`aiSpend.actions.${item.actionKind}`, item.label)}</strong>
                  <span>
                    {item.scopeType === "character_pack"
                      ? t("aiSpend.scopeCharacter")
                      : item.scopeType === "story_run"
                        ? t("aiSpend.scopeStory")
                        : t("aiSpend.scopeEnding")}
                  </span>
                </div>
                <b>
                  {formatBatteries(item.batteries)} {t("common.batteries")}
                </b>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
