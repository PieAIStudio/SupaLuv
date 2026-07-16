import { getStoryCatalogMeta } from "@supaluv/content";
import { describe, expect, it } from "vitest";
import {
  createDraftCh01InkStoryRunner,
  createDraftCh02InkStoryRunner,
  type InkStoryRunner,
  type InkStorySnapshot,
} from "../../apps/web/src/story/inkStoryRunner";

type Chapter = "ch1" | "ch2" | "cross";

type EchoCase = {
  readonly slot: string;
  readonly chapter: Chapter;
  readonly sourceChoiceId: string;
  readonly variableName: string;
  readonly expectedValue: string;
  readonly echoes: readonly {
    readonly sceneId: string;
    readonly text: string;
  }[];
};

const ECHO_CASES: readonly EchoCase[] = [
  {
    slot: "P01/accept",
    chapter: "ch1",
    sourceChoiceId: "d1_bones_accept",
    variableName: "bones_answer",
    expectedValue: "accept",
    echoes: [{ sceneId: "dch01_s031", text: "只把诚实印成了蚂蚁" }],
  },
  {
    slot: "P01/cold",
    chapter: "ch1",
    sourceChoiceId: "d1_bones_cold",
    variableName: "bones_answer",
    expectedValue: "cold",
    echoes: [{ sceneId: "dch01_s031", text: "抢劫前贴告示，也不叫双方自愿" }],
  },
  {
    slot: "P02/flat",
    chapter: "cross",
    sourceChoiceId: "d1_tell_flat",
    variableName: "breakup_delivery",
    expectedValue: "flat",
    echoes: [{ sceneId: "dch02_s017", text: "报快递单似的“分手了。昨天。”" }],
  },
  {
    slot: "P02/hard",
    chapter: "cross",
    sourceChoiceId: "d1_tell_hard",
    variableName: "breakup_delivery",
    expectedValue: "hard",
    echoes: [{ sceneId: "dch02_s017", text: "真实的你要吗？我提的" }],
  },
  {
    slot: "P03/shame",
    chapter: "cross",
    sourceChoiceId: "d1_memory_shame",
    variableName: "memory_posture",
    expectedValue: "shame",
    echoes: [{ sceneId: "dch02_s028", text: "掌心先贴上脸" }],
  },
  {
    slot: "P03/hard",
    chapter: "cross",
    sourceChoiceId: "d1_memory_hard",
    variableName: "memory_posture",
    expectedValue: "hard",
    echoes: [{ sceneId: "dch02_s028", text: "硬撑这门手艺，平台之间倒是通用" }],
  },
  {
    slot: "P04/watch",
    chapter: "ch1",
    sourceChoiceId: "d1_watch_leo",
    variableName: "leo_response",
    expectedValue: "watch",
    echoes: [{ sceneId: "dch01_s031", text: "语法还是烂，账倒算得清" }],
  },
  {
    slot: "P04/rush",
    chapter: "ch1",
    sourceChoiceId: "d1_rush_front",
    variableName: "leo_response",
    expectedValue: "rush",
    echoes: [{ sceneId: "dch01_s031", text: "火气临时办了个双人套餐" }],
  },
  {
    slot: "P05/calculate",
    chapter: "cross",
    sourceChoiceId: "d1_calc_money",
    variableName: "frontdesk_response",
    expectedValue: "calculate",
    echoes: [{ sceneId: "dch02_s001", text: "现在计算器成了排班表" }],
  },
  {
    slot: "P05/angry",
    chapter: "cross",
    sourceChoiceId: "d1_still_angry",
    variableName: "frontdesk_response",
    expectedValue: "angry",
    echoes: [{ sceneId: "dch02_s001", text: "火气照样得打卡" }],
  },
  {
    slot: "P06/firm",
    chapter: "cross",
    sourceChoiceId: "d1_confirm_900",
    variableName: "budget_stance",
    expectedValue: "firm_900",
    echoes: [{ sceneId: "dch02_s017", text: "守住了数字，别的钱就得自己割" }],
  },
  {
    slot: "P06/unspoken",
    chapter: "cross",
    sourceChoiceId: "d1_whisper_less",
    variableName: "budget_stance",
    expectedValue: "unspoken_less",
    echoes: [{ sceneId: "dch02_s017", text: "没说出的还价，现在从辣条钱里找零" }],
  },
  {
    slot: "P07/firm",
    chapter: "ch2",
    sourceChoiceId: "d2_catch_firm",
    variableName: "child_response",
    expectedValue: "firm",
    echoes: [{ sceneId: "dch02_s004", text: "掌心还留着按下去的力道" }],
  },
  {
    slot: "P07/soft",
    chapter: "ch2",
    sourceChoiceId: "d2_catch_soft",
    variableName: "child_response",
    expectedValue: "soft",
    echoes: [{ sceneId: "dch02_s004", text: "克制不是撤单" }],
  },
  {
    slot: "P08/dismiss",
    chapter: "ch2",
    sourceChoiceId: "d2_dismiss_robot",
    variableName: "robot_interest",
    expectedValue: "dismiss",
    echoes: [
      { sceneId: "dch02_s028", text: "拇指已经替它办理了退货" },
      { sceneId: "dch02_s032", text: "再把自己送进初审。流程闭环" },
    ],
  },
  {
    slot: "P08/curious",
    chapter: "ch2",
    sourceChoiceId: "d2_curious_robot",
    variableName: "robot_interest",
    expectedValue: "curious",
    echoes: [
      { sceneId: "dch02_s028", text: "他就知道自己会看到底" },
      { sceneId: "dch02_s032", text: "那个藏法正式失效" },
    ],
  },
];

const CROSS_CHAPTER_VARIABLES = [
  "breakup_delivery",
  "memory_posture",
  "frontdesk_response",
  "budget_stance",
] as const;

function pickDefaultChoice(snapshot: InkStorySnapshot): number {
  const preferred =
    snapshot.choices.find((choice) => choice.choiceId?.endsWith("_skip")) ??
    snapshot.choices.find((choice) => choice.choiceId?.endsWith("_continue")) ??
    snapshot.choices[0];
  if (!preferred) {
    throw new Error(`No authored choice available at ${snapshot.sceneId ?? "unknown scene"}`);
  }
  return preferred.index;
}

function advanceUntilChoice(
  runner: InkStoryRunner,
  choiceId: string,
  maxSteps = 240,
): InkStorySnapshot {
  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = runner.getSnapshot();
    if (snapshot.choices.some((choice) => choice.choiceId === choiceId)) {
      return snapshot;
    }
    if (snapshot.isEnded) {
      throw new Error(`Story ended before choice ${choiceId}`);
    }
    runner.choose(pickDefaultChoice(snapshot));
  }
  throw new Error(`Choice ${choiceId} not reached within ${maxSteps} steps`);
}

function chooseById(runner: InkStoryRunner, choiceId: string): InkStorySnapshot {
  const snapshot = advanceUntilChoice(runner, choiceId);
  const choice = snapshot.choices.find((candidate) => candidate.choiceId === choiceId);
  if (!choice) {
    throw new Error(`Choice ${choiceId} disappeared before selection`);
  }
  return runner.choose(choice.index);
}

function advanceToScene(runner: InkStoryRunner, sceneId: string, maxSteps = 240): InkStorySnapshot {
  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = runner.getSnapshot();
    if (snapshot.sceneId === sceneId) {
      return snapshot;
    }
    if (snapshot.isEnded) {
      throw new Error(`Story ended before scene ${sceneId}`);
    }
    runner.choose(pickDefaultChoice(snapshot));
  }
  throw new Error(`Scene ${sceneId} not reached within ${maxSteps} steps`);
}

function finishChapter(runner: InkStoryRunner, maxSteps = 240): void {
  for (let step = 0; step < maxSteps; step += 1) {
    const snapshot = runner.getSnapshot();
    if (snapshot.isEnded) {
      return;
    }
    runner.choose(pickDefaultChoice(snapshot));
  }
  throw new Error(`Chapter did not terminate within ${maxSteps} steps`);
}

async function createRunnerForEcho(testCase: EchoCase): Promise<InkStoryRunner> {
  if (testCase.chapter === "ch2") {
    const runner = await createDraftCh02InkStoryRunner();
    chooseById(runner, testCase.sourceChoiceId);
    return runner;
  }

  const chapter1 = await createDraftCh01InkStoryRunner();
  chooseById(chapter1, testCase.sourceChoiceId);
  expect(chapter1.getVariable(testCase.variableName)).toBe(testCase.expectedValue);
  if (testCase.chapter === "ch1") {
    return chapter1;
  }

  finishChapter(chapter1);
  const inheritedNames = getStoryCatalogMeta("draft-ch01").inheritVariableNames;
  expect(inheritedNames).toEqual(expect.arrayContaining([...CROSS_CHAPTER_VARIABLES]));
  const inherited = chapter1.exportVariables(inheritedNames);
  expect(inherited[testCase.variableName]).toBe(testCase.expectedValue);
  const chapter2 = await createDraftCh02InkStoryRunner(inherited);
  expect(chapter2.getVariable(testCase.variableName)).toBe(testCase.expectedValue);
  return chapter2;
}

function sequenceForScene(chapter: "ch1" | "ch2", sceneId: string | null): string | null {
  if (!sceneId) return null;
  if (chapter === "ch1") {
    if (sceneId === "dch01_emotion_calibration" || sceneId === "dch01_protocol_test") return "SQ01";
    if (sceneId === "d1_chapter_end") return "SQ07";
    const match = /^dch01_s(\d{3})$/.exec(sceneId);
    if (!match) return null;
    const number = Number(match[1]);
    // novel-v2 ch01 densified to 36 story beats; keep pure-continue runs ≤5 per SQ.
    if (number <= 4) return "SQ01";
    if (number <= 9) return "SQ02";
    if (number <= 14) return "SQ03";
    if (number <= 19) return "SQ04";
    if (number <= 24) return "SQ05";
    if (number <= 30) return "SQ06";
    return "SQ07";
  }

  if (sceneId === "dch02_barcode_sweep") return "SQ08";
  if (sceneId === "dch02_housing_hotspots") return "SQ09";
  if (sceneId === "dch02_mobile_questionnaire") return "SQ12";
  if (sceneId === "d2_chapter_end") return "SQ13";
  const match = /^dch02_s(\d{3})$/.exec(sceneId);
  if (!match) return null;
  const number = Number(match[1]);
  if (number <= 4) return "SQ08";
  if (number <= 9) return "SQ09";
  if (number <= 16) return "SQ10";
  if (number <= 22) return "SQ11";
  if (number <= 28) return "SQ12";
  return "SQ13";
}

function auditContinueRuns(
  runner: InkStoryRunner,
  chapter: "ch1" | "ch2",
  bias: "first" | "last",
): Map<string, number> {
  const maxima = new Map<string, number>();
  let activeSequence: string | null = null;
  let currentRun = 0;

  for (let step = 0; step < 240; step += 1) {
    const snapshot = runner.getSnapshot();
    if (snapshot.isEnded) {
      return maxima;
    }
    const sequence = sequenceForScene(chapter, snapshot.sceneId);
    if (!sequence) {
      throw new Error(`Unmapped scene ${snapshot.sceneId ?? "null"}`);
    }
    if (sequence !== activeSequence) {
      activeSequence = sequence;
      currentRun = 0;
    }

    const isPureContinue =
      snapshot.choices.length === 1 && snapshot.choices[0]?.text.trim() === "继续";
    currentRun = isPureContinue ? currentRun + 1 : 0;
    maxima.set(sequence, Math.max(maxima.get(sequence) ?? 0, currentRun));

    const index = bias === "first" ? 0 : snapshot.choices.length - 1;
    runner.choose(index);
  }
  throw new Error(`${chapter} ${bias} path did not terminate within 240 steps`);
}

describe("Round 15 choice echoes", () => {
  for (const testCase of ECHO_CASES) {
    it(`${testCase.slot} stores its enum and renders the frozen echo`, async () => {
      const runner = await createRunnerForEcho(testCase);
      expect(runner.getVariable(testCase.variableName)).toBe(testCase.expectedValue);
      for (const echo of testCase.echoes) {
        const snapshot = advanceToScene(runner, echo.sceneId);
        expect(snapshot.text).toContain(echo.text);
      }
    });
  }

  it.each([
    {
      label: "measured/shame/firm",
      chapter1Choices: [
        "d1_bones_accept",
        "d1_tell_flat",
        "d1_memory_shame",
        "d1_watch_leo",
        "d1_calc_money",
        "d1_confirm_900",
      ],
      chapter2Choices: ["d2_catch_firm", "d2_dismiss_robot"],
      echoes: {
        p01: "只把诚实印成了蚂蚁",
        p04: "语法还是烂，账倒算得清",
        p05: "现在计算器成了排班表",
        p07: "掌心还留着按下去的力道",
        p06: "守住了数字，别的钱就得自己割",
        p02: "报快递单似的“分手了。昨天。”",
        p03: "掌心先贴上脸",
        p08Landing: "拇指已经替它办理了退货",
        p08End: "再把自己送进初审。流程闭环",
      },
    },
    {
      label: "hard/angry/curious",
      chapter1Choices: [
        "d1_bones_cold",
        "d1_tell_hard",
        "d1_memory_hard",
        "d1_rush_front",
        "d1_still_angry",
        "d1_whisper_less",
      ],
      chapter2Choices: ["d2_catch_soft", "d2_curious_robot"],
      echoes: {
        p01: "抢劫前贴告示，也不叫双方自愿",
        p04: "火气临时办了个双人套餐",
        p05: "火气照样得打卡",
        p07: "克制不是撤单",
        p06: "没说出的还价，现在从辣条钱里找零",
        p02: "真实的你要吗？我提的",
        p03: "硬撑这门手艺，平台之间倒是通用",
        p08Landing: "他就知道自己会看到底",
        p08End: "那个藏法正式失效",
      },
    },
  ])("carries the $label path through both authored endpoints", async (path) => {
    const chapter1 = await createDraftCh01InkStoryRunner();
    for (const choiceId of path.chapter1Choices.slice(0, 5)) {
      chooseById(chapter1, choiceId);
    }
    const s031 = advanceToScene(chapter1, "dch01_s031");
    expect(s031.text).toContain(path.echoes.p01);
    expect(s031.text).toContain(path.echoes.p04);
    chooseById(chapter1, path.chapter1Choices[5]!);
    expect(advanceToScene(chapter1, "d1_chapter_end").text).toContain("旧巷");
    finishChapter(chapter1);

    const inheritedNames = getStoryCatalogMeta("draft-ch01").inheritVariableNames;
    const inherited = chapter1.exportVariables(inheritedNames);
    const chapter2 = await createDraftCh02InkStoryRunner(inherited);
    expect(advanceToScene(chapter2, "dch02_s001").text).toContain(path.echoes.p05);
    chooseById(chapter2, path.chapter2Choices[0]!);
    expect(chapter2.getSnapshot().text).toContain(path.echoes.p07);
    expect(advanceToScene(chapter2, "dch02_s017").text).toContain(path.echoes.p06);
    expect(advanceToScene(chapter2, "dch02_s017").text).toContain(path.echoes.p02);
    chooseById(chapter2, path.chapter2Choices[1]!);
    expect(advanceToScene(chapter2, "dch02_s028").text).toContain(path.echoes.p03);
    expect(advanceToScene(chapter2, "dch02_s028").text).toContain(path.echoes.p08Landing);
    expect(advanceToScene(chapter2, "dch02_s032").text).toContain(path.echoes.p08End);
    expect(advanceToScene(chapter2, "d2_chapter_end").text).toContain("短信屏幕还亮着");
    finishChapter(chapter2);
    expect(chapter2.getSnapshot().isEnded).toBe(true);
  });
});

describe("Round 15 sequence pacing", () => {
  it("keeps every SQ01-SQ13 pure-continue run at five or fewer on both biases", async () => {
    const observed = new Map<string, number>();
    for (const bias of ["first", "last"] as const) {
      const chapter1 = auditContinueRuns(await createDraftCh01InkStoryRunner(), "ch1", bias);
      const chapter2 = auditContinueRuns(await createDraftCh02InkStoryRunner(), "ch2", bias);
      for (const [sequence, maximum] of [...chapter1, ...chapter2]) {
        observed.set(sequence, Math.max(observed.get(sequence) ?? 0, maximum));
      }
    }

    expect([...observed.keys()].sort()).toEqual(
      Array.from({ length: 13 }, (_, index) => `SQ${String(index + 1).padStart(2, "0")}`),
    );
    for (const [sequence, maximum] of observed) {
      expect(maximum, `${sequence} longest pure-continue run`).toBeLessThanOrEqual(5);
    }
  });
});
