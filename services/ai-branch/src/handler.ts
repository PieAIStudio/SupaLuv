import { requestOpenRouterChatCompletion } from "@pieai/swimmer-ai-kit";
import { generateAiBranchWithMastra } from "./mastraBranch.js";
import { buildAiBranchMessages } from "./prompts.js";

export interface AiBranchRequestBody {
  readonly storyId: string;
  readonly sceneId: string;
  readonly config: {
    readonly enabled: true;
    readonly rejoinSceneId: string;
    readonly maxAiBeats?: number;
    readonly context: string;
    readonly artPool?: readonly string[];
    readonly portraitPool?: readonly string[];
    readonly speakerPool?: readonly string[];
  };
  readonly authoredChoiceLabels: readonly string[];
  readonly meters?: { dignity: number; impulse: number };
}

export interface AiBranchBeat {
  readonly speaker: string;
  readonly text: string;
  readonly artKey?: string;
  readonly portraitKey?: string;
  readonly mood?: string;
}

export interface AiBranchResponseBody {
  readonly choiceLabel: string;
  readonly beats: readonly AiBranchBeat[];
  readonly rejoinSceneId: string;
  readonly provider: string;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function pickFromPool(value: unknown, pool: readonly string[]): string | undefined {
  const s = asString(value);
  if (!s) {
    return undefined;
  }
  return pool.includes(s) ? s : pool[0];
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
    throw new Error("Model did not return JSON");
  }
}

/** Direct SwimmerAIKit OpenRouter transport (fallback if Mastra path fails). */
async function generateAiBranchViaOpenRouter(
  body: AiBranchRequestBody,
  options: { apiKey: string; model: string; appName?: string },
): Promise<AiBranchResponseBody> {
  const maxAiBeats = Math.max(1, Math.min(4, body.config.maxAiBeats ?? 2));
  const artPool = body.config.artPool ?? [];
  const portraitPool = body.config.portraitPool ?? [];
  const speakerPool = body.config.speakerPool ?? ["苏明", "旁白"];
  const rejoinSceneId = body.config.rejoinSceneId;

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

  const result = await requestOpenRouterChatCompletion({
    apiKey: options.apiKey,
    model: options.model,
    appName: options.appName ?? "SupaLuv",
    temperature: 0.85,
    responseFormat: { type: "json_object" },
    messages,
  });

  const raw = parseModelJson(result.content) as {
    choiceLabel?: unknown;
    beats?: unknown;
    rejoinSceneId?: unknown;
  };

  const choiceLabel = asString(raw.choiceLabel).slice(0, 36);
  if (!choiceLabel) {
    throw new Error("Missing choiceLabel");
  }

  const beatsIn = Array.isArray(raw.beats) ? raw.beats : [];
  const beats: AiBranchBeat[] = beatsIn.slice(0, maxAiBeats).map((beat) => {
    const row = (beat ?? {}) as Record<string, unknown>;
    const speaker = pickFromPool(row.speaker, speakerPool) ?? speakerPool[0] ?? "旁白";
    const text = asString(row.text).slice(0, 280);
    if (!text) {
      throw new Error("Empty beat text");
    }
    return {
      speaker,
      text,
      artKey: pickFromPool(row.artKey, artPool),
      portraitKey: pickFromPool(row.portraitKey, portraitPool),
      mood: asString(row.mood) || undefined,
    };
  });

  if (beats.length === 0) {
    throw new Error("No beats returned");
  }

  return {
    choiceLabel,
    beats,
    rejoinSceneId,
    provider: `openrouter-fallback:${options.model}`,
  };
}

export async function generateAiBranch(
  body: AiBranchRequestBody,
  options: {
    apiKey: string;
    model: string;
    thinkingLevel?: string;
    appName?: string;
  },
): Promise<AiBranchResponseBody> {
  try {
    return await generateAiBranchWithMastra(body, options);
  } catch (error) {
    // Prefer Mastra; keep SwimmerAIKit direct path as resilience.
    // eslint-disable-next-line no-console
    console.warn(
      "[ai-branch] Mastra path failed, falling back to SwimmerAIKit OpenRouter:",
      error instanceof Error ? error.message : error,
    );
    return generateAiBranchViaOpenRouter(body, options);
  }
}
