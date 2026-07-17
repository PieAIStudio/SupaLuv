/**
 * TTS capability probe via ai-branch `/health`.
 * Lazy one-shot fetch + module cache so dialogue voice can degrade without
 * hammering synthesize when free-form is off.
 */

export interface TtsCapability {
  /** Provider readiness flags from health (non-secret). */
  readonly providers: Readonly<Record<string, boolean>>;
  /** When false, free-form `/tts/synthesize` is disabled server-side. */
  readonly freeformEnabled: boolean;
}

const DEFAULT_CAPABILITY: TtsCapability = {
  providers: {},
  freeformEnabled: false,
};

let cached: TtsCapability | null = null;
let inflight: Promise<TtsCapability> | null = null;

export function resetTtsCapabilityCacheForTests(): void {
  cached = null;
  inflight = null;
}

export function getCachedTtsCapability(): TtsCapability | null {
  return cached;
}

/** Parse the `tts` object from a health JSON body. Fail-closed on freeform. */
export function parseTtsCapabilityFromHealth(body: unknown): TtsCapability {
  if (!body || typeof body !== "object") {
    return DEFAULT_CAPABILITY;
  }
  const tts = (body as { tts?: unknown }).tts;
  if (!tts || typeof tts !== "object") {
    return DEFAULT_CAPABILITY;
  }
  const raw = tts as {
    freeformEnabled?: unknown;
    providers?: unknown;
    elevenlabs?: unknown;
    minimax?: unknown;
  };

  const freeformEnabled = raw.freeformEnabled === true;

  const providers: Record<string, boolean> = {};
  if (raw.providers && typeof raw.providers === "object") {
    for (const [key, value] of Object.entries(raw.providers as Record<string, unknown>)) {
      if (typeof value === "boolean") {
        providers[key] = value;
      }
    }
  } else {
    // Legacy flat shape (pre freeform capability block).
    if (typeof raw.elevenlabs === "boolean") {
      providers.elevenlabs = raw.elevenlabs;
    }
    if (typeof raw.minimax === "boolean") {
      providers.minimax = raw.minimax;
    }
  }

  return { providers, freeformEnabled };
}

function healthEndpoint(): string {
  return (
    (import.meta.env.VITE_SUPALUV_AI_HEALTH_URL as string | undefined)?.trim() || "/api/ai/health"
  );
}

/**
 * Resolve TTS capability once per session (cached). Network/parse failures
 * fail closed: freeformEnabled=false so the client never 400-spams synthesize.
 */
export async function loadTtsCapability(signal?: AbortSignal): Promise<TtsCapability> {
  if (cached) {
    return cached;
  }
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      // The probe is a shared cache fill: deliberately NOT tied to the caller's
      // signal. Binding it would let one unmount (e.g. a StrictMode dev double
      // mount) abort the shared inflight promise for every awaiter, leaving the
      // cache empty and dialogue voice silently disabled for the session.
      const response = await fetch(healthEndpoint(), {
        method: "GET",
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        cached = DEFAULT_CAPABILITY;
        return cached;
      }
      const body: unknown = await response.json();
      cached = parseTtsCapabilityFromHealth(body);
      return cached;
    } catch {
      cached = DEFAULT_CAPABILITY;
      return cached;
    } finally {
      inflight = null;
    }
  })();

  const pending = inflight;
  if (signal) {
    // A caller may stop waiting, but the probe continues and fills the cache.
    return new Promise<TtsCapability>((resolve, reject) => {
      const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      pending.then((value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      }, reject);
    });
  }
  return pending;
}
