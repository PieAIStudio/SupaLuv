import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lookupMessage, messagesFor } from "../../apps/web/src/i18n/catalog";
import {
  AUTHORED_CHOICES_LABEL_ID,
  formatAuthoredChoiceAccessibleName,
  formatOracleChoiceAccessibleName,
  ORACLE_CHOICES_LABEL_ID,
} from "../../apps/web/src/views/play/choiceAccessibility";

const SHARED_LABEL = "说人话了";

describe("oracle vs authored choice accessibility", () => {
  it("gives distinct accessible names when visible labels match", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      const oraclePrefix = lookupMessage(messagesFor(locale), "play.oracleChoiceAria");
      const authoredPrefix = lookupMessage(messagesFor(locale), "play.authoredChoiceAria");
      expect(oraclePrefix, locale).toBeTruthy();
      expect(authoredPrefix, locale).toBeTruthy();
      expect(oraclePrefix).not.toBe(authoredPrefix);

      const oracleName = formatOracleChoiceAccessibleName(oraclePrefix!, SHARED_LABEL);
      const authoredName = formatAuthoredChoiceAccessibleName(authoredPrefix!, SHARED_LABEL);

      expect(oracleName).toContain(SHARED_LABEL);
      expect(authoredName).toContain(SHARED_LABEL);
      expect(oracleName).not.toBe(authoredName);
      expect(oracleName.toLowerCase()).toMatch(/oracle|预言/);
      expect(authoredName.toLowerCase()).toMatch(/story|剧情/);
    }
  });

  it("uses stable group label element ids for aria-labelledby", () => {
    expect(ORACLE_CHOICES_LABEL_ID).toBe("oracle-choices-label");
    expect(AUTHORED_CHOICES_LABEL_ID).toBe("authored-choices-label");
    expect(ORACLE_CHOICES_LABEL_ID).not.toBe(AUTHORED_CHOICES_LABEL_ID);
  });

  it("wires role=group + aria-labelledby and distinct aria-labels in DialoguePanel", () => {
    const source = readFileSync(
      resolve(process.cwd(), "apps/web/src/views/play/DialoguePanel.tsx"),
      "utf8",
    );

    expect(source).toContain('role="group"');
    expect(source).toContain("aria-labelledby={ORACLE_CHOICES_LABEL_ID}");
    expect(source).toContain("aria-labelledby={AUTHORED_CHOICES_LABEL_ID}");
    expect(source).toContain("formatOracleChoiceAccessibleName");
    expect(source).toContain("formatAuthoredChoiceAccessibleName");
    expect(source).toContain('data-choice-group="oracle"');
    expect(source).toContain('data-choice-group="authored"');
    expect(source).toContain("id={ORACLE_CHOICES_LABEL_ID}");
    expect(source).toContain("id={AUTHORED_CHOICES_LABEL_ID}");
  });

  it("keeps SettingsPlayerSection free of raw error.message concatenation for preview UI", () => {
    const source = readFileSync(
      resolve(process.cwd(), "apps/web/src/views/settings/SettingsPlayerSection.tsx"),
      "utf8",
    );

    expect(source).toContain("ttsPreviewErrorI18nKey");
    expect(source).toContain("categorizeTtsPreviewError");
    expect(source).not.toMatch(/message\.slice\(/);
    expect(source).not.toMatch(/\$\{t\("settings\.ttsFailed"\).*message/);
    expect(source).not.toMatch(/onPreviewError\(\s*`\$\{/);
  });
});
