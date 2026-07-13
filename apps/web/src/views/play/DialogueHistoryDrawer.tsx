import { GameButton, GameHistoryPanel, type GameUiHistoryEntry } from "@pieai/swimmer-ui-kit";
import { useLocale } from "../../i18n";

interface DialogueHistoryDrawerProps {
  readonly open: boolean;
  readonly entries: readonly GameUiHistoryEntry[];
  readonly onClose: () => void;
}

export function DialogueHistoryDrawer({ open, entries, onClose }: DialogueHistoryDrawerProps) {
  const { t } = useLocale();
  if (!open) {
    return null;
  }

  return (
    <aside
      className="history-drawer"
      data-testid="history-drawer"
      aria-label={t("play.historyTitle")}
    >
      <div className="history-drawer-header">
        <h2>{t("play.historyTitle")}</h2>
        <GameButton type="button" variant="ghost" onClick={onClose}>
          {t("common.close")}
        </GameButton>
      </div>
      {entries.length === 0 ? (
        <p className="history-empty">{t("play.historyEmpty")}</p>
      ) : (
        <GameHistoryPanel label={t("play.historyLabel")} entries={[...entries].reverse()} />
      )}
    </aside>
  );
}
