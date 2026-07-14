import { GameButton, GamePanel } from "@pieai/swimmer-ui-kit";
import { useLocale } from "../i18n";
import {
  fillTemplate,
  formatRpsResultCopy,
  formatRpsStatus,
  localizeGlobalEchoNote,
  type RpsThrowLabels,
} from "./coplayDisplay";
import { RPS_THROWS, type RpsThrow, type RpsWinner } from "./rpsRules";

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
  const { t } = useLocale();
  const labels: RpsThrowLabels = {
    rock: t("coplay.rpsRock"),
    paper: t("coplay.rpsPaper"),
    scissors: t("coplay.rpsScissors"),
  };
  const roleCopy = role === "host" ? t("coplay.rpsRoleHost") : t("coplay.rpsRoleGuest");
  const resultCopy = duel.globalNote
    ? localizeGlobalEchoNote({
        note: duel.globalNote,
        appliedCopy: t("coplay.rpsUsedGlobal"),
        hostTemplate: t("coplay.globalNoteHost"),
        guestTemplate: t("coplay.globalNoteGuest"),
      })
    : formatRpsResultCopy({
        result: duel.result,
        globalNote: null,
        hostChoiceText: duel.hostChoiceText,
        guestChoiceText: duel.guestChoiceText,
        copy: {
          draw: t("coplay.rpsDraw"),
          hostWon: t("coplay.rpsHostWon"),
          guestWon: t("coplay.rpsGuestWon"),
        },
      });

  const throwsLocked =
    Boolean(duel.localThrow && duel.result !== "draw") || Boolean(duel.globalNote);

  return (
    <div
      className="rps-overlay"
      data-testid="rps-duel"
      role="dialog"
      aria-label={t("coplay.rpsDialogAria")}
      aria-modal="true"
    >
      <GamePanel title={t("coplay.rpsTitle")} className="rps-panel" tone="strong">
        <p className="rps-lead">
          {t("coplay.rpsHostWants")} <strong>{duel.hostChoiceText}</strong>
          {globalLean && globalLean.hostPercent !== null ? (
            <span className="rps-lean">
              {fillTemplate(t("coplay.rpsGlobalPercent"), { n: globalLean.hostPercent })}
            </span>
          ) : null}
          <br />
          {t("coplay.rpsGuestWants")} <strong>{duel.guestChoiceText}</strong>
          {globalLean && globalLean.guestPercent !== null ? (
            <span className="rps-lean">
              {fillTemplate(t("coplay.rpsGlobalPercent"), { n: globalLean.guestPercent })}
            </span>
          ) : null}
        </p>
        <p className="rps-sub">{fillTemplate(t("coplay.rpsSub"), { role: roleCopy })}</p>

        <div className="rps-throws" aria-label={t("coplay.rpsThrowsAria")} data-testid="rps-throws">
          {RPS_THROWS.map((value) => (
            <GameButton
              key={value}
              type="button"
              variant={duel.localThrow === value ? "primary" : "secondary"}
              disabled={throwsLocked}
              onClick={() => onThrow(value)}
              data-testid={`rps-throw-${value}`}
            >
              {labels[value]}
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
              ? t("coplay.rpsLoadingEcho")
              : globalLean?.canReferee
                ? t("coplay.rpsListenGlobal")
                : t("coplay.rpsSampleThin")}
          </GameButton>
        ) : null}

        <p
          className="rps-status"
          aria-label={t("coplay.rpsStatusAria")}
          aria-live="polite"
          data-testid="rps-status"
        >
          {formatRpsStatus({
            globalNote: duel.globalNote,
            localThrow: duel.localThrow,
            remoteThrow: duel.remoteThrow,
            waitingRemote: duel.waitingRemote,
            labels,
            copy: {
              usedGlobal: t("coplay.rpsUsedGlobal"),
              youThrew: t("coplay.rpsYouThrew"),
              waiting: t("coplay.rpsWaiting"),
              pleaseThrow: t("coplay.rpsPleaseThrow"),
              opponent: t("coplay.rpsOpponent"),
            },
          })}
        </p>
        {resultCopy ? (
          <p
            className="rps-result"
            aria-label={t("coplay.rpsResultAria")}
            aria-live="polite"
            data-testid="rps-result"
          >
            {resultCopy}
          </p>
        ) : null}
      </GamePanel>
    </div>
  );
}
