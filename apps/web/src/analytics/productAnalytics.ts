/**
 * Typed PostHog adapter (PieHQ: PostHog-only product analytics).
 * Never put story text, prompts, keys, or PII in properties.
 */

export type AnalyticsEvent =
  | { name: "app_open" }
  | { name: "title_new_game" }
  | { name: "title_continue" }
  | {
      name: "choice_made";
      storyId: string;
      sceneId: string;
      source: "authored" | "ai";
      /** Stable stats key when stats-visible; omit free AI labels. */
      choiceId?: string;
    }
  | { name: "ai_branch_requested"; storyId: string; sceneId: string }
  | { name: "ai_branch_ready"; storyId: string; sceneId: string; provider: string }
  | { name: "ai_branch_failed"; storyId: string; sceneId: string; errorCode: string }
  | { name: "ai_branch_completed"; storyId: string; rejoinSceneId: string }
  | { name: "chapter_ended"; storyId: string }
  | { name: "manual_save"; slotKind: "autosave" | "manual" }
  | {
      name: "settings_changed";
      field: "music" | "ambient" | "sfx" | "voice" | "mute" | "textSpeed" | "autoPlay";
    }
  | { name: "gallery_open" }
  | { name: "history_open" };

type AnalyticsEventName = AnalyticsEvent["name"];

const ALLOWLIST: Record<AnalyticsEventName, readonly string[]> = {
  app_open: [],
  title_new_game: [],
  title_continue: [],
  choice_made: ["storyId", "sceneId", "source", "choiceId"],
  ai_branch_requested: ["storyId", "sceneId"],
  ai_branch_ready: ["storyId", "sceneId", "provider"],
  ai_branch_failed: ["storyId", "sceneId", "errorCode"],
  ai_branch_completed: ["storyId", "rejoinSceneId"],
  chapter_ended: ["storyId"],
  manual_save: ["slotKind"],
  settings_changed: ["field"],
  gallery_open: [],
  history_open: [],
};

interface PostHogLike {
  capture: (name: string, properties?: Record<string, unknown>) => void;
}

let client: PostHogLike | null = null;
let state: "idle" | "loading" | "ready" | "disabled" = "idle";
const pending: Array<{ name: string; properties: Record<string, unknown> }> = [];
const MAX_PENDING = 24;

export function isAnalyticsEnabled(): boolean {
  return client !== null;
}

export async function initProductAnalytics(): Promise<void> {
  const key = import.meta.env.VITE_POSTHOG_KEY?.trim();
  const enabled = import.meta.env.VITE_ENABLE_POSTHOG !== "false";
  if (!key || !enabled) {
    state = "disabled";
    return;
  }

  state = "loading";
  try {
    const { default: posthog } = await import("posthog-js");
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: true,
      disable_session_recording: true,
      persistence: "localStorage",
      // Tag every event so multi-product shared keys can still be filtered.
      loaded: (ph) => {
        ph.register({ product: "supaluv", surface: "web" });
      },
    });
    client = posthog;
    state = "ready";
    while (pending.length > 0) {
      const item = pending.shift();
      if (item) {
        client.capture(item.name, item.properties);
      }
    }
  } catch {
    client = null;
    state = "disabled";
    pending.length = 0;
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  try {
    const allowed = ALLOWLIST[event.name];
    if (!allowed) {
      return;
    }
    const properties: Record<string, unknown> = {};
    const raw = event as unknown as Record<string, unknown>;
    for (const key of allowed) {
      if (raw[key] !== undefined) {
        properties[key] = raw[key];
      }
    }
    if (!client) {
      if (state === "disabled") {
        return;
      }
      if (pending.length < MAX_PENDING) {
        pending.push({ name: event.name, properties });
      }
      return;
    }
    client.capture(event.name, properties);
  } catch {
    // analytics must never break product
  }
}

/** Test seam */
export function setAnalyticsClientForTesting(next: PostHogLike | null): void {
  client = next;
  state = next ? "ready" : "idle";
  pending.length = 0;
}
