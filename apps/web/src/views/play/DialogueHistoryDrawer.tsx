import { GameButton, GameHistoryPanel, type GameUiHistoryEntry } from "@pieai/swimmer-ui-kit";

interface DialogueHistoryDrawerProps {
  readonly open: boolean;
  readonly entries: readonly GameUiHistoryEntry[];
  readonly onClose: () => void;
}

export function DialogueHistoryDrawer({ open, entries, onClose }: DialogueHistoryDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <aside className="history-drawer" data-testid="history-drawer" aria-label="对话历史">
      <div className="history-drawer-header">
        <h2>对话历史</h2>
        <GameButton type="button" variant="ghost" onClick={onClose}>
          关闭
        </GameButton>
      </div>
      {entries.length === 0 ? (
        <p className="history-empty">还没有记录。推进剧情后会出现在这里。</p>
      ) : (
        <GameHistoryPanel label="本局对话历史" entries={[...entries].reverse()} />
      )}
    </aside>
  );
}
