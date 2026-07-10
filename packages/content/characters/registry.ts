/**
 * Runtime character registry for portrait staging.
 * Visual assets live in apps/web/public/assets/portraits/.
 * Lock docs live under packages/content/characters/<id>/.
 */

export type PortraitSide = "left" | "right";

export interface CharacterDef {
  readonly id: string;
  readonly name: string;
  /** Preferred stage side in dual-portrait shots. */
  readonly side: PortraitSide;
  /** Default portrait file stem (without .png). */
  readonly defaultPortrait: string;
}

export const CHARACTER_BY_NAME: Readonly<Record<string, CharacterDef>> = {
  苏明: {
    id: "suming",
    name: "苏明",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  林晓棠: {
    id: "lin_xiaotang",
    name: "林晓棠",
    side: "right",
    defaultPortrait: "lin-neutral",
  },
  周鹿: {
    id: "zhou_lu",
    name: "周鹿",
    side: "right",
    defaultPortrait: "zhou-neutral",
  },
  演示对话: {
    id: "demo_bot",
    name: "演示对话",
    side: "right",
    defaultPortrait: "demo-ui",
  },
};

export function resolveCharacter(speaker: string | undefined): CharacterDef | null {
  if (!speaker) {
    return null;
  }
  return CHARACTER_BY_NAME[speaker] ?? null;
}
