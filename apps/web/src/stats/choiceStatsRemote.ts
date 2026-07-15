/**
 * Optional anonymous aggregate via ai-branch service.
 *
 * This client is deliberately bounded and quiet: one request is allowed at a
 * time, every request has a hard timeout, failures open a deterministic
 * short-lived circuit, and all public methods resolve to a fallback instead of
 * rejecting. Story progression must never wait for this enhancement service.
 *
 * Provenance (`source`) is parsed as a typed field and fails closed when
 * missing, malformed, or unsupported. Callers that need Oracle/referee
 * authority must additionally check authoritative source allow-lists.
 */

import {
  isAuthoritativeChoiceStatsSource,
  isPermittedChoiceOnStory,
  isPermittedStoryId,
  parseChoiceStatsAggregateSource,
  type ChoiceStatsAggregateSource,
} from "@supaluv/shared/choice-stats-catalog";
import type { ChoiceCountMap } from "./choiceStatsTypes";

export type { ChoiceStatsAggregateSource };

export const CHOICE_STATS_REMOTE_TIMEOUT_MS = 750;
export const CHOICE_STATS_REMOTE_BASE_BACKOFF_MS = 2_000;
export const CHOICE_STATS_REMOTE_MAX_BACKOFF_MS = 30_000;
export const CHOICE_STATS_REMOTE_CACHE_MS = 1_500;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface ChoiceStatsRemoteClientOptions {
  readonly baseUrl: string;
  readonly fetchFn?: FetchLike;
  readonly now?: () => number;
  readonly timeoutMs?: number;
  readonly baseBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly cacheMs?: number;
}

/** Parsed remote snapshot with preserved provenance. */
export interface ChoiceStatsRemoteSnapshot {
  readonly storyId: string;
  readonly counts: ChoiceCountMap;
  readonly source: ChoiceStatsAggregateSource;
}

interface CachedSnapshot {
  readonly expiresAt: number;
  readonly snapshot: ChoiceStatsRemoteSnapshot;
}

function sanitizeCounts(value: unknown, storyId: string): ChoiceCountMap | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const out: Record<string, number> = {};
  for (const [key, count] of Object.entries(value)) {
    if (!isPermittedChoiceOnStory(storyId, key)) {
      return null;
    }
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
      return null;
    }
    out[key] = Math.floor(count);
  }
  return out;
}

export function parseChoiceStatsRemotePayload(
  value: unknown,
  fallbackStoryId: string,
): ChoiceStatsRemoteSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const source = parseChoiceStatsAggregateSource(record.source);
  if (!source) {
    return null;
  }
  const expectedStoryId = fallbackStoryId.trim();
  if (!isPermittedStoryId(expectedStoryId)) {
    return null;
  }
  if (typeof record.storyId !== "string" || record.storyId.trim() !== expectedStoryId) {
    return null;
  }
  const counts = sanitizeCounts(record.counts, expectedStoryId);
  if (!counts) {
    return null;
  }
  return { storyId: expectedStoryId, counts, source };
}

export class ChoiceStatsRemoteClient {
  readonly #baseUrl: string;
  readonly #fetchFn: FetchLike;
  readonly #now: () => number;
  readonly #timeoutMs: number;
  readonly #baseBackoffMs: number;
  readonly #maxBackoffMs: number;
  readonly #cacheMs: number;

  #failureCount = 0;
  #retryAt = 0;
  #probeInFlight = false;
  readonly #snapshotCache = new Map<string, CachedSnapshot>();

  constructor(options: ChoiceStatsRemoteClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetchFn =
      options.fetchFn ??
      ((input, init) => {
        return globalThis.fetch(input, init);
      });
    this.#now = options.now ?? Date.now;
    this.#timeoutMs = options.timeoutMs ?? CHOICE_STATS_REMOTE_TIMEOUT_MS;
    this.#baseBackoffMs = options.baseBackoffMs ?? CHOICE_STATS_REMOTE_BASE_BACKOFF_MS;
    this.#maxBackoffMs = options.maxBackoffMs ?? CHOICE_STATS_REMOTE_MAX_BACKOFF_MS;
    this.#cacheMs = options.cacheMs ?? CHOICE_STATS_REMOTE_CACHE_MS;
  }

  async fetchSnapshot(storyId: string): Promise<ChoiceStatsRemoteSnapshot | null> {
    const cached = this.#snapshotCache.get(storyId);
    if (cached && cached.expiresAt > this.#now()) {
      return cached.snapshot;
    }

    const snapshot = await this.#runRequest(async (signal) => {
      const response = await this.#fetchFn(
        `${this.#baseUrl}?storyId=${encodeURIComponent(storyId)}`,
        {
          method: "GET",
          headers: { accept: "application/json" },
          signal,
        },
      );
      if (!response.ok) {
        throw new Error(`choice stats GET ${response.status}`);
      }
      const json: unknown = await response.json();
      const parsed = parseChoiceStatsRemotePayload(json, storyId);
      if (!parsed) {
        throw new Error("choice stats GET invalid payload or provenance");
      }
      return parsed;
    }, null);

    if (snapshot) {
      this.#snapshotCache.set(storyId, {
        expiresAt: this.#now() + this.#cacheMs,
        snapshot,
      });
    }
    return snapshot;
  }

  async postChoice(choiceId: string, storyId: string): Promise<boolean> {
    return this.#runRequest(async (signal) => {
      const response = await this.#fetchFn(`${this.#baseUrl}/record`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storyId, choiceId }),
        signal,
      });
      if (!response.ok) {
        throw new Error(`choice stats POST ${response.status}`);
      }
      this.#snapshotCache.delete(storyId);
      return true;
    }, false);
  }

  resetForTesting(): void {
    this.#failureCount = 0;
    this.#retryAt = 0;
    this.#probeInFlight = false;
    this.#snapshotCache.clear();
  }

  async #runRequest<T>(operation: (signal: AbortSignal) => Promise<T>, fallback: T): Promise<T> {
    const now = this.#now();
    if (this.#probeInFlight || now < this.#retryAt) {
      return fallback;
    }

    this.#probeInFlight = true;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error("choice stats timeout"));
        }, this.#timeoutMs);
      });
      const result = await Promise.race([operation(controller.signal), timeout]);
      this.#failureCount = 0;
      this.#retryAt = 0;
      return result;
    } catch {
      this.#failureCount += 1;
      const multiplier = 2 ** Math.max(0, this.#failureCount - 1);
      const backoff = Math.min(this.#baseBackoffMs * multiplier, this.#maxBackoffMs);
      this.#retryAt = this.#now() + backoff;
      return fallback;
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      this.#probeInFlight = false;
    }
  }
}

function statsBaseUrl(): string {
  const override = (import.meta.env.VITE_SUPALUV_CHOICE_STATS_URL as string | undefined)?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  // Vite proxy → services/ai-branch /choice-stats
  return "/api/choice-stats";
}

const defaultClient = new ChoiceStatsRemoteClient({ baseUrl: statsBaseUrl() });

/** Display path: may return process-memory aggregate with preserved source. */
export async function fetchRemoteChoiceStats(
  storyId: string,
): Promise<ChoiceStatsRemoteSnapshot | null> {
  return defaultClient.fetchSnapshot(storyId);
}

/**
 * Authority path for Oracle / referee. Fail closed unless the response
 * source is an explicitly trusted durable aggregate (none today).
 */
export async function fetchAuthoritativeChoiceStats(
  storyId: string,
): Promise<ChoiceStatsRemoteSnapshot | null> {
  const snapshot = await fetchRemoteChoiceStats(storyId);
  if (!snapshot || !isAuthoritativeChoiceStatsSource(snapshot.source)) {
    return null;
  }
  return snapshot;
}

export async function postRemoteChoice(choiceId: string, storyId: string): Promise<boolean> {
  return defaultClient.postChoice(choiceId, storyId);
}

/** Test seam for the module singleton. */
export function resetChoiceStatsRemoteForTesting(): void {
  defaultClient.resetForTesting();
}
