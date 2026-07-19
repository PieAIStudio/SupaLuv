import type { CharacterImageInput } from "./characterImageProvider.js";
import {
  GENERATED_ADULT_PRESENTATION_PROMPT,
  parseGeneratedAdultPresentationDecision,
  type GeneratedAdultPresentationReviewer,
} from "./characterSafety.js";

export const OPENROUTER_ADULT_PRESENTATION_MODEL = "google/gemini-3.1-flash-lite";

type OpenRouterAdultReviewRequest = {
  readonly model: string;
  readonly messages: readonly [
    {
      readonly role: "user";
      readonly content: readonly [
        { readonly type: "text"; readonly text: string },
        {
          readonly type: "image_url";
          readonly image_url: { readonly url: string };
        },
      ];
    },
  ];
  readonly response_format: {
    readonly type: "json_schema";
    readonly json_schema: {
      readonly name: "adult_presentation";
      readonly strict: true;
      readonly schema: {
        readonly type: "object";
        readonly properties: {
          readonly status: {
            readonly type: "string";
            readonly enum: readonly ["adult", "minor", "uncertain"];
          };
        };
        readonly required: readonly ["status"];
        readonly additionalProperties: false;
      };
    };
  };
  readonly provider: { readonly require_parameters: true };
};

export interface OpenRouterAdultReviewClient {
  review(request: OpenRouterAdultReviewRequest): Promise<{ readonly content?: string }>;
}

export function createOpenRouterGeneratedAdultPresentationReviewer(
  client: OpenRouterAdultReviewClient,
): GeneratedAdultPresentationReviewer {
  const provider = `openrouter:${OPENROUTER_ADULT_PRESENTATION_MODEL}`;
  return {
    async review(image: CharacterImageInput) {
      try {
        const result = await client.review({
          model: OPENROUTER_ADULT_PRESENTATION_MODEL,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: GENERATED_ADULT_PRESENTATION_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${image.mimeType};base64,${Buffer.from(image.bytes).toString("base64")}`,
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
        return parseGeneratedAdultPresentationDecision(result.content, provider);
      } catch {
        return parseGeneratedAdultPresentationDecision(undefined, provider);
      }
    },
  };
}

type OpenRouterChatResponse = {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
};

export function createConfiguredOpenRouterAdultPresentationReviewer(
  apiKey = process.env.OPENROUTER_API_KEY,
  fetchImpl: typeof fetch = fetch,
): GeneratedAdultPresentationReviewer {
  const key = apiKey?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is required for generated-character review");
  return createOpenRouterGeneratedAdultPresentationReviewer({
    async review(request) {
      const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://supaluv.pieaistudio.com",
          "X-Title": "SupaLuv",
        },
        body: JSON.stringify(request),
      });
      if (!response.ok) throw new Error("OpenRouter adult review request failed");
      const payload = (await response.json()) as OpenRouterChatResponse;
      return { content: payload.choices?.[0]?.message?.content };
    },
  });
}
