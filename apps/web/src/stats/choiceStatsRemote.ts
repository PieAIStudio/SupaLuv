/**
 * Optional shared pool via ai-branch service (same host as AI edge).
 * Failure is silent — local + seed still render.
 */

import type { ChoiceCountMap } from "./choiceStatsTypes";

function statsBaseUrl(): string {
  const override = (import.meta.env.VITE_SUPALUV_CHOICE_STATS_URL as string | undefined)?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  // Vite proxy → services/ai-branch /choice-stats
  return "/api/choice-stats";
}

export async function fetchRemoteChoiceCounts(storyId: string): Promise<ChoiceCountMap | null> {
  try {
    const response = await fetch(`${statsBaseUrl()}?storyId=${encodeURIComponent(storyId)}`, {
      method: "GET",
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as { counts?: Record<string, unknown> };
    if (!json.counts || typeof json.counts !== "object") {
      return null;
    }
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(json.counts)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        out[k] = Math.floor(v);
      }
    }
    return out;
  } catch {
    return null;
  }
}

export async function postRemoteChoice(choiceId: string, storyId: string): Promise<boolean> {
  try {
    const response = await fetch(`${statsBaseUrl()}/record`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ storyId, choiceId }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
