import { describe, expect, it } from "vitest";
import {
  clampMeter,
  isContinueChoiceText,
  isContinueOnly,
  storyHasComedyMeters,
} from "../../apps/web/src/views/play/vnHelpers";
import type { InkStorySnapshot } from "../../apps/web/src/story/inkStoryRunner";

function snap(
  partial: Partial<InkStorySnapshot> & Pick<InkStorySnapshot, "choices">,
): InkStorySnapshot {
  return {
    text: "",
    sceneId: "x",
    isEnded: false,
    meters: { dignity: 50, impulse: 50 },
    ...partial,
  };
}

describe("vnHelpers", () => {
  it("clamps meters to 0..100", () => {
    expect(clampMeter(-10)).toBe(0);
    expect(clampMeter(50)).toBe(50);
    expect(clampMeter(140)).toBe(100);
  });

  it("marks comedy meter stories", () => {
    expect(storyHasComedyMeters("draft-ch01")).toBe(true);
    expect(storyHasComedyMeters("draft-ch02")).toBe(true);
    expect(storyHasComedyMeters("prototype-act1")).toBe(true);
    expect(storyHasComedyMeters("chapter-01-trial")).toBe(true);
  });

  it("detects continue-only single choices", () => {
    expect(isContinueOnly(snap({ choices: [{ index: 0, text: "继续" }] }))).toBe(true);
    expect(isContinueOnly(snap({ choices: [{ index: 0, text: "……继续" }] }))).toBe(true);
    expect(isContinueOnly(snap({ choices: [{ index: 0, text: "继续下单流程" }] }))).toBe(true);
    expect(
      isContinueOnly(snap({ choices: [{ index: 0, text: "立刻删掉，假装什么都没发生" }] })),
    ).toBe(false);
    expect(
      isContinueOnly(
        snap({
          choices: [
            { index: 0, text: "继续" },
            { index: 1, text: "别继续" },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("matches continue choice labels", () => {
    expect(isContinueChoiceText("支付")).toBe(true);
    expect(isContinueChoiceText(" 打开演示对话 ")).toBe(true);
    expect(isContinueChoiceText("先截图备份")).toBe(false);
  });
});
