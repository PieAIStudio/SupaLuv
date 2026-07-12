import { describe, expect, it, vi } from "vitest";
import {
  OPENROUTER_ADULT_PRESENTATION_MODEL,
  createConfiguredOpenRouterAdultPresentationReviewer,
  createOpenRouterGeneratedAdultPresentationReviewer,
  type OpenRouterAdultReviewClient,
} from "../../services/ai-branch/src/openRouterCharacterSafety";

const image = { bytes: Buffer.from("generated-adult-character"), mimeType: "image/png" as const };

describe("OpenRouter generated-character adult reviewer", () => {
  it("uses image input and strict structured output without identifying the person", async () => {
    const client: OpenRouterAdultReviewClient = {
      review: vi.fn(async () => ({ content: JSON.stringify({ status: "adult" }) })),
    };
    const reviewer = createOpenRouterGeneratedAdultPresentationReviewer(client);

    await expect(reviewer.review(image)).resolves.toEqual({
      status: "adult",
      provider: `openrouter:${OPENROUTER_ADULT_PRESENTATION_MODEL}`,
    });

    expect(client.review).toHaveBeenCalledWith({
      model: OPENROUTER_ADULT_PRESENTATION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: expect.stringContaining("Do not identify the person") },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${image.bytes.toString("base64")}`,
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "adult_presentation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["adult", "minor", "uncertain"] },
            },
            required: ["status"],
            additionalProperties: false,
          },
        },
      },
      provider: { require_parameters: true },
    });
  });

  it("fails closed on malformed output", async () => {
    const client: OpenRouterAdultReviewClient = {
      review: vi.fn(async () => ({ content: "not-json" })),
    };

    await expect(
      createOpenRouterGeneratedAdultPresentationReviewer(client).review(image),
    ).resolves.toMatchObject({
      status: "uncertain",
      reasonCode: "semantic_review_invalid",
    });
  });

  it("posts multimodal review to OpenRouter chat completions", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ status: "adult" }) } }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );
    const reviewer = createConfiguredOpenRouterAdultPresentationReviewer(
      "private-openrouter-key",
      fetchMock,
    );

    await expect(reviewer.review(image)).resolves.toHaveProperty("status", "adult");

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer private-openrouter-key",
      "X-Title": "SupaLuv",
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: OPENROUTER_ADULT_PRESENTATION_MODEL,
      provider: { require_parameters: true },
    });
  });
});
