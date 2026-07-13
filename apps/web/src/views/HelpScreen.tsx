import { GameBadge, GameButton, GamePanel } from "@pieai/swimmer-ui-kit";
import { useLocale } from "../i18n";

interface HelpScreenProps {
  readonly onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  const { t } = useLocale();
  return (
    <div className="meta-screen help-screen" data-testid="help-screen">
      <header className="meta-header">
        <h1>{t("help.title")}</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </GameButton>
      </header>

      <GamePanel title={t("help.playTitle")} className="settings-panel">
        <ul className="help-list">
          <li>
            <GameBadge tone="ai">Space / Enter</GameBadge> {t("help.advance")}
          </li>
          <li>
            <GameBadge tone="neutral">Esc</GameBadge> {t("help.escape")}
          </li>
          <li>
            <GameBadge tone="success">{t("help.clickDialogue")}</GameBadge>{" "}
            {t("help.clickDialogueHint")}
          </li>
          <li>
            <GameBadge tone="warning">{t("play.fullscreen")}</GameBadge> {t("help.fullscreenHint")}
          </li>
        </ul>
      </GamePanel>

      <GamePanel title={t("help.aiTitle")} className="settings-panel">
        <p className="meta-lead">{t("help.aiBody")}</p>
        <p className="meta-lead">{t("help.aiAssets")}</p>
      </GamePanel>

      <GamePanel title={t("help.leadsTitle")} className="settings-panel">
        <ul className="help-list">
          <li>{t("help.leadsName")}</li>
          <li>{t("help.leadsPortrait")}</li>
          <li>{t("help.leadsCg")}</li>
        </ul>
      </GamePanel>

      <GamePanel title={t("help.coPlayTitle")} className="settings-panel">
        <ul className="help-list">
          <li>{t("help.coPlayStart")}</li>
          <li>{t("help.coPlayTransport")}</li>
          <li>{t("help.coPlayRoles")}</li>
          <li>{t("help.coPlayConflict")}</li>
          <li>{t("help.coPlayVoice")}</li>
        </ul>
      </GamePanel>

      <GamePanel title={t("help.socialTitle")} className="settings-panel">
        <ul className="help-list">
          <li>{t("help.socialEcho")}</li>
          <li>{t("help.socialOracle")}</li>
          <li>{t("help.socialMinority")}</li>
          <li>{t("help.socialShare")}</li>
        </ul>
      </GamePanel>

      <GamePanel title={t("help.savesTitle")} className="settings-panel">
        <ul className="help-list">
          <li>{t("help.savesAuto")}</li>
          <li>{t("help.savesManual")}</li>
          <li>{t("help.savesGallery")}</li>
        </ul>
      </GamePanel>

      <p className="meta-lead">{t("help.footer")}</p>
    </div>
  );
}
