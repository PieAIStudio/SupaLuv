import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");
const auditScript = path.join(workspaceRoot, "tools/asset-audit.mjs");
const intakePath = path.join(workspaceRoot, "packages/content/assets/VISUAL-ASSET-INTAKE.json");
const scratchRoot = path.join(workspaceRoot, ".scratch/content-assets-tests");
const temporaryDirectories: string[] = [];

/** Must stay aligned with tools/asset-audit.mjs FROZEN_REQUIRED_MISSING_IDS. */
const FROZEN_PORTRAIT_AND_REF_IDS = [
  "chen-jia-neutral",
  "leo-neutral",
  "shi-peixin-neutral",
  "staff-worker-neutral",
  "staff-lead-neutral",
  "shop-owner-neutral",
  "chen-jia-ref-base",
  "leo-ref-base",
  "shi-peixin-ref-base",
  "staff-worker-ref-base",
  "staff-lead-ref-base",
  "shop-owner-ref-base",
] as const;

const FROZEN_PROP_IDS = [
  "prop-protocol-terms",
  "prop-barcode-shift",
  "prop-rental-receipt",
  "prop-application-nda",
  "prop-approval-sms",
] as const;

const FROZEN_REQUIRED_MISSING_IDS = [
  ...FROZEN_PORTRAIT_AND_REF_IDS,
  ...FROZEN_PROP_IDS,
] as const;

interface AuditIssue {
  readonly assetId: string;
  readonly path: string | null;
  readonly message: string;
}

interface ReleaseBlocker {
  readonly assetId: string;
  readonly path: string | null;
  readonly reasons: readonly string[];
}

interface AuditReport {
  readonly mode: "intake" | "production";
  readonly pass: boolean;
  readonly decision: string;
  readonly summary: {
    readonly assets: number;
    readonly present: number;
    readonly missing: number;
    readonly openGaps: number;
    readonly releaseBlockers: number;
  };
  readonly checks: {
    readonly stableIds: number;
    readonly fileExistence: number;
    readonly mimeAndExtension: number;
    readonly dimensions: number;
    readonly alpha: number;
    readonly magenta: number;
    readonly portraitMatte: number;
    readonly sha256: number;
    readonly attribution: number;
    readonly rightsEvidence: number;
    readonly runtimeLedgerRows: number;
    readonly reverseCoverage: number;
    readonly pathSafety: number;
  };
  readonly errors: readonly AuditIssue[];
  readonly warnings: readonly AuditIssue[];
  readonly releaseBlockers: readonly ReleaseBlocker[];
  readonly assetMetrics: readonly {
    readonly assetId: string;
    readonly path: string;
    readonly width: number;
    readonly height: number;
    readonly hasAlpha: boolean;
    readonly visibleMagentaRatio: number;
    readonly sha256: string;
    readonly portraitMattePass?: boolean;
  }[];
}

async function runAudit(args: readonly string[]): Promise<{
  readonly exitCode: number;
  readonly stderr: string;
  readonly report: AuditReport;
}> {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [auditScript, ...args, "--json"], {
      cwd: workspaceRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === null) {
        reject(new Error(`asset audit terminated without an exit code: ${stderr}`));
        return;
      }
      try {
        resolve({ exitCode: code, stderr, report: JSON.parse(stdout) as AuditReport });
      } catch (error) {
        reject(
          new Error(
            `asset audit did not return JSON (exit=${code}): ${String(error)}\nstdout=${stdout}\nstderr=${stderr}`,
          ),
        );
      }
    });
  });
}

async function createScratchDir(label: string): Promise<string> {
  await fs.mkdir(scratchRoot, { recursive: true });
  const directory = await fs.mkdtemp(path.join(scratchRoot, `${label}-`));
  temporaryDirectories.push(directory);
  return directory;
}

function toWorkspaceRelative(absolutePath: string): string {
  return path.relative(workspaceRoot, absolutePath).split(path.sep).join("/");
}

async function writeOpaquePortraitWithOneTransparentPixel(filePath: string): Promise<{
  readonly buffer: Buffer;
  readonly sha256: string;
  readonly bytes: number;
}> {
  const width = 832;
  const height = 1248;
  const raw = Buffer.alloc(width * height * 4, 255);
  // Fully opaque gray subject covering the whole canvas…
  for (let index = 0; index < raw.length; index += 4) {
    raw[index] = 120;
    raw[index + 1] = 120;
    raw[index + 2] = 120;
    raw[index + 3] = 255;
  }
  // …except a single transparent corner pixel — weak alpha gate would pass.
  raw[3] = 0;
  const buffer = await sharp(raw, { raw: { width, height, channels: 4 } }).png().toBuffer();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return {
    buffer,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
});

describe("two-chapter visual asset intake", () => {
  it("validates every present visual and keeps real missing deliveries explicit", async () => {
    const result = await runAudit(["--mode=intake"]);

    // Node may emit env noise (NO_COLOR/FORCE_COLOR) on stderr; reject real audit noise only.
    expect(result.stderr).not.toMatch(/asset audit crashed|ERROR|Error:/i);
    expect(result.exitCode).toBe(0);
    expect(result.report.pass).toBe(true);
    expect(result.report.decision).toBe("final");
    expect(result.report.summary).toEqual({
      assets: 43,
      present: 26,
      missing: 17,
      openGaps: 3,
      releaseBlockers: 41,
    });
    expect(result.report.checks.stableIds).toBe(43);
    expect(result.report.checks.fileExistence).toBe(26);
    expect(result.report.checks.mimeAndExtension).toBe(26);
    expect(result.report.checks.dimensions).toBe(26);
    expect(result.report.checks.sha256).toBe(26);
    expect(result.report.checks.attribution).toBe(43);
    expect(result.report.checks.runtimeLedgerRows).toBe(25);
    // Eight formal suming portraits reuse the calibrated matte gate.
    expect(result.report.checks.portraitMatte).toBe(8);
    expect(result.report.checks.reverseCoverage).toBeGreaterThan(0);
    expect(result.report.checks.pathSafety).toBeGreaterThan(0);
    expect(result.report.errors).toEqual([]);
    expect(result.report.warnings.map((warning) => warning.assetId)).toEqual(
      expect.arrayContaining([
        "chen-jia-neutral",
        "leo-neutral",
        "shi-peixin-neutral",
        "prop-protocol-terms",
        "prop-approval-sms",
      ]),
    );

    const sumingShame = result.report.assetMetrics.find(
      (metric) => metric.assetId === "suming-shame",
    );
    expect(sumingShame).toMatchObject({
      path: "apps/web/public/assets/portraits/suming-shame.png",
      width: 832,
      height: 1248,
      hasAlpha: true,
      visibleMagentaRatio: 0,
      portraitMattePass: true,
      sha256: "175a51a0071944dd167cc26fa9b40059eed25400f0a1fa2e041d1945803b6983",
    });
  }, 60_000);

  it("fails production mode with named file, quality, rights, and gap blockers", async () => {
    const result = await runAudit(["--mode=production"]);

    expect(result.exitCode).toBe(1);
    expect(result.report.pass).toBe(false);
    expect(result.report.decision).toBe("blocked");
    expect(result.report.errors).toEqual([]);
    expect(result.report.summary.releaseBlockers).toBe(41);
    expect(result.report.releaseBlockers.map((blocker) => blocker.assetId)).toEqual(
      expect.arrayContaining([
        "bg-office-night",
        "suming-shame",
        "chen-jia-neutral",
        "prop-protocol-terms",
        "gap-background-shot-list",
        "gap-commercial-rights-evidence",
      ]),
    );

    const missingPortrait = result.report.releaseBlockers.find(
      (blocker) => blocker.assetId === "chen-jia-neutral",
    );
    expect(missingPortrait).toEqual({
      assetId: "chen-jia-neutral",
      path: null,
      reasons: ["file missing", "qualityStatus=missing", "rightsStatus=pending"],
    });
  }, 60_000);

  it("asserts the frozen twelve character gaps and five prop IDs remain required", async () => {
    expect(FROZEN_PORTRAIT_AND_REF_IDS).toHaveLength(12);
    expect(FROZEN_PROP_IDS).toHaveLength(5);
    expect(FROZEN_REQUIRED_MISSING_IDS).toHaveLength(17);

    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<{ id: string; fileStatus: string; requiredForProduction: boolean }>;
    };
    const byId = new Map(intake.assets.map((asset) => [asset.id, asset]));
    for (const frozenId of FROZEN_REQUIRED_MISSING_IDS) {
      const asset = byId.get(frozenId);
      expect(asset, `missing frozen intake record ${frozenId}`).toBeDefined();
      expect(asset?.fileStatus).toBe("missing");
      expect(asset?.requiredForProduction).toBe(true);
    }

    const archiveSource = await fs.readFile(
      path.join(workspaceRoot, "apps/web/src/persistence/algorithmShameArchive.ts"),
      "utf8",
    );
    const blockMatch = archiveSource.match(
      /export\s+const\s+ALGORITHM_SHAME_ARCHIVE_RECORD_IDS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/u,
    );
    expect(blockMatch).not.toBeNull();
    const archiveIds = [...(blockMatch?.[1] ?? "").matchAll(/["']([^"']+)["']/g)].map(
      (match) => match[1],
    );
    expect(archiveIds.map((archiveId) => `prop-${archiveId}`)).toEqual([...FROZEN_PROP_IDS]);

    // Audit module export must stay aligned with this frozen contract.
    const exportCheck = await new Promise<{ exitCode: number; stdout: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { FROZEN_REQUIRED_MISSING_IDS } from ${JSON.stringify(auditScript)}; process.stdout.write(JSON.stringify(FROZEN_REQUIRED_MISSING_IDS));`,
        ],
        { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] },
      );
      let stdout = "";
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.once("error", reject);
      child.once("close", (code) => {
        resolve({ exitCode: code ?? 1, stdout });
      });
    });
    expect(exportCheck.exitCode).toBe(0);
    expect(JSON.parse(exportCheck.stdout)).toEqual([...FROZEN_REQUIRED_MISSING_IDS]);
  });

  it("locates duplicate IDs and paths in a malformed intake under workspace scratch", async () => {
    const temporaryDirectory = await createScratchDir("duplicate");
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Record<string, unknown>[];
    };
    intake.assets.push({ ...intake.assets[0] });
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report.pass).toBe(false);
    expect(result.report.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "[bg-office-night] apps/web/public/assets/scenes/bg-office-night.jpg: duplicate stable ID",
        ),
        expect.stringContaining(
          "[bg-office-night] apps/web/public/assets/scenes/bg-office-night.jpg: duplicate path",
        ),
      ]),
    );
  }, 60_000);

  it("rejects an opaque production portrait that only has one transparent pixel", async () => {
    const temporaryDirectory = await createScratchDir("weak-alpha");
    const portraitPath = path.join(temporaryDirectory, "fake-production-portrait.png");
    const image = await writeOpaquePortraitWithOneTransparentPixel(portraitPath);
    // Full intake keeps reverse-coverage truth; append a production portrait that
    // would pass a weak "any transparent pixel" check but must fail matte.
    const fullIntake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Record<string, unknown>[];
    };
    fullIntake.assets.push({
      id: "fake-production-portrait",
      kind: "portrait",
      contract: "portrait-runtime-2x3",
      usage: ["negative-test bypass of weak alpha gate"],
      path: toWorkspaceRelative(portraitPath),
      fileStatus: "present",
      qualityStatus: "production_ready",
      rightsStatus: "pending",
      requiredForProduction: true,
      sha256: image.sha256,
      bytes: image.bytes,
      source: {
        type: "owner_generated_ai",
        owner: "project",
        evidence: "tests/unit/content-assets.test.ts",
      },
      notes: "Must fail strict portrait matte gate.",
    });

    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(fullIntake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report.pass).toBe(false);
    const matteErrors = result.report.errors.filter((error) =>
      error.message.includes("portrait matte gate"),
    );
    expect(matteErrors.length).toBeGreaterThan(0);
    expect(matteErrors.every((error) => error.assetId === "fake-production-portrait")).toBe(true);
    // Weak "any transparent pixel" gate would have accepted this fixture.
    expect(matteErrors.map((error) => error.message).join("\n")).toMatch(
      /transparent coverage|background corner probes|subject coverage|top-band/i,
    );
  }, 60_000);

  it("rejects rightsStatus=cleared with pending/unassigned/placeholder provenance", async () => {
    const temporaryDirectory = await createScratchDir("cleared-rights");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "pending",
      owner: "unassigned",
      evidence: "not_yet_supplied",
    };
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);

    expect(result.exitCode).toBe(1);
    const messages = result.report.errors.map((error) => error.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining("rightsStatus=cleared forbids source.type=pending"),
        expect.stringContaining("rightsStatus=cleared forbids source.owner=unassigned"),
        expect.stringContaining("rightsStatus=cleared requires non-placeholder source.evidence"),
      ]),
    );
  }, 60_000);

  it("rejects absolute and .. path traversal for ledger/asset paths", async () => {
    const temporaryDirectory = await createScratchDir("path-escape");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "boot-splash");
    expect(target).toBeDefined();
    target!.path = "../outside-workspace.png";
    target!.sha256 = "0".repeat(64);
    target!.bytes = 1;
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const relativeEscape = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);
    expect(relativeEscape.exitCode).toBe(1);
    expect(relativeEscape.report.errors.map((error) => error.message).join("\n")).toMatch(
      /path traversal|\.\.|unsafe or unreadable path/i,
    );

    target!.path = "/etc/passwd";
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");
    const absoluteEscape = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);
    expect(absoluteEscape.exitCode).toBe(1);
    expect(absoluteEscape.report.errors.map((error) => error.message).join("\n")).toMatch(
      /absolute paths are not allowed|unsafe or unreadable path/i,
    );
  }, 60_000);

  it("fails reverse coverage when a frozen missing delivery is deleted from intake", async () => {
    const temporaryDirectory = await createScratchDir("drop-frozen");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<{ id: string } & Record<string, unknown>>;
    };
    intake.assets = intake.assets.filter((asset) => asset.id !== "chen-jia-neutral");
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=intake",
      "--manifest",
      toWorkspaceRelative(malformedPath),
      "--runtime-ledger",
      "none",
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report.errors.map((error) => error.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "[chen-jia-neutral] <no-path>: reverse coverage missing intake record (truth source: FROZEN_REQUIRED_MISSING_IDS)",
        ),
      ]),
    );
  }, 60_000);

  it("extracts scene keys and archive IDs from truth sources without a second topology", async () => {
    const exportCheck = await new Promise<{ exitCode: number; stdout: string; stderr: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `
import {
  extractStringFieldValues,
  extractAlgorithmShameArchiveRecordIds,
} from ${JSON.stringify(auditScript)};
const sample = '{ artKey: "bg-office-night", portraitKey: "suming-shame", companionPortraitKey: "suming-committed" }';
const archiveSample = 'export const ALGORITHM_SHAME_ARCHIVE_RECORD_IDS = ["protocol-terms","barcode-shift"] as const;';
process.stdout.write(JSON.stringify({
  art: [...extractStringFieldValues(sample, "artKey")],
  portrait: [...extractStringFieldValues(sample, "portraitKey")],
  companion: [...extractStringFieldValues(sample, "companionPortraitKey")],
  archive: extractAlgorithmShameArchiveRecordIds(archiveSample),
}));
`,
          ],
          { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] },
        );
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk: string) => {
          stderr += chunk;
        });
        child.once("error", reject);
        child.once("close", (code) => {
          resolve({ exitCode: code ?? 1, stdout, stderr });
        });
      },
    );
    expect(exportCheck.exitCode).toBe(0);
    expect(JSON.parse(exportCheck.stdout)).toEqual({
      art: ["bg-office-night"],
      portrait: ["suming-shame"],
      companion: ["suming-committed"],
      archive: ["protocol-terms", "barcode-shift"],
    });
  });
});
