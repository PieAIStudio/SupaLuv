import { Agent } from "@mastra/core/agent";
import { createOpenRouterModel } from "@pieai/swimmer-ai-kit";
import { z } from "zod";
import { buildAiBranchMessages } from "./prompts.js";
import type { AiBranchRequestBody, AiBranchResponseBody } from "./branchTypes.js";

const beatSchema = z.object({
  speaker: z.string().min(1),
  text: z.string().min(1),
  artKey: z.string().optional(),
  portraitKey: z.string().optional(),
  mood: z.string().optional(),
});

const branchSchema = z.object({
  choiceLabel: z.string().min(1).max(48),
  beats: z.array(beatSchema).min(1).max(4),
  rejoinSceneId: z.string().min(1),
});

function pickFromPool(value: string | undefined, pool: readonly string[]): string | undefined {
  if (!value) {
    return undefined;
  }
  return pool.includes(value) ? value : pool[0];
}

function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Mastra agent did not return JSON");
  }
}

/**
 * Product Mastra agent for constrained side branches.
 * Model transport stays OpenRouter via SwimmerAIKit model config.
 *
 * Note: Gemini 3.5 Flash via OpenRouter is more reliable when we request
 * JSON in the prompt and parse agent text, than Mastra's native structuredOutput
 * binding for this provider (which can return undefined object).
 */
export async function generateAiBranchWithMastra(
  body: AiBranchRequestBody,
  options: {
    apiKey: string;
    model: string;
    thinkingLevel?: string;
    appName?: string;
  },
): Promise<AiBranchResponseBody> {
  const maxAiBeats = Math.max(1, Math.min(4, body.config.maxAiBeats ?? 2));
  const artPool = body.config.artPool ?? [];
  const portraitPool = body.config.portraitPool ?? [];
  const speakerPool = body.config.speakerPool ?? ["苏明", "旁白"];
  const rejoinSceneId = body.config.rejoinSceneId;

  const model = createOpenRouterModel({
    model: options.model,
    apiKey: options.apiKey,
    appName: options.appName ?? "SupaLuv",
  });

  const messages = buildAiBranchMessages({
    storyId: body.storyId,
    sceneId: body.sceneId,
    context: body.config.context,
    authoredChoiceLabels: body.authoredChoiceLabels,
    rejoinSceneId,
    maxAiBeats,
    artPool,
    portraitPool,
    speakerPool,
    meters: body.meters,
  });

  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const user = messages.find((m) => m.role === "user")?.content ?? "";

  const agent = new Agent({
    id: "supaluv-side-branch",
    name: "SupaLuv Side Branch",
    instructions: system,
    model,
  });

  const thinking = options.thinkingLevel?.trim().toLowerCase();
  const providerOptions =
    thinking && thinking !== "none"
      ? {
          openrouter: {
            reasoning: { effort: thinking },
          },
        }
      : undefined;

  const response = await agent.generate(
    [
      {
        role: "user",
        content: `${user}\n\n只输出一个 JSON 对象，不要 markdown。`,
      },
    ],
    {
      modelSettings: {
        temperature: 0.85,
        // Reasoning effort shares this budget on OpenRouter/Gemini; 900 let
        // high-effort thinking truncate the JSON tail and fail every parse,
        // silently double-billing via the fallback path.
        maxOutputTokens: 2048,
        ...(providerOptions ? { providerOptions } : {}),
      },
      maxSteps: 1,
    },
  );

  const rawResponse = response as {
    text?: string;
    object?: unknown;
    content?: unknown;
  };
  let text = rawResponse.text?.trim() ?? "";
  if (!text && rawResponse.object) {
    text = JSON.stringify(rawResponse.object);
  }
  if (!text && typeof rawResponse.content === "string") {
    text = rawResponse.content.trim();
  }
  if (!text) {
    throw new Error("Mastra agent returned empty text");
  }

  const parsed = branchSchema.parse(parseModelJson(text));
  const beats = parsed.beats.slice(0, maxAiBeats).map((beat) => ({
    speaker: pickFromPool(beat.speaker, speakerPool) ?? speakerPool[0] ?? "旁白",
    text: beat.text.slice(0, 280),
    artKey: pickFromPool(beat.artKey, artPool),
    portraitKey: pickFromPool(beat.portraitKey, portraitPool),
    mood: beat.mood,
  }));

  if (beats.length === 0) {
    throw new Error("Mastra agent returned empty beats");
  }

  return {
    choiceLabel: parsed.choiceLabel.slice(0, 36),
    beats,
    rejoinSceneId,
    provider: `mastra+openrouter:${options.model}`,
  };
}
