export type BrowserTtsLanguage = "zh-CN" | "en";
export type BrowserTtsRoute = "chinese" | "western";

export interface BrowserTtsSegment {
  readonly index: number;
  readonly text: string;
  readonly language: BrowserTtsLanguage;
  readonly route: BrowserTtsRoute;
}

type ScriptLane = "han" | "latin" | null;

const HAN_CHARACTER = /\p{Script=Han}/u;
const LATIN_CHARACTER = /\p{Script=Latin}/u;
const SENTENCE_PATTERN = /[^。！？!?；;.\n]+[。！？!?；;.]?/gu;
/** Explicit, case-insensitive borrowings allowed to stay in the Chinese lane. */
const CHINESE_LANE_BORROWED_TOKENS = new Set(["ai", "app", "ok", "openai"]);
const LATIN_ALPHANUMERIC_TOKEN = /[A-Za-z0-9]+/gu;

/**
 * Deterministic sentence/script planner used before any paid dialogue request.
 * Mixed Chinese/Latin lines are identified locally and never disguised as a
 * single-locale accent request. Only the frozen AI/App/OK/OpenAI allowlist may
 * inherit the Chinese lane so ordinary English remains on the Western path.
 */
export function planBrowserTtsSegments(
  text: string,
  fallbackLanguage = "zh-CN",
): readonly BrowserTtsSegment[] {
  const normalized = text.trim().replace(/\s+/gu, " ");
  if (!normalized) {
    return [];
  }

  const sentenceChunks = normalized.match(SENTENCE_PATTERN) ?? [normalized];
  const fragments = sentenceChunks.flatMap((sentence) => splitByScript(sentence.trim()));
  const fallback: BrowserTtsLanguage = fallbackLanguage.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en";

  return fragments
    .filter((fragment) => fragment.text.length > 0)
    .map((fragment, index) => {
      const language =
        fragment.lane === "han" ? "zh-CN" : fragment.lane === "latin" ? "en" : fallback;
      return {
        index,
        text: fragment.text,
        language,
        route: language === "zh-CN" ? "chinese" : "western",
      };
    });
}

export function hasMixedTtsRoutes(segments: readonly BrowserTtsSegment[]): boolean {
  return new Set(segments.map((segment) => segment.route)).size > 1;
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
 * Per-fragment freeze rule: when Han is present, each Latin fragment inherits
 * the Chinese lane only when every token in *that* fragment belongs to the
 * explicit AI/App/OK/OpenAI allowlist. Other Latin fragments stay Western and
 * do not poison allowlisted neighbors.
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
