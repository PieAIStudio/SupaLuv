/**
 * Built-in auto-player personas. Keyword tables are maintainable; selection is
 * fully deterministic (same content + persona → same choice index every time).
 */

/** @typedef {{ index: number, text: string }} Choice */

/**
 * @typedef {object} Persona
 * @property {string} id
 * @property {string} label
 * @property {(choices: readonly Choice[]) => number} pick
 */

/** Dignity-leaning: restraint / composure / refusal. */
export const DIGNITY_KEYWORDS = Object.freeze([
  "平静",
  "不说",
  "拒绝",
  "收起",
  "克制",
  "体面",
  "字面接受",
  "先把",
  "听完",
  "放轻",
  "咽回",
  "不确定",
  "暂无",
  "一般",
  "不介意",
  "良好",
  "优秀",
  "基础脸",
  "再少",
  "九百",
  "让雷欧先走",
  "扫过",
  "回陈佳：明天",
]);

/** Impulse-leaning: impulse / bravado / spending / agreeing. */
export const IMPULSE_KEYWORDS = Object.freeze([
  "冲动",
  "嘴硬",
  "答应",
  "花钱",
  "爆表",
  "刺痛",
  "冷笑",
  "标记隐患",
  "硬着头皮",
  "骂",
  "冲上去",
  "想提前结束",
  "想留",
  "辣条",
  "点下申请",
  "点开",
  "进巷子",
  "问出口",
  "更硬",
  "介意",
  "借朋友",
  "我提的",
  "一口气",
  "手指在相册",
  "快进",
  "回陈佳：行",
  "接受初审",
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

/** @type {Readonly<Record<string, Persona>>} */
export const PERSONAS = Object.freeze({
  dignity: Object.freeze({
    id: "dignity",
    label: "克制/体面",
    pick: (choices) => pickHighestScoreFirst(choices, DIGNITY_KEYWORDS),
  }),
  impulse: Object.freeze({
    id: "impulse",
    label: "冲动/嘴硬",
    pick: (choices) => pickHighestScoreLast(choices, IMPULSE_KEYWORDS),
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
