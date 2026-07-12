import { GameBadge, GameButton, GameModal, GameProgress } from "@pieai/swimmer-ui-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { getAiBranchProvider } from "../ai/aiBranchProvider";
import { useAuth } from "../auth/AuthContext";
import { DEFAULT_DISPLAY_NAMES, type DisplayNameMap } from "../persistence/displayNames";
import {
  loadChoiceEchoRows,
  type ChoiceEchoRow,
  type SessionChoicePick,
} from "../stats/choiceStatsClient";
import { majorityOptionForDecision, loadMergedCounts } from "../stats/choiceStatsLean";
import { listOracleGuesses, scoreOracleVerdicts, type OracleVerdict } from "../stats/oracleMemory";
import { downloadShareCard } from "./play/ShareCardExporter";
import { AiEndingExperience } from "./AiEndingExperience";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";

export interface EndingPathMeta {
  readonly usedAiBranch: boolean;
  readonly pathHint?: string;
}

interface ChapterEndCardProps {
  readonly open: boolean;
  readonly storyId?: string;
  readonly dignity: number;
  readonly impulse: number;
  readonly path?: EndingPathMeta;
  /** Stats-visible authored picks from this run. */
  readonly sessionStatsPicks?: readonly SessionChoicePick[];
  readonly displayNames?: DisplayNameMap;
  readonly characterBindings?: StoryCharacterBindings;
  /** When false, hide AI final-chapter entry (draft package chapters). */
  readonly allowAiEnding?: boolean;
  /** Current two-chapter draft terminal card copy. */
  readonly draftEnd?: boolean;
  /** Called once when any echo row is minority (≤32%). */
  readonly onRareEcho?: () => void;
  /** ≥3 minority rows this run. */
  readonly onReverseCurrent?: () => void;
  /** At least one oracle guess matched community majority. */
  readonly onOracleHit?: () => void;
  readonly onReplay: () => void;
  readonly onTitle?: () => void;
}

function buildOrderId(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `SL-CH01-${n}`;
}

function toneLabel(dignity: number, impulse: number): string {
  if (impulse >= 65) {
    return "冲动偏高 · 夜账已结";
  }
  if (dignity >= 55) {
    return "体面残留 · 实验备注";
  }
  return "不英勇也不彻底";
}

function flavorCopy(dignity: number, impulse: number, usedAi: boolean): string {
  if (usedAi && impulse >= 60) {
    return "你让灵感替你点了一次头。作者主线收回绳索——但订单号不会假装没发生。";
  }
  if (usedAi) {
    return "AI 旁支像一次没写进 PR 的 commit：短、可回滚、却留了痕迹。";
  }
  if (impulse >= 65) {
    return "体面是白天的职业，夜晚另有账单。你付了。";
  }
  if (dignity >= 55) {
    return "你把脏样本擦得很干净。干净到像从未存在——直到物流短信响起。";
  }
  return "苏明点下了确认。实验。不是判决。—— 但系统已出单。";
}

export function ChapterEndCard({
  open,
  storyId = "draft-ch02",
  dignity,
  impulse,
  path,
  sessionStatsPicks = [],
  displayNames = DEFAULT_DISPLAY_NAMES,
  characterBindings = {},
  allowAiEnding = false,
  draftEnd = true,
  onRareEcho,
  onReverseCurrent,
  onOracleHit,
  onReplay,
  onTitle,
}: ChapterEndCardProps) {
  const auth = useAuth();
  const [copied, setCopied] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [showAiEnding, setShowAiEnding] = useState(false);
  const [echoRows, setEchoRows] = useState<ChoiceEchoRow[]>([]);
  const [echoLoading, setEchoLoading] = useState(false);
  const [oracleVerdicts, setOracleVerdicts] = useState<OracleVerdict[]>([]);
  const rareFiredRef = useRef(false);
  const reverseFiredRef = useRef(false);
  const oracleFiredRef = useRef(false);
  const orderId = useMemo(() => (open ? buildOrderId() : ""), [open]);
  const usedAi = Boolean(path?.usedAiBranch);
  const label = toneLabel(dignity, impulse);
  const flavor = flavorCopy(dignity, impulse, usedAi);

  useEffect(() => {
    if (!open) {
      setEchoRows([]);
      setEchoLoading(false);
      setOracleVerdicts([]);
      rareFiredRef.current = false;
      reverseFiredRef.current = false;
      oracleFiredRef.current = false;
      return;
    }
    if (sessionStatsPicks.length === 0) {
      setEchoRows([]);
      setEchoLoading(false);
      setOracleVerdicts([]);
      return;
    }
    let cancelled = false;
    setEchoLoading(true);
    void (async () => {
      const rows = await loadChoiceEchoRows(storyId, sessionStatsPicks);
      const counts = await loadMergedCounts(storyId);
      if (cancelled) {
        return;
      }
      setEchoRows(rows);
      setEchoLoading(false);
      if (!rareFiredRef.current && rows.some((r) => r.cohortKind === "minority")) {
        rareFiredRef.current = true;
        onRareEcho?.();
      }
      const minorityCount = rows.filter((r) => r.cohortKind === "minority").length;
      if (!reverseFiredRef.current && minorityCount >= 3) {
        reverseFiredRef.current = true;
        onReverseCurrent?.();
      }

      const majorityMap = new Map<string, { choiceId: string; shortLabel: string }>();
      for (const guess of listOracleGuesses()) {
        const maj = majorityOptionForDecision(storyId, guess.decisionId, counts);
        if (maj) {
          majorityMap.set(guess.decisionId, {
            choiceId: maj.choiceId,
            shortLabel: maj.shortLabel,
          });
        }
      }
      const verdicts = scoreOracleVerdicts(majorityMap);
      setOracleVerdicts([...verdicts]);
      if (!oracleFiredRef.current && verdicts.some((v) => v.correct)) {
        oracleFiredRef.current = true;
        onOracleHit?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, storyId, sessionStatsPicks, onRareEcho, onReverseCurrent, onOracleHit]);

  async function handleCopy() {
    const text = (
      draftEnd
        ? [
            "【超级爱人 · 草稿两章当前终点】",
            "体验官申请：初审通过",
            "下一步：48小时内完成个性化匹配问卷",
            `羞耻 ${dignity} · 冲动 ${impulse}`,
            "苏明：就当我有病。",
          ]
        : [
            "【超级爱人 · 章节结局】",
            `订单：${orderId}`,
            `羞耻 ${dignity} · 冲动 ${impulse}`,
            `批注：${label}`,
            usedAi ? "路径：走过 AI 旁支后汇合主线" : "路径：纯作者选项",
            flavor,
            aiNote ? `AI 结案：${aiNote}` : "",
            "— SupaLuv Demo",
          ]
    )
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  async function handleShareCard() {
    setShareBusy(true);
    try {
      await downloadShareCard({
        orderId,
        dignity,
        impulse,
        toneLabel: label,
        usedAi,
        flavor: aiNote ? `${flavor}\n${aiNote}` : flavor,
        leadNames: {
          male: displayNames.suming,
          female: displayNames.lin_xiaotang,
        },
        echoLines: echoRows
          .filter((row) => row.percentSame !== null)
          .map((row) => ({
            label: row.yourLabel,
            percentSame: row.percentSame as number,
          })),
      });
    } catch {
      // ignore
    } finally {
      setShareBusy(false);
    }
  }

  /** A1 — short ending note; rejoin is the end card itself (no Ink jump). */
  async function handleAiEpilogue() {
    if (aiBusy || aiNote) {
      return;
    }
    if (!auth.isSignedIn) {
      setAiNote("（AI 结案需要登录——主线结算仍有效。可在设定中登录。）");
      return;
    }
    setAiBusy(true);
    try {
      const provider = getAiBranchProvider();
      const result = await provider.generate({
        storyId: "ch01",
        sceneId: "ch01_chapter_end",
        authoredChoiceLabels: ["再玩一遍", "返回标题"],
        meters: { dignity, impulse },
        accessToken: auth.session?.access_token ?? null,
        config: {
          enabled: true,
          rejoinSceneId: "ch01_chapter_end",
          maxAiBeats: 1,
          context: "第1章已结束。用一句黑色喜剧结案陈词（≤60字），像系统备注。禁止色情与人身攻击。",
          speakerPool: ["旁白"],
          artPool: [],
          portraitPool: [],
        },
      });
      const line = result.beats[0]?.text ?? result.choiceLabel;
      setAiNote(line.slice(0, 120));
    } catch {
      setAiNote("（结案服务暂不可用——订单仍已生成。）");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <>
      <AiEndingExperience
        open={open && showAiEnding}
        characterBindings={characterBindings}
        onClose={() => setShowAiEnding(false)}
      />
      <GameModal
        open={open && !showAiEnding}
        title={draftEnd ? "草稿两章 · 当前终点" : "章节完成"}
        size="md"
        closeLabel="关闭结算"
        closeOnBackdrop={false}
        onClose={onReplay}
        className="chapter-end-modal"
        footer={
          <div className="chapter-end-footer">
            {allowAiEnding ? (
              <GameButton
                type="button"
                variant="primary"
                onClick={() => setShowAiEnding(true)}
                data-testid="ending-ai-experience"
              >
                AI 最终章 · 10–20 分钟
              </GameButton>
            ) : (
              <GameButton
                type="button"
                variant="primary"
                onClick={onTitle ?? onReplay}
                data-testid="ending-draft-done"
              >
                {draftEnd ? "就当我有病 · 回标题" : "回标题"}
              </GameButton>
            )}
            {allowAiEnding ? (
              <GameButton
                type="button"
                variant="ghost"
                onClick={() => void handleAiEpilogue()}
                disabled={aiBusy || Boolean(aiNote)}
                data-testid="ending-ai-note"
              >
                {aiBusy ? "结案生成中…" : aiNote ? "已生成结案" : "AI 结案陈词"}
              </GameButton>
            ) : null}
            <GameButton
              type="button"
              variant="ghost"
              onClick={() => void handleCopy()}
              data-testid="ending-copy"
            >
              {copied ? "已复制摘要" : "复制结局摘要"}
            </GameButton>
            {!draftEnd ? (
              <GameButton
                type="button"
                variant="ghost"
                onClick={() => void handleShareCard()}
                disabled={shareBusy}
                data-testid="ending-share-card"
              >
                {shareBusy ? "导出中…" : "下载分享卡"}
              </GameButton>
            ) : null}
            {onTitle ? (
              <GameButton
                type="button"
                variant="secondary"
                onClick={onTitle}
                data-testid="ending-title"
              >
                返回标题
              </GameButton>
            ) : null}
            <GameButton
              type="button"
              variant={allowAiEnding ? "primary" : "ghost"}
              onClick={onReplay}
              data-testid="ending-replay"
            >
              {draftEnd ? "再玩一遍草稿" : "再玩一遍"}
            </GameButton>
          </div>
        }
      >
        <div className="chapter-end-body is-reveal" data-testid="ending-note">
          <div className="chapter-end-shine" aria-hidden="true" />
          {draftEnd ? (
            <>
              <div className="chapter-end-badges">
                <GameBadge tone="success">初审通过</GameBadge>
                <GameBadge tone="ai">48 小时内完成匹配问卷</GameBadge>
                <GameBadge tone="warning">草稿当前终点</GameBadge>
              </div>
              <p className="chapter-end-order" data-testid="ending-order-id">
                体验官申请 <strong>已提交</strong>
              </p>
              <p className="chapter-end-lead">
                三分钟后，短信快得像那头一直有人等着。苏明盯着屏幕：就当我有病。
              </p>
            </>
          ) : (
            <>
              <div className="chapter-end-badges">
                <GameBadge tone="success">订单已确认</GameBadge>
                <GameBadge tone="ai">分批发货</GameBadge>
                <GameBadge tone="warning">{label}</GameBadge>
                {usedAi ? <GameBadge tone="ai">含 AI 旁支</GameBadge> : null}
              </div>
              <p className="chapter-end-order" data-testid="ending-order-id">
                订单号 <strong>{orderId}</strong>
              </p>
              <p className="chapter-end-lead">{flavor}</p>
            </>
          )}
          {aiNote ? (
            <p className="chapter-end-ai-note" data-testid="ending-ai-text">
              AI 结案：{aiNote}
            </p>
          ) : null}

          {path?.pathHint ? <p className="chapter-end-path-hint">{path.pathHint}</p> : null}

          <div className="chapter-end-meters" aria-label="本局数值结算">
            <div className="chapter-end-meter reveal-item" style={{ animationDelay: "90ms" }}>
              <div className="chapter-end-meter-head">
                <span>羞耻</span>
                <strong>{dignity}</strong>
              </div>
              <GameProgress label="本局羞耻" value={dignity} tone="warning" showValue />
            </div>
            <div className="chapter-end-meter reveal-item" style={{ animationDelay: "180ms" }}>
              <div className="chapter-end-meter-head">
                <span>冲动</span>
                <strong>{impulse}</strong>
              </div>
              <GameProgress label="本局冲动" value={impulse} tone="danger" showValue />
            </div>
          </div>

          <section
            className="chapter-end-echo"
            aria-label="全球选项回声"
            data-testid="ending-global-echo"
          >
            <header className="chapter-end-echo-head">
              <h3>全球回声</h3>
              <p>有多少玩家在关键抉择上和你一样——像互动影游的章末结算。</p>
            </header>
            {echoLoading ? (
              <p className="chapter-end-echo-empty">正在汇总社区选择…</p>
            ) : echoRows.length === 0 ? (
              <p className="chapter-end-echo-empty">
                本局未经过统计白名单里的关键分叉（或仍在演示捷径）。再走一遍完整路径即可看到回声。
              </p>
            ) : (
              <ul className="chapter-end-echo-list">
                {echoRows.map((row, index) => (
                  <li
                    key={row.decisionId}
                    className="chapter-end-echo-row reveal-item"
                    style={{ animationDelay: `${220 + index * 70}ms` }}
                    data-testid={`ending-echo-${row.decisionId}`}
                  >
                    <p className="chapter-end-echo-prompt">{row.prompt}</p>
                    <p className="chapter-end-echo-yours">
                      你选了：<strong>{row.yourLabel}</strong>
                    </p>
                    <div className="chapter-end-echo-bar-wrap" aria-hidden="true">
                      <div
                        className="chapter-end-echo-bar"
                        style={{
                          width:
                            row.percentSame === null
                              ? "12%"
                              : `${Math.max(8, Math.min(100, row.percentSame))}%`,
                        }}
                      />
                    </div>
                    <div className="chapter-end-echo-meta">
                      {row.percentSame === null ? (
                        <span>样本不足，暂不显示百分比</span>
                      ) : (
                        <span>
                          <strong>{row.percentSame}%</strong> 的玩家与你相同
                        </span>
                      )}
                      <span className={`chapter-end-echo-tag is-${row.cohortKind}`}>
                        {row.cohortLabel}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {echoRows[0]?.sourceNote ? (
              <p className="chapter-end-echo-source">{echoRows[0].sourceNote}</p>
            ) : null}
          </section>

          {oracleVerdicts.length > 0 ? (
            <section
              className="chapter-end-oracle"
              data-testid="ending-oracle"
              aria-label="预言家结算"
            >
              <header className="chapter-end-echo-head">
                <h3>预言家</h3>
                <p>你猜的多数 vs 社区实际多数。</p>
              </header>
              <ul className="chapter-end-echo-list">
                {oracleVerdicts.map((v) => (
                  <li key={v.decisionId} className="chapter-end-echo-row">
                    <p className="chapter-end-echo-yours">
                      你猜：<strong>{v.predictedLabel}</strong>
                      {" · "}
                      多数：<strong>{v.actualMajorityLabel}</strong>
                      {" · "}
                      <span className={v.correct ? "oracle-hit" : "oracle-miss"}>
                        {v.correct ? "命中" : "偏差"}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="chapter-end-footnote">
            {draftEnd
              ? "她不会评判你——至少落地页是这么写的。"
              : "实验。不是判决。—— 但订单号已经生成。"}
          </p>
        </div>
      </GameModal>
    </>
  );
}
