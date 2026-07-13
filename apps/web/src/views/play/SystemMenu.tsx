import { MANUAL_SLOTS, type ManualSlotId } from "../../persistence/gameSave";
import { useLocale } from "../../i18n";

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
  const { locale, t } = useLocale();
  const devCopy = import.meta.env.DEV
    ? locale === "zh-CN"
      ? {
          hide: "隐藏开发工具",
          show: "开发工具",
          creatorMap: "创作地图",
        }
      : {
          hide: "Hide developer tools",
          show: "Developer tools",
          creatorMap: "Creator map",
        }
    : null;
  if (!open) {
    return null;
  }

  return (
    <div className="system-menu" data-testid="system-menu" role="menu">
      <button type="button" onClick={() => onSave()} data-testid="save-button" role="menuitem">
        {t("play.quickSave")} ({activeSaveSlot.replace("slot-", "#")})
      </button>
      {MANUAL_SLOTS.map((slotId, index) => (
        <button key={slotId} type="button" onClick={() => onSave(slotId)} role="menuitem">
          {t("play.saveManual")} {index + 1}
        </button>
      ))}
      <button
        type="button"
        onClick={onToggleAutoPlay}
        data-testid="autoplay-toggle"
        role="menuitem"
      >
        {autoPlay ? t("play.autoDisable") : t("play.autoEnable")}
      </button>
      <button type="button" onClick={onReset} role="menuitem">
        {t("play.restartChapter")}
      </button>
      <button type="button" onClick={onOpenGallery} role="menuitem">
        {t("play.gallery")}
      </button>
      <button type="button" onClick={onOpenSettings} role="menuitem">
        {t("play.settings")}
      </button>
      {onOpenHelp ? (
        <button type="button" onClick={onOpenHelp} data-testid="help-menu-button" role="menuitem">
          {t("play.help")}
        </button>
      ) : null}
      {onOpenAchievements ? (
        <button
          type="button"
          onClick={onOpenAchievements}
          data-testid="achievements-menu-button"
          role="menuitem"
        >
          {t("play.achievements")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onOpenPlayerPath}
        data-testid="player-path-menu-button"
        role="menuitem"
      >
        {t("play.route")}
      </button>
      <button type="button" onClick={onOpenTitle} role="menuitem">
        {t("play.title")}
      </button>
      {devCopy && onToggleDevTools ? (
        <button
          type="button"
          data-testid="dev-tools-toggle"
          onClick={onToggleDevTools}
          role="menuitem"
        >
          {showDevTools ? devCopy.hide : devCopy.show}
        </button>
      ) : null}
      {devCopy && showDevTools && onToggleDevTools ? (
        <button
          type="button"
          onClick={onOpenCreatorMap}
          data-testid="creator-map-menu-button"
          role="menuitem"
        >
          {devCopy.creatorMap}
        </button>
      ) : null}
    </div>
  );
}
