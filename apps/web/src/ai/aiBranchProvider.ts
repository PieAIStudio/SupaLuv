import { createMockAiBranchProvider } from "./mockAiBranchProvider";
import type {
  AiBranchBeat,
  AiBranchProvider,
  AiBranchRequest,
  AiBranchResult,
} from "./aiBranchTypes";

/**
 * Prefer live edge (SwimmerAIKit + OpenRouter via services/ai-branch).
 * Live path requires SwimmerCore access token (Authorization Bearer).
 * Mock only when explicitly forced (dev) — not used as silent auth bypass.
 *
 * Dev default endpoint: `/api/ai/branch` (Vite proxy → localhost:8787)
 * Override: `VITE_SUPALUV_AI_BRANCH_URL`
 */
export function getAiBranchProvider(): AiBranchProvider {
  const endpoint =
    (import.meta.env.VITE_SUPALUV_AI_BRANCH_URL as string | undefined)?.trim() || "/api/ai/branch";

  if (import.meta.env.VITE_SUPALUV_AI_FORCE_MOCK === "1") {
    return createMockAiBranchProvider();
  }

  return createLiveProvider(endpoint);
}

function createLiveProvider(endpoint: string): AiBranchProvider {
  return {
    id: "live",
    async generate(request: AiBranchRequest): Promise<AiBranchResult> {
      if (!request.accessToken?.trim()) {
        throw new Error("AUTH_REQUIRED");
      }
      return requestRemote(endpoint, request);
    },
  };
}

async function requestRemote(endpoint: string, request: AiBranchRequest): Promise<AiBranchResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${request.accessToken}`,
    },
    body: JSON.stringify({
      storyId: request.storyId,
      sceneId: request.sceneId,
      config: request.config,
      authoredChoiceLabels: request.authoredChoiceLabels,
      meters: request.meters,
      locale: request.locale,
    }),
    signal: request.signal,
  });

  if (response.status === 401) {
    throw new Error("AUTH_REQUIRED");
  }
  if (response.status === 402) {
    throw new Error("INSUFFICIENT_BATTERIES");
  }
  if (response.status === 403) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "SAFETY_BLOCKED");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `AI branch request failed (${response.status})`);
  }

  const json = (await response.json()) as {
    choiceLabel: string;
    beats: AiBranchBeat[];
    rejoinSceneId: string;
    provider?: string;
  };

  if (!json.choiceLabel || !Array.isArray(json.beats)) {
    throw new Error("AI branch payload invalid");
  }

  return {
    choiceLabel: json.choiceLabel,
    beats: json.beats.slice(0, request.config.maxAiBeats ?? 2),
    rejoinSceneId: request.config.rejoinSceneId,
    provider: json.provider ?? "remote",
  };
}
