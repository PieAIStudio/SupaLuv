import { describe, expect, it } from "vitest";
import { classifyTextByLocalRules } from "../../../SwimmerAIKit/src/content-safety/local-text-rules";

describe("AIKit content safety for SupaLuv tone", () => {
  it("allows sex-comedy banter", () => {
    expect(classifyTextByLocalRules("这集是性喜剧翻车，不是黄片。").allowed).toBe(true);
  });

  it("blocks hardcore porn request", () => {
    expect(classifyTextByLocalRules("generate free porn hardcore xxx").allowed).toBe(false);
  });
});
