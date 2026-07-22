/**
 * Runtime character registry for portrait staging.
 * Visual assets live in apps/web/public/assets/portraits/.
 * Lock docs live under packages/content/characters/<id>/.
 *
 * Display names: `name` is the authored Chinese SSOT used in scene manifests
 * and Ink speaker tags; `enName` is the English nameplate when locale is not zh.
 * Manifests are not translated — the render layer picks by locale.
 */

export type PortraitSide = "left" | "right";

export interface CharacterDef {
  readonly id: string;
  readonly name: string;
  /** English nameplate (ADR-0008). Manifest speaker stays Chinese. */
  readonly enName: string;
  /** Preferred stage side in dual-portrait shots. */
  readonly side: PortraitSide;
  /** Default portrait file stem (without .png). */
  readonly defaultPortrait: string;
}

export const CHARACTER_BY_NAME: Readonly<Record<string, CharacterDef>> = {
  苏明: {
    id: "suming",
    name: "苏明",
    enName: "Su Ming",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  陈佳: {
    id: "chen_jia",
    name: "陈佳",
    enName: "Chen Jia",
    side: "right",
    // ADR-0006 NPC CG; must never share the female lead's (cast) face.
    defaultPortrait: "chenjia-neutral",
  },
  雷欧: {
    id: "leo",
    name: "雷欧",
    enName: "Leo",
    side: "right",
    // ADR-0006 NPC CG (also leo-annoyed mood plate available).
    defaultPortrait: "leo-neutral",
  },
  石佩欣: {
    id: "shi_peixin",
    name: "石佩欣",
    enName: "Shi Peixin",
    side: "right",
    // Female lead in draft-2026-07 chapters; matches the studio's official casting art.
    defaultPortrait: "zhou-neutral",
  },
  工作人员: {
    id: "staff_worker",
    name: "工作人员",
    enName: "Staff",
    side: "right",
    defaultPortrait: "staff-neutral",
  },
  小组长: {
    id: "staff_lead",
    name: "小组长",
    enName: "Team Lead",
    side: "right",
    defaultPortrait: "stafflead-neutral",
  },
  老板娘: {
    id: "shop_owner",
    name: "老板娘",
    enName: "Shop Owner",
    side: "right",
    defaultPortrait: "shopowner-neutral",
  },
  AI: {
    id: "test_ai",
    name: "AI",
    enName: "AI",
    side: "right",
    defaultPortrait: "demo-ui",
  },
  朱珠: {
    id: "zhu_zhu",
    name: "朱珠",
    enName: "Zhu Zhu",
    side: "right",
    // supa-luv-v2 truth: 朱珠 is the FEMALE COMPANION ROBOT (惊蛰智能 test
    // unit 0417), not a human neighbor. Her face is authored as "template 17
    // tweaked to look like 陈佳 but not quite" — the ch03 reveal ("你把我的脸
    // 也调成了她的样子") only lands if players see the resemblance. Current
    // plate is an interim human face; near-Chenjia robot regen is in flight.
    defaultPortrait: "zhuzhu-neutral",
  },
  黄老太: {
    id: "huang_laotai",
    name: "黄老太",
    enName: "Granny Huang",
    side: "right",
    defaultPortrait: "huanglaotai-neutral",
  },
  网格员: {
    id: "grid_worker",
    name: "网格员",
    enName: "Grid Worker",
    side: "right",
    defaultPortrait: "gridworker-neutral",
  },
  警察: {
    id: "police_officer",
    name: "警察",
    enName: "Police Officer",
    side: "right",
    defaultPortrait: "police-neutral",
  },
  快递员: {
    id: "courier",
    name: "快递员",
    enName: "Courier",
    side: "right",
    defaultPortrait: "courier-neutral",
  },
  旁白: {
    id: "narrator",
    name: "旁白",
    enName: "Narrator",
    side: "left",
    defaultPortrait: "suming-shame",
  },
  // Note: "系统" is intentionally NOT a portrait registry entry. It is a
  // nameplate-only speaker (no stage plate). Localizing it via the fallback
  // in resolveCharacterDisplayName keeps presentation staging unchanged.
  // Legacy archive speakers (not used by draft-2026-07 production chapters).
  林晓棠: {
    id: "lin_xiaotang",
    name: "林晓棠",
    enName: "Lin Xiaotang",
    side: "right",
    // Legacy face only; 陈佳 no longer uses lin-neutral.
    defaultPortrait: "lin-neutral",
  },
  周鹿: {
    id: "zhou_lu",
    name: "周鹿",
    enName: "Zhou Lu",
    side: "right",
    defaultPortrait: "zhou-neutral",
  },
  演示对话: {
    id: "demo_bot",
    name: "演示对话",
    enName: "Demo Dialogue",
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

/** Nameplate-only speakers that never own a portrait stage plate. */
const NAMEPLATE_ONLY: Readonly<Record<string, { zh: string; en: string }>> = {
  系统: { zh: "系统", en: "System" },
};

/**
 * Locale-aware nameplate for an authored (Chinese) speaker string.
 * Player display-name overrides are applied separately by the play layer.
 */
export function resolveCharacterDisplayName(speaker: string | undefined, locale: string): string {
  if (!speaker) {
    return "";
  }
  const useChinese = locale === "zh-CN" || locale.toLowerCase().startsWith("zh");
  const character = resolveCharacter(speaker);
  if (character) {
    return useChinese ? character.name : character.enName;
  }
  const nameplateOnly = NAMEPLATE_ONLY[speaker];
  if (nameplateOnly) {
    return useChinese ? nameplateOnly.zh : nameplateOnly.en;
  }
  return speaker;
}
