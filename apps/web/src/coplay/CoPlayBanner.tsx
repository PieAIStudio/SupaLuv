import { GameBadge } from "@pieai/swimmer-ui-kit";
import { useLocale } from "../i18n";
import { fillTemplate } from "./coplayDisplay";
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
  const { t } = useLocale();
  const peerStatus =
    peerCount > 0
      ? fillTemplate(t("coplay.peersOnline"), { n: peerCount })
      : transportKind === "realtime"
        ? t("coplay.waitRealtime")
        : t("coplay.waitLocal");

  return (
    <div className="coplay-banner" aria-label={t("coplay.bannerAria")} data-testid="coplay-banner">
      <GameBadge tone={role === "host" ? "success" : "ai"}>
        {role === "host" ? t("coplay.badgeHost") : t("coplay.badgeGuest")}
      </GameBadge>
      <GameBadge tone="neutral">
        {transportKind === "realtime" ? t("coplay.transportRealtime") : t("coplay.transportLocal")}
      </GameBadge>
      <span className="coplay-banner-code" data-testid="coplay-room-code">
        {t("coplay.roomPrefix")} {roomCode}
      </span>
      <span className="coplay-banner-peers" aria-live="polite">
        {peerStatus}
      </span>
      {role === "host" && guestVotes.length > 0 ? (
        <span
          className="coplay-banner-votes"
          aria-label={t("coplay.guestVotesAria")}
          data-testid="coplay-guest-votes"
        >
          {t("coplay.guestVotesPrefix")}
          {guestVotes.map((v) => `${v.alias}→${v.choiceText}`).join(" · ")}
        </span>
      ) : null}
      {role === "guest" ? (
        <span className="coplay-banner-hint">{t("coplay.guestHint")}</span>
      ) : null}
      {onLeave ? (
        <button
          type="button"
          className="coplay-banner-leave"
          aria-label={t("coplay.leaveAria")}
          onClick={onLeave}
        >
          {t("coplay.leave")}
        </button>
      ) : null}
    </div>
  );
}
