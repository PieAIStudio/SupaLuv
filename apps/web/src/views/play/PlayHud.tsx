import { GameBadge, GameButton, GameProgress } from "@pieai/swimmer-ui-kit";
import { bedLabel } from "../../audio/bedCatalog";
import { useLocale } from "../../i18n";
import type { ManualSlotId } from "../../persistence/gameSave";
import type { StoryId } from "../../story/storyMapAdapter";
import { SystemMenu } from "./SystemMenu";

interface PlayHudProps {
  readonly playerMode: boolean;
  readonly autoPlay: boolean;
  readonly showComedyMeters: boolean;
  readonly mianzi: number;
  readonly ai_score: number;
  readonly saveFlash: boolean;
  readonly showDevTools: boolean;
  readonly storyId: StoryId;
  readonly storyLabel: string;
  /** Current exclusive BGM key (stable id). */
  readonly nowPlayingBedId?: string | null;
  readonly isFullscreen: boolean;
  readonly muted: boolean;
  readonly systemOpen: boolean;
  readonly activeSaveSlot: ManualSlotId;
  readonly onStoryChange: (storyId: StoryId) => void;
  readonly onToggleFullscreen: () => void;
  readonly onToggleMute: () => void;
  readonly onOpenHistory: () => void;
  readonly onToggleSystem: () => void;
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

export function PlayHud({
  playerMode,
  autoPlay,
  showComedyMeters,
  mianzi,
  ai_score,
  saveFlash,
  showDevTools,
  storyId,
  storyLabel,
  nowPlayingBedId = null,
  isFullscreen,
  muted,
  systemOpen,
  activeSaveSlot,
  onStoryChange,
  onToggleFullscreen,
  onToggleMute,
  onOpenHistory,
  onToggleSystem,
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
}: PlayHudProps) {
  const { locale, t } = useLocale();
  const modeLabel =
    !playerMode && import.meta.env.DEV
      ? locale === "zh-CN"
        ? "开发模式"
        : "Developer mode"
      : t("play.storyMode");
  return (
    <header className={`vn-hud${systemOpen ? " is-system-open" : ""}`}>
      <div className="hud-left">
        <span data-testid="prototype-badge">
          <GameBadge tone={playerMode ? "ai" : "warning"}>{modeLabel}</GameBadge>
        </span>
        {autoPlay ? <GameBadge tone="success">AUTO</GameBadge> : null}
        {showComedyMeters ? (
          <div className="meter-rail" data-testid="comedy-meters">
            <div className="meter-block">
              <span className="meter-label">{t("play.mianzi")}</span>
              <GameProgress label={t("play.mianzi")} value={mianzi} tone="warning" showValue />
            </div>
            <div className="meter-block">
              <span className="meter-label">{t("play.ai_score")}</span>
              <GameProgress label={t("play.ai_score")} value={ai_score} tone="danger" showValue />
            </div>
          </div>
        ) : null}
        {saveFlash ? (
          <span className="save-toast" data-testid="save-toast">
            {t("play.saved")}
          </span>
        ) : null}
        {nowPlayingBedId ? (
          <span
            className="now-playing-chip"
            data-testid="now-playing"
            title={bedLabel(nowPlayingBedId, locale)}
          >
            ♪ {bedLabel(nowPlayingBedId, locale)}
          </span>
        ) : null}
      </div>
      <div className="hud-right">
        {showDevTools ? (
          <label className="hud-select-wrap">
            <span className="hud-select-label" data-testid="story-label">
              {storyLabel}
            </span>
            <select
              aria-label="Story selector"
              className="hud-select"
              value={storyId}
              onChange={(event) => onStoryChange(event.target.value as StoryId)}
            >
              <option value="draft-ch01">第01章 · 你有病吧</option>
              <option value="draft-ch02">第02章 · 她不会评判你</option>
              <option value="draft-ch03">第03章 · 长按七秒</option>
              <option value="prototype-act1">Prototype Act 1</option>
              <option value="chapter-01-trial">Chapter 01 Trial</option>
            </select>
          </label>
        ) : (
          <span className="hud-select-label player-story-label" data-testid="story-label">
            {storyLabel}
          </span>
        )}
        <GameButton
          type="button"
          variant="ghost"
          onClick={onToggleFullscreen}
          data-testid="fullscreen-toggle"
        >
          {isFullscreen ? t("play.exitFullscreen") : t("play.fullscreen")}
        </GameButton>
        <GameButton
          type="button"
          variant="ghost"
          onClick={onToggleMute}
          data-testid="mute-toggle"
          aria-pressed={muted}
        >
          {muted ? t("play.soundOff") : t("play.soundOn")}
        </GameButton>
        <GameButton
          type="button"
          variant="ghost"
          onClick={onOpenHistory}
          data-testid="history-toggle"
        >
          {t("play.history")}
        </GameButton>
        <div className="system-menu-wrap">
          <GameButton
            type="button"
            variant="secondary"
            onClick={onToggleSystem}
            data-testid="system-menu-toggle"
            aria-expanded={systemOpen}
          >
            {t("play.system")}
          </GameButton>
          <SystemMenu
            open={systemOpen}
            activeSaveSlot={activeSaveSlot}
            autoPlay={autoPlay}
            showDevTools={showDevTools}
            onSave={onSave}
            onToggleAutoPlay={onToggleAutoPlay}
            onReset={onReset}
            onOpenGallery={onOpenGallery}
            onOpenSettings={onOpenSettings}
            onOpenHelp={onOpenHelp}
            onOpenAchievements={onOpenAchievements}
            onOpenTitle={onOpenTitle}
            onToggleDevTools={onToggleDevTools}
            onOpenPlayerPath={onOpenPlayerPath}
            onOpenCreatorMap={onOpenCreatorMap}
          />
        </div>
      </div>
    </header>
  );
}
