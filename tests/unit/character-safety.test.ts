import { describe, expect, it, vi } from "vitest";
import type { ContentModerationProvider } from "@pieai/swimmer-ai-kit/content-safety";
import {
  CharacterSafetyError,
  createCharacterSafety,
  createGeminiGeneratedAdultPresentationReviewer,
  GEMINI_ADULT_PRESENTATION_MODEL,
  type GeminiAdultReviewClient,
  type GeneratedAdultPresentationReviewer,
} from "../../services/ai-branch/src/characterSafety";

const image = { bytes: Buffer.from("image"), mimeType: "image/jpeg" as const };

function setup(options?: {
  adult?: {
    status: "adult" | "minor" | "uncertain" | "no_real_face";
    realFaceCount: number;
    reasonCode?: string;
  };
  visual?: {
    allowed: boolean;
    category?: "adult" | "graphic_violence" | "moderation_uncertain";
    reasonCode?: string;
  };
  semantic?: { status: "adult" | "minor" | "uncertain"; reasonCode?: string };
}) {
  const moderation: ContentModerationProvider = {
    reviewText: vi.fn(async () => ({ allowed: true })),
    reviewAdultReference: vi.fn(async () => ({
      status: options?.adult?.status ?? "adult",
      realFaceCount: options?.adult?.realFaceCount ?? 1,
      provider: "sightengine" as const,
      ...(options?.adult?.reasonCode ? { reasonCode: options.adult.reasonCode } : {}),
    })),
    reviewVisualAsset: vi.fn(async () => ({
      allowed: options?.visual?.allowed ?? true,
      provider: "test",
      ...(options?.visual?.category ? { category: options.visual.category } : {}),
      ...(options?.visual?.reasonCode ? { reasonCode: options.visual.reasonCode } : {}),
    })),
  };
  const semanticReviewer: GeneratedAdultPresentationReviewer = {
    review: vi.fn(async () => ({
      status: options?.semantic?.status ?? "adult",
      provider: "test-semantic",
      ...(options?.semantic?.reasonCode ? { reasonCode: options.semantic.reasonCode } : {}),
    })),
  };
  return {
    moderation,
    semanticReviewer,
    safety: createCharacterSafety({ moderation, semanticReviewer }),
  };
}

describe("character safety", () => {
  it.each([
    ["minor", 1, "minor_reference"],
    ["uncertain", 1, "adult_verification_uncertain"],
    ["no_real_face", 0, "real_face_required"],
    ["adult", 2, "single_face_required"],
  ] as const)(
    "fails a human reference classified as %s with %s face(s)",
    async (status, realFaceCount, code) => {
      const { safety } = setup({ adult: { status, realFaceCount } });

      await expect(safety.reviewHumanReferences([image])).rejects.toMatchObject({ code });
    },
  );

  it("fails closed when ordinary visual moderation is unavailable", async () => {
    const { safety } = setup({
      visual: {
        allowed: false,
        category: "moderation_uncertain",
        reasonCode: "visual_classifier_unavailable",
      },
    });

    await expect(safety.reviewRobotReferences([image])).rejects.toMatchObject({
      code: "visual_review_unavailable",
      retryable: true,
    });
  });

  it("blocks nudity or other disallowed ordinary visual content before generation", async () => {
    const { safety } = setup({
      visual: { allowed: false, category: "adult", reasonCode: "visual_adult" },
    });

    await expect(safety.reviewHumanReferences([image])).rejects.toMatchObject({
      code: "visual_content_blocked",
      retryable: false,
    });
  });

  it("requires a secondary adult-presentation PASS for generated output", async () => {
    const { safety } = setup({ semantic: { status: "uncertain" } });

    await expect(safety.reviewGeneratedCharacter(image)).rejects.toMatchObject({
      code: "generated_adult_uncertain",
    });
  });

  it("passes safe adult references, robot art, and safe adult generated art", async () => {
    const { safety, moderation, semanticReviewer } = setup();

    await expect(safety.reviewHumanReferences([image, image])).resolves.toEqual({ allowed: true });
    await expect(safety.reviewRobotReferences([image])).resolves.toEqual({ allowed: true });
    await expect(safety.reviewGeneratedCharacter(image)).resolves.toEqual({ allowed: true });
    expect(moderation.reviewAdultReference).toHaveBeenCalledTimes(2);
    expect(semanticReviewer.review).toHaveBeenCalledOnce();
  });

  it("exposes only stable user-safe errors, not provider reason text", async () => {
    const { safety } = setup({
      adult: { status: "minor", realFaceCount: 1, reasonCode: "raw_vendor_code" },
    });

    const error = await safety.reviewHumanReferences([image]).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CharacterSafetyError);
    expect(error).toMatchObject({
      code: "minor_reference",
      message: "This reference cannot be used",
    });
    expect(String(error)).not.toContain("raw_vendor_code");
  });
});

describe("generated adult-presentation reviewer", () => {
  it("asks only for apparent adulthood and parses structured output", async () => {
    const client: GeminiAdultReviewClient = {
      create: vi.fn(async () => ({ outputText: JSON.stringify({ status: "adult" }) })),
    };
    const reviewer = createGeminiGeneratedAdultPresentationReviewer(client);

    await expect(reviewer.review(image)).resolves.toMatchObject({
      status: "adult",
      provider: GEMINI_ADULT_PRESENTATION_MODEL,
    });
    const request = vi.mocked(client.create).mock.calls[0]?.[0];
    expect(request).toBeDefined();
    if (!request) throw new Error("review request missing");
    expect(request.model).toBe(GEMINI_ADULT_PRESENTATION_MODEL);
    expect(request.prompt).toContain("Do not identify the person");
    expect(request.imageData).toBe(image.bytes.toString("base64"));
  });

  it("fails closed on malformed semantic output", async () => {
    const client: GeminiAdultReviewClient = {
      create: vi.fn(async () => ({ outputText: "not-json" })),
    };

    await expect(
      createGeminiGeneratedAdultPresentationReviewer(client).review(image),
    ).resolves.toMatchObject({ status: "uncertain", reasonCode: "semantic_review_invalid" });
  });
});
