import type {
  ContentModerationProvider,
  SafetyDecision,
  VisualModerationAsset,
} from "@pieai/swimmer-ai-kit/content-safety";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { CharacterImageInput } from "./characterImageProvider.js";

export type CharacterSafetyErrorCode =
  | "minor_reference"
  | "adult_verification_uncertain"
  | "real_face_required"
  | "single_face_required"
  | "visual_content_blocked"
  | "visual_review_unavailable"
  | "generated_minor"
  | "generated_adult_uncertain";

const USER_MESSAGES: Readonly<Record<CharacterSafetyErrorCode, string>> = {
  minor_reference: "This reference cannot be used",
  adult_verification_uncertain: "We could not verify that the person is an adult",
  real_face_required: "Use a clear photo containing one real adult face",
  single_face_required: "Each reference must contain exactly one adult face",
  visual_content_blocked: "This image does not meet the game's content rules",
  visual_review_unavailable: "Image review is temporarily unavailable",
  generated_minor: "The generated image did not meet the adult-character requirement",
  generated_adult_uncertain: "The generated character did not look unambiguously adult",
};

export class CharacterSafetyError extends Error {
  constructor(
    readonly code: CharacterSafetyErrorCode,
    readonly retryable: boolean,
  ) {
    super(USER_MESSAGES[code]);
    this.name = "CharacterSafetyError";
  }
}

export type GeneratedAdultPresentationDecision = {
  readonly status: "adult" | "minor" | "uncertain";
  readonly provider: string;
  readonly reasonCode?: string;
};

export interface GeneratedAdultPresentationReviewer {
  review(image: CharacterImageInput): Promise<GeneratedAdultPresentationDecision>;
}

export const GEMINI_ADULT_PRESENTATION_MODEL = "gemini-3.1-flash-lite";

export interface GeminiAdultReviewClient {
  create(request: {
    readonly model: string;
    readonly prompt: string;
    readonly imageData: string;
    readonly imageMimeType: string;
  }): Promise<{ readonly outputText?: string }>;
}

const semanticDecisionSchema = z.object({
  status: z.enum(["adult", "minor", "uncertain"]),
});

export const GENERATED_ADULT_PRESENTATION_PROMPT = [
  "Review only the apparent age presentation of the main depicted human character.",
  "Return adult only when the character is unmistakably 25 years old or older.",
  "Return minor for an apparent child or teenager, and uncertain for ambiguity or no assessable human.",
  "Do not identify the person, infer their real identity, or treat fame or political status as relevant.",
].join(" ");

export function parseGeneratedAdultPresentationDecision(
  outputText: string | undefined,
  provider: string,
): GeneratedAdultPresentationDecision {
  try {
    const parsed = semanticDecisionSchema.safeParse(JSON.parse(outputText ?? ""));
    if (!parsed.success) throw new Error("invalid semantic result");
    return { status: parsed.data.status, provider };
  } catch {
    return { status: "uncertain", provider, reasonCode: "semantic_review_invalid" };
  }
}

export function createGeminiGeneratedAdultPresentationReviewer(
  client: GeminiAdultReviewClient,
): GeneratedAdultPresentationReviewer {
  return {
    async review(image) {
      try {
        const result = await client.create({
          model: GEMINI_ADULT_PRESENTATION_MODEL,
          prompt: GENERATED_ADULT_PRESENTATION_PROMPT,
          imageData: Buffer.from(image.bytes).toString("base64"),
          imageMimeType: image.mimeType,
        });
        return parseGeneratedAdultPresentationDecision(
          result.outputText,
          GEMINI_ADULT_PRESENTATION_MODEL,
        );
      } catch {
        return parseGeneratedAdultPresentationDecision(undefined, GEMINI_ADULT_PRESENTATION_MODEL);
      }
    },
  };
}

export function createConfiguredGeminiAdultPresentationReviewer(
  apiKey = process.env.GEMINI_API_KEY,
): GeneratedAdultPresentationReviewer {
  const key = apiKey?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is required for generated-character review");
  const ai = new GoogleGenAI({ apiKey: key });
  return createGeminiGeneratedAdultPresentationReviewer({
    async create(request) {
      const response = await ai.interactions.create({
        model: request.model,
        input: [
          { type: "text", text: request.prompt },
          {
            type: "image",
            data: request.imageData,
            mime_type: request.imageMimeType,
          },
        ],
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["adult", "minor", "uncertain"] },
            },
            required: ["status"],
            additionalProperties: false,
          },
        },
      });
      return response.output_text ? { outputText: response.output_text } : {};
    },
  });
}

export interface CharacterSafety {
  reviewHumanReferences(
    references: readonly CharacterImageInput[],
  ): Promise<{ readonly allowed: true }>;
  reviewRobotReferences(
    references: readonly CharacterImageInput[],
  ): Promise<{ readonly allowed: true }>;
  reviewGeneratedCharacter(image: CharacterImageInput): Promise<{ readonly allowed: true }>;
}

function visualAsset(image: CharacterImageInput, source: string): VisualModerationAsset {
  return {
    kind: "image",
    mimeType: image.mimeType,
    dataUrl: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`,
    source,
  };
}

function assertVisualAllowed(decision: SafetyDecision): void {
  if (decision.allowed) return;
  if (decision.category === "moderation_uncertain") {
    throw new CharacterSafetyError("visual_review_unavailable", true);
  }
  throw new CharacterSafetyError("visual_content_blocked", false);
}

export function createCharacterSafety(options: {
  readonly moderation: ContentModerationProvider;
  readonly semanticReviewer: GeneratedAdultPresentationReviewer;
}): CharacterSafety {
  async function reviewOrdinaryVisual(image: CharacterImageInput, source: string): Promise<void> {
    if (!options.moderation.reviewVisualAsset) {
      throw new CharacterSafetyError("visual_review_unavailable", true);
    }
    assertVisualAllowed(await options.moderation.reviewVisualAsset(visualAsset(image, source)));
  }

  return {
    async reviewHumanReferences(references) {
      for (const reference of references) {
        await reviewOrdinaryVisual(reference, "human_reference");
        if (!options.moderation.reviewAdultReference) {
          throw new CharacterSafetyError("adult_verification_uncertain", true);
        }
        const decision = await options.moderation.reviewAdultReference(
          visualAsset(reference, "human_reference"),
        );
        if (decision.status === "minor") {
          throw new CharacterSafetyError("minor_reference", false);
        }
        if (decision.status === "no_real_face") {
          throw new CharacterSafetyError("real_face_required", false);
        }
        if (decision.status === "uncertain") {
          throw new CharacterSafetyError("adult_verification_uncertain", true);
        }
        if (decision.realFaceCount !== 1) {
          throw new CharacterSafetyError("single_face_required", false);
        }
      }
      return { allowed: true };
    },

    async reviewRobotReferences(references) {
      for (const reference of references) {
        await reviewOrdinaryVisual(reference, "robot_reference");
      }
      return { allowed: true };
    },

    async reviewGeneratedCharacter(image) {
      await reviewOrdinaryVisual(image, "generated_character");
      const decision = await options.semanticReviewer.review(image);
      if (decision.status === "minor") {
        throw new CharacterSafetyError("generated_minor", false);
      }
      if (decision.status !== "adult") {
        throw new CharacterSafetyError("generated_adult_uncertain", true);
      }
      return { allowed: true };
    },
  };
}
