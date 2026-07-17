import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../..");
const auditScript = path.join(workspaceRoot, "tools/asset-audit.mjs");
const intakePath = path.join(workspaceRoot, "packages/content/assets/VISUAL-ASSET-INTAKE.json");
const scratchRoot = path.join(workspaceRoot, ".scratch/content-assets-tests");
const rightsEvidenceRoot = path.join(workspaceRoot, "packages/content/assets/rights-evidence");
const releaseEvidenceRoot = path.join(workspaceRoot, "packages/content/assets/release-evidence");
const temporaryDirectories: string[] = [];
const temporaryFiles: string[] = [];

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

const FROZEN_REQUIRED_MISSING_IDS = [...FROZEN_PORTRAIT_AND_REF_IDS] as const;

interface AuditIssue {
  readonly assetId: string;
  readonly path: string | null;
  readonly message: string;
}

interface ReleaseBlocker {
  readonly assetId: string;
  readonly path: string | null;
  readonly reasons: readonly string[];
  readonly truthSources: readonly string[];
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
    readonly gapResolutions: number;
    readonly runtimeLedgerRows: number;
    readonly reverseCoverage: number;
    readonly productionTruth: number;
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

async function runAuditProcess(args: readonly string[]): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
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
      resolve({ exitCode: code, stdout, stderr });
    });
  });
}

async function runAudit(args: readonly string[]): Promise<{
  readonly exitCode: number;
  readonly stderr: string;
  readonly report: AuditReport;
}> {
  const result = await runAuditProcess(args);
  try {
    return {
      exitCode: result.exitCode,
      stderr: result.stderr,
      report: JSON.parse(result.stdout) as AuditReport,
    };
  } catch (error) {
    throw new Error(
      `asset audit did not return JSON (exit=${result.exitCode}): ${String(error)}\nstdout=${result.stdout}\nstderr=${result.stderr}`,
    );
  }
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
  const buffer = await sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
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
    temporaryFiles.splice(0).map(async (filePath) => {
      try {
        await fs.rm(filePath, { force: true, recursive: true });
      } catch {
        // best-effort cleanup
      }
    }),
  );
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true })),
  );
  // Remove empty evidence dirs created only for tests (never leave fabricated claims).
  for (const evidenceRoot of [rightsEvidenceRoot, releaseEvidenceRoot]) {
    try {
      const entries = await fs.readdir(evidenceRoot);
      if (entries.length === 0) await fs.rmdir(evidenceRoot);
    } catch {
      // absent is fine
    }
  }
});

async function writeTemporaryEvidenceFile(
  directory: string,
  fileName: string,
  contents: string,
): Promise<{ relativePath: string; sha256: string; absolutePath: string }> {
  await fs.mkdir(directory, { recursive: true });
  const absolutePath = path.join(directory, fileName);
  const buffer = Buffer.from(contents, "utf8");
  await fs.writeFile(absolutePath, buffer);
  temporaryFiles.push(absolutePath);
  return {
    absolutePath,
    relativePath: path.relative(workspaceRoot, absolutePath).split(path.sep).join("/"),
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

async function loadAuditModule(): Promise<{
  auditAssetIntake: (options?: Record<string, unknown>) => Promise<AuditReport>;
}> {
  return (await import(pathToFileURL(auditScript).href)) as {
    auditAssetIntake: (options?: Record<string, unknown>) => Promise<AuditReport>;
  };
}

describe("two-chapter visual asset intake", () => {
  it("validates every present visual and keeps real missing deliveries explicit", async () => {
    const result = await runAudit(["--mode=intake"]);

    // Node may emit env noise (NO_COLOR/FORCE_COLOR) on stderr; reject real audit noise only.
    expect(result.stderr).not.toMatch(/asset audit crashed|ERROR|Error:/i);
    expect(result.exitCode).toBe(0);
    expect(result.report.pass).toBe(true);
    expect(result.report.decision).toBe("final");
    expect(result.report.summary).toEqual({
      assets: 60,
      present: 48,
      missing: 12,
      openGaps: 3,
      releaseBlockers: 44,
    });
    expect(result.report.checks.stableIds).toBe(60);
    expect(result.report.checks.fileExistence).toBe(48);
    expect(result.report.checks.mimeAndExtension).toBe(48);
    expect(result.report.checks.dimensions).toBe(48);
    expect(result.report.checks.sha256).toBe(48);
    expect(result.report.checks.attribution).toBe(60);
    expect(result.report.checks.runtimeLedgerRows).toBe(35);
    expect(result.report.checks.rightsEvidence).toBe(0);
    expect(result.report.checks.gapResolutions).toBe(0);
    expect(result.report.checks.productionTruth).toBe(44);
    // Twelve ADR-0006 CG lead portraits reuse the calibrated green matte gate.
    expect(result.report.checks.portraitMatte).toBe(12);
    expect(result.report.checks.reverseCoverage).toBeGreaterThan(0);
    expect(result.report.checks.pathSafety).toBeGreaterThan(0);
    expect(result.report.errors).toEqual([]);
    expect(result.report.warnings.map((warning) => warning.assetId)).toEqual(
      expect.arrayContaining(["chen-jia-neutral", "leo-neutral", "shi-peixin-neutral"]),
    );
    expect(result.report.warnings.map((warning) => warning.assetId)).not.toEqual(
      expect.arrayContaining([...FROZEN_PROP_IDS]),
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
      sha256: "2fe82ea944814e5655e0e03cce9feb22d49ca5763ecf9d4f90c1b5540521b163",
    });
    const protocolProp = result.report.assetMetrics.find(
      (metric) => metric.assetId === "prop-protocol-terms",
    );
    expect(protocolProp).toMatchObject({
      path: "apps/web/public/assets/props/prop-protocol-terms.png",
      width: 1600,
      height: 900,
      sha256: "5882911ea96692f14606fe5fee553c775eb25365b21a5adce1d17796d1a6d392",
      bytes: 558904,
    });
  }, 60_000);

  it("fails production mode with named file, quality, rights, and gap blockers", async () => {
    const result = await runAudit(["--mode=production"]);

    expect(result.exitCode).toBe(1);
    expect(result.report.pass).toBe(false);
    expect(result.report.decision).toBe("blocked");
    expect(result.report.errors).toEqual([]);
    expect(result.report.summary.releaseBlockers).toBe(44);
    expect(result.report.releaseBlockers.map((blocker) => blocker.assetId)).toEqual(
      expect.arrayContaining([
        "bg-office-night",
        "suming-shame",
        "zhou-neutral",
        "shipeixin-calm-smile",
        "chen-jia-neutral",
        "prop-protocol-terms",
        "gap-background-shot-list",
        "gap-commercial-rights-evidence",
      ]),
    );

    const missingPortrait = result.report.releaseBlockers.find(
      (blocker) => blocker.assetId === "chen-jia-neutral",
    );
    expect(missingPortrait).toMatchObject({
      assetId: "chen-jia-neutral",
      path: null,
      reasons: ["file missing", "qualityStatus=missing", "rightsStatus=pending"],
    });
    const provisionalProp = result.report.releaseBlockers.find(
      (blocker) => blocker.assetId === "prop-protocol-terms",
    );
    expect(provisionalProp).toMatchObject({
      assetId: "prop-protocol-terms",
      path: "apps/web/public/assets/props/prop-protocol-terms.png",
      reasons: ["qualityStatus=prototype_only", "rightsStatus=pending"],
    });
  }, 60_000);

  it("keeps twelve character deliveries missing while five provisional prop files remain required", async () => {
    expect(FROZEN_PORTRAIT_AND_REF_IDS).toHaveLength(12);
    expect(FROZEN_PROP_IDS).toHaveLength(5);
    expect(FROZEN_REQUIRED_MISSING_IDS).toHaveLength(12);

    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<{
        id: string;
        fileStatus: string;
        qualityStatus: string;
        rightsStatus: string;
        humanArtReview?: boolean;
        requiredForProduction: boolean;
      }>;
    };
    const byId = new Map(intake.assets.map((asset) => [asset.id, asset]));
    for (const frozenId of FROZEN_REQUIRED_MISSING_IDS) {
      const asset = byId.get(frozenId);
      expect(asset, `missing frozen intake record ${frozenId}`).toBeDefined();
      expect(asset?.fileStatus).toBe("missing");
      expect(asset?.requiredForProduction).toBe(true);
    }
    for (const propId of FROZEN_PROP_IDS) {
      const asset = byId.get(propId);
      expect(asset, `missing frozen prop intake record ${propId}`).toBeDefined();
      expect(asset).toMatchObject({
        fileStatus: "present",
        qualityStatus: "prototype_only",
        rightsStatus: "pending",
        humanArtReview: false,
        requiredForProduction: true,
      });
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
    const exportCheck = await new Promise<{ exitCode: number; stdout: string }>(
      (resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `import { FROZEN_REQUIRED_MISSING_IDS, FROZEN_REQUIRED_PROP_IDS } from ${JSON.stringify(auditScript)}; process.stdout.write(JSON.stringify({ missing: FROZEN_REQUIRED_MISSING_IDS, props: FROZEN_REQUIRED_PROP_IDS }));`,
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
      },
    );
    expect(exportCheck.exitCode).toBe(0);
    expect(JSON.parse(exportCheck.stdout)).toEqual({
      missing: [...FROZEN_REQUIRED_MISSING_IDS],
      props: [...FROZEN_PROP_IDS],
    });
  });

  it("ignores intake false for truth-required assets and formal production gaps", async () => {
    const temporaryDirectory = await createScratchDir("truth-required-false");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<{ id: string; requiredForProduction: boolean }>;
      gaps: Array<{ id: string; requiredForProduction: boolean }>;
    };
    for (const assetId of ["suming-shame", "chen-jia-neutral"]) {
      const asset = intake.assets.find((candidate) => candidate.id === assetId);
      expect(asset).toBeDefined();
      asset!.requiredForProduction = false;
    }
    const rightsGap = intake.gaps.find((gap) => gap.id === "gap-commercial-rights-evidence");
    expect(rightsGap).toBeDefined();
    rightsGap!.requiredForProduction = false;
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=production",
      "--manifest",
      toWorkspaceRelative(malformedPath),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report.decision).toBe("blocked");
    expect(result.report.errors).toEqual([]);
    expect(result.report.summary.releaseBlockers).toBe(44);
    expect(result.report.checks.portraitMatte).toBe(12);
    for (const requiredId of [
      "suming-shame",
      "chen-jia-neutral",
      "gap-commercial-rights-evidence",
    ]) {
      const blocker = result.report.releaseBlockers.find((entry) => entry.assetId === requiredId);
      expect(blocker, `${requiredId} must remain blocked by independent truth`).toBeDefined();
      expect(blocker?.truthSources.length).toBeGreaterThan(0);
      expect(
        result.report.warnings.some(
          (warning) =>
            warning.assetId === requiredId && warning.message.includes("non-authoritative"),
        ),
      ).toBe(true);
    }
  }, 60_000);

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
    // Replace a truth-required production portrait. Setting the intake boolean
    // false must not disable the independent portrait-matte production contract.
    const fullIntake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Record<string, unknown>[];
    };
    const target = fullIntake.assets.find((asset) => asset.id === "suming-shame");
    expect(target).toBeDefined();
    Object.assign(target!, {
      path: toWorkspaceRelative(portraitPath),
      requiredForProduction: false,
      sha256: image.sha256,
      bytes: image.bytes,
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
    expect(matteErrors.every((error) => error.assetId === "suming-shame")).toBe(true);
    // Weak "any transparent pixel" gate would have accepted this fixture.
    expect(matteErrors.map((error) => error.message).join("\n")).toMatch(
      /transparent coverage|background corner probes|subject coverage|top-band/i,
    );
  }, 60_000);

  it("rejects cleared rights with arbitrary source text and malformed structured evidence", async () => {
    const temporaryDirectory = await createScratchDir("cleared-rights");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
      rightsEvidence: Array<Record<string, unknown>>;
      gapResolutions: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "owner_generated_ai",
      owner: "project",
      evidence: "ok",
    };
    intake.rightsEvidence = [
      {
        assetId: "suming-base",
        kind: "pending",
        ownerOrLicensor: "unassigned",
        reference: "ok",
        reviewedAt: "tbd",
        reviewer: "self",
        sha256: "not-a-hash",
      },
      {
        assetId: "suming-base",
        kind: "commercial_license",
        ownerOrLicensor: "Project owner",
        reference:
          "https://example.com/repository/packages/content/assets/VISUAL-ASSET-INTAKE.json",
        reviewedAt: "2026-07-15",
        reviewer: "rights-reviewer",
        sha256: "a".repeat(64),
      },
    ];
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
        expect.stringContaining("rights evidence kind must be one of"),
        expect.stringContaining("ownerOrLicensor must identify"),
        expect.stringContaining("not a placeholder"),
        expect.stringContaining("reviewedAt must be a real UTC YYYY-MM-DD date"),
        expect.stringContaining("reviewer must identify the human reviewer"),
        expect.stringContaining("HTTPS URLs are provenance only"),
        expect.stringContaining("requires at least one valid structured rightsEvidence record"),
      ]),
    );
  }, 60_000);

  it("keeps all three formal gaps blocked when status is flipped to resolved without evidence", async () => {
    const temporaryDirectory = await createScratchDir("gap-self-resolved");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      gaps: Array<{ id: string; status: string }>;
      gapResolutions: unknown[];
    };
    expect(intake.gapResolutions).toEqual([]);
    for (const gapId of [
      "gap-background-shot-list",
      "gap-npc-mood-matrix",
      "gap-commercial-rights-evidence",
    ]) {
      const gap = intake.gaps.find((candidate) => candidate.id === gapId);
      expect(gap).toBeDefined();
      gap!.status = "resolved";
    }
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const result = await runAudit([
      "--mode=production",
      "--manifest",
      toWorkspaceRelative(malformedPath),
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.report.summary.releaseBlockers).toBe(44);
    expect(result.report.checks.productionTruth).toBe(44);
    for (const gapId of [
      "gap-background-shot-list",
      "gap-npc-mood-matrix",
      "gap-commercial-rights-evidence",
    ]) {
      const blocker = result.report.releaseBlockers.find((entry) => entry.assetId === gapId);
      expect(blocker, `${gapId} must remain a production blocker`).toBeDefined();
      expect(blocker?.reasons.join(" ")).toMatch(/gapResolutions|structured/i);
      expect(
        result.report.errors.some(
          (error) =>
            error.assetId === gapId &&
            error.message.includes("non-authoritative without a matching valid gapResolutions"),
        ),
      ).toBe(true);
    }
  }, 60_000);

  it("rejects future-dated rights evidence and direct HTTPS rights references", async () => {
    const temporaryDirectory = await createScratchDir("future-https-rights");
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
      rightsEvidence: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "owner_generated_ai",
      owner: "project owner",
      evidence: "session notes on file",
    };
    intake.rightsEvidence = [
      {
        assetId: "suming-base",
        kind: "commercial_license",
        ownerOrLicensor: "Any String LLC",
        reference: "https://example.com/ok",
        reviewedAt: "2099-12-31",
        reviewer: "Any String Reviewer",
        sha256: "b".repeat(64),
      },
    ];
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
    const messages = result.report.errors.map((error) => error.message).join("\n");
    expect(messages).toMatch(/reviewedAt must be a real UTC YYYY-MM-DD date not later than today/i);
    expect(messages).toMatch(/HTTPS URLs are provenance only/i);
    expect(messages).toMatch(/requires at least one valid structured rightsEvidence record/i);
  }, 60_000);

  it("rejects rights-evidence symlinks that resolve to the intake", async () => {
    const temporaryDirectory = await createScratchDir("rights-symlink");
    await fs.mkdir(rightsEvidenceRoot, { recursive: true });
    const symlinkPath = path.join(rightsEvidenceRoot, "audit-self-ref.json");
    await fs.symlink(
      path.join(workspaceRoot, "packages/content/assets/VISUAL-ASSET-INTAKE.json"),
      symlinkPath,
    );
    temporaryFiles.push(symlinkPath);

    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
      rightsEvidence: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "owner_generated_ai",
      owner: "project owner",
      evidence: "session notes on file",
    };
    intake.rightsEvidence = [
      {
        assetId: "suming-base",
        kind: "project_ownership",
        ownerOrLicensor: "Project owner",
        reference: "packages/content/assets/rights-evidence/audit-self-ref.json",
        reviewedAt: "2026-07-15",
        reviewer: "rights-reviewer",
        sha256: "c".repeat(64),
      },
    ];
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
    expect(result.report.errors.map((error) => error.message).join("\n")).toMatch(
      /must not be a symlink/i,
    );
    expect(result.report.checks.rightsEvidence).toBe(0);
  }, 60_000);

  it("rejects missing, non-regular, and SHA-mismatched local rights evidence", async () => {
    const temporaryDirectory = await createScratchDir("rights-file-failures");
    await fs.mkdir(rightsEvidenceRoot, { recursive: true });
    const evidence = await writeTemporaryEvidenceFile(
      rightsEvidenceRoot,
      "temp-mismatch.txt",
      "actual-bytes-for-mismatch-test\n",
    );
    const directoryAsReference = path.join(rightsEvidenceRoot, "not-a-file-dir");
    await fs.mkdir(directoryAsReference, { recursive: true });
    temporaryFiles.push(directoryAsReference);

    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
      rightsEvidence: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "owner_generated_ai",
      owner: "project owner",
      evidence: "session notes on file",
    };
    intake.rightsEvidence = [
      {
        assetId: "suming-base",
        kind: "project_ownership",
        ownerOrLicensor: "Project owner",
        reference: "packages/content/assets/rights-evidence/does-not-exist.txt",
        reviewedAt: "2026-07-15",
        reviewer: "rights-reviewer",
        sha256: "d".repeat(64),
      },
      {
        assetId: "suming-base",
        kind: "commercial_license",
        ownerOrLicensor: "Project owner",
        reference: "packages/content/assets/rights-evidence/not-a-file-dir",
        reviewedAt: "2026-07-15",
        reviewer: "rights-reviewer",
        sha256: "e".repeat(64),
      },
      {
        assetId: "suming-base",
        kind: "generation_terms",
        ownerOrLicensor: "Project owner",
        reference: evidence.relativePath,
        reviewedAt: "2026-07-15",
        reviewer: "rights-reviewer",
        sha256: "f".repeat(64),
      },
    ];
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
    const messages = result.report.errors.map((error) => error.message).join("\n");
    expect(messages).toMatch(/missing or unreadable|unsafe or unreadable/i);
    expect(messages).toMatch(/non-symlink regular file/i);
    expect(messages).toMatch(/sha256 mismatch/i);
    expect(result.report.checks.rightsEvidence).toBe(0);
  }, 60_000);

  it("accepts temporary local rights evidence with matching hash and injected valid date", async () => {
    const temporaryDirectory = await createScratchDir("rights-positive");
    const evidence = await writeTemporaryEvidenceFile(
      rightsEvidenceRoot,
      "temp-positive-clearance.txt",
      "temporary local rights evidence for gate contract only\n",
    );
    const intake = JSON.parse(await fs.readFile(intakePath, "utf8")) as {
      assets: Array<Record<string, unknown>>;
      rightsEvidence: Array<Record<string, unknown>>;
      gapResolutions: Array<Record<string, unknown>>;
    };
    const target = intake.assets.find((asset) => asset.id === "suming-base");
    expect(target).toBeDefined();
    target!.rightsStatus = "cleared";
    target!.source = {
      type: "owner_generated_ai",
      owner: "project owner",
      evidence: "reviewed local evidence file",
    };
    intake.rightsEvidence = [
      {
        assetId: "suming-base",
        kind: "project_ownership",
        ownerOrLicensor: "SupaLuv project owner",
        reference: evidence.relativePath,
        reviewedAt: "2026-07-15",
        reviewer: "Release rights reviewer",
        sha256: evidence.sha256,
      },
    ];
    const malformedPath = path.join(temporaryDirectory, "VISUAL-ASSET-INTAKE.json");
    await fs.writeFile(malformedPath, `${JSON.stringify(intake, null, 2)}\n`, "utf8");

    const { auditAssetIntake } = await loadAuditModule();
    const report = await auditAssetIntake({
      workspaceRoot,
      manifestPath: toWorkspaceRelative(malformedPath),
      runtimeLedgerPath: null,
      mode: "intake",
      utcToday: "2026-07-16",
    });

    expect(report.pass).toBe(true);
    expect(report.errors).toEqual([]);
    expect(report.checks.rightsEvidence).toBe(1);
    expect(report.checks.pathSafety).toBeGreaterThan(0);
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

  it("fails closed when a nonexistent nested report path crosses a symlink", async () => {
    const temporaryDirectory = await createScratchDir("report-symlink");
    const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "supaluv-report-escape-"));
    temporaryDirectories.push(outsideDirectory);
    const escapeLink = path.join(temporaryDirectory, "escape");
    await fs.symlink(outsideDirectory, escapeLink, "dir");
    const reportPath = toWorkspaceRelative(path.join(escapeLink, "nested", "report.json"));

    const result = await runAuditProcess(["--mode=intake", "--report", reportPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/asset audit crashed|resolved path escapes the workspace/i);
    await expect(fs.access(path.join(outsideDirectory, "nested", "report.json"))).rejects.toThrow(
      /ENOENT/,
    );
  }, 60_000);

  it("safely creates a nonexistent nested report path inside the workspace", async () => {
    const temporaryDirectory = await createScratchDir("report-contained");
    const reportPath = path.join(temporaryDirectory, "nested", "deeper", "report.json");

    const result = await runAuditProcess([
      "--mode=intake",
      "--report",
      toWorkspaceRelative(reportPath),
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).not.toMatch(/asset audit crashed|Error:/i);
    const report = JSON.parse(await fs.readFile(reportPath, "utf8")) as AuditReport;
    expect(report.pass).toBe(true);
    expect(report.summary.releaseBlockers).toBe(44);
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
          "[chen-jia-neutral] <no-path>: reverse coverage missing intake record",
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
