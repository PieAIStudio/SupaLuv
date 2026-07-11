import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { bedLabel, bedTitle } from "../audio/bedCatalog";
import { gameAudio } from "../audio/gameAudio";
import type { GalleryUnlocks } from "../persistence/gameSave";

interface GalleryScreenProps {
  readonly unlocks: GalleryUnlocks;
  readonly onBack: () => void;
}

export function GalleryScreen({ unlocks, onBack }: GalleryScreenProps) {
  const total = unlocks.images.length + unlocks.audio.length;

  return (
    <div className="meta-screen gallery-screen" data-testid="gallery-screen">
      <header className="meta-header">
        <h1>鉴赏 / 图鉴</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          返回
        </GameButton>
      </header>

      <p className="meta-lead">
        解锁内容会在推进剧情或听过配乐时写入本机图鉴。点曲目可试听（独占播放）。
      </p>

      <div className="gallery-grid">
        <GamePanel title="图片 CG" tone="strong">
          <div className="gallery-badges">
            <GameBadge tone="neutral">已解锁 {unlocks.images.length}</GameBadge>
          </div>
          {unlocks.images.length === 0 ? (
            <GameEmptyState title="还没有图片" description="进入带场景图的节点后会出现在这里。" />
          ) : (
            <ul className="gallery-list">
              {unlocks.images.map((id) => (
                <li key={id}>
                  <img src={`/assets/scenes/${id}.jpg`} alt={id} className="gallery-thumb" />
                  <span>{id}</span>
                </li>
              ))}
            </ul>
          )}
        </GamePanel>

        <GamePanel title="配乐收藏" tone="strong">
          <div className="gallery-badges">
            <GameBadge tone="success">已解锁 {unlocks.audio.length}</GameBadge>
          </div>
          {unlocks.audio.length === 0 ? (
            <GameEmptyState
              title="还没有配乐"
              description="听过的 BGM（标题 / 场景 / 章末）会出现在这里，可点播放。"
            />
          ) : (
            <ul className="gallery-list text-only gallery-audio-list">
              {unlocks.audio.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className="gallery-audio-play"
                    data-testid={`gallery-audio-${id}`}
                    onClick={() => {
                      gameAudio.unlock();
                      gameAudio.playExclusiveBed(id);
                    }}
                  >
                    <span className="gallery-audio-title">{bedTitle(id)}</span>
                    <span className="gallery-audio-meta">{bedLabel(id)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GamePanel>
      </div>

      <p className="meta-lead">合计解锁：{total}</p>
    </div>
  );
}
