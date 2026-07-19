import { describe, expect, it, vi } from "vitest";
import { CharacterImageProviderError } from "../../services/ai-branch/src/character/characterImageProvider";
import {
  GEMINI_CHARACTER_IMAGE_MODEL,
  createGeminiCharacterImageProvider,
  type GeminiImageInteractionClient,
} from "../../services/ai-branch/src/character/geminiCharacterImageProvider";

const png = Buffer.from("safe-generated-image");

function clientWithImage(): GeminiImageInteractionClient & {
  create: ReturnType<typeof vi.fn>;
} {
  return {
    create: vi.fn(async () => ({
      id: "interaction-1",
      output_image: { data: png.toString("base64"), mime_type: "image/png" },
    })),
  };
}

const reference = {
  bytes: Buffer.from("reference-image"),
  mimeType: "image/jpeg" as const,
};

describe("Gemini character image provider", () => {
  it("generates a 1K portrait base from one to three inline references", async () => {
    const client = clientWithImage();
    const provider = createGeminiCharacterImageProvider(client);

    const result = await provider.generateBase({
      prompt: "A witty robotics founder in a near-future apartment.",
      references: [reference, reference, reference],
    });

    expect(client.create).toHaveBeenCalledOnce();
    const request = client.create.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      model: GEMINI_CHARACTER_IMAGE_MODEL,
      response_format: {
        type: "image",
        mime_type: "image/png",
        aspect_ratio: "3:4",
        image_size: "1K",
      },
    });
    expect(request.input).toHaveLength(4);
    expect(request.input.slice(1)).toEqual(
      Array(3).fill({
        type: "image",
        data: reference.bytes.toString("base64"),
        mime_type: "image/jpeg",
      }),
    );
    expect(request.input[0].text).toContain("clearly 25 years old or older");
    expect(request.input[0].text).toContain("No nudity");
    expect(result).toMatchObject({
      bytes: png,
      mimeType: "image/png",
      modelId: GEMINI_CHARACTER_IMAGE_MODEL,
      providerRequestMetadata: {
        interactionId: "interaction-1",
        referenceCount: 3,
        purpose: "base",
      },
    });
  });

  it("uses only the accepted base for a mood portrait and a 3:4 frame", async () => {
    const client = clientWithImage();
    const provider = createGeminiCharacterImageProvider(client);

    await provider.generateMood({
      prompt: "Keep identity and wardrobe.",
      mood: "amused",
      base: reference,
    });

    const request = client.create.mock.calls[0]?.[0];
    expect(request.input).toHaveLength(2);
    expect(request.input[0].text).toContain("amused");
    expect(request.response_format.aspect_ratio).toBe("3:4");
  });

  it("supports up to four character references in a cinematic 16:9 still", async () => {
    const client = clientWithImage();
    const provider = createGeminiCharacterImageProvider(client);

    await provider.generateStill({
      prompt: "Two adults argue beside a malfunctioning domestic robot.",
      characters: [reference, reference],
    });

    const request = client.create.mock.calls[0]?.[0];
    expect(request.input).toHaveLength(3);
    expect(request.response_format.aspect_ratio).toBe("16:9");
  });

  it("rejects invalid reference counts before calling Gemini", async () => {
    const client = clientWithImage();
    const provider = createGeminiCharacterImageProvider(client);

    await expect(
      provider.generateBase({ prompt: "text-only robot", references: [] }),
    ).resolves.toHaveProperty("modelId", GEMINI_CHARACTER_IMAGE_MODEL);
    await expect(
      provider.generateStill({ prompt: "still", characters: Array(5).fill(reference) }),
    ).rejects.toBeInstanceOf(CharacterImageProviderError);
    expect(client.create).toHaveBeenCalledOnce();
  });

  it("turns missing and malformed image outputs into typed failures", async () => {
    const missing: GeminiImageInteractionClient = {
      create: vi.fn(async () => ({ id: "no-image" })),
    };
    const malformed: GeminiImageInteractionClient = {
      create: vi.fn(async () => ({
        id: "bad-image",
        output_image: { data: "%%%not-base64%%%", mime_type: "image/png" },
      })),
    };

    await expect(
      createGeminiCharacterImageProvider(missing).generateBase({
        prompt: "portrait",
        references: [reference],
      }),
    ).rejects.toMatchObject({ code: "missing_image" });
    await expect(
      createGeminiCharacterImageProvider(malformed).generateBase({
        prompt: "portrait",
        references: [reference],
      }),
    ).rejects.toMatchObject({ code: "invalid_image" });
  });

  it("maps provider safety rejection without leaking provider details", async () => {
    const client: GeminiImageInteractionClient = {
      create: vi.fn(async () => {
        throw Object.assign(new Error("raw provider policy text"), { status: 400 });
      }),
    };

    await expect(
      createGeminiCharacterImageProvider(client).generateBase({
        prompt: "portrait",
        references: [reference],
      }),
    ).rejects.toMatchObject({ code: "provider_rejected", retryable: false });
  });
});
