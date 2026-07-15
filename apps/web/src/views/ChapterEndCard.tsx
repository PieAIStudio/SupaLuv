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
import { majorityOptionForDecision, loadAuthoritativeCounts } from "../stats/choiceStatsLean";
import { listOracleGuesses, scoreOracleVerdicts, type OracleVerdict } from "../stats/oracleMemory";
import { downloadShareCard } from "./play/ShareCardExporter";
import { AiEndingExperience } from "./AiEndingExperience";
import type { StoryCharacterBindings } from "../characters/characterPackTypes";
import { useLocale } from "../i18n";

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
  const { t } = useLocale();
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
  const label =
    impulse >= 65
      ? t("chapterEnd.toneImpulse")
      : dignity >= 55
        ? t("chapterEnd.toneDignity")
        : t("chapterEnd.toneNeutral");
  const flavor =
    usedAi && impulse >= 60
      ? t("chapterEnd.flavorAiImpulse")
      : usedAi
        ? t("chapterEnd.flavorAi")
        : impulse >= 65
          ? t("chapterEnd.flavorImpulse")
          : dignity >= 55
            ? t("chapterEnd.flavorDignity")
            : t("chapterEnd.flavorNeutral");

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
      // Oracle scoring uses only authoritative durable aggregates (none today).
      // Process-memory display samples must not score predictions.
      const authorityCounts = await loadAuthoritativeCounts(storyId);
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
        const maj = majorityOptionForDecision(storyId, guess.decisionId, authorityCounts);
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
            `【${t("chapterEnd.clipboardDraftTitle")}】`,
            t("chapterEnd.clipboardApplication"),
            t("chapterEnd.clipboardNext"),
            `${t("chapterEnd.clipboardMeters")}: ${dignity} · ${impulse}`,
            t("chapterEnd.draftLead"),
          ]
        : [
            `【${t("chapterEnd.clipboardEndingTitle")}】`,
            `${t("chapterEnd.clipboardOrder")}${orderId}`,
            `${t("chapterEnd.clipboardMeters")}: ${dignity} · ${impulse}`,
            `${t("chapterEnd.clipboardNote")}${label}`,
            usedAi ? t("chapterEnd.clipboardPathAi") : t("chapterEnd.clipboardPathAuthor"),
            flavor,
            aiNote ? `${t("chapterEnd.aiNotePrefix")}${aiNote}` : "",
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
        copy: {
          title: t("chapterEnd.shareTitle"),
          order: t("chapterEnd.shareOrder"),
          dignity: t("play.dignity"),
          impulse: t("play.impulse"),
          leads: t("chapterEnd.shareLeads"),
          aiPath: t("chapterEnd.sharePathAi"),
          echo: t("chapterEnd.shareEcho"),
          same: t("chapterEnd.shareSame"),
        },
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
      setAiNote(t("chapterEnd.loginRequired"));
      return;
    }
    setAiBusy(true);
    try {
      const provider = getAiBranchProvider();
      const result = await provider.generate({
        storyId: "ch01",
        sceneId: "ch01_chapter_end",
        authoredChoiceLabels: [t("chapterEnd.replayChoice"), t("chapterEnd.titleChoice")],
        meters: { dignity, impulse },
        accessToken: auth.session?.access_token ?? null,
        config: {
          enabled: true,
          rejoinSceneId: "ch01_chapter_end",
          maxAiBeats: 1,
          context: t("chapterEnd.aiPrompt"),
          speakerPool: [t("chapterEnd.narrator")],
          artPool: [],
          portraitPool: [],
        },
      });
      const line = result.beats[0]?.text ?? result.choiceLabel;
      setAiNote(line.slice(0, 120));
    } catch {
      setAiNote(t("chapterEnd.unavailable"));
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
        title={draftEnd ? t("chapterEnd.draftTitle") : t("chapterEnd.title")}
        size="md"
        closeLabel={t("chapterEnd.close")}
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
                {t("chapterEnd.aiEnding")}
              </GameButton>
            ) : (
              <GameButton
                type="button"
                variant="primary"
                onClick={onTitle ?? onReplay}
                data-testid="ending-draft-done"
              >
                {draftEnd ? t("chapterEnd.draftDone") : t("chapterEnd.returnTitle")}
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
                {aiBusy
                  ? t("chapterEnd.aiNoteLoading")
                  : aiNote
                    ? t("chapterEnd.aiNoteDone")
                    : t("chapterEnd.aiNoteAction")}
              </GameButton>
            ) : null}
            <GameButton
              type="button"
              variant="ghost"
              onClick={() => void handleCopy()}
              data-testid="ending-copy"
            >
              {copied ? t("chapterEnd.copied") : t("chapterEnd.copy")}
            </GameButton>
            {!draftEnd ? (
              <GameButton
                type="button"
                variant="ghost"
                onClick={() => void handleShareCard()}
                disabled={shareBusy}
                data-testid="ending-share-card"
              >
                {shareBusy ? t("chapterEnd.exporting") : t("chapterEnd.share")}
              </GameButton>
            ) : null}
            {onTitle ? (
              <GameButton
                type="button"
                variant="secondary"
                onClick={onTitle}
                data-testid="ending-title"
              >
                {t("chapterEnd.returnTitle")}
              </GameButton>
            ) : null}
            <GameButton
              type="button"
              variant={allowAiEnding ? "primary" : "ghost"}
              onClick={onReplay}
              data-testid="ending-replay"
            >
              {draftEnd ? t("chapterEnd.replayDraft") : t("chapterEnd.replay")}
            </GameButton>
          </div>
        }
      >
        <div className="chapter-end-body is-reveal" data-testid="ending-note">
          <div className="chapter-end-shine" aria-hidden="true" />
          {draftEnd ? (
            <>
              <div className="chapter-end-badges">
                <GameBadge tone="success">{t("chapterEnd.draftApproved")}</GameBadge>
                <GameBadge tone="ai">{t("chapterEnd.questionnaire")}</GameBadge>
                <GameBadge tone="warning">{t("chapterEnd.draftEndpoint")}</GameBadge>
              </div>
              <p className="chapter-end-order" data-testid="ending-order-id">
                {t("chapterEnd.application")} <strong>{t("chapterEnd.submitted")}</strong>
              </p>
              <p className="chapter-end-lead">{t("chapterEnd.draftLead")}</p>
            </>
          ) : (
            <>
              <div className="chapter-end-badges">
                <GameBadge tone="success">{t("chapterEnd.orderConfirmed")}</GameBadge>
                <GameBadge tone="ai">{t("chapterEnd.partialDelivery")}</GameBadge>
                <GameBadge tone="warning">{label}</GameBadge>
                {usedAi ? <GameBadge tone="ai">{t("chapterEnd.containsAi")}</GameBadge> : null}
              </div>
              <p className="chapter-end-order" data-testid="ending-order-id">
                {t("chapterEnd.orderNumber")} <strong>{orderId}</strong>
              </p>
              <p className="chapter-end-lead">{flavor}</p>
            </>
          )}
          {aiNote ? (
            <p className="chapter-end-ai-note" data-testid="ending-ai-text">
              {t("chapterEnd.aiNotePrefix")}
              {aiNote}
            </p>
          ) : null}

          {path?.pathHint ? (
            <p className="chapter-end-path-hint">
              {usedAi ? t("chapterEnd.pathAi") : t("chapterEnd.pathAuthor")}
            </p>
          ) : null}

          <div className="chapter-end-meters" aria-label={t("chapterEnd.metersAria")}>
            <div className="chapter-end-meter reveal-item" style={{ animationDelay: "90ms" }}>
              <div className="chapter-end-meter-head">
                <span>{t("play.dignity")}</span>
                <strong>{dignity}</strong>
              </div>
              <GameProgress
                label={t("chapterEnd.runDignity")}
                value={dignity}
                tone="warning"
                showValue
              />
            </div>
            <div className="chapter-end-meter reveal-item" style={{ animationDelay: "180ms" }}>
              <div className="chapter-end-meter-head">
                <span>{t("play.impulse")}</span>
                <strong>{impulse}</strong>
              </div>
              <GameProgress
                label={t("chapterEnd.runImpulse")}
                value={impulse}
                tone="danger"
                showValue
              />
            </div>
          </div>

          <section
            className="chapter-end-echo"
            aria-label={t("chapterEnd.echoAria")}
            data-testid="ending-global-echo"
          >
            <header className="chapter-end-echo-head">
              <h3>{t("chapterEnd.echoTitle")}</h3>
              <p>{t("chapterEnd.echoLead")}</p>
            </header>
            {echoLoading ? (
              <p className="chapter-end-echo-empty">{t("chapterEnd.echoLoading")}</p>
            ) : echoRows.length === 0 ? (
              <p className="chapter-end-echo-empty">{t("chapterEnd.echoEmpty")}</p>
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
                      {t("chapterEnd.youChose")} <strong>{row.yourLabel}</strong>
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
                        <span>{t("chapterEnd.insufficient")}</span>
                      ) : (
                        <span>
                          <strong>{row.percentSame}%</strong> {t("chapterEnd.playersSame")}
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
              aria-label={t("chapterEnd.oracleAria")}
            >
              <header className="chapter-end-echo-head">
                <h3>{t("chapterEnd.oracleTitle")}</h3>
                <p>{t("chapterEnd.oracleLead")}</p>
              </header>
              <ul className="chapter-end-echo-list">
                {oracleVerdicts.map((v) => (
                  <li key={v.decisionId} className="chapter-end-echo-row">
                    <p className="chapter-end-echo-yours">
                      {t("chapterEnd.predicted")} <strong>{v.predictedLabel}</strong>
                      {" · "}
                      {t("chapterEnd.majority")} <strong>{v.actualMajorityLabel}</strong>
                      {" · "}
                      <span className={v.correct ? "oracle-hit" : "oracle-miss"}>
                        {v.correct ? t("chapterEnd.hit") : t("chapterEnd.miss")}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="chapter-end-footnote">
            {draftEnd ? t("chapterEnd.draftFootnote") : t("chapterEnd.footnote")}
          </p>
        </div>
      </GameModal>
    </>
  );
}
