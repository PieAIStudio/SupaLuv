import { describe, expect, it } from "vitest";
import { resolveTtsRoute } from "@pieai/swimmer-ai-kit/tts";
import {
  planDialogueTtsSegments,
  resolveTtsCharacterId,
  toSafeTtsSynthesizeResult,
} from "../../services/ai-branch/src/tts/ttsRoute";

describe("dual TTS route", () => {
  it("sends Chinese locales to the Chinese lane", () => {
    expect(resolveTtsRoute("zh-CN")).toBe("chinese");
    expect(resolveTtsRoute("zh")).toBe("chinese");
  });

  it("sends Western locales to the Western lane", () => {
    expect(resolveTtsRoute("en")).toBe("western");
    expect(resolveTtsRoute("en-US")).toBe("western");
    expect(resolveTtsRoute("fr-FR")).toBe("western");
  });

  it("canonicalizes core cast aliases and never forwards an arbitrary voice id", () => {
    expect(resolveTtsCharacterId("雷欧")).toBe("leo");
    expect(resolveTtsCharacterId("Léo")).toBe("leo");
    expect(resolveTtsCharacterId("苏明")).toBe("suming");
    expect(resolveTtsCharacterId("石佩欣")).toBe("shi_peixin");
    expect(resolveTtsCharacterId("provider-internal-voice-id")).toBe("narrator");
  });

  it("plans Leo code-switching by reproducible sentence/script fragments", () => {
    const segments = planDialogueTtsSegments(
      "你们在听？This is wrong. Live，实时。我听见他们笑了。",
      "zh-CN",
    );
    expect(segments.map(({ text, language, route }) => ({ text, language, route }))).toEqual([
      { text: "你们在听？", language: "zh-CN", route: "chinese" },
      { text: "This is wrong.", language: "en", route: "western" },
      { text: "Live，", language: "en", route: "western" },
      { text: "实时。", language: "zh-CN", route: "chinese" },
      { text: "我听见他们笑了。", language: "zh-CN", route: "chinese" },
    ]);
  });

  it("inherits Chinese lane for short AI/App/OK borrowings from real chapters", () => {
    const aiLine = planDialogueTtsSegments(
      '"你听起来在硬撑。"AI 忽然说，"是不是在假装坚强？"',
      "zh-CN",
    );
    expect(new Set(aiLine.map((segment) => segment.route))).toEqual(new Set(["chinese"]));
    expect(aiLine.some((segment) => segment.text.includes("AI"))).toBe(true);

    const okLine = planDialogueTtsSegments('雷欧对着听筒喊："九百？OK……地址发我，现在。"', "zh-CN");
    expect(new Set(okLine.map((segment) => segment.route))).toEqual(new Set(["chinese"]));

    const appAiLine = planDialogueTtsSegments(
      "苏明一眼就认出了这句话。App 里那个 AI，开口没两句就是这一句。",
      "zh-CN",
    );
    expect(new Set(appAiLine.map((segment) => segment.route))).toEqual(new Set(["chinese"]));

    const appSoul = planDialogueTtsSegments("白天扫条码，晚上被 App 扫灵魂。", "zh-CN");
    expect(new Set(appSoul.map((segment) => segment.route))).toEqual(new Set(["chinese"]));
  });

  it("keeps multi-word English Western and still flags true mixed routes", () => {
    const mixed = planDialogueTtsSegments("你们在听？This is wrong.", "zh-CN");
    expect(mixed.map((segment) => segment.route)).toEqual(["chinese", "western"]);
    expect(planDialogueTtsSegments("Only English here.", "zh-CN")[0]?.route).toBe("western");
  });

  it("detects script language instead of trusting the UI locale", () => {
    expect(planDialogueTtsSegments("Only English here.", "zh-CN")[0]?.language).toBe("en");
    expect(planDialogueTtsSegments("这里只说中文。", "en")[0]?.language).toBe("zh-CN");
  });

  it("keeps provider and route metadata on the server side", () => {
    expect(
      toSafeTtsSynthesizeResult({
        audioBase64: "YQ==",
        mimeType: "audio/mpeg",
        provider: "mock",
        route: "western",
      }),
    ).toEqual({ audioBase64: "YQ==", mimeType: "audio/mpeg" });
  });
});
