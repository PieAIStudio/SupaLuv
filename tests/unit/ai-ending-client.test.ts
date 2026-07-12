import { describe, expect, it } from "vitest";
import {
  AiEndingApiError,
  describeAiEndingFailure,
} from "../../apps/web/src/ai-ending/aiEndingClient";

describe("AI ending player-facing failures", () => {
  it("does not expose model schema details to players", () => {
    expect(
      describeAiEndingFailure(
        new AiEndingApiError(500, "non-terminal segment must have 2–4 choices"),
        "推进失败",
      ),
    ).toBe("这段 AI 内容未通过质量检查，请重试。失败调用不会扣款。");
  });

  it("keeps actionable authentication and conflict guidance", () => {
    expect(describeAiEndingFailure(new AiEndingApiError(401, "AUTH_REQUIRED"), "推进失败")).toBe(
      "登录状态已失效，请重新登录后继续。",
    );
    expect(describeAiEndingFailure(new AiEndingApiError(409, "VERSION_CONFLICT"), "推进失败")).toBe(
      "结局进度已在别处更新，请返回后重新进入最终章。",
    );
  });
});
