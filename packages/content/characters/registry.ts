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
  陈佳: {
    id: "chen_jia",
    name: "陈佳",
    side: "right",
    defaultPortrait: "lin-neutral",
  },
  雷欧: {
    id: "leo",
    name: "雷欧",
    side: "right",
    defaultPortrait: "zhou-neutral",
  },
  石佩欣: {
    id: "shi_peixin",
    name: "石佩欣",
    side: "right",
    defaultPortrait: "lin-neutral",
  },
  工作人员: {
    id: "staff_worker",
    name: "工作人员",
    side: "right",
    defaultPortrait: "demo-ui",
  },
  小组长: {
    id: "staff_lead",
    name: "小组长",
    side: "right",
    defaultPortrait: "demo-ui",
  },
  老板娘: {
    id: "shop_owner",
    name: "老板娘",
    side: "right",
    defaultPortrait: "zhou-neutral",
  },
  AI: {
    id: "test_ai",
    name: "AI",
    side: "right",
    defaultPortrait: "demo-ui",
  },
  旁白: {
    id: "narrator",
    name: "旁白",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  // Legacy archive speakers (not used by draft-2026-07 production chapters).
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
