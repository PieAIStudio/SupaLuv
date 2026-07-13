import { GameBadge, GameButton, GameProgress } from "@pieai/swimmer-ui-kit";
import { bedLabel } from "../../audio/bedCatalog";
import type { ManualSlotId } from "../../persistence/gameSave";
import type { StoryId } from "../../story/storyMapAdapter";
import { SystemMenu } from "./SystemMenu";

interface PlayHudProps {
  readonly playerMode: boolean;
  readonly autoPlay: boolean;
  readonly showComedyMeters: boolean;
  readonly dignity: number;
  readonly impulse: number;
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
  dignity,
  impulse,
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
  return (
    <header className="vn-hud">
      <div className="hud-left">
        <span data-testid="prototype-badge">
          <GameBadge tone={playerMode ? "ai" : "warning"}>
            {playerMode ? "剧情模式" : "开发模式"}
          </GameBadge>
        </span>
        {autoPlay ? <GameBadge tone="success">AUTO</GameBadge> : null}
        {showComedyMeters ? (
          <div className="meter-rail" data-testid="comedy-meters">
            <div className="meter-block">
              <span className="meter-label">羞耻</span>
              <GameProgress label="羞耻" value={dignity} tone="warning" showValue />
            </div>
            <div className="meter-block">
              <span className="meter-label">冲动</span>
              <GameProgress label="冲动" value={impulse} tone="danger" showValue />
            </div>
          </div>
        ) : null}
        {saveFlash ? (
          <span className="save-toast" data-testid="save-toast">
            已保存
          </span>
        ) : null}
        {nowPlayingBedId ? (
          <span
            className="now-playing-chip"
            data-testid="now-playing"
            title={bedLabel(nowPlayingBedId)}
          >
            ♪ {bedLabel(nowPlayingBedId)}
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
          {isFullscreen ? "退出全屏" : "全屏"}
        </GameButton>
        <GameButton
          type="button"
          variant="ghost"
          onClick={onToggleMute}
          data-testid="mute-toggle"
          aria-pressed={muted}
        >
          {muted ? "声音关" : "声音开"}
        </GameButton>
        <GameButton
          type="button"
          variant="ghost"
          onClick={onOpenHistory}
          data-testid="history-toggle"
        >
          历史
        </GameButton>
        <div className="system-menu-wrap">
          <GameButton
            type="button"
            variant="secondary"
            onClick={onToggleSystem}
            data-testid="system-menu-toggle"
            aria-expanded={systemOpen}
          >
            系统
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
