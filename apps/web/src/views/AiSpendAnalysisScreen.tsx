import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  createAiSpendClient,
  type AiSpendAnalysis,
  type AiSpendItem,
} from "../commerce/aiSpendClient";

const scopeLabels: Record<AiSpendItem["scopeType"], string> = {
  character_pack: "角色形象",
  story_run: "故事进程",
  ai_ending_session: "AI 最终章",
};

function formatBatteries(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "");
}

export function AiSpendAnalysisScreen({ onBack }: { readonly onBack: () => void }) {
  const auth = useAuth();
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
          <h1>AI 消费分析</h1>
        </div>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          返回
        </GameButton>
      </header>

      <p className="meta-lead">
        作者剧情完全免费。这里只展示已经成功交付并正式扣除的 AI
        功能；失败、拦截、退款和重复请求不会记账。
      </p>

      {!auth.isSignedIn ? (
        <GameEmptyState
          title="需要登录"
          description="登录同一个账号，才能查看自己的 AI 消费明细。"
        />
      ) : loading ? (
        <p className="meta-lead" role="status">
          正在核对消费记录…
        </p>
      ) : error ? (
        <GameEmptyState title="暂时无法读取" description="消费明细服务暂不可用，请稍后重试。" />
      ) : !analysis || analysis.items.length === 0 ? (
        <GameEmptyState
          title="还没有 AI 消费"
          description="作者剧情完全免费；只有你主动使用 AI 功能后才会出现记录。"
        />
      ) : (
        <>
          <GamePanel className="ai-spend-total" tone="strong">
            <span>累计已用</span>
            <strong data-testid="ai-spend-total">{formatBatteries(analysis.totalBatteries)}</strong>
            <GameBadge tone="ai">电池</GameBadge>
          </GamePanel>
          <div className="ai-spend-list" data-testid="ai-spend-list">
            {analysis.items.map((item) => (
              <article className="ai-spend-row" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{scopeLabels[item.scopeType]}</span>
                </div>
                <b>{formatBatteries(item.batteries)} 电池</b>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
