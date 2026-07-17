import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import type {
  NarrativeGraphCreator,
  NarrativeGraphPlayerSkeleton,
  NarrativeSourceRange,
} from "@supaluv/shared/narrative-graph";

const CREATOR_GRAPH_PATH = "packages/content/generated/narrative-graph-creator.json";
const PLAYER_GRAPH_PATH = "packages/content/generated/narrative-graph-player.json";
const STORY_CATALOG_PATH = "packages/content/catalog/story-catalog.json";

export type CreatorStudioErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PATH"
  | "HASH_CONFLICT"
  | "GRAPH_CONFLICT"
  | "RANGE_DRIFT"
  | "INVALID_REPLACEMENT"
  | "COMPILE_FAILED"
  | "TOPOLOGY_CHANGED"
  | "VALIDATION_FAILED"
  | "SAVE_FAILED";

export class CreatorStudioError extends Error {
  readonly code: CreatorStudioErrorCode;
  readonly status: number;

  constructor(code: CreatorStudioErrorCode, message: string, status = 400) {
    super(message);
    this.name = "CreatorStudioError";
    this.code = code;
    this.status = status;
  }
}

export interface CreatorGraphEnvelope {
  readonly graph: NarrativeGraphCreator;
  readonly sources: Readonly<Record<string, { readonly hash: string }>>;
}

export interface CreatorSaveRequest {
  readonly file: string;
  readonly revision: string;
  readonly sourceHash: string;
  readonly sourceRange: Pick<NarrativeSourceRange, "startLine" | "endLine">;
  readonly originalText: string;
  readonly replacement: string;
}

export interface CreatorCandidateInput {
  readonly repoRoot: string;
  readonly file: string;
  readonly candidatePath: string;
  readonly candidateSource: string;
  readonly replacement: string;
  readonly sourceRange: Pick<NarrativeSourceRange, "startLine" | "endLine">;
  readonly currentGraph: NarrativeGraphCreator;
}

export interface CreatorCandidateArtifacts {
  readonly compiledJson: string;
  readonly creatorGraph: NarrativeGraphCreator;
  readonly playerGraph: NarrativeGraphPlayerSkeleton;
}

export type CreatorCandidateValidator = (
  input: CreatorCandidateInput,
) => CreatorCandidateArtifacts | Promise<CreatorCandidateArtifacts>;

interface CreatorStudioServiceOptions {
  readonly repoRoot: string;
  readonly validateCandidate?: CreatorCandidateValidator;
}

interface StoryCatalogFile {
  readonly productionChapters?: readonly { readonly inkFile?: string }[];
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function toRepoPath(value: string): string {
  return value.split(sep).join("/");
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function isInsideRoot(repoRoot: string, absolutePath: string): boolean {
  const rel = relative(repoRoot, absolutePath);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

async function loadAllowlistedInkFiles(repoRoot: string): Promise<readonly string[]> {
  const catalog = await readJson<StoryCatalogFile>(join(repoRoot, STORY_CATALOG_PATH));
  const files = (catalog.productionChapters ?? []).map((chapter) => chapter.inkFile);
  if (files.length === 0 || files.some((file) => !file)) {
    throw new CreatorStudioError(
      "VALIDATION_FAILED",
      "story-catalog.json 没有可用于创作地图的 production Ink 文件。",
      500,
    );
  }
  return files.map((file) => `packages/content/ink/${file}`);
}

async function loadEnvelope(repoRoot: string): Promise<CreatorGraphEnvelope> {
  const graph = await readJson<NarrativeGraphCreator>(join(repoRoot, CREATOR_GRAPH_PATH));
  const allowlist = await loadAllowlistedInkFiles(repoRoot);
  const sources: Record<string, { hash: string }> = {};
  for (const file of allowlist) {
    const bytes = await readFile(join(repoRoot, file));
    sources[file] = { hash: sha256(bytes) };
  }
  return { graph, sources };
}

function resolveAllowedPath(repoRoot: string, file: string, allowlist: readonly string[]): string {
  const normalized = toRepoPath(normalize(file));
  const absolute = resolve(repoRoot, normalized);
  if (!isInsideRoot(repoRoot, absolute) || !allowlist.includes(normalized)) {
    throw new CreatorStudioError(
      "INVALID_PATH",
      "只能修改 story catalog 白名单内的 Ink 文件。",
      403,
    );
  }
  return absolute;
}

function validateRange(range: CreatorSaveRequest["sourceRange"]): void {
  if (
    !Number.isInteger(range.startLine) ||
    !Number.isInteger(range.endLine) ||
    range.startLine < 1 ||
    range.endLine < range.startLine
  ) {
    throw new CreatorStudioError("INVALID_REQUEST", "source range 无效。", 400);
  }
}

function validateReplacement(
  originalText: string,
  replacement: string,
  range: CreatorSaveRequest["sourceRange"],
): void {
  const expectedLineCount = range.endLine - range.startLine + 1;
  const replacementLineCount = replacement.split("\n").length;
  if (!replacement.trim() || replacementLineCount !== expectedLineCount) {
    throw new CreatorStudioError(
      "INVALID_REPLACEMENT",
      "第一版只能在原 source range 内修改现有文字，不能增删行。",
      422,
    );
  }
  const structural = /^(?:===|=|->|\+|\*|~|\{|\}|#|-\s)/;
  if (replacement.split("\n").some((line) => structural.test(line.trimStart()))) {
    throw new CreatorStudioError(
      "INVALID_REPLACEMENT",
      "不能通过文本编辑器新增节点、choice、divert、tag 或 Ink 控制语句。",
      422,
    );
  }
  if (originalText.split("\n").length !== expectedLineCount) {
    throw new CreatorStudioError("RANGE_DRIFT", "原文本与 source range 已漂移。", 409);
  }
}

function replaceSourceRange(
  source: string,
  range: CreatorSaveRequest["sourceRange"],
  originalText: string,
  replacement: string,
): string {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const hasTrailingNewline = source.endsWith("\n");
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (hasTrailingNewline) {
    lines.pop();
  }
  const currentLines = lines.slice(range.startLine - 1, range.endLine);
  const current = currentLines.join("\n");
  const originalLines = originalText.split("\n");
  // The creator graph serves display text with indentation trimmed, so an
  // exact byte match fails for any line nested inside a gather/choice block.
  // Accept a per-line trimmed match and re-apply each disk line's leading
  // whitespace on write, so indentation survives the edit untouched.
  const trimmedMatch =
    currentLines.length === originalLines.length &&
    currentLines.every((line, index) => line.trim() === originalLines[index]!.trim());
  if (current !== originalText && !trimmedMatch) {
    throw new CreatorStudioError(
      "RANGE_DRIFT",
      "行号或原文本已变化。刷新创作地图后重新选择这一行。",
      409,
    );
  }
  const replacementLines = replacement.split("\n").map((line, index) => {
    if (current === originalText) {
      return line;
    }
    const indent = currentLines[index]?.match(/^[ \t]*/)?.[0] ?? "";
    return `${indent}${line.trimStart()}`;
  });
  lines.splice(range.startLine - 1, range.endLine - range.startLine + 1, ...replacementLines);
  return `${lines.join(newline)}${hasTrailingNewline ? newline : ""}`;
}

function sourceRangeIsEditable(
  graph: NarrativeGraphCreator,
  file: string,
  range: CreatorSaveRequest["sourceRange"],
  originalText: string,
): boolean {
  return graph.nodes.some((node) =>
    node.dialogueLines.some(
      (line) =>
        line.sourceRange?.file === file &&
        line.sourceRange.startLine === range.startLine &&
        line.sourceRange.endLine === range.endLine &&
        line.text === originalText,
    ),
  );
}

function topologySignature(graph: NarrativeGraphCreator): string {
  return JSON.stringify({
    nodes: graph.nodes
      .map((node) => ({ id: node.id, kind: node.kind }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: graph.edges
      .map((edge) => ({
        id: edge.id,
        kind: edge.kind,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        stableChoiceId: edge.stableChoiceId,
        endsChapter: Boolean(edge.endsChapter),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    entryNodeIds: [...graph.entryNodeIds].sort(),
    terminalNodeIds: [...graph.terminalNodeIds].sort(),
  });
}

async function replaceFilesAtomically(
  replacements: readonly { readonly path: string; readonly bytes: string }[],
): Promise<void> {
  const originals = new Map<string, Uint8Array>();
  const staged: { path: string; tempPath: string }[] = [];
  const replaced: string[] = [];
  try {
    for (const replacement of replacements) {
      originals.set(replacement.path, await readFile(replacement.path));
      const tempPath = join(
        dirname(replacement.path),
        `.${basename(replacement.path)}.${randomUUID()}.tmp`,
      );
      await writeFile(tempPath, replacement.bytes, { encoding: "utf8", flag: "wx" });
      staged.push({ path: replacement.path, tempPath });
    }
    for (const file of staged) {
      await rename(file.tempPath, file.path);
      replaced.push(file.path);
    }
  } catch (error) {
    for (const path of replaced.reverse()) {
      const original = originals.get(path);
      if (original) {
        await writeFile(path, original);
      }
    }
    throw new CreatorStudioError(
      "SAVE_FAILED",
      `原子替换失败，已回滚原文件：${error instanceof Error ? error.message : String(error)}`,
      500,
    );
  } finally {
    await Promise.all(staged.map((file) => rm(file.tempPath, { force: true })));
  }
}

async function validateRealCandidate(
  input: CreatorCandidateInput,
): Promise<CreatorCandidateArtifacts> {
  const require = createRequire(join(input.repoRoot, "apps/web/package.json"));
  const { Compiler } = require("inkjs/full") as {
    Compiler: new (source: string) => { Compile(): { ToJson(): string } };
  };

  let compiledJson: string;
  try {
    const rawJson = new Compiler(input.candidateSource).Compile().ToJson();
    compiledJson = prettyJson(JSON.parse(rawJson));
  } catch (error) {
    throw new CreatorStudioError(
      "COMPILE_FAILED",
      `Ink 编译失败，磁盘未改动：${error instanceof Error ? error.message : String(error)}`,
      422,
    );
  }

  try {
    // Node-only generator. It compiles/explores every production chapter and
    // validates both creator and player graph integrity against this override.
    const generatorUrl = pathToFileURL(
      join(input.repoRoot, "packages/content/scripts/generate-narrative-graph.mjs"),
    ).href;
    const { buildPackageGraph } = await import(generatorUrl);
    const { creator, player } = buildPackageGraph({
      sourceOverrides: new Map([[input.file, input.candidateSource]]),
    }) as {
      creator: NarrativeGraphCreator;
      player: NarrativeGraphPlayerSkeleton;
    };
    return { compiledJson, creatorGraph: creator, playerGraph: player };
  } catch (error) {
    if (error instanceof CreatorStudioError) {
      throw error;
    }
    throw new CreatorStudioError(
      "VALIDATION_FAILED",
      `NarrativeGraph 生成或完整性验证失败，磁盘未改动：${error instanceof Error ? error.message : String(error)}`,
      422,
    );
  }
}

export function createCreatorStudioService(options: CreatorStudioServiceOptions) {
  const repoRoot = resolve(options.repoRoot);
  const validateCandidate = options.validateCandidate ?? validateRealCandidate;

  return {
    async getGraph(): Promise<CreatorGraphEnvelope> {
      return loadEnvelope(repoRoot);
    },

    async save(request: CreatorSaveRequest): Promise<CreatorGraphEnvelope> {
      validateRange(request.sourceRange);
      validateReplacement(request.originalText, request.replacement, request.sourceRange);
      const allowlist = await loadAllowlistedInkFiles(repoRoot);
      const sourcePath = resolveAllowedPath(repoRoot, request.file, allowlist);
      const currentEnvelope = await loadEnvelope(repoRoot);
      if (currentEnvelope.graph.revision !== request.revision) {
        throw new CreatorStudioError(
          "GRAPH_CONFLICT",
          "剧情图 revision 已更新。刷新创作地图后重试。",
          409,
        );
      }
      const currentSourceBytes = await readFile(sourcePath);
      if (sha256(currentSourceBytes) !== request.sourceHash) {
        throw new CreatorStudioError(
          "HASH_CONFLICT",
          "Ink 文件已被其他修改覆盖。刷新后再编辑，当前磁盘内容未改动。",
          409,
        );
      }
      if (
        !sourceRangeIsEditable(
          currentEnvelope.graph,
          request.file,
          request.sourceRange,
          request.originalText,
        )
      ) {
        throw new CreatorStudioError(
          "RANGE_DRIFT",
          "该 source range 不再对应 graph 中的可编辑剧情文本。",
          409,
        );
      }

      const currentSource = currentSourceBytes.toString("utf8");
      const candidateSource = replaceSourceRange(
        currentSource,
        request.sourceRange,
        request.originalText,
        request.replacement,
      );
      const transactionDir = await mkdtemp(join(tmpdir(), "supaluv-creator-save-"));
      const candidatePath = join(transactionDir, basename(request.file));
      try {
        await writeFile(candidatePath, candidateSource, "utf8");
        const artifacts = await validateCandidate({
          repoRoot,
          file: request.file,
          candidatePath,
          candidateSource,
          replacement: request.replacement,
          sourceRange: request.sourceRange,
          currentGraph: currentEnvelope.graph,
        });
        if (
          topologySignature(artifacts.creatorGraph) !== topologySignature(currentEnvelope.graph)
        ) {
          throw new CreatorStudioError(
            "TOPOLOGY_CHANGED",
            "候选文本改变了节点、choice 或 divert 拓扑；第一版拒绝保存。",
            422,
          );
        }

        const compiledPath = join(
          repoRoot,
          "packages/content/compiled",
          basename(request.file).replace(/\.ink$/, ".json"),
        );
        await replaceFilesAtomically([
          { path: sourcePath, bytes: candidateSource },
          { path: compiledPath, bytes: artifacts.compiledJson },
          {
            path: join(repoRoot, CREATOR_GRAPH_PATH),
            bytes: prettyJson(artifacts.creatorGraph),
          },
          {
            path: join(repoRoot, PLAYER_GRAPH_PATH),
            bytes: prettyJson(artifacts.playerGraph),
          },
        ]);
      } finally {
        await rm(transactionDir, { recursive: true, force: true });
      }

      return loadEnvelope(repoRoot);
    },
  };
}

export function shouldEnableCreatorStudio(command: string, mode: string): boolean {
  return command === "serve" && mode !== "production";
}
