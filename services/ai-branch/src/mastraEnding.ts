import { Agent } from "@mastra/core/agent";
import { createOpenRouterModel } from "@pieai/swimmer-ai-kit";
import type {
  AiEndingContract,
  AiEndingContinuity,
  AiEndingPlayerAction,
  AiEndingSegment,
} from "../../../packages/shared/src/ai-ending.js";
import { endingOutlineSchema, parseEndingSegment } from "./endingSchemas.js";
import { buildEndingMessages } from "./endingPrompts.js";

export interface EndingAgent {
  generate(
    messages: readonly { role: "system" | "user"; content: string }[],
    options: { maxOutputTokens: number },
  ): Promise<string>;
}

function json(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("ending agent did not return JSON");
  }
}

export function createEndingGenerator(agent: EndingAgent) {
  return {
    async generateOutline(contract: AiEndingContract) {
      const messages = [
        {
          role: "system" as const,
          content: `为非正史最终章规划 3–8 段。只选一个 outcomeAnchor：${contract.allowedOutcomeAnchors.join(",")}。输出 JSON: outcomeAnchor,segmentPlan,terminalImage。`,
        },
        {
          role: "user" as const,
          content: JSON.stringify({
            facts: contract.requiredFacts,
            threads: contract.unresolvedThreads,
          }),
        },
      ];
      const parsed = endingOutlineSchema.parse(
        json(await agent.generate(messages, { maxOutputTokens: 900 })),
      );
      if (!contract.allowedOutcomeAnchors.includes(parsed.outcomeAnchor))
        throw new Error("outline chose a forbidden anchor");
      return parsed;
    },
    async generateSegment(input: {
      contract: AiEndingContract;
      sequence: number;
      outline: Readonly<Record<string, unknown>>;
      continuity: AiEndingContinuity;
      playerAction: AiEndingPlayerAction;
      allowedSpeakers: readonly string[];
    }): Promise<AiEndingSegment> {
      const messages = buildEndingMessages(input);
      let last: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const suffix =
            attempt === 0
              ? messages
              : [
                  ...messages,
                  {
                    role: "user" as const,
                    content: `修复上一输出。严格满足 schema；若 sequence=${input.contract.forceTerminalAtSegment}，terminal=true、choices=[]。`,
                  },
                ];
          return parseEndingSegment(
            json(await agent.generate(suffix, { maxOutputTokens: 2_600 })),
            input.contract,
            input.sequence,
            input.allowedSpeakers,
          );
        } catch (error) {
          last = error;
        }
      }
      throw last instanceof Error ? last : new Error("ending generation failed");
    },
  };
}

export type EndingGenerator = ReturnType<typeof createEndingGenerator>;

export function createConfiguredEndingGenerator(): EndingGenerator {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for AI endings");
  const modelId = process.env.SUPALUV_ENDING_MODEL?.trim() || "google/gemini-3.5-flash";
  const model = createOpenRouterModel({ model: modelId, apiKey, appName: "SupaLuv" });
  return createEndingGenerator({
    async generate(messages, options) {
      const system = messages.find((item) => item.role === "system")?.content ?? "";
      const user = messages
        .filter((item) => item.role === "user")
        .map((item) => item.content)
        .join("\n");
      const agent = new Agent({
        id: "supaluv-ai-ending",
        name: "SupaLuv AI Ending",
        instructions: system,
        model,
      });
      const response = await agent.generate([{ role: "user", content: user }], {
        maxSteps: 1,
        modelSettings: { temperature: 0.82, maxOutputTokens: options.maxOutputTokens },
      });
      const raw = response as { text?: string; object?: unknown };
      if (raw.text?.trim()) return raw.text;
      if (raw.object) return JSON.stringify(raw.object);
      throw new Error("AI ending agent returned no content");
    },
  });
}
