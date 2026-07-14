import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { bedLabel, bedTitle } from "../audio/bedCatalog";
import { gameAudio } from "../audio/gameAudio";
import { useLocale } from "../i18n";
import {
  ALGORITHM_SHAME_ARCHIVE,
  type AlgorithmShameArchiveRecordId,
} from "../persistence/algorithmShameArchive";
import type { GalleryUnlocks } from "../persistence/gameSave";

interface GalleryScreenProps {
  readonly unlocks: GalleryUnlocks;
  readonly onBack: () => void;
}

export function GalleryScreen({ unlocks, onBack }: GalleryScreenProps) {
  const { locale, t } = useLocale();
  const archiveUnlocked = new Set(unlocks.archive ?? []);
  const archiveUnlockedCount = ALGORITHM_SHAME_ARCHIVE.filter((record) =>
    archiveUnlocked.has(record.id),
  ).length;
  const total = unlocks.images.length + unlocks.audio.length + archiveUnlockedCount;

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

        <GamePanel title={t("gallery.archive")} tone="strong">
          <div className="gallery-badges">
            <GameBadge tone="neutral">
              {t("gallery.unlockedCount")} {archiveUnlockedCount}/{ALGORITHM_SHAME_ARCHIVE.length}
            </GameBadge>
          </div>
          <p className="gallery-archive-lead" data-testid="gallery-archive-lead">
            {t("gallery.archiveLead")}
          </p>
          <ul
            className="gallery-list text-only gallery-archive-list"
            data-testid="gallery-archive-list"
          >
            {ALGORITHM_SHAME_ARCHIVE.map((record) => {
              const unlocked = archiveUnlocked.has(record.id);
              return (
                <li
                  key={record.id}
                  className={unlocked ? "is-unlocked" : "is-locked"}
                  data-testid={`gallery-archive-${record.id}`}
                  data-state={unlocked ? "unlocked" : "locked"}
                >
                  <div className="gallery-archive-row">
                    <span className="gallery-archive-title">
                      {unlocked
                        ? t(`gallery.records.${record.id as AlgorithmShameArchiveRecordId}.title`)
                        : "••••"}
                    </span>
                    <GameBadge tone={unlocked ? "success" : "neutral"}>
                      {unlocked ? t("gallery.archiveUnlocked") : t("gallery.archiveLocked")}
                    </GameBadge>
                  </div>
                  <p className="gallery-archive-desc">
                    {unlocked
                      ? t(
                          `gallery.records.${record.id as AlgorithmShameArchiveRecordId}.description`,
                        )
                      : t("gallery.archiveEmptyDescription")}
                  </p>
                </li>
              );
            })}
          </ul>
        </GamePanel>
      </div>

      <p className="meta-lead">
        {t("gallery.total")}: {total}
      </p>
    </div>
  );
}
