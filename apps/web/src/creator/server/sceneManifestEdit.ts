/**
 * Minimal-diff scene manifest field rewriting for Creator Studio.
 * Operates on production scene manifest TypeScript sources under packages/content/manifests/.
 */

export interface SceneAiBranchFields {
  readonly enabled: true;
  readonly waitLabel?: string;
  readonly rejoinSceneId: string;
  readonly maxAiBeats?: number;
  readonly context: string;
  readonly artPool?: readonly string[];
  readonly portraitPool?: readonly string[];
  readonly speakerPool?: readonly string[];
}

export interface SceneEditableFields {
  readonly speaker?: string;
  readonly artKey?: string;
  readonly videoKey?: string;
  readonly aiBranch?: SceneAiBranchFields | null;
}

export interface ParsedSceneCard {
  readonly id: string;
  readonly speaker?: string;
  readonly artKey?: string;
  readonly videoKey?: string;
  readonly aiBranch: SceneAiBranchFields | null;
}

export class SceneManifestEditError extends Error {
  readonly code: "SCENE_NOT_FOUND" | "PARSE_FAILED" | "INVALID_FIELD";

  constructor(code: SceneManifestEditError["code"], message: string) {
    super(message);
    this.name = "SceneManifestEditError";
    this.code = code;
  }
}

function findMatchingBrace(source: string, openIndex: number): number {
  if (source[openIndex] !== "{") {
    return -1;
  }
  let depth = 0;
  let inString: '"' | "'" | "`" | null = null;
  let escaped = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i]!;
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** Locate the object literal that owns `id: "<sceneId>"`. */
export function findSceneObjectRange(
  source: string,
  sceneId: string,
): { readonly start: number; readonly end: number } {
  const idPattern = new RegExp(
    `\\bid\\s*:\\s*(["'])${escapeRegExp(sceneId)}\\1`,
    "m",
  );
  const idMatch = idPattern.exec(source);
  if (!idMatch || idMatch.index === undefined) {
    throw new SceneManifestEditError("SCENE_NOT_FOUND", `场景 ${sceneId} 不在该 manifest 中。`);
  }
  let open = idMatch.index;
  while (open > 0 && source[open] !== "{") {
    open -= 1;
  }
  if (source[open] !== "{") {
    throw new SceneManifestEditError("PARSE_FAILED", `无法定位场景 ${sceneId} 的对象起点。`);
  }
  const close = findMatchingBrace(source, open);
  if (close < 0) {
    throw new SceneManifestEditError("PARSE_FAILED", `无法定位场景 ${sceneId} 的对象终点。`);
  }
  return { start: open, end: close };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeJsString(raw: string): string {
  try {
    // JSON-compatible decode for double-quoted strings; single-quoted fallback.
    if (raw.startsWith('"')) {
      return JSON.parse(raw) as string;
    }
    if (raw.startsWith("'")) {
      return JSON.parse(`"${raw.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`) as string;
    }
  } catch {
    // fall through
  }
  return raw.slice(1, -1);
}

function encodeJsString(value: string): string {
  return JSON.stringify(value);
}

function readStringFieldSimple(objectSource: string, field: string): string | undefined {
  const pattern = new RegExp(`\\b${escapeRegExp(field)}\\s*:\\s*(["'])((?:\\\\.|(?!\\1).)*)\\1`);
  const match = pattern.exec(objectSource);
  if (!match) return undefined;
  return decodeJsString(`${match[1]}${match[2]}${match[1]}`);
}

function readNumberField(objectSource: string, field: string): number | undefined {
  const pattern = new RegExp(`\\b${escapeRegExp(field)}\\s*:\\s*(\\d+)`);
  const match = pattern.exec(objectSource);
  if (!match) return undefined;
  return Number(match[1]);
}

function readStringArrayField(objectSource: string, field: string): string[] | undefined {
  const pattern = new RegExp(`\\b${escapeRegExp(field)}\\s*:\\s*\\[([\\s\\S]*?)\\]`);
  const match = pattern.exec(objectSource);
  if (!match) return undefined;
  const body = match[1] ?? "";
  const values: string[] = [];
  const itemPattern = /(["'])((?:\\.|(?!\1).)*)\1/g;
  let item: RegExpExecArray | null;
  while ((item = itemPattern.exec(body))) {
    values.push(decodeJsString(`${item[1]}${item[2]}${item[1]}`));
  }
  return values;
}

function findPropertyRange(
  objectSource: string,
  field: string,
): { readonly start: number; readonly end: number } | null {
  const keyPattern = new RegExp(`\\b${escapeRegExp(field)}\\s*:`);
  const keyMatch = keyPattern.exec(objectSource);
  if (!keyMatch || keyMatch.index === undefined) {
    return null;
  }
  let i = keyMatch.index + keyMatch[0].length;
  while (i < objectSource.length && /\s/.test(objectSource[i]!)) {
    i += 1;
  }
  // Expand start leftward to include the line's leading indent so rewrites
  // do not double-indent (keyMatch starts at the property name).
  let start = keyMatch.index;
  while (start > 0 && (objectSource[start - 1] === " " || objectSource[start - 1] === "\t")) {
    start -= 1;
  }
  const ch = objectSource[i];
  if (ch === '"' || ch === "'" || ch === "`") {
    const quote = ch;
    i += 1;
    let escaped = false;
    for (; i < objectSource.length; i += 1) {
      const c = objectSource[i]!;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (c === "\\") {
        escaped = true;
        continue;
      }
      if (c === quote) {
        i += 1;
        break;
      }
    }
  } else if (ch === "{") {
    const close = findMatchingBrace(objectSource, i);
    if (close < 0) {
      throw new SceneManifestEditError("PARSE_FAILED", `字段 ${field} 对象括号不匹配。`);
    }
    i = close + 1;
  } else if (ch === "[") {
    let depth = 0;
    let inString: '"' | "'" | "`" | null = null;
    let escaped = false;
    for (; i < objectSource.length; i += 1) {
      const c = objectSource[i]!;
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (c === "\\") {
          escaped = true;
          continue;
        }
        if (c === inString) inString = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        inString = c;
        continue;
      }
      if (c === "[") depth += 1;
      if (c === "]") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
    }
  } else {
    while (i < objectSource.length && /[^\n,]/.test(objectSource[i]!)) {
      i += 1;
    }
  }
  // Include trailing comma + following whitespace/newline for clean removal.
  let end = i;
  if (objectSource[end] === ",") {
    end += 1;
  }
  while (end < objectSource.length && (objectSource[end] === " " || objectSource[end] === "\t")) {
    end += 1;
  }
  if (objectSource[end] === "\r") end += 1;
  if (objectSource[end] === "\n") end += 1;
  return { start, end };
}

function detectIndent(objectSource: string): string {
  const match = /\n([ \t]+)\w/.exec(objectSource);
  return match?.[1] ?? "    ";
}

function formatAiBranch(aiBranch: SceneAiBranchFields, indent: string): string {
  const inner = `${indent}  `;
  const lines: string[] = [`${indent}aiBranch: {`, `${inner}enabled: true,`];
  if (aiBranch.waitLabel !== undefined) {
    lines.push(`${inner}waitLabel: ${encodeJsString(aiBranch.waitLabel)},`);
  }
  lines.push(`${inner}rejoinSceneId: ${encodeJsString(aiBranch.rejoinSceneId)},`);
  if (aiBranch.maxAiBeats !== undefined) {
    lines.push(`${inner}maxAiBeats: ${aiBranch.maxAiBeats},`);
  }
  // Keep context as a single JSON string line for stable diffs.
  lines.push(`${inner}context: ${encodeJsString(aiBranch.context)},`);
  if (aiBranch.artPool && aiBranch.artPool.length > 0) {
    lines.push(`${inner}artPool: [${aiBranch.artPool.map((v) => encodeJsString(v)).join(", ")}],`);
  }
  if (aiBranch.portraitPool && aiBranch.portraitPool.length > 0) {
    const items = aiBranch.portraitPool.map((v) => encodeJsString(v)).join(",\n" + inner + "  ");
    if (aiBranch.portraitPool.length <= 3) {
      lines.push(`${inner}portraitPool: [${aiBranch.portraitPool.map((v) => encodeJsString(v)).join(", ")}],`);
    } else {
      lines.push(`${inner}portraitPool: [`);
      lines.push(`${inner}  ${items},`);
      lines.push(`${inner}],`);
    }
  }
  if (aiBranch.speakerPool && aiBranch.speakerPool.length > 0) {
    lines.push(
      `${inner}speakerPool: [${aiBranch.speakerPool.map((v) => encodeJsString(v)).join(", ")}],`,
    );
  }
  lines.push(`${indent}},`);
  return `${lines.join("\n")}\n`;
}

function setStringField(objectSource: string, field: string, value: string | undefined): string {
  const range = findPropertyRange(objectSource, field);
  if (value === undefined || value === "") {
    if (!range) return objectSource;
    return `${objectSource.slice(0, range.start)}${objectSource.slice(range.end)}`;
  }
  if (range) {
    // range includes the original line indent; reuse it for a one-line rewrite.
    const prior = objectSource.slice(range.start, range.end);
    const indent = prior.match(/^[ \t]*/)?.[0] ?? detectIndent(objectSource);
    const line = `${indent}${field}: ${encodeJsString(value)},\n`;
    return `${objectSource.slice(0, range.start)}${line}${objectSource.slice(range.end)}`;
  }
  const indent = detectIndent(objectSource);
  const line = `${indent}${field}: ${encodeJsString(value)},\n`;
  // Insert after the id field when possible.
  const idRange = findPropertyRange(objectSource, "id");
  if (idRange) {
    return `${objectSource.slice(0, idRange.end)}${line}${objectSource.slice(idRange.end)}`;
  }
  // Fallback: insert after opening brace.
  const open = objectSource.indexOf("{");
  return `${objectSource.slice(0, open + 1)}\n${line}${objectSource.slice(open + 1)}`;
}

function setAiBranchField(
  objectSource: string,
  aiBranch: SceneAiBranchFields | null | undefined,
): string {
  if (aiBranch === undefined) {
    return objectSource;
  }
  const range = findPropertyRange(objectSource, "aiBranch");
  if (aiBranch === null) {
    if (!range) return objectSource;
    return `${objectSource.slice(0, range.start)}${objectSource.slice(range.end)}`;
  }
  const indent = detectIndent(objectSource);
  const block = formatAiBranch(aiBranch, indent);
  if (range) {
    return `${objectSource.slice(0, range.start)}${block}${objectSource.slice(range.end)}`;
  }
  // Insert before noncanonical/source if present, else before closing brace.
  const noncanonical = findPropertyRange(objectSource, "noncanonical");
  if (noncanonical) {
    return `${objectSource.slice(0, noncanonical.start)}${block}${objectSource.slice(noncanonical.start)}`;
  }
  const close = objectSource.lastIndexOf("}");
  return `${objectSource.slice(0, close)}${block}${objectSource.slice(close)}`;
}

export function parseSceneCard(source: string, sceneId: string): ParsedSceneCard {
  const range = findSceneObjectRange(source, sceneId);
  const objectSource = source.slice(range.start, range.end + 1);
  const speaker = readStringFieldSimple(objectSource, "speaker");
  const artKey = readStringFieldSimple(objectSource, "artKey");
  const videoKey = readStringFieldSimple(objectSource, "videoKey");

  const aiRange = findPropertyRange(objectSource, "aiBranch");
  let aiBranch: SceneAiBranchFields | null = null;
  if (aiRange) {
    const aiSource = objectSource.slice(aiRange.start, aiRange.end);
    const rejoinSceneId = readStringFieldSimple(aiSource, "rejoinSceneId");
    const context = readStringFieldSimple(aiSource, "context");
    if (rejoinSceneId && context !== undefined) {
      aiBranch = {
        enabled: true,
        waitLabel: readStringFieldSimple(aiSource, "waitLabel"),
        rejoinSceneId,
        maxAiBeats: readNumberField(aiSource, "maxAiBeats"),
        context,
        artPool: readStringArrayField(aiSource, "artPool"),
        portraitPool: readStringArrayField(aiSource, "portraitPool"),
        speakerPool: readStringArrayField(aiSource, "speakerPool"),
      };
    }
  }

  return {
    id: sceneId,
    speaker,
    artKey,
    videoKey,
    aiBranch,
  };
}

export function listSceneIds(source: string): string[] {
  const ids: string[] = [];
  const pattern = /\bid\s*:\s*(["'])([^"'\\]+)\1/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    ids.push(match[2]!);
  }
  return ids;
}

export function applySceneFieldUpdates(
  source: string,
  sceneId: string,
  fields: SceneEditableFields,
): string {
  const range = findSceneObjectRange(source, sceneId);
  let objectSource = source.slice(range.start, range.end + 1);

  if ("speaker" in fields) {
    if (!fields.speaker) {
      throw new SceneManifestEditError("INVALID_FIELD", "speaker 不能为空。");
    }
    objectSource = setStringField(objectSource, "speaker", fields.speaker);
  }
  if ("artKey" in fields) {
    objectSource = setStringField(objectSource, "artKey", fields.artKey);
  }
  if ("videoKey" in fields) {
    objectSource = setStringField(objectSource, "videoKey", fields.videoKey);
  }
  if ("aiBranch" in fields) {
    if (fields.aiBranch) {
      if (!fields.aiBranch.rejoinSceneId?.trim()) {
        throw new SceneManifestEditError("INVALID_FIELD", "aiBranch.rejoinSceneId 不能为空。");
      }
      if (!fields.aiBranch.context?.trim()) {
        throw new SceneManifestEditError("INVALID_FIELD", "aiBranch.context 不能为空。");
      }
    }
    objectSource = setAiBranchField(objectSource, fields.aiBranch);
  }

  return `${source.slice(0, range.start)}${objectSource}${source.slice(range.end + 1)}`;
}
