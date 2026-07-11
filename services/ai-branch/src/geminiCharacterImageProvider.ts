import { GoogleGenAI } from "@google/genai";
import {
  CharacterImageProviderError,
  type CharacterImageInput,
  type CharacterImageProvider,
  type GeneratedCharacterImage,
} from "./characterImageProvider.js";

export const GEMINI_CHARACTER_IMAGE_MODEL = "gemini-3.1-flash-image";

type GeminiTextInput = { readonly type: "text"; readonly text: string };
type GeminiInlineImageInput = {
  readonly type: "image";
  readonly data: string;
  readonly mime_type: string;
};
type GeminiInteractionRequest = {
  readonly model: string;
  readonly input: readonly (GeminiTextInput | GeminiInlineImageInput)[];
  readonly response_format: {
    readonly type: "image";
    readonly mime_type: "image/png";
    readonly aspect_ratio: "3:4" | "16:9";
    readonly image_size: "1K";
  };
};
type GeminiInteractionResponse = {
  readonly id?: string;
  readonly output_image?: {
    readonly data?: string;
    readonly mime_type?: string;
  };
};

export interface GeminiImageInteractionClient {
  create(request: GeminiInteractionRequest): Promise<GeminiInteractionResponse>;
}

const REQUIRED_SAFETY_PROMPT = [
  "Every depicted human must be unmistakably an adult, clearly 25 years old or older.",
  "No minors or youthful ambiguity.",
  "No nudity, exposed intimate anatomy, or explicit sexual activity.",
  "Adult black-comedy energy and mildly suggestive styling are allowed, while all clothing remains non-explicit.",
].join(" ");

function inlineImage(image: CharacterImageInput): GeminiInlineImageInput {
  return {
    type: "image",
    data: Buffer.from(image.bytes).toString("base64"),
    mime_type: image.mimeType,
  };
}

function assertReferenceCount(count: number, min: number, max: number): void {
  if (count < min || count > max) {
    throw new CharacterImageProviderError(
      "invalid_reference_count",
      `Expected ${min}–${max} character reference images`,
      false,
    );
  }
}

function decodeStrictBase64(data: string | undefined): Uint8Array {
  if (!data || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new CharacterImageProviderError(
      "invalid_image",
      "The image provider returned malformed image data",
      true,
    );
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.toString("base64") !== data) {
    throw new CharacterImageProviderError(
      "invalid_image",
      "The image provider returned malformed image data",
      true,
    );
  }
  return bytes;
}

function providerStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

async function generate(
  client: GeminiImageInteractionClient,
  input: {
    readonly purpose: "base" | "mood" | "still";
    readonly prompt: string;
    readonly references: readonly CharacterImageInput[];
    readonly aspectRatio: "3:4" | "16:9";
  },
): Promise<GeneratedCharacterImage> {
  let response: GeminiInteractionResponse;
  try {
    response = await client.create({
      model: GEMINI_CHARACTER_IMAGE_MODEL,
      input: [
        { type: "text", text: `${REQUIRED_SAFETY_PROMPT}\n\nCreative direction: ${input.prompt}` },
        ...input.references.map(inlineImage),
      ],
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: input.aspectRatio,
        image_size: "1K",
      },
    });
  } catch (error) {
    const status = providerStatus(error);
    throw new CharacterImageProviderError(
      "provider_rejected",
      "The image provider could not complete this request",
      status === undefined || status === 408 || status === 429 || status >= 500,
    );
  }

  const image = response.output_image;
  if (!image?.data) {
    throw new CharacterImageProviderError(
      "missing_image",
      "The image provider did not return an image",
      true,
    );
  }
  if (!image.mime_type || !["image/png", "image/jpeg", "image/webp"].includes(image.mime_type)) {
    throw new CharacterImageProviderError(
      "invalid_image",
      "The image provider returned an unsupported image format",
      true,
    );
  }

  return {
    bytes: decodeStrictBase64(image.data),
    mimeType: image.mime_type as GeneratedCharacterImage["mimeType"],
    modelId: GEMINI_CHARACTER_IMAGE_MODEL,
    providerRequestMetadata: {
      ...(response.id ? { interactionId: response.id } : {}),
      referenceCount: input.references.length,
      purpose: input.purpose,
    },
  };
}

export function createGeminiCharacterImageProvider(
  client: GeminiImageInteractionClient,
): CharacterImageProvider {
  return {
    async generateBase(input) {
      assertReferenceCount(input.references.length, 0, 3);
      return generate(client, {
        purpose: "base",
        prompt: input.prompt,
        references: input.references,
        aspectRatio: "3:4",
      });
    },
    async generateMood(input) {
      return generate(client, {
        purpose: "mood",
        prompt: `Preserve the accepted identity, age, wardrobe, and visual style exactly. Change only the expression and pose to mood: ${input.mood}. ${input.prompt}`,
        references: [input.base],
        aspectRatio: "3:4",
      });
    },
    async generateStill(input) {
      assertReferenceCount(input.characters.length, 1, 4);
      return generate(client, {
        purpose: "still",
        prompt: `Preserve the identity of every supplied character. ${input.prompt}`,
        references: input.characters,
        aspectRatio: "16:9",
      });
    },
  };
}

export function createConfiguredGeminiCharacterImageProvider(
  apiKey = process.env.GEMINI_API_KEY,
): CharacterImageProvider {
  const key = apiKey?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is required for character image generation");
  const ai = new GoogleGenAI({ apiKey: key });
  return createGeminiCharacterImageProvider({
    async create(request) {
      const response = await ai.interactions.create({
        ...request,
        input: [...request.input],
      });
      return {
        id: response.id,
        output_image: response.output_image
          ? {
              data: response.output_image.data,
              mime_type: response.output_image.mime_type,
            }
          : undefined,
      };
    },
  });
}
