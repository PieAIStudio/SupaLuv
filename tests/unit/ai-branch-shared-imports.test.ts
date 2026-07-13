import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AI_BRANCH_SRC = join(process.cwd(), "services/ai-branch/src");
const RELATIVE_SHARED = /from\s+["'](?:\.\.\/)+packages\/shared\//;

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTsFiles(full));
    } else if (entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("ai-branch shared package imports", () => {
  it("does not reach into packages/shared via relative filesystem paths", () => {
    const offenders = collectTsFiles(AI_BRANCH_SRC)
      .map((file) => ({ file, text: readFileSync(file, "utf8") }))
      .filter(({ text }) => RELATIVE_SHARED.test(text))
      .map(({ file }) => file.replace(process.cwd() + "/", ""));

    expect(offenders).toEqual([]);
  });

  it("declares @supaluv/shared as a direct workspace dependency", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "services/ai-branch/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["@supaluv/shared"]).toBe("workspace:*");
  });
});
