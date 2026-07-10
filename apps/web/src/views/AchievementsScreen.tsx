import { GameBadge, GameButton, GameEmptyState, GamePanel } from "@pieai/swimmer-ui-kit";
import { ACHIEVEMENT_DEFS, loadAchievements } from "../persistence/achievements";

interface AchievementsScreenProps {
  readonly onBack: () => void;
}

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
  const unlocked = loadAchievements();
  const unlockedCount = Object.keys(unlocked).length;

  return (
    <div className="meta-screen achievements-screen" data-testid="achievements-screen">
      <header className="meta-header">
        <h1>成就</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          返回
        </GameButton>
      </header>

      <p className="meta-lead">
        已解锁 {unlockedCount} / {ACHIEVEMENT_DEFS.length}
        <GameBadge tone="ai"> 本地记录</GameBadge>
      </p>

      <div className="gallery-grid">
        {ACHIEVEMENT_DEFS.map((def) => {
          const at = unlocked[def.id];
          return (
            <GamePanel
              key={def.id}
              title={def.title}
              tone={at ? "strong" : "default"}
              className={at ? "achievement-card is-unlocked" : "achievement-card is-locked"}
            >
              {at ? (
                <>
                  <GameBadge tone="success">已解锁</GameBadge>
                  <p className="meta-lead">{def.description}</p>
                  <p className="meta-lead achievement-time">{new Date(at).toLocaleString()}</p>
                </>
              ) : (
                <GameEmptyState title="未解锁" description={def.description} />
              )}
            </GamePanel>
          );
        })}
      </div>
    </div>
  );
}
