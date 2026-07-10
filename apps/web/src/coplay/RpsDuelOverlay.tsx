import { GameButton, GamePanel } from "@pieai/swimmer-ui-kit";
import { RPS_LABELS, RPS_THROWS, type RpsThrow, type RpsWinner } from "./rpsRules";

export interface RpsDuelView {
  readonly duelId: string;
  readonly hostChoiceText: string;
  readonly guestChoiceText: string;
  readonly localThrow: RpsThrow | null;
  readonly remoteThrow: RpsThrow | null;
  readonly result: RpsWinner | null;
  readonly waitingRemote: boolean;
  readonly globalNote: string | null;
}

export interface GlobalLeanHint {
  readonly hostPercent: number | null;
  readonly guestPercent: number | null;
  readonly canReferee: boolean;
  readonly loading: boolean;
}

interface RpsDuelOverlayProps {
  readonly duel: RpsDuelView;
  readonly role: "host" | "guest";
  readonly globalLean?: GlobalLeanHint | null;
  readonly onThrow: (value: RpsThrow) => void;
  readonly onGlobalReferee?: () => void;
}

export function RpsDuelOverlay({
  duel,
  role,
  globalLean,
  onThrow,
  onGlobalReferee,
}: RpsDuelOverlayProps) {
  const resultCopy = duel.globalNote
    ? duel.globalNote
    : duel.result === "draw"
      ? "平局！请再出一次。"
      : duel.result === "host"
        ? `房主赢了 → 「${duel.hostChoiceText}」`
        : duel.result === "guest"
          ? `客人赢了 → 「${duel.guestChoiceText}」`
          : null;

  const throwsLocked =
    Boolean(duel.localThrow && duel.result !== "draw") || Boolean(duel.globalNote);

  return (
    <div className="rps-overlay" data-testid="rps-duel" role="dialog" aria-modal="true">
      <GamePanel title="选项冲突 · 石头剪刀布" className="rps-panel" tone="strong">
        <p className="rps-lead">
          房主想选：<strong>{duel.hostChoiceText}</strong>
          {globalLean && globalLean.hostPercent !== null ? (
            <span className="rps-lean"> · 全球 {globalLean.hostPercent}%</span>
          ) : null}
          <br />
          客人想选：<strong>{duel.guestChoiceText}</strong>
          {globalLean && globalLean.guestPercent !== null ? (
            <span className="rps-lean"> · 全球 {globalLean.guestPercent}%</span>
          ) : null}
        </p>
        <p className="rps-sub">赢的一方选项生效。你是{role === "host" ? "房主" : "客人"}。</p>

        <div className="rps-throws" data-testid="rps-throws">
          {RPS_THROWS.map((value) => (
            <GameButton
              key={value}
              type="button"
              variant={duel.localThrow === value ? "primary" : "secondary"}
              disabled={throwsLocked}
              onClick={() => onThrow(value)}
              data-testid={`rps-throw-${value}`}
            >
              {RPS_LABELS[value]}
            </GameButton>
          ))}
        </div>

        {role === "host" && onGlobalReferee ? (
          <GameButton
            type="button"
            variant="ghost"
            disabled={throwsLocked || globalLean?.loading || !globalLean?.canReferee}
            onClick={onGlobalReferee}
            data-testid="rps-global-referee"
          >
            {globalLean?.loading
              ? "拉取全球回声…"
              : globalLean?.canReferee
                ? "听全球的（跳过猜拳）"
                : "全球样本不足 / 平分"}
          </GameButton>
        ) : null}

        <p className="rps-status" data-testid="rps-status">
          {duel.globalNote
            ? "已采用全球回声裁判"
            : duel.localThrow
              ? `你出了：${RPS_LABELS[duel.localThrow]}${duel.waitingRemote ? " · 等待对方…" : ""}`
              : "请出拳"}
          {duel.remoteThrow && duel.localThrow && !duel.globalNote
            ? ` · 对方：${RPS_LABELS[duel.remoteThrow]}`
            : ""}
        </p>
        {resultCopy ? (
          <p className="rps-result" data-testid="rps-result">
            {resultCopy}
          </p>
        ) : null}
      </GamePanel>
    </div>
  );
}
