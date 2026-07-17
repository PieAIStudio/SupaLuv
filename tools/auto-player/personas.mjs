/**
 * Built-in auto-player personas. Keyword tables are maintainable; selection is
 * fully deterministic (same content + persona → same choice index every time).
 *
 * ADR-0007: mianzi (体面) vs ai_score (情感评分) strategies.
 */

/** @typedef {{ index: number, text: string }} Choice */

/**
 * @typedef {object} Persona
 * @property {string} id
 * @property {string} label
 * @property {(choices: readonly Choice[]) => number} pick
 */

/** Face/mianzi-leaning: restraint, refusal, privacy, 嘴硬 boundary. */
export const MIANZI_KEYWORDS = Object.freeze([
  "拒绝",
  "收起",
  "克制",
  "体面",
  "放轻",
  "咽回",
  "不确定",
  "暂无",
  "基础脸",
  "再少",
  "九百",
  "让雷欧先走",
  "回陈佳：明天",
  "标记隐患",
  "跳过",
  "不愿评价",
  "介意",
  "冷笑",
  "想提前结束",
  "只想快点走",
  "快进",
  "硬着头皮",
  "借朋友",
  "嗤一声",
  "数到三",
  "随便取",
  "明天吧",
  "不说",
]);

/** Platform/ai_score-leaning: cooperate with system, privacy, full performance. */
export const AI_SCORE_KEYWORDS = Object.freeze([
  "爆表",
  "刺痛",
  "答应",
  "花钱",
  "冲上去",
  "想留",
  "辣条",
  "点下申请",
  "点开",
  "进巷子",
  "问出口",
  "更硬",
  "我提的",
  "一口气",
  "手指在相册",
  "回陈佳：行",
  "接受初审",
  "字面接受",
  "真情流露",
  "不介意",
  "优秀",
  "申请",
  "耳朵却竖",
  "骂自己",
  "把那顿饭",
  "听完小结",
  "先把矛盾听完",
  "咬牙",
  "数满七秒",
  "好好好好",
  "相册",
  "傍晚",
  "扫过",
  "按住手腕",
  "尽快定",
  "只想尽快",
  "良好",
  "有独立房间",
  "可改造",
]);

/** Skip interactions when the label offers an explicit skip. */
export const SKIP_KEYWORDS = Object.freeze(["跳过", "不测", "下一步"]);

/**
 * @param {string} text
 * @param {readonly string[]} keywords
 * @returns {number}
 */
export function scoreKeywords(text, keywords) {
  const hay = String(text ?? "");
  let score = 0;
  for (const kw of keywords) {
    if (kw && hay.includes(kw)) {
      score += 1;
    }
  }
  return score;
}

/**
 * Highest keyword score wins; ties take the earliest index.
 * @param {readonly Choice[]} choices
 * @param {readonly string[]} keywords
 * @returns {number}
 */
export function pickHighestScoreFirst(choices, keywords) {
  if (choices.length === 0) {
    throw new RangeError("Cannot pick from empty choices");
  }
  let bestIndex = 0;
  let bestScore = scoreKeywords(choices[0].text, keywords);
  for (let i = 1; i < choices.length; i += 1) {
    const score = scoreKeywords(choices[i].text, keywords);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Highest keyword score wins; ties take the latest index.
 * @param {readonly Choice[]} choices
 * @param {readonly string[]} keywords
 * @returns {number}
 */
export function pickHighestScoreLast(choices, keywords) {
  if (choices.length === 0) {
    throw new RangeError("Cannot pick from empty choices");
  }
  let bestIndex = 0;
  let bestScore = scoreKeywords(choices[0].text, keywords);
  for (let i = 1; i < choices.length; i += 1) {
    const score = scoreKeywords(choices[i].text, keywords);
    if (score >= bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * Prefer any skip-labelled option (first match); otherwise first option.
 * @param {readonly Choice[]} choices
 * @returns {number}
 */
export function pickSkipper(choices) {
  if (choices.length === 0) {
    throw new RangeError("Cannot pick from empty choices");
  }
  for (let i = 0; i < choices.length; i += 1) {
    if (scoreKeywords(choices[i].text, SKIP_KEYWORDS) > 0) {
      return i;
    }
  }
  return 0;
}

/**
 * Platform-coop persona: prefer ai_score keywords; never treat bare "跳过" as a win.
 * When scores tie at zero, take the earliest non-skip option so questionnaire completion
 * diverges from mianzi/skipper paths under position-aligned transcript diffs.
 * @param {readonly Choice[]} choices
 * @returns {number}
 */
export function pickAiScorePersona(choices) {
  if (choices.length === 0) {
    throw new RangeError("Cannot pick from empty choices");
  }
  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < choices.length; i += 1) {
    const text = choices[i].text;
    let score = scoreKeywords(text, AI_SCORE_KEYWORDS);
    if (scoreKeywords(text, SKIP_KEYWORDS) > 0) {
      score -= 10;
    }
    // Later option wins ties so "骂自己再申请" beats plain apply when both score.
    if (score > bestScore || (score === bestScore && score > 0 && i > bestIndex)) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestScore <= 0) {
    for (let i = 0; i < choices.length; i += 1) {
      if (scoreKeywords(choices[i].text, SKIP_KEYWORDS) === 0) {
        return i;
      }
    }
  }
  return bestIndex;
}

/** @type {Readonly<Record<string, Persona>>} */
export const PERSONAS = Object.freeze({
  mianzi: Object.freeze({
    id: "mianzi",
    label: "体面/拒绝",
    pick: (choices) => pickHighestScoreFirst(choices, MIANZI_KEYWORDS),
  }),
  ai_score: Object.freeze({
    id: "ai_score",
    label: "绩效/配合系统",
    pick: pickAiScorePersona,
  }),
  skipper: Object.freeze({
    id: "skipper",
    label: "跳过互动",
    pick: pickSkipper,
  }),
});

export const PERSONA_IDS = Object.freeze(Object.keys(PERSONAS));

/**
 * @param {string} name
 * @returns {Persona}
 */
export function getPersona(name) {
  const persona = PERSONAS[name];
  if (!persona) {
    throw new Error(
      `Unknown persona "${name}". Built-ins: ${PERSONA_IDS.join(", ")}`,
    );
  }
  return persona;
}
