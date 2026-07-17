#!/usr/bin/env node
/**
 * CLI: pnpm auto-player --persona <name|all> --out <dir>
 *
 * Walks draft-ch01/02/03 with deterministic persona strategies and writes
 * transcripts + summary.json under --out.
 */
import process from "node:process";

import { DEFAULT_CHAPTERS, PERSONA_IDS, runAll } from "./engine.mjs";
import { getPersona } from "./personas.mjs";

function printHelp() {
  console.log(`Usage: pnpm auto-player --persona <name|all> --out <dir> [options]

Options:
  --persona <id|all>   Built-in persona: ${PERSONA_IDS.join(", ")} (or all)
  --out <dir>          Output directory for transcripts + summary.json
  --chapter <id>       Limit to one chapter (default: all draft-ch01..03)
  --no-chain           Do not inherit variables across chapters
  --help               Show this help

Examples:
  pnpm auto-player --persona all --out .scratch/auto-player-run
  pnpm auto-player --persona dignity --out /tmp/ap --chapter draft-ch01
`);
}

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--no-chain") {
      out.noChain = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for --${key}`);
      }
      out[key] = value;
      i += 1;
      continue;
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }
  return out;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    printHelp();
    process.exit(2);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const personaArg = args.persona;
  const outDir = args.out;
  if (!personaArg || typeof personaArg !== "string") {
    console.error("Missing required --persona <name|all>");
    printHelp();
    process.exit(2);
  }
  if (!outDir || typeof outDir !== "string") {
    console.error("Missing required --out <dir>");
    printHelp();
    process.exit(2);
  }

  const personaIds =
    personaArg === "all"
      ? [...PERSONA_IDS]
      : (() => {
          getPersona(personaArg); // validate
          return [personaArg];
        })();

  const chapterIds =
    typeof args.chapter === "string" ? [args.chapter] : [...DEFAULT_CHAPTERS];
  const chainChapters = !args.noChain;

  if (personaIds.length === 1 && chapterIds.length === 1) {
    // Still write via runAll so summary.json shape is consistent.
  }

  const { summary, results } = runAll({
    outDir,
    personaIds,
    chapterIds,
    chainChapters,
  });

  for (const r of results) {
    const status = r.ended ? "ok" : "INCOMPLETE";
    console.log(
      `[${status}] ${r.persona}/${r.chapterId}: knots=${r.knotCount} choices=${r.choiceCount} text_lines=${r.textLineCount}`,
    );
  }

  console.log(`Wrote summary → ${outDir}/summary.json`);
  if (summary.transcriptDiffs) {
    for (const [pair, byChapter] of Object.entries(summary.transcriptDiffs)) {
      const parts = Object.entries(byChapter)
        .map(([ch, n]) => `${ch}=${n}`)
        .join(" ");
      console.log(`diff ${pair}: ${parts}`);
    }
  }
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
}
