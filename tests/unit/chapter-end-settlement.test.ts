import { describe, expect, it } from "vitest";

/**
 * ADR-0007 chapter-end "系统季度绩效结算": jump into d*_chapter_end with forced
 * mianzi / ai_score and assert the progressive company-voice line.
 */
describe("ADR-0007 chapter-end quarterly settlement", () => {
  it("ch01 初见绩效 branches on meter extremes and mid band", async () => {
    const { createDraftCh01InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const highAiLowFace = await createDraftCh01InkStoryRunner({
      ai_score: 80,
      mianzi: 20,
    });
    highAiLowFace.jumpTo("d1_chapter_end");
    expect(highAiLowFace.getSnapshot().text).toContain("【系统·阶段结算】初见绩效");
    expect(highAiLowFace.getSnapshot().text).toContain("体面余额不足");

    const highFaceLowAi = await createDraftCh01InkStoryRunner({
      ai_score: 15,
      mianzi: 80,
    });
    highFaceLowAi.jumpTo("d1_chapter_end");
    expect(highFaceLowAi.getSnapshot().text).toContain("真诚新人");

    const highAi = await createDraftCh01InkStoryRunner({ ai_score: 75, mianzi: 50 });
    highAi.jumpTo("d1_chapter_end");
    expect(highAi.getSnapshot().text).toContain("可开发样本");

    const lowFace = await createDraftCh01InkStoryRunner({ ai_score: 40, mianzi: 18 });
    lowFace.jumpTo("d1_chapter_end");
    expect(lowFace.getSnapshot().text).toContain("更冷的字体");

    const mid = await createDraftCh01InkStoryRunner({ ai_score: 50, mianzi: 50 });
    mid.jumpTo("d1_chapter_end");
    expect(mid.getSnapshot().text).toContain("可观察中位");
  });

  it("ch02 转正评估 uses distinct progressive copy", async () => {
    const { createDraftCh02InkStoryRunner } =
      await import("../../apps/web/src/story/inkStoryRunner");

    const highAiLowFace = await createDraftCh02InkStoryRunner({
      ai_score: 82,
      mianzi: 12,
    });
    highAiLowFace.jumpTo("d2_chapter_end");
    expect(highAiLowFace.getSnapshot().text).toContain("【系统·阶段结算】转正评估");
    expect(highAiLowFace.getSnapshot().text).toContain("高配合、低体面");

    const highFaceLowAi = await createDraftCh02InkStoryRunner({
      ai_score: 18,
      mianzi: 78,
    });
    highFaceLowAi.jumpTo("d2_chapter_end");
    expect(highFaceLowAi.getSnapshot().text).toContain("站直不等于配合");

    const mid = await createDraftCh02InkStoryRunner({ ai_score: 55, mianzi: 48 });
    mid.jumpTo("d2_chapter_end");
    expect(mid.getSnapshot().text).toContain("临期价签");
  });

  it("ch03 绑定后首次考核 uses binding-stage copy", async () => {
    const { createInkStoryRunnerForId } = await import("../../apps/web/src/story/inkStoryRunner");

    const highAiLowFace = await createInkStoryRunnerForId("draft-ch03", undefined, {
      ai_score: 88,
      mianzi: 10,
    });
    highAiLowFace.jumpTo("d3_chapter_end");
    expect(highAiLowFace.getSnapshot().text).toContain("【系统·阶段结算】绑定后首次考核");
    expect(highAiLowFace.getSnapshot().text).toContain("沉浸成本");

    const highFaceLowAi = await createInkStoryRunnerForId("draft-ch03", undefined, {
      ai_score: 12,
      mianzi: 85,
    });
    highFaceLowAi.jumpTo("d3_chapter_end");
    expect(highFaceLowAi.getSnapshot().text).toContain("观察档友好模式");

    const mid = await createInkStoryRunnerForId("draft-ch03", undefined, {
      ai_score: 45,
      mianzi: 55,
    });
    mid.jumpTo("d3_chapter_end");
    expect(mid.getSnapshot().text).toContain("继续使用，继续被使用");
  });
});
