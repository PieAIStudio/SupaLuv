import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { useLocale } from "../i18n";
import { ACHIEVEMENT_DEFS, loadAchievements } from "../persistence/achievements";

interface AchievementsScreenProps {
  readonly onBack: () => void;
}

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const { t, locale } = useLocale();
  const unlocked = loadAchievements();
  const unlockedCount = Object.keys(unlocked).length;

  return (
    <div className="meta-screen achievements-screen" data-testid="achievements-screen">
      <header className="meta-header">
        <h1>{t("achievements.title")}</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </GameButton>
      </header>

      <p className="meta-lead">
        {t("achievements.progress")} {unlockedCount} / {ACHIEVEMENT_DEFS.length}
        <GameBadge tone="ai"> {t("achievements.localRecord")}</GameBadge>
      </p>

      <div className="gallery-grid">
        {ACHIEVEMENT_DEFS.map((def) => {
          const at = unlocked[def.id];
          return (
            <GamePanel
              key={def.id}
              title={t(`achievements.items.${def.id}.title`, def.title)}
              tone={at ? "strong" : "default"}
              className={at ? "achievement-card is-unlocked" : "achievement-card is-locked"}
            >
              {at ? (
                <>
                  <GameBadge tone="success">{t("achievements.unlocked")}</GameBadge>
                  <p className="meta-lead">
                    {t(`achievements.items.${def.id}.description`, def.description)}
                  </p>
                  <p className="meta-lead achievement-time">
                    {new Date(at).toLocaleString(locale)}
                  </p>
                </>
              ) : (
                <GameEmptyState
                  title={t("achievements.locked")}
                  description={t(`achievements.items.${def.id}.description`, def.description)}
                />
              )}
            </GamePanel>
          );
        })}
      </div>
    </div>
  );
}
