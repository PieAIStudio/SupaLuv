import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Prose integrity for authored Ink chapters.
 *
 * The novel-v2 conversion once hard-cut beat prose at a length budget,
 * leaving 27 sentences chopped mid-clause (e.g. “……删了大部分，剩”).
 * Compile gates cannot see this — only readers can. This encodes the check:
 * every long prose line must end at a sentence boundary (CJK/Latin terminal
 * punctuation, closing quote/bracket, dash, colon, or markdown emphasis).
 */

const CHAPTER_FILES = ["draft-ch01.ink", "draft-ch02.ink", "draft-ch03.ink"];
const INK_DIR = join(__dirname, "../../packages/content/ink");

const NON_PROSE_PREFIXES = ["#", "+", "->", "VAR", "~", "*", "//", "{", "-", "=", "==="];
const TERMINAL = /[。！？…”"）)】\]:：—*]$/u;
const MIN_PROSE_LENGTH = 40;

function truncatedLines(source: string): string[] {
  const offenders: string[] = [];
  let knot = "unknown";
  source.split("\n").forEach((line, index) => {
    const knotMatch = /^=== (\S+) ===/.exec(line);
    if (knotMatch?.[1]) {
      knot = knotMatch[1];
      return;
    }
    const text = line.trim();
    if (!text || NON_PROSE_PREFIXES.some((prefix) => text.startsWith(prefix))) {
      return;
    }
    if (text.length < MIN_PROSE_LENGTH) {
      return;
    }
    if (!TERMINAL.test(text)) {
      offenders.push(`${knot} L${index + 1}: …${text.slice(-24)}`);
    }
  });
  return offenders;
}

describe("ink prose integrity", () => {
  for (const file of CHAPTER_FILES) {
    it(`${file} has no prose cut mid-sentence`, () => {
      let source = "";
      try {
        source = readFileSync(join(INK_DIR, file), "utf8");
      } catch {
        return; // chapter not present on this branch yet
      }
      expect(truncatedLines(source)).toEqual([]);
    });
  }
});
