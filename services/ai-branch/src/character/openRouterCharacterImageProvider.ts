import {
  CharacterImageProviderError,
  type CharacterImageInput,
  type CharacterImageProvider,
  type GeneratedCharacterImage,
} from "./characterImageProvider.js";

export const OPENROUTER_CHARACTER_IMAGE_MODEL = "google/gemini-3.1-flash-image";

type OpenRouterReference = {
  readonly type: "image_url";
  readonly image_url: { readonly url: string };
};

export type OpenRouterImageRequest = {
  readonly model: string;
  readonly prompt: string;
  readonly input_references: readonly OpenRouterReference[];
  readonly n: 1;
  readonly resolution: "1K";
  readonly aspect_ratio: "3:4" | "16:9";
  readonly output_format: "png";
};

export type OpenRouterImageResponse = {
  readonly id?: string;
  readonly data?: readonly {
    readonly b64_json?: string;
    readonly media_type?: string;
  }[];
};

export interface OpenRouterImageClient {
  generate(request: OpenRouterImageRequest): Promise<OpenRouterImageResponse>;
}

const REQUIRED_SAFETY_PROMPT = [
  "Every depicted human must be unmistakably an adult, clearly 25 years old or older.",
  "No minors or youthful ambiguity.",
  "No nudity, exposed intimate anatomy, or explicit sexual activity.",
  "Adult black-comedy energy and mildly suggestive styling are allowed, while all clothing remains non-explicit.",
].join(" ");

function inlineReference(image: CharacterImageInput): OpenRouterReference {
  return {
    type: "image_url",
    image_url: {
      url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`,
    },
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

function statusOf(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

async function generate(
  client: OpenRouterImageClient,
  input: {
    readonly purpose: "base" | "mood" | "still";
    readonly prompt: string;
    readonly references: readonly CharacterImageInput[];
    readonly aspectRatio: "3:4" | "16:9";
  },
): Promise<GeneratedCharacterImage> {
  let response: OpenRouterImageResponse;
  try {
    response = await client.generate({
      model: OPENROUTER_CHARACTER_IMAGE_MODEL,
      prompt: `${REQUIRED_SAFETY_PROMPT}\n\nCreative direction: ${input.prompt}`,
      input_references: input.references.map(inlineReference),
      n: 1,
      resolution: "1K",
      aspect_ratio: input.aspectRatio,
      output_format: "png",
    });
  } catch (error) {
    const status = statusOf(error);
    throw new CharacterImageProviderError(
      "provider_rejected",
      "The image provider could not complete this request",
      status === undefined || status === 408 || status === 429 || status >= 500,
    );
  }

  const image = response.data?.[0];
  if (!image?.b64_json) {
    throw new CharacterImageProviderError(
      "missing_image",
      "The image provider did not return an image",
      true,
    );
  }
  const mimeType = image.media_type || "image/png";
  if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
    throw new CharacterImageProviderError(
      "invalid_image",
      "The image provider returned an unsupported image format",
      true,
    );
  }

  return {
    bytes: decodeStrictBase64(image.b64_json),
    mimeType: mimeType as GeneratedCharacterImage["mimeType"],
    providerId: "openrouter",
    modelId: OPENROUTER_CHARACTER_IMAGE_MODEL,
    providerRequestMetadata: {
      ...(response.id ? { interactionId: response.id } : {}),
      referenceCount: input.references.length,
      purpose: input.purpose,
    },
  };
}

export function createOpenRouterCharacterImageProvider(
  client: OpenRouterImageClient,
): CharacterImageProvider {
  return {
    generateBase(input) {
      assertReferenceCount(input.references.length, 0, 3);
      return generate(client, {
        purpose: "base",
        prompt: input.prompt,
        references: input.references,
        aspectRatio: "3:4",
      });
    },
    generateMood(input) {
      return generate(client, {
        purpose: "mood",
        prompt: `Preserve the accepted identity, age, wardrobe, and visual style exactly. Change only the expression and pose to mood: ${input.mood}. ${input.prompt}`,
        references: [input.base],
        aspectRatio: "3:4",
      });
    },
    generateStill(input) {
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

export function createConfiguredOpenRouterCharacterImageProvider(
  apiKey = process.env.OPENROUTER_API_KEY,
  fetchImpl: typeof fetch = fetch,
): CharacterImageProvider {
  const key = apiKey?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is required for character image generation");
  return createOpenRouterCharacterImageProvider({
    async generate(request) {
      const response = await fetchImpl("https://openrouter.ai/api/v1/images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://supaluv.pieaistudio.com",
          "X-Title": "SupaLuv",
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) {
        throw Object.assign(new Error("OpenRouter image request failed"), {
          status: response.status,
        });
      }
      return (await response.json()) as OpenRouterImageResponse;
    },
  });
}
