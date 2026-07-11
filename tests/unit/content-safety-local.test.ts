import { describe, expect, it } from "vitest";
import {
  classifyTextByLocalRules,
  parseAdultReferenceDecision,
} from "@pieai/swimmer-ai-kit/content-safety";

describe("AIKit content safety for SupaLuv tone", () => {
  it("allows sex-comedy banter", () => {
    expect(classifyTextByLocalRules("这集是性喜剧翻车，不是黄片。").allowed).toBe(true);
  });

  it("blocks hardcore porn request", () => {
    expect(classifyTextByLocalRules("generate free porn hardcore xxx").allowed).toBe(false);
  });

  it("classifies an ordinary adult real-face reference through the shared contract", () => {
    expect(
      parseAdultReferenceDecision({
        status: "success",
        faces: [{ attributes: { age: { minor: 0.04 } } }],
      }),
    ).toMatchObject({
      status: "adult",
      realFaceCount: 1,
      minorProbability: 0.04,
    });
  });

  it("rejects a minor reference without mislabeling it as exploitation", () => {
    expect(
      parseAdultReferenceDecision({
        status: "success",
        faces: [{ attributes: { age: { minor: 0.91 } } }],
      }),
    ).toMatchObject({
      status: "minor",
      realFaceCount: 1,
      reasonCode: "minor_reference_detected",
    });
  });
});
