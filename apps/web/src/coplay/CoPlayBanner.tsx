import { GameBadge } from "@pieai/swimmer-ui-kit";
import type { CoPlayRole } from "./protocol";
import type { VotePayloadV1 } from "./protocol";
import type { CoPlayTransportKind } from "./transportTypes";

interface CoPlayBannerProps {
  readonly roomCode: string;
  readonly role: CoPlayRole;
  readonly peerCount: number;
  readonly transportKind?: CoPlayTransportKind;
  readonly guestVotes?: readonly VotePayloadV1[];
  readonly onLeave?: () => void;
}

export function CoPlayBanner({
  roomCode,
  role,
  peerCount,
  transportKind = "broadcast",
  guestVotes = [],
  onLeave,
}: CoPlayBannerProps) {
  return (
    <div className="coplay-banner" data-testid="coplay-banner">
      <GameBadge tone={role === "host" ? "success" : "ai"}>
        {role === "host" ? "同玩 · 房主" : "同玩 · 围观"}
      </GameBadge>
      <GameBadge tone="neutral">
        {transportKind === "realtime" ? "跨网 Realtime" : "本机标签页"}
      </GameBadge>
      <span className="coplay-banner-code" data-testid="coplay-room-code">
        房间 {roomCode}
      </span>
      <span className="coplay-banner-peers">
        {peerCount > 0
          ? `${peerCount} 位在线好友`
          : transportKind === "realtime"
            ? "等待好友加入…"
            : "等待另一标签页加入…"}
      </span>
      {role === "host" && guestVotes.length > 0 ? (
        <span className="coplay-banner-votes" data-testid="coplay-guest-votes">
          朋友倾向：{guestVotes.map((v) => `${v.alias}→${v.choiceText}`).join(" · ")}
        </span>
      ) : null}
      {role === "guest" ? (
        <span className="coplay-banner-hint">你可投票，房主最终点选推进</span>
      ) : null}
      {onLeave ? (
        <button type="button" className="coplay-banner-leave" onClick={onLeave}>
          离开同玩
        </button>
      ) : null}
    </div>
  );
}
