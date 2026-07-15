import { createHash } from "node:crypto";

export function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
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

export function computeCoverageMappingDigest(entries) {
  const payload = entries
    .map((entry) => `${entry.id}:${entry.chapterId}:${entry.sceneId}`)
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
  const actualDigest = computeCoverageMappingDigest(entries);
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
    if (/^[+*\-]/.test(trimmed)) {
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
    if (/^[+*\-]/.test(cleaned)) {
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
