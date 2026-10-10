import { createHash } from "node:crypto";

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function parseSourceBlocks(raw) {
  if (typeof raw !== "string") {
    return [];
  }
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
}

export function isSourceStructureBlock(paragraph) {
  if (typeof paragraph !== "string") {
    return false;
  }
  const lines = paragraph
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 1 && lines[0].startsWith("#")) {
    return true;
  }
  const trimmed = paragraph.trim();
  if (trimmed === "——" || trimmed === "---" || trimmed === "***") {
    return true;
  }
  return /^[—\-–]{2,}$/u.test(trimmed);
}

export function stripInkLineComments(inkSource) {
  if (typeof inkSource !== "string") {
    return "";
  }
  return inkSource
    .split("\n")
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

/**
 * Return each declared `# scene:` together with the Ink knot that owns it.
 * A knot may repeat the same scene tag across stitches; those bodies are
 * combined so source-to-scene inference stays deterministic.
 */
export function listInkScenes(inkSource) {
  if (typeof inkSource !== "string") {
    return [];
  }
  const knotMatches = Array.from(inkSource.matchAll(/^===\s+([a-z0-9_]+)\s+===\s*$/gm));
  const byScene = new Map();

  for (const [index, match] of knotMatches.entries()) {
    const knotId = match[1];
    const start = (match.index ?? 0) + match[0].length;
    const end = knotMatches[index + 1]?.index ?? inkSource.length;
    const body = inkSource.slice(start, end);
    const sceneIds = new Set(
      Array.from(body.matchAll(/^# scene:([^\n]+)\s*$/gm), (sceneMatch) =>
        sceneMatch[1]?.trim(),
      ).filter(Boolean),
    );
    for (const sceneId of sceneIds) {
      const existing = byScene.get(sceneId);
      if (existing) {
        existing.bodies.push(body);
        existing.knotIds.push(knotId);
      } else {
        byScene.set(sceneId, { sceneId, bodies: [body], knotIds: [knotId] });
      }
    }
  }

  return Array.from(byScene.values());
}

export function findExactSourceSceneIds(inkSource, sourceParagraph) {
  if (typeof sourceParagraph !== "string" || sourceParagraph.length === 0) {
    return [];
  }
  return listInkScenes(stripInkLineComments(inkSource))
    .filter((scene) => scene.bodies.some((body) => body.includes(sourceParagraph)))
    .map((scene) => scene.sceneId);
}

function countNonOverlappingOccurrences(text, needle) {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let cursor = 0;
  while (cursor <= text.length - needle.length) {
    const found = text.indexOf(needle, cursor);
    if (found < 0) {
      break;
    }
    count += 1;
    cursor = found + needle.length;
  }
  return count;
}

/**
 * Prevent multiple source paragraphs from consuming one literal Ink occurrence,
 * and require an ambiguous exact match to stay adjacent to its source neighbours.
 */
export function validateExactOccurrenceMappings({ entries, sourceParagraphs, inkSource }) {
  const errors = [];
  if (!Array.isArray(entries) || !Array.isArray(sourceParagraphs)) {
    return { ok: false, errors: ["exact occurrence validation requires array inputs"] };
  }
  if (entries.length !== sourceParagraphs.length) {
    errors.push(
      `exact occurrence validation count mismatch: entries=${entries.length} source=${sourceParagraphs.length}`,
    );
  }

  const scenes = new Map(
    listInkScenes(stripInkLineComments(inkSource)).map((scene) => [scene.sceneId, scene]),
  );
  const demands = new Map();

  for (const [index, entry] of entries.entries()) {
    if (!entry || entry.status === "approved-adaptation") {
      continue;
    }
    const paragraph = sourceParagraphs[index];
    if (typeof paragraph !== "string" || !entry.sceneId) {
      continue;
    }
    const candidates = findExactSourceSceneIds(inkSource, paragraph);
    if (candidates.length > 1) {
      const neighbourSceneIds = new Set(
        [entries[index - 1]?.sceneId, entries[index + 1]?.sceneId].filter(Boolean),
      );
      if (neighbourSceneIds.size > 0 && !neighbourSceneIds.has(entry.sceneId)) {
        errors.push(
          `${entry.id}: ambiguous exact scene ${entry.sceneId} breaks source adjacency; ` +
            `neighbours=[${[...neighbourSceneIds].join(", ")}] candidates=[${candidates.join(", ")}]`,
        );
      }
    }

    const demandKey = `${entry.textHash ?? sha256Text(paragraph)}\u0000${entry.sceneId}`;
    const demand = demands.get(demandKey) ?? {
      paragraph,
      sceneId: entry.sceneId,
      entryIds: [],
    };
    demand.entryIds.push(entry.id);
    demands.set(demandKey, demand);
  }

  for (const demand of demands.values()) {
    const scene = scenes.get(demand.sceneId);
    const capacity = (scene?.bodies ?? []).reduce(
      (sum, body) => sum + countNonOverlappingOccurrences(body, demand.paragraph),
      0,
    );
    if (demand.entryIds.length > capacity) {
      errors.push(
        `${demand.entryIds.join(",")}: ${demand.entryIds.length} exact source paragraphs reuse ` +
          `${capacity} literal occurrence(s) in ${demand.sceneId}`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}

export function normalizeSubstantiveText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.normalize("NFKC").replace(/[\p{White_Space}\p{Punctuation}\p{Symbol}]/gu, "");
}

/**
 * Reject empty-shell rationales/snippets after case/spacing/punctuation normalization.
 * Covers pure `x` filler and repeated/concatenated todo|tbd|pending tokens.
 */
export function isPlaceholderText(value) {
  const normalized = normalizeSubstantiveText(value);
  if (!normalized) {
    return false;
  }
  return /^(?:x+|(?:todo|tbd|pending)+)$/i.test(normalized);
}

function legacyCoverageMappingDigest(entries) {
  const payload = entries
    .map((entry) => `${entry.id}:${entry.chapterId}:${entry.sceneId}`)
    .join("\n");
  return sha256Text(payload);
}

function canonicalAdaptationReceipt(receipt) {
  if (!receipt) {
    return null;
  }
  return {
    sourceHash: receipt.sourceHash ?? receipt.textHash ?? null,
    sceneId: receipt.sceneId ?? null,
    factMappings: (receipt.factMappings ?? []).map((mapping) => ({
      fact: mapping.fact ?? null,
      sourceSnippet: mapping.sourceSnippet ?? null,
      targetSnippet: mapping.targetSnippet ?? null,
    })),
    pacingRationale: receipt.pacingRationale ?? null,
  };
}

/**
 * v2 protects the complete reviewed coverage contract, not only scene ids.
 * Version 1 remains readable solely to migrate the previously pinned anchor.
 */
export function computeCoverageMappingDigest(entries, contractVersion = 2) {
  if (contractVersion === 1) {
    return legacyCoverageMappingDigest(entries);
  }
  if (contractVersion !== 2) {
    throw new Error(`Unsupported coverage digest contract version: ${String(contractVersion)}`);
  }
  const payload = entries
    .map((entry) =>
      JSON.stringify({
        id: entry.id,
        sourceId: entry.sourceId ?? null,
        paragraphIndex: entry.paragraphIndex ?? null,
        textHash: entry.textHash ?? null,
        chapterId: entry.chapterId,
        sceneId: entry.sceneId ?? null,
        status: entry.status ?? null,
        notes: entry.notes ?? "",
        dialogueQuotes: entry.dialogueQuotes ?? [],
        adaptationReceipt: canonicalAdaptationReceipt(entry.adaptationReceipt),
      }),
    )
    .join("\n");
  return sha256Text(payload);
}

export function validateCoverageMappingDigest(entries, anchor) {
  const errors = [];
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) {
    errors.push("coverage mapping digest anchor is missing");
    return { ok: false, errors, actualDigest: computeCoverageMappingDigest(entries) };
  }
  if (anchor.algorithm !== "sha256") {
    errors.push(`unsupported coverage mapping digest algorithm: ${String(anchor.algorithm)}`);
  }
  if (anchor.entryCount !== entries.length) {
    errors.push(
      `coverage mapping entry count mismatch: anchor=${anchor.entryCount} ledger=${entries.length}`,
    );
  }
  const contractVersion = anchor.contractVersion ?? 1;
  if (contractVersion !== 1 && contractVersion !== 2) {
    errors.push(`unsupported coverage digest contract version: ${String(contractVersion)}`);
  }
  const actualDigest = computeCoverageMappingDigest(
    entries,
    contractVersion === 1 || contractVersion === 2 ? contractVersion : 2,
  );
  if (anchor.value !== actualDigest) {
    errors.push(
      `coverage mapping digest mismatch: anchor=${String(anchor.value)} ledger=${actualDigest}`,
    );
  }
  return { ok: errors.length === 0, errors, actualDigest };
}

export function isolateSceneKnots(inkSource, sceneId) {
  if (typeof sceneId !== "string" || sceneId.length === 0) {
    return [];
  }
  const escaped = sceneId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `===\\s+([a-z0-9_]+)\\s+===\\n# scene:${escaped}\\n([\\s\\S]*?)(?=\\n===\\s+|$)`,
    "g",
  );
  return Array.from(inkSource.matchAll(re), (match) => ({
    knotId: match[1],
    body: match[2] ?? "",
  }));
}

function stripInlineInkNoise(line) {
  let text = line;
  const commentIndex = text.indexOf("//");
  if (commentIndex >= 0) {
    text = text.slice(0, commentIndex);
  }
  const tagIndex = text.indexOf("#");
  if (tagIndex >= 0) {
    text = text.slice(0, tagIndex);
  }
  return text.trim();
}

function countControlBraces(line) {
  let open = 0;
  let close = 0;
  for (const ch of line) {
    if (ch === "{") {
      open += 1;
    } else if (ch === "}") {
      close += 1;
    }
  }
  return { open, close };
}

/**
 * Conservative syntax-aware projection of direct player-facing text lines.
 * Not a full Ink parser. Fail-closed on unbalanced control braces (returns "").
 * - strips inline // comments and inline # tags before keeping a line
 * - excludes whole-line comments/tags, declarations, diverts, gathers, choices,
 *   glue/control lines, and every line inside / opening / closing `{ ... }` blocks
 */
export function extractInkPlayerText(knotBody) {
  if (typeof knotBody !== "string") {
    return "";
  }

  const playerLines = [];
  let depth = 0;

  for (const rawLine of knotBody.split("\n")) {
    const trimmed = rawLine.trim();
    const { open, close } = countControlBraces(trimmed);
    const startsInsideBlock = depth > 0;
    depth += open - close;
    if (depth < 0) {
      return "";
    }

    // Exclude any line that opens/closes a control block or sits inside one.
    if (startsInsideBlock || open > 0 || close > 0) {
      continue;
    }
    if (!trimmed) {
      continue;
    }
    if (trimmed.startsWith("//")) {
      continue;
    }
    if (/^(?:#|~|->|===|=|VAR\b|CONST\b|INCLUDE\b|EXTERNAL\b)/.test(trimmed)) {
      continue;
    }
    // Choices (* / +), gathers (-), glue.
    if (/^[+*-]/.test(trimmed)) {
      continue;
    }
    if (/^<>/.test(trimmed)) {
      continue;
    }

    const cleaned = stripInlineInkNoise(trimmed);
    if (!cleaned) {
      continue;
    }
    if (/^(?:#|~|->|===|=|VAR\b|CONST\b|INCLUDE\b|EXTERNAL\b)/.test(cleaned)) {
      continue;
    }
    if (/^[+*-]/.test(cleaned)) {
      continue;
    }

    playerLines.push(cleaned);
  }

  if (depth !== 0) {
    return "";
  }
  return playerLines.join("\n");
}

function hasSubstantiveLength(value, minimum) {
  return normalizeSubstantiveText(value).length >= minimum && !isPlaceholderText(value);
}

function playerTextHasSnippet(playerText, snippet) {
  // Match only within one projected line; never across lines.
  return playerText.split("\n").some((line) => line.includes(snippet));
}

function findNormalizedSpan(haystack, needle) {
  const normalizedHaystack = normalizeSubstantiveText(haystack);
  const normalizedNeedle = normalizeSubstantiveText(needle);
  if (!normalizedNeedle) {
    return null;
  }
  const start = normalizedHaystack.indexOf(normalizedNeedle);
  if (start < 0) {
    return null;
  }
  return { start, end: start + normalizedNeedle.length };
}

function spansOverlap(left, right) {
  return left.start < right.end && right.start < left.end;
}

function assertPairwiseNonOverlapping(spans, label, errors) {
  for (let i = 0; i < spans.length; i += 1) {
    const left = spans[i];
    if (!left) {
      continue;
    }
    for (let j = i + 1; j < spans.length; j += 1) {
      const right = spans[j];
      if (!right) {
        continue;
      }
      if (spansOverlap(left, right)) {
        errors.push(
          `${label} snippets for fact mappings ${i + 1} and ${j + 1} overlap after normalization`,
        );
      }
    }
  }
}

export function validateAdaptationReceipt({ receipt, entry, sourceParagraph, inkSource }) {
  const errors = [];
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return { ok: false, errors: ["adaptation receipt is missing or not an object"] };
  }

  const sourceHash = receipt.sourceHash ?? receipt.textHash;
  if (sourceHash !== entry.textHash) {
    errors.push("receipt source hash does not match entry text hash");
  }
  if (receipt.sceneId !== entry.sceneId || typeof receipt.sceneId !== "string") {
    errors.push("receipt scene id does not match entry scene id");
  }

  const requiredMappings = normalizeSubstantiveText(sourceParagraph).length >= 120 ? 2 : 1;
  if (!Array.isArray(receipt.factMappings) || receipt.factMappings.length < requiredMappings) {
    errors.push(`receipt requires at least ${requiredMappings} fact mapping(s)`);
  }

  if (!hasSubstantiveLength(receipt.pacingRationale, 12)) {
    errors.push(
      "pacing rationale must contain at least 12 substantive characters and not be a placeholder",
    );
  }

  const knots = isolateSceneKnots(inkSource, receipt.sceneId);
  if (knots.length !== 1) {
    errors.push(`mapped scene must resolve to exactly one knot; found ${knots.length}`);
  }
  const playerText = knots.length === 1 ? extractInkPlayerText(knots[0].body) : "";
  const seenPairs = new Set();
  const sourceSpans = [];
  const targetSpans = [];

  for (const [index, mapping] of (receipt.factMappings ?? []).entries()) {
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) {
      errors.push(`fact mapping ${index + 1} is not an object`);
      sourceSpans.push(null);
      targetSpans.push(null);
      continue;
    }
    if (!hasSubstantiveLength(mapping.sourceSnippet, 8)) {
      errors.push(`fact mapping ${index + 1} source snippet is too short or placeholder`);
      sourceSpans.push(null);
    } else if (!sourceParagraph.includes(mapping.sourceSnippet)) {
      errors.push(
        `fact mapping ${index + 1} source snippet is not present in its source paragraph`,
      );
      sourceSpans.push(null);
    } else {
      sourceSpans.push(findNormalizedSpan(sourceParagraph, mapping.sourceSnippet));
    }

    if (!hasSubstantiveLength(mapping.targetSnippet, 8)) {
      errors.push(`fact mapping ${index + 1} target snippet is too short or placeholder`);
      targetSpans.push(null);
    } else if (!playerTextHasSnippet(playerText, mapping.targetSnippet)) {
      errors.push(
        `fact mapping ${index + 1} target snippet is not present in player text for the mapped knot`,
      );
      targetSpans.push(null);
    } else {
      targetSpans.push(findNormalizedSpan(playerText, mapping.targetSnippet));
    }

    const pairKey = `${normalizeSubstantiveText(mapping.sourceSnippet)}\u0000${normalizeSubstantiveText(mapping.targetSnippet)}`;
    if (seenPairs.has(pairKey)) {
      errors.push(`fact mapping ${index + 1} duplicates an earlier source-target pair`);
    }
    seenPairs.add(pairKey);
  }

  // Long paragraphs require independently anchored mappings, not nested/overlapping slices.
  if (requiredMappings >= 2 && (receipt.factMappings ?? []).length >= 2) {
    assertPairwiseNonOverlapping(sourceSpans, "source", errors);
    assertPairwiseNonOverlapping(targetSpans, "target", errors);
  }

  return { ok: errors.length === 0, errors };
}
