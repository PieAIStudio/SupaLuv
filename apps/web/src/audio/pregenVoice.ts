/**
 * Pre-generated dialogue voice bank.
 *
 * Authored script lines are synthesized OFFLINE (tools/voice-pregen) and
 * shipped as static mp3s, so guests hear voice in production without any
 * runtime TTS spend or auth. Runtime TTS remains the fallback for cache
 * misses and is the only path for AI-generated lines.
 *
 * The lookup key must be computed identically by the offline tool and the
 * browser, so both import THIS module. Key inputs are the routed text the
 * runtime would send to TTS (segment-joined, 480-char cap), the character id
 * and the language — normalized so whitespace differences never miss.
 */

export const PREGEN_VOICE_DIR = "/assets/voice";
export const PREGEN_VOICE_CATALOG_URL = `${PREGEN_VOICE_DIR}/catalog.json`;

/** Collapse all whitespace runs; the joined/trimmed text is what we voice. */
export function normalizeVoiceText(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

/** FNV-1a 64-bit over UTF-8 code points, hex string. Deterministic, no crypto. */
export function fnv1a64Hex(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = new TextEncoder().encode(input);
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}

export function pregenVoiceKey(characterId: string, language: string, text: string): string {
  return fnv1a64Hex(`${characterId}|${language}|${normalizeVoiceText(text)}`);
}

export function pregenVoiceUrl(key: string): string {
  return `${PREGEN_VOICE_DIR}/${key}.mp3`;
}

interface PregenCatalog {
  readonly version: number;
  readonly keys: readonly string[];
}

let catalogPromise: Promise<ReadonlySet<string>> | null = null;

/**
 * Load the shipped catalog once per session. A missing or malformed catalog
 * yields an empty set: every line simply falls back to runtime TTS rules.
 */
export function loadPregenVoiceCatalog(): Promise<ReadonlySet<string>> {
  catalogPromise ??= fetch(PREGEN_VOICE_CATALOG_URL)
    .then(async (response) => {
      if (!response.ok) {
        return new Set<string>();
      }
      const body = (await response.json()) as PregenCatalog;
      if (!body || !Array.isArray(body.keys)) {
        return new Set<string>();
      }
      return new Set(body.keys.filter((key) => typeof key === "string"));
    })
    .catch(() => new Set<string>());
  return catalogPromise;
}

/** Test hygiene. */
export function resetPregenVoiceCatalogForTests(): void {
  catalogPromise = null;
}

const BASE64_CHUNK = 0x8000;

/** Fetch a static clip and hand it to the existing base64 playback path. */
export async function fetchPregenClipBase64(
  key: string,
  signal?: AbortSignal,
): Promise<{ audioBase64: string; mimeType: string }> {
  const response = await fetch(pregenVoiceUrl(key), { signal });
  if (!response.ok) {
    throw new Error(`pregen clip missing: ${key}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < buffer.length; offset += BASE64_CHUNK) {
    binary += String.fromCharCode(...buffer.subarray(offset, offset + BASE64_CHUNK));
  }
  return { audioBase64: btoa(binary), mimeType: "audio/mpeg" };
}
