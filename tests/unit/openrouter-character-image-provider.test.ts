import { describe, expect, it, vi } from "vitest";
import {
  OPENROUTER_CHARACTER_IMAGE_MODEL,
  createConfiguredOpenRouterCharacterImageProvider,
  createOpenRouterCharacterImageProvider,
  type OpenRouterImageClient,
} from "../../services/ai-branch/src/character/openRouterCharacterImageProvider";

const generated = Buffer.from("openrouter-generated-image");
const reference = {
  bytes: Buffer.from("adult-reference-image"),
  mimeType: "image/jpeg" as const,
};

describe("OpenRouter character image provider", () => {
  it("generates a 1K portrait from private inline references", async () => {
    const client: OpenRouterImageClient = {
      generate: vi.fn(async () => ({
        id: "or-image-1",
        data: [{ b64_json: generated.toString("base64"), media_type: "image/png" }],
      })),
    };
    const provider = createOpenRouterCharacterImageProvider(client);

    const result = await provider.generateBase({
      prompt: "A witty adult robotics founder.",
      references: [reference],
    });

    expect(client.generate).toHaveBeenCalledWith({
      model: OPENROUTER_CHARACTER_IMAGE_MODEL,
      prompt: expect.stringContaining("clearly 25 years old or older"),
      input_references: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${reference.bytes.toString("base64")}`,
          },
        },
      ],
      n: 1,
      resolution: "1K",
      aspect_ratio: "3:4",
      output_format: "png",
    });
    expect(result).toMatchObject({
      bytes: generated,
      mimeType: "image/png",
      modelId: OPENROUTER_CHARACTER_IMAGE_MODEL,
      providerId: "openrouter",
      providerRequestMetadata: {
        interactionId: "or-image-1",
        referenceCount: 1,
        purpose: "base",
      },
    });
  });

  it("posts to the unified Image API with server-only authentication", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ data: [{ b64_json: generated.toString("base64") }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const provider = createConfiguredOpenRouterCharacterImageProvider(
      "private-openrouter-key",
      fetchMock,
    );

    await provider.generateBase({ prompt: "adult robot designer", references: [] });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/images");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer private-openrouter-key",
      "HTTP-Referer": "https://supaluv.pieaistudio.com",
      "X-Title": "SupaLuv",
    });
    expect(String(init?.body)).not.toContain("GEMINI_API_KEY");
  });

  it("fails with typed errors for provider rejection and malformed output", async () => {
    const rejected: OpenRouterImageClient = {
      generate: vi.fn(async () => {
        throw Object.assign(new Error("provider detail"), { status: 400 });
      }),
    };
    const malformed: OpenRouterImageClient = {
      generate: vi.fn(async () => ({ data: [{ b64_json: "not-base64" }] })),
    };

    await expect(
      createOpenRouterCharacterImageProvider(rejected).generateBase({
        prompt: "portrait",
        references: [],
      }),
    ).rejects.toMatchObject({ code: "provider_rejected", retryable: false });
    await expect(
      createOpenRouterCharacterImageProvider(malformed).generateBase({
        prompt: "portrait",
        references: [],
      }),
    ).rejects.toMatchObject({ code: "invalid_image", retryable: true });
  });
});
