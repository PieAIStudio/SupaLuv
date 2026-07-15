import { describe, expect, it } from "vitest";
import {
  hasMixedTtsRoutes,
  planBrowserTtsSegments,
} from "../../apps/web/src/audio/ttsSegmentation";
import { planDialogueTtsSegments } from "../../services/ai-branch/src/ttsRoute";

const CHAPTER_FIXTURES = [
  '"你听起来在硬撑。"AI 忽然说，"是不是在假装坚强？"',
  '雷欧对着听筒喊："九百？OK……地址发我，现在。"',
  "苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。",
  "白天扫条码，晚上被 App 扫灵魂。",
  "你们在听？This is wrong. Live，实时。",
  "Only English here. Another sentence!",
  "这里只说中文。下一句。",
  "Robot。真的 robot，会说话。",
  "OpenAI 还在缓存里。",
] as const;

describe("browser/server TTS segmentation parity", () => {
  it.each(CHAPTER_FIXTURES.map((text) => [text, "zh-CN"] as const))(
    "keeps routing plans identical for %s",
    (text, fallbackLanguage) => {
      const browser = planBrowserTtsSegments(text, fallbackLanguage);
      const server = planDialogueTtsSegments(text, fallbackLanguage);
      expect(browser).toEqual(server);
    },
  );

  it("does not silence Chinese chapter lines that only borrow AI/App/OK tokens", () => {
    for (const text of [
      '"你听起来在硬撑。"AI 忽然说，"是不是在假装坚强？"',
      '雷欧对着听筒喊："九百？OK……地址发我，现在。"',
      "苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。",
      "白天扫条码，晚上被 App 扫灵魂。",
      "OpenAI 还在缓存里。",
    ]) {
      const segments = planBrowserTtsSegments(text, "zh-CN");
      expect(hasMixedTtsRoutes(segments)).toBe(false);
      expect(segments.every((segment) => segment.route === "chinese")).toBe(true);
    }
  });

  it("keeps true multi-word English mixed with Chinese as mixed routes", () => {
    const segments = planBrowserTtsSegments("你们在听？This is wrong.", "zh-CN");
    expect(hasMixedTtsRoutes(segments)).toBe(true);
  });

  it("inherits Chinese for a single short Latin token beside Han, not for pure English", () => {
    expect(planBrowserTtsSegments("真的 robot，会说话。", "zh-CN")[0]?.route).toBe("chinese");
    expect(planBrowserTtsSegments("Robot。", "zh-CN")[0]?.route).toBe("western");
  });
});
