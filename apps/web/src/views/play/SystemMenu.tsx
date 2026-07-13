import { MANUAL_SLOTS, type ManualSlotId } from "../../persistence/gameSave";

interface SystemMenuProps {
  readonly open: boolean;
  readonly activeSaveSlot: ManualSlotId;
  readonly autoPlay: boolean;
  readonly showDevTools: boolean;
  readonly onSave: (slotId?: ManualSlotId) => void;
  readonly onToggleAutoPlay: () => void;
  readonly onReset: () => void;
  readonly onOpenGallery: () => void;
  readonly onOpenSettings: () => void;
  readonly onOpenHelp?: () => void;
  readonly onOpenAchievements?: () => void;
  readonly onOpenTitle: () => void;
  readonly onToggleDevTools?: () => void;
  readonly onOpenPlayerPath: () => void;
  readonly onOpenCreatorMap: () => void;
}

export function SystemMenu({
  open,
  activeSaveSlot,
  autoPlay,
  showDevTools,
  onSave,
  onToggleAutoPlay,
  onReset,
  onOpenGallery,
  onOpenSettings,
  onOpenHelp,
  onOpenAchievements,
  onOpenTitle,
  onToggleDevTools,
  onOpenPlayerPath,
  onOpenCreatorMap,
}: SystemMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="system-menu" data-testid="system-menu" role="menu">
      <button type="button" onClick={() => onSave()} data-testid="save-button" role="menuitem">
        快速存档（{activeSaveSlot.replace("slot-", "槽")}）
      </button>
      {MANUAL_SLOTS.map((slotId, index) => (
        <button key={slotId} type="button" onClick={() => onSave(slotId)} role="menuitem">
          存到手动槽 {index + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={onToggleAutoPlay}
        data-testid="autoplay-toggle"
        role="menuitem"
      >
        {autoPlay ? "关闭自动播放" : "开启自动播放"}
      </button>
      <button type="button" onClick={onReset} role="menuitem">
        重来本章
      </button>
      <button type="button" onClick={onOpenGallery} role="menuitem">
        鉴赏图鉴
      </button>
      <button type="button" onClick={onOpenSettings} role="menuitem">
        设定
      </button>
      {onOpenHelp ? (
        <button type="button" onClick={onOpenHelp} data-testid="help-menu-button" role="menuitem">
          操作说明
        </button>
      ) : null}
      {onOpenAchievements ? (
        <button
          type="button"
          onClick={onOpenAchievements}
          data-testid="achievements-menu-button"
          role="menuitem"
        >
          成就
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpenPlayerPath}
        data-testid="player-path-menu-button"
        role="menuitem"
      >
        我的路线
      </button>
      <button type="button" onClick={onOpenTitle} role="menuitem">
        返回标题
      </button>
      {onToggleDevTools ? (
        <button
          type="button"
          data-testid="dev-tools-toggle"
          onClick={onToggleDevTools}
          role="menuitem"
        >
          {showDevTools ? "隐藏开发工具" : "开发工具"}
        </button>
      ) : null}
      {showDevTools && onToggleDevTools ? (
        <button
          type="button"
          onClick={onOpenCreatorMap}
          data-testid="creator-map-menu-button"
          role="menuitem"
        >
          创作地图
        </button>
      ) : null}
    </div>
  );
}
