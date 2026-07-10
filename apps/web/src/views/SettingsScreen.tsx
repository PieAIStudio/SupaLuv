/**
 * Settings shell — composes player section + collapsible lab.
 * Do not re-merge large panels here; extend settings/* instead.
 */

import { GameButton } from "@pieai/swimmer-ui-kit";
import { useState } from "react";
import { useLocale } from "../i18n";
import type { DisplayNameMap } from "../persistence/displayNames";
import type { PortraitPackState } from "../persistence/portraitPack";
import type { GameSettings } from "../persistence/settings";
import { SettingsLabSection } from "./settings/SettingsLabSection";
import { SettingsPlayerSection } from "./settings/SettingsPlayerSection";

interface SettingsScreenProps {
  readonly settings: GameSettings;
  readonly onChange: (next: GameSettings) => void;
  readonly displayNames: DisplayNameMap;
  readonly onDisplayNamesChange: (next: DisplayNameMap) => void;
  readonly portraitPack: PortraitPackState;
  readonly onPortraitPackChange: (next: PortraitPackState) => void;
  readonly onBack: () => void;
}

export function SettingsScreen({
  settings,
  onChange,
  displayNames,
  onDisplayNamesChange,
  portraitPack,
  onPortraitPackChange,
  onBack,
}: SettingsScreenProps) {
  const { t } = useLocale();
  const [previewError, setPreviewError] = useState<string | null>(null);

  return (
    <div className="meta-screen settings-screen" data-testid="settings-screen">
      <header className="meta-header">
        <h1>{t("settings.title")}</h1>
        <GameButton type="button" variant="ghost" onClick={onBack}>
          {t("common.back")}
        </GameButton>
      </header>

      <SettingsPlayerSection
        settings={settings}
        onChange={onChange}
        displayNames={displayNames}
        onDisplayNamesChange={onDisplayNamesChange}
        onPreviewError={setPreviewError}
      />

      <SettingsLabSection
        portraitPack={portraitPack}
        onPortraitPackChange={onPortraitPackChange}
        previewError={previewError}
      />
    </div>
  );
}
