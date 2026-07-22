/**
 * Offline dialogue voice bank generator.
 *
 * Walks each chapter's distinct visible Ink menus (BFS over choice branches),
 * reproduces the runtime's exact text chunking (see apps/web/src/story/
 * inkStoryRunner.ts readSnapshot), and synthesizes every authored line once
 * via MiniMax using the same casting map the live TTS service uses. Clips
 * land in apps/web/public/assets/voice/<key>.mp3 plus catalog.json; the
 * browser (apps/web/src/audio/pregenVoice.ts) computes the same key and
 * plays the static clip before ever considering runtime TTS.
 *
 * Key contract language must match apps/web useDialogueVoice:
 *   zh-CN locale → "zh-CN"
 *   any other UI locale → "en"
 *
 * Run:
 *   pnpm voice:plan
 *   npx tsx tools/voice-pregen/generate.ts [--dry-run] [--dump] [--plan] [--help]
 *     [--language=zh-CN|en|all] [--chapter=draft-ch01]
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBuffer, parseFile } from "music-metadata";

import {
  hasMixedTtsRoutes,
  planBrowserTtsSegments,
} from "../../apps/web/src/audio/ttsSegmentation";
import { speakerToCharacterId } from "../../apps/web/src/audio/ttsClient";
import { normalizeVoiceText, pregenVoiceKey } from "../../apps/web/src/audio/pregenVoice";
import {
  loadStoryChapter,
  productionStoryCatalog,
  type StoryCatalogId,
} from "../../packages/content/src";
import {
  CHINESE_VOICE_MAP,
  ENGLISH_VOICE_MAP,
  type EnglishVoiceCast,
} from "../../services/ai-branch/src/tts/ttsRoute";
import { buildVoiceLedgerText, buildVoiceProvenance } from "./assetGovernance";
import { commitVoiceBankTransaction } from "./bankTransaction";
import { sha256Text, voicePlanDigest, voiceTraversalChunkKey } from "./safetyContract";
import {
  createMiniMaxSynthesisBody,
  VOICE_SYNTHESIS_SPEC,
  type VoiceCastContract,
} from "./synthesisContract";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const OUT_DIR = join(REPO_ROOT, "apps/web/public/assets/voice");
const RUNTIME_ASSET_LEDGER_PATH = join(
  REPO_ROOT,
  "packages/content/assets/RUNTIME-ASSET-LEDGER.csv",
);
const VOICE_PROVENANCE_DIR = join(REPO_ROOT, "packages/content/assets/provenance");
const LEGACY_VOICE_BASELINE_PATH = join(
  REPO_ROOT,
  "packages/content/assets/voice-legacy-baseline.json",
);
const MAX_STATES_PER_CHAPTER = 3000;
const MINIMAX_SPEECH_TURBO_USD_PER_MILLION_CHARS = 60;
const MINIMAX_PRICING_AS_OF = "2026-07-22";
const MINIMAX_PRICING_SOURCE = "https://platform.minimax.io/docs/guides/pricing-paygo";

/**
 * Must stay byte-identical to useNarrativePlayback:
 *   language: locale === "zh-CN" ? "zh-CN" : "en"
 */
export type PregenLanguage = "zh-CN" | "en";

const require = createRequire(resolve(REPO_ROOT, "apps/web/package.json"));
const { Story } = require("inkjs");

const PRODUCTION_CHAPTER_IDS = productionStoryCatalog.map((chapter) => chapter.id);

function printHelp(): void {
  console.log(`Offline dialogue voice bank generator (MiniMax t2a_v2).

Usage:
  npx tsx tools/voice-pregen/generate.ts [options]

Options:
  --language=zh-CN|en|all
                        Content language for compiled Ink + key + language_boost.
                        Read-only modes default to zh-CN; --sync is always all.
                        en walks packages/content/compiled/<chapter>.en.json
                        (falls back to <chapter>.json only if .en is missing —
                        production drafts always ship .en after P0b).
                        Key language string is "zh-CN" or "en" — must match
                        useDialogueVoice routedLanguage for that UI locale.
  --chapter=<id>        Only one production chapter. Current catalog:
                        ${PRODUCTION_CHAPTER_IDS.join(" | ")}.
                        Default: every production chapter in story-catalog.json.
  --dry-run             Collect lines, print counts + samples; no API calls.
  --dump                Print full JSON array of unique lines and exit.
  --plan                Print a machine-readable cache/casting plan and exit.
                        Implies no API calls and no file writes.
  --sync                Explicit paid/write mode over every configured language
                        and chapter; scoped --language/--chapter are rejected.
                        Synthesizes missing clips, prunes reviewed global orphans,
                        rebuilds catalog, and requires 0 missing.
  --expected-missing=N  Required with --sync; abort if the plan changed.
  --expected-plan-digest=SHA256
                        Required with --sync; exact digest from reviewed
                        pnpm voice:plan --language=all output.
  --max-cost-usd=N      Required with --sync when estimated spend is non-zero.
  --operator=ID         Required when --sync generates clips; provenance operator
                        slug (letters, numbers, dot, underscore, hyphen).
  --help                Show this help.

Outputs:
  apps/web/public/assets/voice/<fnv1a64-key>.mp3
  apps/web/public/assets/voice/catalog.json
  packages/content/assets/RUNTIME-ASSET-LEDGER.csv
  packages/content/assets/provenance/voice-<key>.md
  packages/content/assets/voice-legacy-baseline.json

Casting SSOT:
  zh-CN → CHINESE_VOICE_MAP in services/ai-branch/src/tts/ttsRoute.ts
  en    → ENGLISH_VOICE_MAP (voice_id + speed + pitch) in the same file
          (export only; not wired into runtime TTS routing — that is P2)

Env:
  Only required when --sync must synthesize missing clips:
  ~/PieAI/.secrets/supaluv/local.server.env  (MINIMAX_API_KEY, optional MINIMAX_BASE_URL)
`);
}

type PregenLanguageSelection = PregenLanguage | "all";

function parseLanguage(argv: readonly string[], sync: boolean): PregenLanguageSelection {
  const raw = argv
    .find((arg) => arg.startsWith("--language="))
    ?.split("=")[1]
    ?.trim();
  if (!raw) {
    return sync ? "all" : "zh-CN";
  }
  if (raw === "all") {
    return "all";
  }
  if (raw === "zh-CN" || raw === "zh") {
    return "zh-CN";
  }
  if (raw === "en" || raw === "en-US" || raw === "english") {
    return "en";
  }
  throw new Error(`Unsupported --language=${raw}; use zh-CN, en, or all`);
}

function choiceIdFromTags(tags: readonly string[] | null | undefined): string | null {
  const tag = tags?.find((value) => value.startsWith("choice:"));
  return tag ? tag.slice("choice:".length).trim() : null;
}

/** Compiled Ink path: en prefers `.en.json`, falls back to zh base. */
function compiledInkPath(chapterId: string, language: PregenLanguage): string {
  const base = join(REPO_ROOT, "packages/content/compiled", `${chapterId}.json`);
  if (language === "zh-CN") {
    return base;
  }
  const enPath = join(REPO_ROOT, "packages/content/compiled", `${chapterId}.en.json`);
  return existsSync(enPath) ? enPath : base;
}

function loadEnv(): Record<string, string> {
  const envPath = join(homedir(), "PieAI", ".secrets", "supaluv", "local.server.env");
  const text = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

/** Byte-for-byte replica of the runtime chunker in inkStoryRunner.readSnapshot. */
function readChunk(story: InstanceType<typeof Story>): {
  text: string;
  sceneId: string | null;
  choices: Array<{ id: string | null; text: string }>;
} {
  const textParts: string[] = [];
  let sceneId: string | null = null;
  while (story.canContinue) {
    const line = story.Continue() ?? "";
    const currentTags: string[] = story.currentTags ?? [];
    const sceneTag = currentTags.find((tag) => tag.startsWith("scene:"));
    if (sceneTag) {
      sceneId = sceneTag.slice("scene:".length).trim();
    }
    const trimmed = String(line).trim();
    if (trimmed.length > 0) {
      textParts.push(trimmed);
    }
  }
  return {
    text: textParts.join("\n\n"),
    sceneId,
    choices: story.currentChoices.map((choice: { tags?: string[]; text?: string }) => ({
      id: choiceIdFromTags(choice.tags),
      text: String(choice.text ?? "").trim(),
    })),
  };
}

interface CollectedLine {
  readonly key: string;
  readonly characterId: string;
  readonly text: string;
  readonly chapterId: string;
  readonly sceneId: string | null;
  readonly language: PregenLanguage;
}

async function collectChapterLines(
  chapterId: StoryCatalogId,
  language: PregenLanguage,
): Promise<CollectedLine[]> {
  const chapter = await loadStoryChapter(chapterId, language);
  const compiled = chapter.compiledStoryJson;
  const scenes = chapter.scenes;
  const speakerByScene = new Map(scenes.map((scene) => [scene.id, scene.speaker ?? "旁白"]));

  const lines = new Map<string, CollectedLine>();
  // Meter variables make raw ink states near-unique, so a state-keyed visited
  // set explodes breadth-first and caps out before deep scenes. Dedupe on the
  // OBSERVED chunk instead: once a (text, choices, scene) situation has been
  // expanded, later meter-variant copies of it are recorded but not re-expanded.
  const expandedChunks = new Set<string>();
  // Queue entries: saved ink state + the sceneId carried from previous chunks.
  const queue: Array<{ state: string | null; sceneId: string | null }> = [
    { state: null, sceneId: null },
  ];
  let states = 0;

  while (queue.length > 0 && states < MAX_STATES_PER_CHAPTER) {
    const entry = queue.shift()!;
    const story = new Story(compiled);
    if (entry.state) {
      story.state.LoadJson(entry.state);
    }
    const chunk = readChunk(story);
    states += 1;
    const carriedSceneId = chunk.sceneId ?? entry.sceneId;
    const chunkKey = voiceTraversalChunkKey({
      sceneId: carriedSceneId,
      text: chunk.text,
      choices: chunk.choices,
    });
    const shouldExpand = !expandedChunks.has(chunkKey);
    expandedChunks.add(chunkKey);

    if (chunk.text.length > 0) {
      const speaker = (carriedSceneId ? speakerByScene.get(carriedSceneId) : undefined) ?? "旁白";
      const characterId = speakerToCharacterId(speaker);
      const segments = planBrowserTtsSegments(chunk.text, language);
      if (segments.length > 0 && !hasMixedTtsRoutes(segments)) {
        const routedText = segments
          .map((segment) => segment.text)
          .join(" ")
          .slice(0, 480);
        // routedLanguage from segments[0] matches useDialogueVoice key path.
        const routedLanguage = (segments[0]?.language ?? language) as PregenLanguage;
        const key = pregenVoiceKey(characterId, routedLanguage, routedText);
        if (!lines.has(key)) {
          lines.set(key, {
            key,
            characterId,
            text: normalizeVoiceText(routedText),
            chapterId,
            sceneId: carriedSceneId,
            language: routedLanguage,
          });
        }
      }
    }

    if (!shouldExpand) {
      continue;
    }
    for (let index = 0; index < chunk.choices.length; index += 1) {
      const branch = new Story(compiled);
      if (entry.state) {
        branch.state.LoadJson(entry.state);
      }
      // Re-consume the chunk so the branch sits at the same choice point.
      while (branch.canContinue) {
        branch.Continue();
      }
      if (branch.currentChoices.length <= index) {
        continue;
      }
      branch.ChooseChoiceIndex(index);
      queue.push({ state: branch.state.ToJson(), sceneId: carriedSceneId });
    }
  }

  if (states >= MAX_STATES_PER_CHAPTER) {
    throw new Error(`[${chapterId}] state cap hit (${states}); voice plan is incomplete`);
  }
  return [...lines.values()];
}

function resolveChineseVoice(characterId: string): {
  voiceId: string;
  speed: number;
  pitch: number;
} {
  return {
    voiceId: CHINESE_VOICE_MAP[characterId] ?? "male-qn-qingse",
    speed: 1,
    pitch: 0,
  };
}

function resolveEnglishVoice(characterId: string): EnglishVoiceCast {
  return (
    ENGLISH_VOICE_MAP[characterId] ?? {
      voice_id: "English_Trustworthy_Man",
      speed: 1,
      pitch: 0,
    }
  );
}

function resolveVoiceCast(language: PregenLanguage, characterId: string): VoiceCastContract {
  if (language === "en") {
    const voice = resolveEnglishVoice(characterId);
    return {
      voiceId: voice.voice_id,
      speed: voice.speed,
      pitch: voice.pitch,
      languageBoost: "English",
    } as const;
  }
  return {
    ...resolveChineseVoice(characterId),
    languageBoost: "Chinese",
  } as const;
}

async function synthesize(
  env: Record<string, string>,
  language: PregenLanguage,
  characterId: string,
  text: string,
): Promise<Buffer> {
  const baseUrl = (env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com").replace(/\/$/, "");
  const cast = resolveVoiceCast(language, characterId);

  const response = await fetch(`${baseUrl}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify(createMiniMaxSynthesisBody({ text, cast })),
  });
  const body = (await response.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { audio?: string };
  };
  if (!response.ok || body?.base_resp?.status_code !== 0 || !body?.data?.audio) {
    throw new Error(
      `minimax ${response.status} code=${body?.base_resp?.status_code} ${body?.base_resp?.status_msg ?? ""}`,
    );
  }
  return Buffer.from(body.data.audio, "hex");
}

const chapterLineCache = new Map<string, Promise<CollectedLine[]>>();

function collectChapterLinesCached(
  chapterId: StoryCatalogId,
  language: PregenLanguage,
): Promise<CollectedLine[]> {
  const cacheKey = `${language}:${chapterId}`;
  const cached = chapterLineCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const pending = collectChapterLines(chapterId, language);
  chapterLineCache.set(cacheKey, pending);
  return pending;
}

async function collectConfiguredVoiceBank(): Promise<Map<string, CollectedLine>> {
  const lines: CollectedLine[] = [];
  for (const language of ["zh-CN", "en"] as const) {
    for (const chapter of productionStoryCatalog) {
      if (chapter.voiceLanguages.includes(language)) {
        lines.push(...(await collectChapterLinesCached(chapter.id, language)));
      }
    }
  }
  return new Map(lines.map((line) => [line.key, line]));
}

interface VoiceAudioMetadata {
  readonly container: string;
  readonly codec: string;
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitrate: number;
  readonly durationMs: number;
}

interface VoiceFileRecord {
  readonly key: string;
  readonly sha256: string | null;
  readonly bytes: number | null;
  readonly valid: boolean;
  readonly invalidReason: "read_error" | "metadata_parse" | "contract_mismatch" | null;
  readonly metadata: VoiceAudioMetadata | null;
}

interface VoiceLedgerRecord {
  readonly assetId: string;
  readonly key: string;
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly source: string;
  readonly releaseStatus: string;
  readonly notes: string;
}

interface LegacyVoiceBaseline {
  readonly version: 1;
  readonly created: string;
  readonly purpose: string;
  readonly unregisteredCount: number;
  readonly contentDigest: string;
}

function sha256Buffer(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeVoiceMetadata(
  metadata: Awaited<ReturnType<typeof parseBuffer>>,
): VoiceAudioMetadata {
  const format = metadata.format;
  return {
    container: format.container ?? "",
    codec: format.codec ?? "",
    sampleRate: format.sampleRate ?? 0,
    channels: format.numberOfChannels ?? 0,
    bitrate: Math.round(format.bitrate ?? 0),
    durationMs: Math.round((format.duration ?? 0) * 1000),
  };
}

function metadataMatchesSynthesisContract(metadata: VoiceAudioMetadata): boolean {
  return (
    metadata.container === "MPEG" &&
    /Layer 3/iu.test(metadata.codec) &&
    metadata.sampleRate === VOICE_SYNTHESIS_SPEC.audio.sampleRate &&
    metadata.channels === VOICE_SYNTHESIS_SPEC.audio.channels &&
    metadata.bitrate === VOICE_SYNTHESIS_SPEC.audio.bitrate &&
    metadata.durationMs > 0
  );
}

async function validateVoiceBuffer(buffer: Buffer): Promise<VoiceAudioMetadata> {
  if (buffer.length < 512) {
    throw new Error("MiniMax returned an empty or truncated MP3 payload");
  }
  let metadata: Awaited<ReturnType<typeof parseBuffer>>;
  try {
    metadata = await parseBuffer(
      buffer,
      { mimeType: "audio/mpeg", size: buffer.length },
      { duration: true, skipCovers: true },
    );
  } catch (error) {
    throw new Error(`MiniMax returned an undecodable MP3 payload: ${String(error)}`);
  }
  const normalized = normalizeVoiceMetadata(metadata);
  if (!metadataMatchesSynthesisContract(normalized)) {
    throw new Error(
      `MiniMax MP3 violates the reviewed output contract: ${JSON.stringify(normalized)}`,
    );
  }
  return normalized;
}

async function inspectVoiceFile(key: string): Promise<VoiceFileRecord> {
  const filePath = join(OUT_DIR, `${key}.mp3`);
  let buffer: Buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    return {
      key,
      sha256: null,
      bytes: null,
      valid: false,
      invalidReason: "read_error",
      metadata: null,
    };
  }
  let metadata;
  try {
    metadata = normalizeVoiceMetadata(
      await parseFile(filePath, { duration: true, skipCovers: true }),
    );
  } catch {
    return {
      key,
      sha256: sha256Buffer(buffer),
      bytes: buffer.length,
      valid: false,
      invalidReason: "metadata_parse",
      metadata: null,
    };
  }
  const valid = buffer.length >= 512 && metadataMatchesSynthesisContract(metadata);
  return {
    key,
    sha256: sha256Buffer(buffer),
    bytes: buffer.length,
    valid,
    invalidReason: valid ? null : "contract_mismatch",
    metadata,
  };
}

function listVoiceFileKeys(): string[] {
  if (!existsSync(OUT_DIR)) {
    return [];
  }
  return readdirSync(OUT_DIR)
    .filter((file) => file.endsWith(".mp3"))
    .map((file) => file.replace(/\.mp3$/u, ""))
    .sort();
}

function readCatalogKeys(): string[] {
  const catalogPath = join(OUT_DIR, "catalog.json");
  if (!existsSync(catalogPath)) {
    return [];
  }
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as { keys?: unknown };
  if (!Array.isArray(catalog.keys) || catalog.keys.some((key) => typeof key !== "string")) {
    throw new Error("voice catalog.json must contain a string keys[] array");
  }
  return [...new Set(catalog.keys as string[])].sort();
}

async function inspectStaticBank(desiredKeys: ReadonlySet<string>) {
  const fileKeys = listVoiceFileKeys();
  const catalogKeys = readCatalogKeys();
  const fileRecords = await Promise.all(fileKeys.map((key) => inspectVoiceFile(key)));
  const validFileKeys = fileRecords.filter((record) => record.valid).map((record) => record.key);
  const validFileSet = new Set(validFileKeys);
  const fileSet = new Set(fileKeys);
  const catalogSet = new Set(catalogKeys);
  return {
    desiredKeys: desiredKeys.size,
    fileKeys,
    fileRecords,
    fileContentDigest: voicePlanDigest(
      fileRecords.map((record) => ({
        key: record.key,
        sha256: record.sha256,
        bytes: record.bytes,
        valid: record.valid,
        invalidReason: record.invalidReason,
        metadata: record.metadata,
      })),
    ),
    catalogKeys,
    invalidFileKeys: fileKeys.filter((key) => !validFileSet.has(key)),
    missingDesiredKeys: [...desiredKeys].filter((key) => !validFileSet.has(key)).sort(),
    orphanKeys: fileKeys.filter((key) => !desiredKeys.has(key)),
    fileMissingCatalog: fileKeys.filter((key) => !catalogSet.has(key)),
    catalogMissingFile: catalogKeys.filter((key) => !fileSet.has(key)),
  };
}

type StaticVoiceBank = Awaited<ReturnType<typeof inspectStaticBank>>;

function parseVoiceLedger(text: string): VoiceLedgerRecord[] {
  const lines = text.split(/\r?\n/u).filter((line) => line.length > 0);
  const expectedHeader = "asset_id,path,sha256,bytes,source,release_status,notes";
  if (lines[0] !== expectedHeader) {
    throw new Error("RUNTIME-ASSET-LEDGER.csv has an unexpected header");
  }
  return lines
    .slice(1)
    .filter((line) => line.startsWith("voice-"))
    .map((line) => {
      const fields = line.split(",");
      if (fields.length !== 7) {
        throw new Error(`voice ledger row must have exactly 7 comma-free fields: ${line}`);
      }
      const [assetId, path, sha256, rawBytes, source, releaseStatus, notes] = fields;
      const normalizedSha256 = sha256 ?? "";
      const bytes = Number(rawBytes);
      if (
        !assetId ||
        !path ||
        !/^[a-f0-9]{64}$/u.test(normalizedSha256) ||
        !Number.isSafeInteger(bytes) ||
        bytes <= 0 ||
        !source ||
        !releaseStatus ||
        !notes
      ) {
        throw new Error(`invalid voice ledger row: ${line}`);
      }
      return {
        assetId,
        key: assetId.slice("voice-".length),
        path,
        sha256: normalizedSha256,
        bytes,
        source,
        releaseStatus,
        notes,
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function readLegacyVoiceBaseline(): LegacyVoiceBaseline {
  const parsed = JSON.parse(
    readFileSync(LEGACY_VOICE_BASELINE_PATH, "utf8"),
  ) as Partial<LegacyVoiceBaseline>;
  if (
    parsed.version !== 1 ||
    typeof parsed.created !== "string" ||
    typeof parsed.purpose !== "string" ||
    !Number.isSafeInteger(parsed.unregisteredCount) ||
    !/^[a-f0-9]{64}$/u.test(parsed.contentDigest ?? "")
  ) {
    throw new Error("voice-legacy-baseline.json has an invalid schema");
  }
  return parsed as LegacyVoiceBaseline;
}

function legacyVoiceDigest(records: readonly VoiceFileRecord[]): string {
  return voicePlanDigest(
    records
      .map((record) => ({ key: record.key, sha256: record.sha256, bytes: record.bytes }))
      .sort((left, right) => left.key.localeCompare(right.key)),
  );
}

function inspectVoiceGovernance(bank: StaticVoiceBank) {
  const ledgerText = readFileSync(RUNTIME_ASSET_LEDGER_PATH, "utf8");
  const ledgerRecords = parseVoiceLedger(ledgerText);
  const ledgerByKey = new Map(ledgerRecords.map((record) => [record.key, record]));
  const fileByKey = new Map(bank.fileRecords.map((record) => [record.key, record]));
  const provenanceRecords = existsSync(VOICE_PROVENANCE_DIR)
    ? readdirSync(VOICE_PROVENANCE_DIR)
        .filter((file) => /^voice-[a-f0-9]+\.md$/u.test(file))
        .map((file) => {
          const path = join(VOICE_PROVENANCE_DIR, file);
          return {
            key: file.slice("voice-".length, -".md".length),
            sha256: sha256Buffer(readFileSync(path)),
          };
        })
        .sort((left, right) => left.key.localeCompare(right.key))
    : [];
  const provenanceKeys = new Set(provenanceRecords.map((record) => record.key));
  const unregisteredRecords = bank.fileRecords.filter((record) => !ledgerByKey.has(record.key));
  const legacyBaseline = readLegacyVoiceBaseline();
  const actualLegacyDigest = legacyVoiceDigest(unregisteredRecords);
  const legacyBaselineMatches =
    legacyBaseline.unregisteredCount === unregisteredRecords.length &&
    legacyBaseline.contentDigest === actualLegacyDigest;
  const ledgerMismatchKeys = ledgerRecords
    .filter((record) => {
      const file = fileByKey.get(record.key);
      return (
        !file ||
        record.path !== `apps/web/public/assets/voice/${record.key}.mp3` ||
        record.sha256 !== file.sha256 ||
        record.bytes !== file.bytes ||
        record.source !== "ai_generated_minimax_speech02_turbo"
      );
    })
    .map((record) => record.key);
  const danglingVoiceLedgerKeys = ledgerRecords
    .filter((record) => !fileByKey.has(record.key))
    .map((record) => record.key);
  const missingProvenanceKeys = ledgerRecords
    .filter((record) => !provenanceKeys.has(record.key))
    .map((record) => record.key);
  const orphanProvenanceKeys = provenanceRecords
    .filter((record) => !ledgerByKey.has(record.key))
    .map((record) => record.key);
  return {
    ledgerText,
    ledgerSha256: sha256Text(ledgerText),
    ledgerRecords,
    provenanceRecords,
    provenanceDigest: voicePlanDigest(provenanceRecords),
    legacyBaseline,
    legacyBaselineSha256: sha256Buffer(readFileSync(LEGACY_VOICE_BASELINE_PATH)),
    actualLegacyCount: unregisteredRecords.length,
    actualLegacyDigest,
    legacyBaselineMatches,
    ledgerMismatchKeys,
    danglingVoiceLedgerKeys,
    missingProvenanceKeys,
    orphanProvenanceKeys,
  };
}

type VoiceGovernance = ReturnType<typeof inspectVoiceGovernance>;

function voiceGovernanceIsClean(governance: VoiceGovernance): boolean {
  return (
    governance.legacyBaselineMatches &&
    governance.ledgerMismatchKeys.length === 0 &&
    governance.danglingVoiceLedgerKeys.length === 0 &&
    governance.missingProvenanceKeys.length === 0 &&
    governance.orphanProvenanceKeys.length === 0
  );
}

function buildLegacyVoiceBaseline(input: {
  readonly current: LegacyVoiceBaseline;
  readonly currentBank: StaticVoiceBank;
  readonly currentGovernance: VoiceGovernance;
  readonly generatedKeys: ReadonlySet<string>;
  readonly orphanKeys: ReadonlySet<string>;
}): LegacyVoiceBaseline {
  const governedKeys = new Set(input.currentGovernance.ledgerRecords.map((record) => record.key));
  const remainingLegacy = input.currentBank.fileRecords.filter(
    (record) =>
      !governedKeys.has(record.key) &&
      !input.generatedKeys.has(record.key) &&
      !input.orphanKeys.has(record.key),
  );
  return {
    ...input.current,
    unregisteredCount: remainingLegacy.length,
    contentDigest: legacyVoiceDigest(remainingLegacy),
  };
}

function writeStagedText(stageRoot: string, name: string, text: string): string {
  const path = join(stageRoot, name);
  writeFileSync(path, text, "utf8");
  return path;
}

function parseNonNegativeNumberArg(argv: readonly string[], name: string): number | undefined {
  const raw = argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
  if (raw === undefined) {
    return undefined;
  }
  if (raw.trim() === "" || !Number.isFinite(Number(raw)) || Number(raw) < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return Number(raw);
}

function parseStringArg(argv: readonly string[], name: string): string | undefined {
  return argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
}

async function main() {
  const argv = process.argv.slice(2);
  const unknownArgs = argv.filter(
    (arg) =>
      !["--help", "-h", "--dry-run", "--dump", "--plan", "--sync"].includes(arg) &&
      !arg.startsWith("--language=") &&
      !arg.startsWith("--chapter=") &&
      !arg.startsWith("--expected-missing=") &&
      !arg.startsWith("--expected-plan-digest=") &&
      !arg.startsWith("--max-cost-usd=") &&
      !arg.startsWith("--operator="),
  );
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown option(s): ${unknownArgs.join(", ")}`);
  }
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const modes = ["--plan", "--dry-run", "--dump", "--sync"].filter((mode) => argv.includes(mode));
  if (modes.length !== 1) {
    throw new Error(
      "Choose exactly one safe mode: --plan, --dry-run, --dump, or explicit paid/write --sync",
    );
  }

  const dryRun = argv.includes("--dry-run");
  const planOnly = argv.includes("--plan");
  const dumpOnly = argv.includes("--dump");
  const sync = argv.includes("--sync");
  const languageSelection = parseLanguage(argv, sync);
  const languages: PregenLanguage[] =
    languageSelection === "all" ? ["zh-CN", "en"] : [languageSelection];
  const chapterArgument = argv.find((arg) => arg.startsWith("--chapter="));
  const onlyChapter = chapterArgument?.slice("--chapter=".length);
  if (chapterArgument && !onlyChapter) {
    throw new Error("--chapter requires a non-empty catalog id");
  }
  if (
    sync &&
    (onlyChapter ||
      (argv.some((arg) => arg.startsWith("--language=")) && languageSelection !== "all"))
  ) {
    throw new Error(
      "Scoped --sync is forbidden: paid/write mode must cover every configured language and chapter",
    );
  }
  const selections = languages.flatMap((language) =>
    productionStoryCatalog
      .filter(
        (chapter) =>
          chapter.voiceLanguages.includes(language) && (!onlyChapter || chapter.id === onlyChapter),
      )
      .map((chapter) => ({ language, chapterId: chapter.id })),
  );
  if (onlyChapter && selections.length === 0) {
    throw new Error(
      `Chapter ${onlyChapter} is not configured for ${languageSelection}; expected a production catalog id`,
    );
  }
  const chapterIds = [...new Set(selections.map((selection) => selection.chapterId))];

  if (!planOnly && !dumpOnly) {
    console.log(`languages=${languages.join(",")} chapters=${chapterIds.join(",")}`);
  }

  const configuredBank = await collectConfiguredVoiceBank();
  const desiredKeys = new Set(configuredBank.keys());
  const bank = await inspectStaticBank(desiredKeys);
  const validFileKeys = new Set(
    bank.fileRecords.filter((record) => record.valid).map((record) => record.key),
  );
  const governance = inspectVoiceGovernance(bank);

  const all: CollectedLine[] = [];
  const chapterPlans: Array<{
    language: PregenLanguage;
    chapterId: StoryCatalogId;
    uniqueChunks: number;
    characters: number;
    chars: number;
    existingClips: number;
    missingClips: number;
    missingChars: number;
    byCharacter: Record<string, number>;
  }> = [];
  for (const { language, chapterId } of selections) {
    const path = compiledInkPath(chapterId, language);
    if (!planOnly && !dumpOnly) {
      console.log(`[${chapterId}] ink=${path}`);
    }
    const lines = await collectChapterLinesCached(chapterId, language);
    if (!planOnly && !dumpOnly) {
      console.log(`[${chapterId}] unique voiced chunks: ${lines.length}`);
    }
    all.push(...lines);
    const byCharacter = Object.fromEntries(
      [...new Set(lines.map((line) => line.characterId))]
        .sort()
        .map((characterId) => [
          characterId,
          lines.filter((line) => line.characterId === characterId).length,
        ]),
    );
    const existingClips = lines.filter((line) => validFileKeys.has(line.key)).length;
    const missingChars = lines
      .filter((line) => !validFileKeys.has(line.key))
      .reduce((sum, line) => sum + line.text.length, 0);
    chapterPlans.push({
      language,
      chapterId,
      uniqueChunks: lines.length,
      characters: Object.keys(byCharacter).length,
      chars: lines.reduce((sum, line) => sum + line.text.length, 0),
      existingClips,
      missingClips: lines.length - existingClips,
      missingChars,
      byCharacter,
    });
  }
  const unique = new Map(all.map((line) => [line.key, line]));
  const totalChars = [...unique.values()].reduce((sum, line) => sum + line.text.length, 0);
  if (!planOnly && !dumpOnly) {
    console.log(`total unique lines: ${unique.size}, chars: ${totalChars}`);
  }

  const uniqueLines = [...unique.values()];
  const missingLines = uniqueLines.filter((line) => !validFileKeys.has(line.key));
  const missingChars = missingLines.reduce((sum, line) => sum + line.text.length, 0);
  const estimateUsd = (chars: number) =>
    Number(((chars / 1_000_000) * MINIMAX_SPEECH_TURBO_USD_PER_MILLION_CHARS).toFixed(6));

  const describeLine = (line: CollectedLine) => ({
    key: line.key,
    language: line.language,
    characterId: line.characterId,
    textHash: sha256Text(line.text),
    chars: line.text.length,
    cast: resolveVoiceCast(line.language, line.characterId),
  });
  const configuredLineDescriptors = [...configuredBank.values()]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(describeLine);
  const selectedMissingDescriptors = [...missingLines]
    .sort((left, right) => left.key.localeCompare(right.key))
    .map(describeLine);
  const buildPlanContract = (bankState: StaticVoiceBank, governanceState: VoiceGovernance) => ({
    contractVersion: 2,
    selection: { languages, chapterIds },
    synthesis: VOICE_SYNTHESIS_SPEC,
    configuredLines: configuredLineDescriptors,
    selectedMissingLines: selectedMissingDescriptors,
    staticBank: {
      fileRecords: bankState.fileRecords,
      fileContentDigest: bankState.fileContentDigest,
      catalogKeys: bankState.catalogKeys,
      invalidFileKeys: bankState.invalidFileKeys,
      missingDesiredKeys: bankState.missingDesiredKeys,
      orphanKeys: bankState.orphanKeys,
      fileMissingCatalog: bankState.fileMissingCatalog,
      catalogMissingFile: bankState.catalogMissingFile,
    },
    governance: {
      ledgerSha256: governanceState.ledgerSha256,
      ledgerRecords: governanceState.ledgerRecords,
      provenanceRecords: governanceState.provenanceRecords,
      provenanceDigest: governanceState.provenanceDigest,
      legacyBaseline: governanceState.legacyBaseline,
      legacyBaselineSha256: governanceState.legacyBaselineSha256,
      actualLegacyCount: governanceState.actualLegacyCount,
      actualLegacyDigest: governanceState.actualLegacyDigest,
      legacyBaselineMatches: governanceState.legacyBaselineMatches,
      ledgerMismatchKeys: governanceState.ledgerMismatchKeys,
      danglingVoiceLedgerKeys: governanceState.danglingVoiceLedgerKeys,
      missingProvenanceKeys: governanceState.missingProvenanceKeys,
      orphanProvenanceKeys: governanceState.orphanProvenanceKeys,
    },
  });
  const planContract = buildPlanContract(bank, governance);
  const currentPlanDigest = voicePlanDigest(planContract);

  if (planOnly) {
    const existingUnique = uniqueLines.filter((line) => validFileKeys.has(line.key)).length;
    console.log(
      JSON.stringify(
        {
          version: 4,
          source: "story-catalog.json",
          language: languageSelection,
          languages,
          chapterIds,
          planDigest: currentPlanDigest,
          synthesis: VOICE_SYNTHESIS_SPEC,
          pricing: {
            provider: VOICE_SYNTHESIS_SPEC.provider,
            modelFamily: VOICE_SYNTHESIS_SPEC.model,
            unit: "USD per 1,000,000 input characters",
            rate: MINIMAX_SPEECH_TURBO_USD_PER_MILLION_CHARS,
            asOf: MINIMAX_PRICING_AS_OF,
            sourceUrl: MINIMAX_PRICING_SOURCE,
            note: "Estimate only; verify the provider page before a paid regeneration.",
          },
          chapters: chapterPlans,
          casting: [
            ...new Map(
              configuredLineDescriptors.map((line) => [
                `${line.language}:${line.characterId}`,
                {
                  language: line.language,
                  characterId: line.characterId,
                  ...line.cast,
                },
              ]),
            ).values(),
          ].sort((left, right) =>
            `${left.language}:${left.characterId}`.localeCompare(
              `${right.language}:${right.characterId}`,
            ),
          ),
          totals: {
            uniqueChunks: unique.size,
            chars: totalChars,
            existingClips: existingUnique,
            missingClips: unique.size - existingUnique,
            missingChars,
            missingEstimateUsd: estimateUsd(missingChars),
            fullRegenerationEstimateUsd: estimateUsd(totalChars),
          },
          staticBank: {
            desiredKeys: bank.desiredKeys,
            files: bank.fileKeys.length,
            catalogKeys: bank.catalogKeys.length,
            fileContentDigest: bank.fileContentDigest,
            invalidFileKeys: bank.invalidFileKeys,
            missingDesiredKeys: bank.missingDesiredKeys,
            orphanKeys: bank.orphanKeys,
            fileMissingCatalog: bank.fileMissingCatalog,
            catalogMissingFile: bank.catalogMissingFile,
            governance: {
              managedAssets: governance.ledgerRecords.length,
              legacyUnregisteredAssets: governance.actualLegacyCount,
              legacyUnregisteredDigest: governance.actualLegacyDigest,
              legacyBaselineMatches: governance.legacyBaselineMatches,
              ledgerSha256: governance.ledgerSha256,
              provenanceDigest: governance.provenanceDigest,
              ledgerMismatchKeys: governance.ledgerMismatchKeys,
              danglingVoiceLedgerKeys: governance.danglingVoiceLedgerKeys,
              missingProvenanceKeys: governance.missingProvenanceKeys,
              orphanProvenanceKeys: governance.orphanProvenanceKeys,
            },
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  if (dumpOnly) {
    console.log(JSON.stringify([...unique.values()], null, 1));
    return;
  }

  if (dryRun) {
    for (const line of [...unique.values()].slice(0, 5)) {
      console.log(`  sample [${line.characterId}|${line.language}] ${line.text.slice(0, 60)}…`);
    }
    return;
  }

  if (!sync) {
    throw new Error("Internal mode error: write path requires --sync");
  }

  const expectedMissing = parseNonNegativeNumberArg(argv, "--expected-missing");
  if (expectedMissing === undefined || !Number.isInteger(expectedMissing)) {
    throw new Error(
      `--sync requires integer --expected-missing=${missingLines.length} from a reviewed pnpm voice:plan --language=all`,
    );
  }
  if (expectedMissing !== missingLines.length) {
    throw new Error(
      `Voice plan drift: expected ${expectedMissing} missing clips, found ${missingLines.length}; rerun pnpm voice:plan --language=all`,
    );
  }
  const expectedPlanDigest = parseStringArg(argv, "--expected-plan-digest");
  if (!expectedPlanDigest || !/^[a-f0-9]{64}$/u.test(expectedPlanDigest)) {
    throw new Error(
      `--sync requires --expected-plan-digest=${currentPlanDigest} from a reviewed pnpm voice:plan --language=all`,
    );
  }
  if (expectedPlanDigest !== currentPlanDigest) {
    throw new Error(
      `Voice plan drift: expected digest ${expectedPlanDigest}, found ${currentPlanDigest}; rerun pnpm voice:plan --language=all`,
    );
  }
  if (!voiceGovernanceIsClean(governance)) {
    throw new Error(
      `Voice asset governance is not clean; no API calls made: ${JSON.stringify({
        legacyBaselineMatches: governance.legacyBaselineMatches,
        ledgerMismatchKeys: governance.ledgerMismatchKeys,
        danglingVoiceLedgerKeys: governance.danglingVoiceLedgerKeys,
        missingProvenanceKeys: governance.missingProvenanceKeys,
        orphanProvenanceKeys: governance.orphanProvenanceKeys,
      })}`,
    );
  }
  const selectedMissingKeys = missingLines.map((line) => line.key).sort();
  if (JSON.stringify(selectedMissingKeys) !== JSON.stringify(bank.missingDesiredKeys)) {
    throw new Error(
      "Global voice sync selection does not cover every configured missing key; no API calls made",
    );
  }
  const estimatedSpend = estimateUsd(missingChars);
  const maxCostUsd = parseNonNegativeNumberArg(argv, "--max-cost-usd");
  if (estimatedSpend > 0 && maxCostUsd === undefined) {
    throw new Error(
      `Estimated spend is $${estimatedSpend}; --sync requires an explicit --max-cost-usd budget`,
    );
  }
  if (maxCostUsd !== undefined && estimatedSpend > maxCostUsd) {
    throw new Error(
      `Estimated spend $${estimatedSpend} exceeds --max-cost-usd=${maxCostUsd}; no API calls made`,
    );
  }
  const operator = parseStringArg(argv, "--operator");
  if (missingLines.length > 0 && (!operator || !/^[a-zA-Z0-9._-]{2,64}$/u.test(operator))) {
    throw new Error(
      "Paid voice generation requires --operator=<stable-id> for asset provenance; no API calls made",
    );
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const lockPath = join(OUT_DIR, ".voice-sync.lock");
  let lockDescriptor: number;
  try {
    lockDescriptor = openSync(lockPath, "wx");
  } catch {
    throw new Error(`Another voice sync owns ${lockPath}; no API calls made`);
  }

  try {
    const lockedBank = await inspectStaticBank(desiredKeys);
    const lockedGovernance = inspectVoiceGovernance(lockedBank);
    if (voicePlanDigest(buildPlanContract(lockedBank, lockedGovernance)) !== currentPlanDigest) {
      throw new Error("Voice bank changed while acquiring the sync lock; rerun the reviewed plan");
    }

    const needsCatalogRepair =
      lockedBank.fileMissingCatalog.length > 0 || lockedBank.catalogMissingFile.length > 0;
    if (missingLines.length === 0 && lockedBank.orphanKeys.length === 0 && !needsCatalogRepair) {
      console.log(
        `generated=0 pruned=0 prunedBytes=0 failed=0 catalog=${desiredKeys.size} missing=0 governed=${lockedGovernance.ledgerRecords.length} legacy=${lockedGovernance.actualLegacyCount}`,
      );
      return;
    }

    const stageRoot = mkdtempSync(join(OUT_DIR, ".voice-sync-stage-"));
    try {
      const env = missingLines.length > 0 ? loadEnv() : null;
      const sourceUrl = `${(env?.MINIMAX_BASE_URL ?? "https://api.minimaxi.com").replace(/\/$/, "")}/v1/t2a_v2`;
      const generatedRecords = new Map<string, VoiceFileRecord>();
      const stagedAudioPaths = new Map<string, string>();
      let generated = 0;
      let failed = 0;

      for (const line of missingLines) {
        const stagedAudioPath = join(stageRoot, `${line.key}.mp3`);
        let done = false;
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 4 && !done; attempt += 1) {
          try {
            const audio = await synthesize(env!, line.language, line.characterId, line.text);
            const metadata = await validateVoiceBuffer(audio);
            writeFileSync(stagedAudioPath, audio);
            generatedRecords.set(line.key, {
              key: line.key,
              sha256: sha256Buffer(audio),
              bytes: audio.length,
              valid: true,
              invalidReason: null,
              metadata,
            });
            stagedAudioPaths.set(line.key, stagedAudioPath);
            generated += 1;
            done = true;
            if (generated % 25 === 0) {
              console.log(`  …${generated} generated`);
            }
          } catch (error) {
            lastError = error;
            rmSync(stagedAudioPath, { force: true });
            if (String(error).includes("1002")) {
              // RPM limit: back off and retry the same line.
              await new Promise((resolveDelay) => setTimeout(resolveDelay, 15_000));
              continue;
            }
            break;
          }
        }
        if (!done) {
          failed += 1;
          console.error(
            `  FAIL [${line.characterId}] ${line.text.slice(0, 40)}: ${String(lastError)}`,
          );
        }
        // Stay under the provider RPM ceiling.
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_200));
      }

      if (failed > 0 || generatedRecords.size !== missingLines.length) {
        throw new Error(
          `voice sync stopped with ${failed} failed clip(s); public bank, ledger and provenance unchanged`,
        );
      }

      const orphanKeys = new Set(lockedBank.orphanKeys);
      const prunedBytes = lockedBank.orphanKeys.reduce(
        (sum, key) => sum + statSync(join(OUT_DIR, `${key}.mp3`)).size,
        0,
      );
      const keys = [...desiredKeys].sort();
      const generatedLines = new Map(missingLines.map((line) => [line.key, line]));
      const interimLedgerText = buildVoiceLedgerText({
        currentText: lockedGovernance.ledgerText,
        generated: generatedRecords,
        lines: generatedLines,
        orphanKeys: [],
      });
      const targetLedgerText = buildVoiceLedgerText({
        currentText: lockedGovernance.ledgerText,
        generated: generatedRecords,
        lines: generatedLines,
        orphanKeys: lockedBank.orphanKeys,
      });
      const targetLegacyBaseline = buildLegacyVoiceBaseline({
        current: lockedGovernance.legacyBaseline,
        currentBank: lockedBank,
        currentGovernance: lockedGovernance,
        generatedKeys: new Set(generatedRecords.keys()),
        orphanKeys,
      });
      const targetLegacyText = `${JSON.stringify(targetLegacyBaseline, null, 2)}\n`;
      const stagedCatalogPath = writeStagedText(
        stageRoot,
        "catalog.json",
        `${JSON.stringify({ version: 1, keys }, null, 2)}\n`,
      );
      JSON.parse(readFileSync(stagedCatalogPath, "utf8"));

      const preActivationReplacements = [...stagedAudioPaths.entries()].map(
        ([key, stagedPath]) => ({ stagedPath, targetPath: join(OUT_DIR, `${key}.mp3`) }),
      );
      const generatedAt = new Date().toISOString().slice(0, 10);
      for (const line of missingLines) {
        const stagedPath = writeStagedText(
          stageRoot,
          `voice-${line.key}.md`,
          buildVoiceProvenance({
            line,
            cast: resolveVoiceCast(line.language, line.characterId),
            operator: operator!,
            generatedAt,
            sourceUrl,
          }),
        );
        preActivationReplacements.push({
          stagedPath,
          targetPath: join(VOICE_PROVENANCE_DIR, `voice-${line.key}.md`),
        });
      }
      if (interimLedgerText !== lockedGovernance.ledgerText) {
        preActivationReplacements.push({
          stagedPath: writeStagedText(
            stageRoot,
            "RUNTIME-ASSET-LEDGER.interim.csv",
            interimLedgerText,
          ),
          targetPath: RUNTIME_ASSET_LEDGER_PATH,
        });
      }
      const postActivationReplacements = [];
      if (targetLedgerText !== interimLedgerText) {
        postActivationReplacements.push({
          stagedPath: writeStagedText(
            stageRoot,
            "RUNTIME-ASSET-LEDGER.final.csv",
            targetLedgerText,
          ),
          targetPath: RUNTIME_ASSET_LEDGER_PATH,
        });
      }
      if (targetLegacyText !== readFileSync(LEGACY_VOICE_BASELINE_PATH, "utf8")) {
        postActivationReplacements.push({
          stagedPath: writeStagedText(stageRoot, "voice-legacy-baseline.json", targetLegacyText),
          targetPath: LEGACY_VOICE_BASELINE_PATH,
        });
      }

      const postActivationDeletions = lockedBank.orphanKeys.flatMap((key) => {
        const paths = [join(OUT_DIR, `${key}.mp3`)];
        const provenancePath = join(VOICE_PROVENANCE_DIR, `voice-${key}.md`);
        if (existsSync(provenancePath)) {
          paths.push(provenancePath);
        }
        return paths;
      });

      await commitVoiceBankTransaction({
        transactionDirectory: join(stageRoot, "transaction"),
        preActivationReplacements,
        catalogReplacement: {
          stagedPath: stagedCatalogPath,
          targetPath: join(OUT_DIR, "catalog.json"),
        },
        postActivationReplacements,
        postActivationDeletions,
        validate: async () => {
          const finalBank = await inspectStaticBank(desiredKeys);
          const finalGovernance = inspectVoiceGovernance(finalBank);
          if (
            finalBank.missingDesiredKeys.length > 0 ||
            finalBank.orphanKeys.length > 0 ||
            finalBank.invalidFileKeys.length > 0 ||
            finalBank.fileMissingCatalog.length > 0 ||
            finalBank.catalogMissingFile.length > 0 ||
            !voiceGovernanceIsClean(finalGovernance)
          ) {
            throw new Error(
              `voice sync postcondition failed: ${JSON.stringify({ bank: finalBank, governance: finalGovernance })}`,
            );
          }
        },
      });

      const committedBank = await inspectStaticBank(desiredKeys);
      const committedGovernance = inspectVoiceGovernance(committedBank);
      console.log(
        `generated=${generated} pruned=${lockedBank.orphanKeys.length} prunedBytes=${prunedBytes} failed=0 catalog=${keys.length} missing=0 governed=${committedGovernance.ledgerRecords.length} legacy=${committedGovernance.actualLegacyCount}`,
      );
    } finally {
      rmSync(stageRoot, { recursive: true, force: true });
    }
  } finally {
    closeSync(lockDescriptor);
    rmSync(lockPath, { force: true });
  }
}

await main();
