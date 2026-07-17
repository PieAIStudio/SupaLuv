import { hasAuthoritativeChoiceStatsCapability } from "@supaluv/shared/choice-stats-catalog";

const STORAGE_KEY = "supaluv.achievements.v1";

export type AchievementId =
  | "first_play"
  | "first_ai_branch"
  | "first_manual_save"
  | "ch01_clear"
  | "high_ai_score"
  | "high_mianzi"
  | "gallery_start"
  | "rare_echo_path"
  | "first_coplay"
  | "first_rps"
  | "custom_pack_active"
  | "reverse_current"
  | "oracle_hit";

export interface AchievementDef {
  readonly id: AchievementId;
  readonly title: string;
  readonly description: string;
  readonly requiresAuthoritativeChoiceStats?: boolean;
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: "first_play",
    title: "第一次下单预演",
    description: "进入第 1 章可玩 demo。",
  },
  {
    id: "first_ai_branch",
    title: "灵感越界",
    description: "选过一次 AI 旁支，并回到作者主线。",
  },
  {
    id: "first_manual_save",
    title: "体面备份",
    description: "手动存过一次档。",
  },
  {
    id: "ch01_clear",
    title: "初审通过",
    description: "完成当前两章草稿。",
  },
  {
    id: "high_ai_score",
    title: "绩效爆表",
    description: "结局情感评分 ≥ 65。",
  },
  {
    id: "high_mianzi",
    title: "残留体面",
    description: "结局体面 ≥ 55。",
  },
  {
    id: "gallery_start",
    title: "鉴赏入门",
    description: "打开过图鉴。",
  },
  {
    id: "rare_echo_path",
    title: "少数派回声",
    description: "章末全球回声里，至少有一次选择属于少数派（≤32%）。",
    requiresAuthoritativeChoiceStats: true,
  },
  {
    id: "first_coplay",
    title: "双人订单",
    description: "开启过本机同玩（邀请房）。",
  },
  {
    id: "first_rps",
    title: "剪刀石头布",
    description: "在同玩选项冲突中完成一次石头剪刀布对决。",
  },
  {
    id: "custom_pack_active",
    title: "换角试衣间",
    description: "上传过自定义主角立绘覆盖（本机包）。",
  },
  {
    id: "reverse_current",
    title: "逆流订单",
    description: "一局里至少 3 次全球回声少数派。",
    requiresAuthoritativeChoiceStats: true,
  },
  {
    id: "oracle_hit",
    title: "预言命中",
    description: "预言家猜中至少一次社区多数选。",
    requiresAuthoritativeChoiceStats: true,
  },
] as const;

export function isAchievementAvailable(def: AchievementDef): boolean {
  return !def.requiresAuthoritativeChoiceStats || hasAuthoritativeChoiceStatsCapability();
}

export function listPlayerVisibleAchievementDefs(): readonly AchievementDef[] {
  return ACHIEVEMENT_DEFS.filter(isAchievementAvailable);
}

export type AchievementMap = Partial<Record<AchievementId, string>>;

export function loadAchievements(): AchievementMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return JSON.parse(raw) as AchievementMap;
  } catch {
    return {};
  }
}

export function hasAchievement(id: AchievementId): boolean {
  return Boolean(loadAchievements()[id]);
}

/**
 * Unlock if new. Returns definition when newly unlocked (for toast).
 */
export function unlockAchievement(id: AchievementId): AchievementDef | null {
  const current = loadAchievements();
  if (current[id]) {
    return null;
  }
  const def = ACHIEVEMENT_DEFS.find((item) => item.id === id) ?? null;
  if (!def || !isAchievementAvailable(def)) {
    return null;
  }
  const next: AchievementMap = {
    ...current,
    [id]: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return def;
}

export function listUnlocked(): readonly AchievementDef[] {
  const map = loadAchievements();
  return ACHIEVEMENT_DEFS.filter((def) => isAchievementAvailable(def) && Boolean(map[def.id]));
}
