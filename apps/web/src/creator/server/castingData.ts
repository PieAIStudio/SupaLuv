/**
 * Casting Desk server data: registry characters + portrait files + voice casting.
 */

import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";

export interface RegistryCharacter {
  readonly id: string;
  readonly name: string;
  readonly side: string;
  readonly defaultPortrait: string;
}

export interface CastingPortrait {
  readonly stem: string;
  readonly fileName: string;
  readonly publicPath: string;
}

export interface CastingCharacter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly side: string;
  readonly defaultPortrait: string;
  readonly voiceId: string | null;
  readonly portraits: readonly CastingPortrait[];
  /** Public path to a pregenerated mp3 for preview, if any. */
  readonly previewVoicePath: string | null;
  readonly previewVoiceKey: string | null;
}

export interface CastingDeskPayload {
  readonly characters: readonly CastingCharacter[];
  readonly voiceMap: Readonly<Record<string, string>>;
  readonly castIndexSource: "memory" | "static" | "generated";
}

export interface VoiceDumpLine {
  readonly key: string;
  readonly characterId: string;
  readonly text?: string;
}

/** Parse CHARACTER_BY_NAME entries from registry.ts source text. */
export function parseCharacterRegistry(source: string): RegistryCharacter[] {
  const blockMatch = /export const CHARACTER_BY_NAME[\s\S]*?=\s*\{([\s\S]*)\n\};/.exec(source);
  const block = blockMatch?.[1] ?? source;
  const characters: RegistryCharacter[] = [];
  const entryPattern =
    /(?:^|\n)\s*(?:[A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*|"[^"]+"|'[^']+')\s*:\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(block))) {
    const body = match[1] ?? "";
    const id = readStringField(body, "id");
    const name = readStringField(body, "name");
    if (!id || !name) continue;
    characters.push({
      id,
      name,
      side: readStringField(body, "side") ?? "right",
      defaultPortrait: readStringField(body, "defaultPortrait") ?? "",
    });
  }
  // De-dupe by id (legacy aliases share ids).
  const byId = new Map<string, RegistryCharacter>();
  for (const character of characters) {
    if (!byId.has(character.id)) byId.set(character.id, character);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans"));
}

function readStringField(body: string, field: string): string | null {
  const pattern = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`);
  return pattern.exec(body)?.[1] ?? null;
}

/** Parse CHINESE_VOICE_MAP object body from ttsRoute.ts source. */
export function parseChineseVoiceMap(source: string): Record<string, string> {
  const match = /export const CHINESE_VOICE_MAP[^=]*=\s*\{([^}]+)\}/.exec(source);
  if (!match?.[1]) return {};
  const map: Record<string, string> = {};
  const pairPattern = /([A-Za-z0-9_]+)\s*:\s*["']([^"']+)["']/g;
  let pair: RegExpExecArray | null;
  while ((pair = pairPattern.exec(match[1]))) {
    map[pair[1]!] = pair[2]!;
  }
  return map;
}

/**
 * Portrait stem prefixes for a character. Longer prefixes win so
 * stafflead is not claimed by staff.
 */
export function portraitPrefixesFor(character: RegistryCharacter): string[] {
  const prefixes = new Set<string>();
  if (character.defaultPortrait) {
    const stem = character.defaultPortrait.replace(/-[^-]+$/, "");
    if (stem) prefixes.add(stem);
  }
  const flatId = character.id.replace(/_/g, "");
  if (flatId) prefixes.add(flatId);
  // Known alternate stems in public/assets/portraits.
  if (character.id === "shi_peixin") {
    prefixes.add("zhou");
    prefixes.add("shipeixin");
  }
  if (character.id === "staff_worker") prefixes.add("staff");
  if (character.id === "staff_lead") prefixes.add("stafflead");
  if (character.id === "chen_jia") prefixes.add("chenjia");
  if (character.id === "zhu_zhu") prefixes.add("zhuzhu");
  if (character.id === "huang_laotai") prefixes.add("huanglaotai");
  if (character.id === "grid_worker") prefixes.add("gridworker");
  if (character.id === "police_officer") prefixes.add("police");
  if (character.id === "test_ai" || character.id === "demo_bot") prefixes.add("demo-ui");
  return [...prefixes];
}

export function matchPortraitToCharacter(
  fileStem: string,
  characters: readonly RegistryCharacter[],
): string | null {
  // Longer prefix wins (stafflead > staff). On ties, prefer the character
  // whose flat id owns the stem (suming-* → suming) over aliases that reuse
  // the same defaultPortrait (narrator → suming-shame).
  const ranked = characters
    .flatMap((character) =>
      portraitPrefixesFor(character).map((prefix) => {
        const flatId = character.id.replace(/_/g, "");
        const ownsStem =
          fileStem === flatId ||
          fileStem.startsWith(`${flatId}-`) ||
          fileStem === prefix ||
          (character.defaultPortrait === fileStem && character.id !== "narrator");
        return {
          id: character.id,
          prefix,
          score: prefix.length,
          ownership: ownsStem ? 1 : 0,
          aliasPenalty: character.id === "narrator" || character.id === "demo_bot" ? 1 : 0,
        };
      }),
    )
    .filter(({ prefix }) => fileStem === prefix || fileStem.startsWith(`${prefix}-`))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.ownership - a.ownership ||
        a.aliasPenalty - b.aliasPenalty,
    );
  return ranked[0]?.id ?? null;
}

export function groupPortraitsByCharacter(
  fileNames: readonly string[],
  characters: readonly RegistryCharacter[],
): Map<string, CastingPortrait[]> {
  const map = new Map<string, CastingPortrait[]>();
  for (const character of characters) {
    map.set(character.id, []);
  }
  for (const fileName of fileNames) {
    if (!/\.(png|webp|jpe?g)$/i.test(fileName)) continue;
    const stem = fileName.replace(/\.[^.]+$/, "");
    const characterId = matchPortraitToCharacter(stem, characters);
    if (!characterId) continue;
    const list = map.get(characterId) ?? [];
    list.push({
      stem,
      fileName,
      publicPath: `/assets/portraits/${fileName}`,
    });
    map.set(characterId, list);
  }
  for (const [id, list] of map) {
    map.set(
      id,
      [...list].sort((a, b) => a.stem.localeCompare(b.stem)),
    );
  }
  return map;
}

/**
 * From voice-pregen --dump lines + existing mp3 keys, pick one preview key per character.
 */
export function buildCastIndex(
  dumpLines: readonly VoiceDumpLine[],
  existingKeys: ReadonlySet<string>,
): Record<string, string> {
  const index: Record<string, string> = {};
  for (const line of dumpLines) {
    if (!line.characterId || !line.key) continue;
    if (index[line.characterId]) continue;
    if (!existingKeys.has(line.key)) continue;
    index[line.characterId] = line.key;
  }
  return index;
}

export function parseVoiceDumpStdout(stdout: string): VoiceDumpLine[] {
  const lines = stdout.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === "[") {
      start = i;
      break;
    }
  }
  if (start < 0) {
    // Fallback: first JSON array bracket not part of [chapter] logs.
    const idx = stdout.search(/\n\[\n/);
    if (idx >= 0) {
      return JSON.parse(stdout.slice(idx + 1)) as VoiceDumpLine[];
    }
    throw new Error("voice-pregen --dump 未输出 JSON 数组。");
  }
  return JSON.parse(lines.slice(start).join("\n")) as VoiceDumpLine[];
}

function resolveTsxBin(repoRoot: string): string {
  const candidates = [
    join(repoRoot, "services/ai-branch/node_modules/.bin/tsx"),
    join(repoRoot, "node_modules/.bin/tsx"),
  ];
  return candidates[0]!;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runDump(repoRoot: string): Promise<string> {
  const tsxBin = resolveTsxBin(repoRoot);
  const script = join(repoRoot, "tools/voice-pregen/generate.ts");
  return new Promise((resolvePromise, reject) => {
    const child = spawn(tsxBin, [script, "--dump"], {
      cwd: repoRoot,
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`voice-pregen --dump 失败 (exit ${code}): ${stderr || stdout}`));
        return;
      }
      resolvePromise(stdout);
    });
  });
}

export interface CastingLoadOptions {
  readonly repoRoot: string;
  /** Injected cast index for tests; skips dump/static load. */
  readonly castIndexOverride?: Readonly<Record<string, string>>;
  /** Injected voice map for tests. */
  readonly voiceMapOverride?: Readonly<Record<string, string>>;
}

let cachedCastIndex: { readonly index: Record<string, string>; readonly source: "generated" } | null =
  null;

/** Reset in-memory cast-index cache (tests). */
export function resetCastIndexCache(): void {
  cachedCastIndex = null;
}

export async function loadCastingDesk(options: CastingLoadOptions): Promise<CastingDeskPayload> {
  const { repoRoot } = options;
  const registrySource = await readFile(
    join(repoRoot, "packages/content/characters/registry.ts"),
    "utf8",
  );
  const characters = parseCharacterRegistry(registrySource);

  let voiceMap: Record<string, string> = options.voiceMapOverride
    ? { ...options.voiceMapOverride }
    : {};
  if (!options.voiceMapOverride) {
    const ttsSource = await readFile(join(repoRoot, "services/ai-branch/src/tts/ttsRoute.ts"), "utf8");
    voiceMap = parseChineseVoiceMap(ttsSource);
  }

  const portraitDir = join(repoRoot, "apps/web/public/assets/portraits");
  let portraitFiles: string[] = [];
  try {
    portraitFiles = await readdir(portraitDir);
  } catch {
    portraitFiles = [];
  }
  const portraitsByCharacter = groupPortraitsByCharacter(portraitFiles, characters);

  const voiceDir = join(repoRoot, "apps/web/public/assets/voice");
  let voiceFiles: string[] = [];
  try {
    voiceFiles = await readdir(voiceDir);
  } catch {
    voiceFiles = [];
  }
  const existingKeys = new Set(
    voiceFiles.filter((name) => name.endsWith(".mp3")).map((name) => name.replace(/\.mp3$/, "")),
  );

  let castIndex: Record<string, string> = {};
  let castIndexSource: CastingDeskPayload["castIndexSource"] = "generated";

  if (options.castIndexOverride) {
    castIndex = { ...options.castIndexOverride };
    castIndexSource = "memory";
  } else {
    const staticPath = join(voiceDir, "cast-index.json");
    if (await fileExists(staticPath)) {
      try {
        const parsed = JSON.parse(await readFile(staticPath, "utf8")) as {
          readonly byCharacter?: Record<string, string>;
        };
        if (parsed.byCharacter && typeof parsed.byCharacter === "object") {
          castIndex = { ...parsed.byCharacter };
          castIndexSource = "static";
        }
      } catch {
        // fall through to generate
      }
    }
    if (castIndexSource !== "static") {
      if (cachedCastIndex) {
        castIndex = cachedCastIndex.index;
        castIndexSource = "generated";
      } else {
        try {
          const stdout = await runDump(repoRoot);
          const dumpLines = parseVoiceDumpStdout(stdout);
          castIndex = buildCastIndex(dumpLines, existingKeys);
          cachedCastIndex = { index: castIndex, source: "generated" };
          castIndexSource = "generated";
        } catch {
          // Soft-fail: characters still list without preview.
          castIndex = {};
          castIndexSource = "generated";
        }
      }
    }
  }

  const payloadCharacters: CastingCharacter[] = characters.map((character) => {
    const previewKey = castIndex[character.id] ?? null;
    const previewExists = previewKey ? existingKeys.has(previewKey) : false;
    return {
      id: character.id,
      name: character.name,
      description: `id ${character.id} · 舞台侧 ${character.side}`,
      side: character.side,
      defaultPortrait: character.defaultPortrait,
      voiceId: voiceMap[character.id] ?? null,
      portraits: portraitsByCharacter.get(character.id) ?? [],
      previewVoiceKey: previewExists ? previewKey : null,
      previewVoicePath: previewExists && previewKey ? `/assets/voice/${previewKey}.mp3` : null,
    };
  });

  return {
    characters: payloadCharacters,
    voiceMap,
    castIndexSource,
  };
}
