import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("portrait matte asset gate", () => {
  it("is deterministic, rejects an opaque magenta fixture, and passes all runtime portraits", async () => {
    const { stdout } = await execFileAsync(process.execPath, ["tools/portrait-matte/verify.mjs"], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      maxBuffer: 10 * 1024 * 1024,
    });
    const report = JSON.parse(stdout) as {
      pass: boolean;
      determinism: Array<{
        hashEqual: boolean;
        bytesEqual: boolean;
        runtimeHashEqual: boolean;
        runtimeBytesEqual: boolean;
      }>;
      official: Array<{ gate: { pass: boolean } }>;
      badFixture: { rejected: boolean };
    };

    // 12 lead CG plates + 11 NPC CG plates (ADR-0006, 2026-07-17)
    expect(report.determinism).toHaveLength(23);
    expect(
      report.determinism.every(
        (entry) =>
          entry.hashEqual && entry.bytesEqual && entry.runtimeHashEqual && entry.runtimeBytesEqual,
      ),
    ).toBe(true);
    expect(report.badFixture.rejected).toBe(true);
    expect(report.official).toHaveLength(23);
    expect(report.official.every((entry) => entry.gate.pass)).toBe(true);
    expect(report.pass).toBe(true);
  }, 120_000);
});
