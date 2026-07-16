import {
  createDualTtsFromEnv,
  describeTtsEnv,
  resolveTtsRoute,
  type TtsLocaleRoute,
  type TtsSynthesizeResult,
} from "@pieai/swimmer-ai-kit/tts";

export type CoreTtsCharacterId =
  | "suming"
  | "leo"
  | "chen_jia"
  | "shi_peixin"
  | "staff_worker"
  | "staff_lead"
  | "shop_owner"
  | "test_ai"
  | "narrator"
  | "lin_xiaotang"
  | "zhou_lu"
  | "zhu_zhu"
  | "huang_laotai"
  | "grid_worker"
  | "police_officer"
  | "courier";

export interface TtsDialogueSegment {
  readonly index: number;
  readonly text: string;
  readonly language: "zh-CN" | "en";
  readonly route: TtsLocaleRoute;
}

export interface SafeTtsSynthesizeResult {
  readonly audioBase64: string;
  readonly mimeType: string;
}

type ScriptLane = "han" | "latin" | null;

const HAN_CHARACTER = /\p{Script=Han}/u;
const LATIN_CHARACTER = /\p{Script=Latin}/u;
const SENTENCE_PATTERN = /[^。！？!?；;.\n]+[。！？!?；;.]?/gu;
/** Explicit, case-insensitive borrowings allowed to stay in the Chinese lane. */
const CHINESE_LANE_BORROWED_TOKENS = new Set(["ai", "app", "ok", "openai"]);
const LATIN_ALPHANUMERIC_TOKEN = /[A-Za-z0-9]+/gu;

// Provider voice IDs are server-only catalog data. Core characters without a
// final casting asset intentionally share a safe provisional lane voice.
// Built lazily: server.ts loads local secret env files after module imports,
// so an eager module-level build would capture an env without provider keys.
let routerInstance: ReturnType<typeof createDualTtsFromEnv> | null = null;

function router(): ReturnType<typeof createDualTtsFromEnv> {
  routerInstance ??= buildRouter();
  return routerInstance;
}

const buildRouter = () =>
  createDualTtsFromEnv({
    westernVoiceMap: {
      suming: "CwhRBWXzGAHq8TQ4Fs17",
      leo: "CwhRBWXzGAHq8TQ4Fs17",
      narrator: "CwhRBWXzGAHq8TQ4Fs17",
      staff_worker: "CwhRBWXzGAHq8TQ4Fs17",
      staff_lead: "CwhRBWXzGAHq8TQ4Fs17",
      test_ai: "EXAVITQu4vr4xnSDxMaL",
      chen_jia: "EXAVITQu4vr4xnSDxMaL",
      shi_peixin: "EXAVITQu4vr4xnSDxMaL",
      shop_owner: "EXAVITQu4vr4xnSDxMaL",
      lin_xiaotang: "EXAVITQu4vr4xnSDxMaL",
      zhou_lu: "EXAVITQu4vr4xnSDxMaL",
      zhu_zhu: "EXAVITQu4vr4xnSDxMaL",
      huang_laotai: "EXAVITQu4vr4xnSDxMaL",
      grid_worker: "CwhRBWXzGAHq8TQ4Fs17",
      police_officer: "CwhRBWXzGAHq8TQ4Fs17",
      courier: "CwhRBWXzGAHq8TQ4Fs17",
    },
    chineseVoiceMap: {
      suming: "male-qn-qingse",
      leo: "male-qn-qingse",
      narrator: "male-qn-qingse",
      staff_worker: "male-qn-qingse",
      staff_lead: "male-qn-qingse",
      test_ai: "female-shaonv",
      chen_jia: "female-shaonv",
      shi_peixin: "female-shaonv",
      shop_owner: "female-shaonv",
      lin_xiaotang: "female-shaonv",
      zhou_lu: "female-shaonv",
      zhu_zhu: "female-shaonv",
      huang_laotai: "female-shaonv",
      grid_worker: "male-qn-qingse",
      police_officer: "male-qn-qingse",
      courier: "male-qn-qingse",
    },
  });

export function ttsHealthSnapshot() {
  return {
    ...describeTtsEnv(),
    defaultLang: process.env.SUPALUV_TTS_DEFAULT_LANG?.trim() || "zh-CN",
    routingCatalog: "supaluv-core-v1",
    mixedLanguageMode: "segmented-catalog-required",
  };
}

export function resolveTtsCharacterId(value: string | undefined): CoreTtsCharacterId {
  const normalized = normalizeCharacter(value ?? "");
  const aliases: Readonly<Record<string, CoreTtsCharacterId>> = {
    苏明: "suming",
    suming: "suming",
    雷欧: "leo",
    leo: "leo",
    陈佳: "chen_jia",
    chenjia: "chen_jia",
    石佩欣: "shi_peixin",
    shipeixin: "shi_peixin",
    工作人员: "staff_worker",
    staffworker: "staff_worker",
    小组长: "staff_lead",
    stafflead: "staff_lead",
    老板娘: "shop_owner",
    shopowner: "shop_owner",
    ai: "test_ai",
    testai: "test_ai",
    旁白: "narrator",
    narrator: "narrator",
    林晓棠: "lin_xiaotang",
    linxiaotang: "lin_xiaotang",
    周鹿: "zhou_lu",
    zhoulu: "zhou_lu",
    朱珠: "zhu_zhu",
    zhuzhu: "zhu_zhu",
    黄老太: "huang_laotai",
    huanglaotai: "huang_laotai",
    网格员: "grid_worker",
    gridworker: "grid_worker",
    警察: "police_officer",
    policeofficer: "police_officer",
    快递员: "courier",
    courier: "courier",
  };
  return aliases[normalized] ?? "narrator";
}

export function planDialogueTtsSegments(
  text: string,
  fallbackLanguage = "zh-CN",
): readonly TtsDialogueSegment[] {
  const normalized = text.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    return [];
  }
  const sentenceChunks = normalized.match(SENTENCE_PATTERN) ?? [normalized];
  const fragments = sentenceChunks.flatMap((sentence) => splitByScript(sentence.trim()));
  const fallback: "zh-CN" | "en" = fallbackLanguage.toLowerCase().startsWith("zh") ? "zh-CN" : "en";

  return fragments
    .filter((fragment) => fragment.text.length > 0)
    .map((fragment, index) => {
      const language =
        fragment.lane === "han" ? "zh-CN" : fragment.lane === "latin" ? "en" : fallback;
      return {
        index,
        text: fragment.text,
        language,
        route: resolveTtsRoute(language),
      };
    });
}

export async function synthesizeDialogue(input: {
  text: string;
  language?: string;
  characterId?: string;
  emotion?: string;
  signal?: AbortSignal;
}): Promise<SafeTtsSynthesizeResult> {
  const fallbackLanguage =
    input.language?.trim() || process.env.SUPALUV_TTS_DEFAULT_LANG?.trim() || "zh-CN";
  const segments = planDialogueTtsSegments(input.text, fallbackLanguage);
  if (segments.length === 0) {
    throw new Error("TTS_TEXT_REQUIRED");
  }
  const routes = new Set(segments.map((segment) => segment.route));
  if (routes.size > 1) {
    throw new Error("TTS_MIXED_LANGUAGE_REQUIRES_SEGMENTED_CATALOG");
  }
  const language = segments[0]?.language ?? fallbackLanguage;
  const result = await router().synthesize({
    text: segments.map((segment) => segment.text).join(" "),
    language,
    characterId: resolveTtsCharacterId(input.characterId),
    emotion: input.emotion,
    signal: input.signal,
  });
  return toSafeTtsSynthesizeResult(result);
}

export function toSafeTtsSynthesizeResult(result: TtsSynthesizeResult): SafeTtsSynthesizeResult {
  return {
    audioBase64: result.audioBase64,
    mimeType: result.mimeType,
  };
}

function normalizeCharacter(value: string): string {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[\s_\-.'’]/gu, "");
}

function splitByScript(text: string): Array<{ text: string; lane: ScriptLane }> {
  const fragments: Array<{ text: string; lane: ScriptLane }> = [];
  let lane: ScriptLane = null;
  let buffer = "";
  for (const character of text) {
    const nextLane = classifyCharacter(character);
    if (nextLane && lane && nextLane !== lane) {
      pushFragment(fragments, buffer, lane);
      buffer = character;
      lane = nextLane;
      continue;
    }
    buffer += character;
    if (nextLane) {
      lane = nextLane;
    }
  }
  pushFragment(fragments, buffer, lane);
  return mergeAdjacentLanes(reclassifyBorrowedTechTokens(fragments));
}

/**
 * Per-fragment freeze rule (must stay parity-identical with browser planner):
 * when Han is present, each Latin fragment inherits the Chinese lane only when
 * every token in *that* fragment belongs to the explicit AI/App/OK/OpenAI
 * allowlist. Other Latin fragments stay Western and do not poison neighbors.
 */
function reclassifyBorrowedTechTokens(
  fragments: Array<{ text: string; lane: ScriptLane }>,
): Array<{ text: string; lane: ScriptLane }> {
  if (!fragments.some((fragment) => fragment.lane === "han")) {
    return fragments;
  }
  return fragments.map((fragment) =>
    fragment.lane === "latin" && isAllowedChineseLaneBorrowing(fragment.text)
      ? { text: fragment.text, lane: "han" }
      : fragment,
  );
}

function isAllowedChineseLaneBorrowing(text: string): boolean {
  const tokens = latinAlphanumericTokens(text);
  return (
    tokens.length > 0 &&
    tokens.every((token) => CHINESE_LANE_BORROWED_TOKENS.has(token.toLowerCase()))
  );
}

function latinAlphanumericTokens(text: string): string[] {
  return text.match(LATIN_ALPHANUMERIC_TOKEN) ?? [];
}

function mergeAdjacentLanes(
  fragments: Array<{ text: string; lane: ScriptLane }>,
): Array<{ text: string; lane: ScriptLane }> {
  const merged: Array<{ text: string; lane: ScriptLane }> = [];
  for (const fragment of fragments) {
    const previous = merged[merged.length - 1];
    if (previous && previous.lane === fragment.lane) {
      previous.text = `${previous.text} ${fragment.text}`.replace(/\s+/gu, " ").trim();
      continue;
    }
    merged.push({ text: fragment.text, lane: fragment.lane });
  }
  return merged;
}

function classifyCharacter(character: string): ScriptLane {
  if (HAN_CHARACTER.test(character)) {
    return "han";
  }
  if (LATIN_CHARACTER.test(character)) {
    return "latin";
  }
  return null;
}

function pushFragment(
  fragments: Array<{ text: string; lane: ScriptLane }>,
  text: string,
  lane: ScriptLane,
): void {
  const trimmed = text.trim();
  if (trimmed) {
    fragments.push({ text: trimmed, lane });
  }
}
