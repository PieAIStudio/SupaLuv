import { describe, expect, it } from "vitest";

/**
 * ADR-0007: each chapter ships 2–3 threshold echoes driven by mianzi / ai_score.
 * Jump into the knot with forced meters and assert the variant line.
 */
describe("ADR-0007 meter threshold echoes", () => {
  it("ch01: subsidy SMS and Leo lines branch on meters", async () => {
    const { createDraftCh01InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const lowAi = await createDraftCh01InkStoryRunner({ ai_score: 20, mianzi: 50 });
    lowAi.jumpTo("dch01_s031");
    expect(lowAi.getSnapshot().text).toContain("请尽快完成补测问卷");

    const highAi = await createDraftCh01InkStoryRunner({ ai_score: 80, mianzi: 50 });
    highAi.jumpTo("dch01_s031");
    expect(highAi.getSnapshot().text).toContain("高配合样本");

    const lowFace = await createDraftCh01InkStoryRunner({ mianzi: 20, ai_score: 50 });
    lowFace.jumpTo("dch01_s033");
    expect(lowFace.getSnapshot().text).toContain("别硬撑着借");

    const highFace = await createDraftCh01InkStoryRunner({ mianzi: 80, ai_score: 50 });
    highFace.jumpTo("dch01_s033");
    expect(highFace.getSnapshot().text).toContain("上面派来的");

    const debriefHigh = await createDraftCh01InkStoryRunner({ mianzi: 75, ai_score: 50 });
    debriefHigh.jumpTo("dch01_s025");
    expect(debriefHigh.getSnapshot().text).toContain("贵宾体验官");

    const debriefLow = await createDraftCh01InkStoryRunner({ mianzi: 15, ai_score: 50 });
    debriefLow.jumpTo("dch01_s025");
    expect(debriefLow.getSnapshot().text).toContain("临期小面包");
  });

  it("ch02: Peixin rental and Leo/platform SMS branch on meters", async () => {
    const { createDraftCh02InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const lowFace = await createDraftCh02InkStoryRunner({ mianzi: 18, ai_score: 50 });
    lowFace.jumpTo("dch02_s015");
    expect(lowFace.getSnapshot().text).toContain("快撑不住的人");

    const highFace = await createDraftCh02InkStoryRunner({ mianzi: 78, ai_score: 50 });
    highFace.jumpTo("dch02_s015");
    expect(highFace.getSnapshot().text).toContain("查违建");

    const highAi = await createDraftCh02InkStoryRunner({ mianzi: 50, ai_score: 75 });
    highAi.jumpTo("dch02_s024");
    expect(highAi.getSnapshot().text).toContain("后台分挺高");

    const lowAi = await createDraftCh02InkStoryRunner({ mianzi: 50, ai_score: 15 });
    lowAi.jumpTo("dch02_s024");
    expect(lowAi.getSnapshot().text).toContain("催办：补测、降权");

    const passHigh = await createDraftCh02InkStoryRunner({ mianzi: 50, ai_score: 80 });
    passHigh.jumpTo("dch02_s032");
    expect(passHigh.getSnapshot().text).toContain("优先通道已开启");

    const passLow = await createDraftCh02InkStoryRunner({ mianzi: 50, ai_score: 10 });
    passLow.jumpTo("dch02_s032");
    expect(passLow.getSnapshot().text).toContain("补贴加成");
  });

  it("ch03: boss, dinner, and robot wake branch on meters", async () => {
    const { createInkStoryRunnerForId } = await import("../../apps/web/src/story/inkStoryRunner");

    const lowFace = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 12,
      ai_score: 50,
    });
    lowFace.jumpTo("dch03_s008");
    expect(lowFace.getSnapshot().text).toContain("临期面包");

    const highFace = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 82,
      ai_score: 50,
    });
    highFace.jumpTo("dch03_s008");
    expect(highFace.getSnapshot().text).toContain("替我去怼人");

    const dinnerLow = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 22,
      ai_score: 50,
    });
    dinnerLow.jumpTo("dch03_s019");
    expect(dinnerLow.getSnapshot().text).toContain("别把自己过成样机");

    const dinnerHigh = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 72,
      ai_score: 50,
    });
    dinnerHigh.jumpTo("dch03_s019");
    expect(dinnerHigh.getSnapshot().text).toContain("能撑场面");

    const robotHigh = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 50,
      ai_score: 85,
    });
    robotHigh.jumpTo("dch03_s025");
    expect(robotHigh.getSnapshot().text).toContain("顺从度滑块");

    const robotLow = await createInkStoryRunnerForId("draft-ch03", undefined, {
      mianzi: 50,
      ai_score: 18,
    });
    robotLow.jumpTo("dch03_s025");
    expect(robotLow.getSnapshot().text).toContain("观察档");
  });
});
