import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { bedLabel, bedTitle } from "../audio/bedCatalog";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";
import type { GalleryUnlocks } from "../persistence/gameSave";

interface GalleryScreenProps {
  readonly unlocks: GalleryUnlocks;
  readonly onBack: () => void;
}

export function GalleryScreen({ unlocks, onBack }: GalleryScreenProps) {
  const { locale, t } = useLocale();
  const total = unlocks.images.length + unlocks.audio.length;

  return (
    <div className="meta-screen gallery-screen" data-testid="gallery-screen">
      <header className="meta-header">
        <h1>{t("gallery.title")}</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </GameButton>
      </header>

      <p className="meta-lead">{t("gallery.lead")}</p>

      <div className="gallery-grid">
        <GamePanel title={t("gallery.images")} tone="strong">
          <div className="gallery-badges">
            <GameBadge tone="neutral">
              {t("gallery.unlockedCount")} {unlocks.images.length}
            </GameBadge>
          </div>
          {unlocks.images.length === 0 ? (
            <GameEmptyState
              title={t("gallery.noImages")}
              description={t("gallery.noImagesDescription")}
            />
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

        <GamePanel title={t("gallery.audio")} tone="strong">
          <div className="gallery-badges">
            <GameBadge tone="success">
              {t("gallery.unlockedCount")} {unlocks.audio.length}
            </GameBadge>
          </div>
          {unlocks.audio.length === 0 ? (
            <GameEmptyState
              title={t("gallery.noAudio")}
              description={t("gallery.noAudioDescription")}
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
                    <span className="gallery-audio-meta">{bedLabel(id, locale)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GamePanel>
      </div>

      <p className="meta-lead">
        {t("gallery.total")}: {total}
      </p>
    </div>
  );
}
