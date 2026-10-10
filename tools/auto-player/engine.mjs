/**
 * Deterministic Ink auto-player: load precompiled chapter JSON via inkjs,
 * walk with a persona strategy, emit stable transcripts + stats.
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getPersona, PERSONA_IDS, PERSONAS } from "./personas.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const COMPILED_DIR = join(REPO_ROOT, "packages/content/compiled");
const CATALOG_PATH = join(REPO_ROOT, "packages/content/catalog/story-catalog.json");

const require = createRequire(resolve(REPO_ROOT, "apps/web/package.json"));
const { Story } = require("inkjs");

export const DEFAULT_CHAPTERS = Object.freeze(
  (loadStoryCatalog().productionChapters ?? []).map((chapter) => chapter.id),
);

/** Hard step cap so a content cycle never hangs the tool. */
export const MAX_STEPS = 5000;

/**
 * @param {string} chapterId
 * @returns {string}
 */
export function compiledChapterPath(chapterId) {
  return join(COMPILED_DIR, `${chapterId}.json`);
}

/**
 * @param {string} chapterId
 * @returns {string}
 */
export function loadCompiledChapterJson(chapterId) {
  const path = compiledChapterPath(chapterId);
  if (!existsSync(path)) {
    throw new Error(`Missing compiled chapter: ${path}`);
  }
  return readFileSync(path, "utf8");
}

/**
 * @returns {object}
 */
export function loadStoryCatalog() {
  return JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
}

/**
 * @param {string} chapterId
 * @returns {string[]}
 */
export function inheritVariableNamesFor(chapterId) {
  const catalog = loadStoryCatalog();
  const chapter = (catalog.productionChapters ?? []).find((c) => c.id === chapterId);
  return Array.isArray(chapter?.inheritVariableNames) ? [...chapter.inheritVariableNames] : [];
}

/**
 * Ink path string → knot id (first component before `.`).
 * @param {string | null | undefined} pathString
 * @returns {string}
 */
export function knotIdFromPath(pathString) {
  if (!pathString) {
    return "(unknown)";
  }
  const first = String(pathString).split(".")[0];
  return first || "(unknown)";
}

/**
 * Snapshot all global Ink variables as plain JSON-serializable values.
 * @param {import('inkjs').Story} story
 * @returns {Record<string, string | number | boolean | null>}
 */
export function snapshotVariables(story) {
  /** @type {Record<string, string | number | boolean | null>} */
  const out = {};
  const globals = story.variablesState?._globalVariables;
  if (globals && typeof globals.forEach === "function") {
    globals.forEach((value, name) => {
      out[String(name)] = plainInkValue(value);
    });
  } else {
    // Fallback: known keys via proxy enumeration.
    for (const name of Object.keys(story.variablesState ?? {})) {
      if (name.startsWith("_")) {
        continue;
      }
      try {
        out[name] = plainInkValue(story.variablesState[name]);
      } catch {
        // ignore non-variable props
      }
    }
  }
  // Stable key order for determinism.
  return sortObject(out);
}

/**
 * @param {unknown} value
 * @returns {string | number | boolean | null}
 */
function plainInkValue(value) {
  if (value == null) {
    return null;
  }
  // inkjs VariableValue wrapper
  if (typeof value === "object" && value !== null && "value" in value) {
    return plainInkValue(/** @type {{ value: unknown }} */ (value).value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return String(value);
}

/**
 * @template {Record<string, unknown>} T
 * @param {T} obj
 * @returns {T}
 */
function sortObject(obj) {
  /** @type {Record<string, unknown>} */
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return /** @type {T} */ (sorted);
}

/**
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @returns {Array<{ name: string, from: unknown, to: unknown }>}
 */
export function diffVariables(before, after) {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  /** @type {Array<{ name: string, from: unknown, to: unknown }>} */
  const changes = [];
  for (const name of [...names].sort()) {
    const from = before[name];
    const to = after[name];
    if (!Object.is(from, to) && JSON.stringify(from) !== JSON.stringify(to)) {
      changes.push({ name, from, to });
    }
  }
  return changes;
}

/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function lineDiffCount(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  const n = Math.max(la.length, lb.length);
  let diffs = 0;
  for (let i = 0; i < n; i += 1) {
    if (la[i] !== lb[i]) {
      diffs += 1;
    }
  }
  return diffs;
}

/**
 * @typedef {object} TranscriptStep
 * @property {string} knotId
 * @property {string[]} textLines
 * @property {Array<{ index: number, text: string, selected: boolean }> | null} choices
 * @property {Array<{ name: string, from: unknown, to: unknown }>} varDiff
 */

/**
 * @typedef {object} ChapterRunResult
 * @property {string} persona
 * @property {string} chapterId
 * @property {boolean} ended
 * @property {number} steps
 * @property {number} knotCount
 * @property {number} choiceCount
 * @property {number} textLineCount
 * @property {string[]} knotPath
 * @property {Record<string, string | number | boolean | null>} finalVars
 * @property {TranscriptStep[]} stepsDetail
 * @property {string} transcriptMarkdown
 * @property {Record<string, string | number | boolean | null>} exportedVars
 */

/**
 * @param {import('inkjs').Story} story
 * @param {Record<string, unknown>} vars
 */
function applyVariables(story, vars) {
  for (const [name, value] of Object.entries(vars)) {
    try {
      story.variablesState[name] = value;
    } catch {
      // Variable may not exist in this chapter.
    }
  }
}

/**
 * @param {import('inkjs').Story} story
 * @param {readonly string[]} names
 * @returns {Record<string, string | number | boolean | null>}
 */
export function exportVariables(story, names) {
  /** @type {Record<string, string | number | boolean | null>} */
  const out = {};
  for (const name of names) {
    try {
      out[name] = plainInkValue(story.variablesState[name]);
    } catch {
      out[name] = null;
    }
  }
  return sortObject(out);
}

/**
 * Run one persona through one compiled chapter.
 *
 * @param {object} options
 * @param {string} options.chapterId
 * @param {string} options.personaId
 * @param {Record<string, unknown>} [options.initialVars]
 * @param {number} [options.maxSteps]
 * @param {string} [options.compiledJson]
 * @returns {ChapterRunResult}
 */
export function runChapter(options) {
  const {
    chapterId,
    personaId,
    initialVars = {},
    maxSteps = MAX_STEPS,
    compiledJson = loadCompiledChapterJson(chapterId),
  } = options;

  const persona = getPersona(personaId);
  const story = new Story(compiledJson);
  if (Object.keys(initialVars).length > 0) {
    applyVariables(story, initialVars);
  }

  /** @type {TranscriptStep[]} */
  const stepsDetail = [];
  /** @type {string[]} */
  const knotPath = [];
  const visitedKnots = new Set();

  let prevVars = snapshotVariables(story);
  let choiceCount = 0;
  let textLineCount = 0;
  let steps = 0;
  let ended = false;

  /** @type {TranscriptStep | null} */
  let current = null;

  /**
   * @param {string} knotId
   */
  function openKnot(knotId) {
    if (current && current.knotId === knotId) {
      return;
    }
    if (current) {
      stepsDetail.push(current);
    }
    current = {
      knotId,
      textLines: [],
      choices: null,
      varDiff: [],
    };
    if (!visitedKnots.has(knotId)) {
      visitedKnots.add(knotId);
      knotPath.push(knotId);
    }
  }

  while (steps < maxSteps) {
    steps += 1;

    // Drain text to next choice boundary or END.
    while (story.canContinue) {
      const line = story.Continue() ?? "";
      const path = story.state.currentPathString ?? story.state.previousPathString ?? null;
      const knotId = knotIdFromPath(path);
      openKnot(knotId);
      // Preserve original line breaks inside a Continue() chunk; record non-empty lines.
      const raw = String(line).replace(/\r\n/g, "\n");
      for (const part of raw.split("\n")) {
        // Ink often emits trailing newline; keep non-empty body lines only for
        // readable transcripts, but count each non-empty evaluated line.
        if (part.trim().length > 0) {
          current.textLines.push(part.trimEnd());
          textLineCount += 1;
        }
      }
    }

    const choices = story.currentChoices.map((c, index) => ({
      index,
      text: String(c.text ?? "").trim(),
    }));

    if (choices.length === 0) {
      ended = true;
      // Capture final knot if we never opened one (empty chapter edge case).
      if (!current) {
        openKnot(knotIdFromPath(story.state.currentPathString));
      }
      break;
    }

    // Ensure a section exists for the choice menu.
    const menuPath = story.state.currentPathString ?? story.state.previousPathString ?? null;
    openKnot(knotIdFromPath(menuPath));

    const selectedIndex = persona.pick(choices);
    if (selectedIndex < 0 || selectedIndex >= choices.length) {
      throw new Error(
        `Persona ${personaId} picked invalid index ${selectedIndex} at knot ${current?.knotId}`,
      );
    }

    current.choices = choices.map((c) => ({
      index: c.index,
      text: c.text,
      selected: c.index === selectedIndex,
    }));

    story.ChooseChoiceIndex(selectedIndex);
    choiceCount += 1;

    const nextVars = snapshotVariables(story);
    current.varDiff = diffVariables(prevVars, nextVars);
    prevVars = nextVars;

    // Close this step section so the next knot starts clean.
    stepsDetail.push(current);
    current = null;
  }

  if (steps >= maxSteps && !ended) {
    throw new Error(
      `auto-player exceeded ${maxSteps} steps for ${personaId}/${chapterId} (possible infinite loop)`,
    );
  }

  if (current) {
    stepsDetail.push(current);
    current = null;
  }

  const finalVars = snapshotVariables(story);
  const inheritNames = inheritVariableNamesFor(chapterId);
  const exportedVars =
    inheritNames.length > 0 ? exportVariables(story, inheritNames) : { ...finalVars };

  const transcriptMarkdown = formatTranscript({
    personaId,
    chapterId,
    stepsDetail,
    finalVars,
    knotCount: visitedKnots.size,
    choiceCount,
    textLineCount,
    ended,
    steps,
  });

  return {
    persona: personaId,
    chapterId,
    ended,
    steps,
    knotCount: visitedKnots.size,
    choiceCount,
    textLineCount,
    knotPath,
    finalVars,
    stepsDetail,
    transcriptMarkdown,
    exportedVars,
  };
}

/**
 * @param {object} args
 * @param {string} args.personaId
 * @param {string} args.chapterId
 * @param {TranscriptStep[]} args.stepsDetail
 * @param {Record<string, unknown>} args.finalVars
 * @param {number} args.knotCount
 * @param {number} args.choiceCount
 * @param {number} args.textLineCount
 * @param {boolean} args.ended
 * @param {number} args.steps
 * @returns {string}
 */
export function formatTranscript(args) {
  const {
    personaId,
    chapterId,
    stepsDetail,
    finalVars,
    knotCount,
    choiceCount,
    textLineCount,
    ended,
    steps,
  } = args;

  const lines = [];
  lines.push(`# Auto-player transcript`);
  lines.push(``);
  lines.push(`- persona: \`${personaId}\``);
  lines.push(`- chapter: \`${chapterId}\``);
  lines.push(`- ended: ${ended}`);
  lines.push(`- engine_steps: ${steps}`);
  lines.push(``);

  for (const step of stepsDetail) {
    lines.push(`## ${step.knotId}`);
    lines.push(``);
    for (const text of step.textLines) {
      lines.push(text);
    }
    if (step.textLines.length > 0) {
      lines.push(``);
    }
    if (step.choices && step.choices.length > 0) {
      lines.push(`### Choices`);
      lines.push(``);
      for (const choice of step.choices) {
        const mark = choice.selected ? "x" : " ";
        lines.push(`- [${mark}] ${choice.text}`);
      }
      lines.push(``);
    }
    if (step.varDiff.length > 0) {
      lines.push(`### VAR Δ`);
      lines.push(``);
      for (const change of step.varDiff) {
        lines.push(`- \`${change.name}\`: ${formatVar(change.from)} → ${formatVar(change.to)}`);
      }
      lines.push(``);
    }
  }

  lines.push(`## Chapter end`);
  lines.push(``);
  lines.push(`### VAR full table`);
  lines.push(``);
  lines.push(`| variable | value |`);
  lines.push(`| --- | --- |`);
  for (const name of Object.keys(finalVars).sort()) {
    lines.push(`| \`${name}\` | ${formatVar(finalVars[name])} |`);
  }
  lines.push(``);
  lines.push(`### Path stats`);
  lines.push(``);
  lines.push(`| metric | value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| knots_visited | ${knotCount} |`);
  lines.push(`| choices_made | ${choiceCount} |`);
  lines.push(`| text_lines (Ink-evaluated) | ${textLineCount} |`);
  lines.push(`| ended | ${ended} |`);
  lines.push(``);

  // Stable trailing newline.
  return lines.join("\n");
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function formatVar(value) {
  if (value === null || value === undefined) {
    return "`null`";
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * @param {object} options
 * @param {string} options.outDir
 * @param {readonly string[]} [options.personaIds]
 * @param {readonly string[]} [options.chapterIds]
 * @param {boolean} [options.chainChapters] inherit vars across chapters per persona
 * @returns {{ summary: object, results: ChapterRunResult[] }}
 */
export function runAll(options) {
  const {
    outDir,
    personaIds = PERSONA_IDS,
    chapterIds = DEFAULT_CHAPTERS,
    chainChapters = true,
  } = options;

  /** @type {ChapterRunResult[]} */
  const results = [];
  /** @type {Record<string, Record<string, object>>} */
  const stats = {};
  /** @type {Record<string, Record<string, string>>} */
  const transcripts = {};

  for (const personaId of personaIds) {
    stats[personaId] = {};
    transcripts[personaId] = {};
    /** @type {Record<string, unknown>} */
    let carryVars = {};

    for (const chapterId of chapterIds) {
      const result = runChapter({
        chapterId,
        personaId,
        initialVars: chainChapters ? carryVars : {},
      });
      results.push(result);
      transcripts[personaId][chapterId] = result.transcriptMarkdown;
      stats[personaId][chapterId] = {
        ended: result.ended,
        steps: result.steps,
        knots_visited: result.knotCount,
        choices_made: result.choiceCount,
        text_lines: result.textLineCount,
      };

      const personaDir = join(outDir, personaId);
      mkdirSync(personaDir, { recursive: true });
      const transcriptPath = join(personaDir, `${chapterId}.transcript.md`);
      writeFileSync(transcriptPath, result.transcriptMarkdown, "utf8");

      if (chainChapters) {
        carryVars = { ...result.exportedVars };
      }
    }
  }

  /** Pairwise line-diff counts: "a|b" → { chapterId: n } */
  /** @type {Record<string, Record<string, number>>} */
  const transcriptDiffs = {};
  for (let i = 0; i < personaIds.length; i += 1) {
    for (let j = i + 1; j < personaIds.length; j += 1) {
      const a = personaIds[i];
      const b = personaIds[j];
      const key = `${a}|${b}`;
      transcriptDiffs[key] = {};
      for (const chapterId of chapterIds) {
        transcriptDiffs[key][chapterId] = lineDiffCount(
          transcripts[a][chapterId],
          transcripts[b][chapterId],
        );
      }
    }
  }

  const summary = {
    generatedBy: "tools/auto-player",
    personas: [...personaIds],
    chapters: [...chapterIds],
    chainChapters,
    stats,
    transcriptDiffs,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  return { summary, results };
}

export { PERSONA_IDS, PERSONAS, getPersona, REPO_ROOT };
