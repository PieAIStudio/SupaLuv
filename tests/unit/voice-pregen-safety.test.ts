import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  buildVoiceLedgerText,
  buildVoiceProvenance,
} from "../../tools/voice-pregen/assetGovernance";
import { commitVoiceBankTransaction } from "../../tools/voice-pregen/bankTransaction";
import { voicePlanDigest, voiceTraversalChunkKey } from "../../tools/voice-pregen/safetyContract";
import {
  createMiniMaxSynthesisBody,
  VOICE_SYNTHESIS_SPEC,
} from "../../tools/voice-pregen/synthesisContract";

const root = resolve(import.meta.dirname, "../..");
const tsx = resolve(root, "node_modules/.bin/tsx");
const script = resolve(root, "tools/voice-pregen/generate.ts");
const catalog = resolve(root, "apps/web/public/assets/voice/catalog.json");
const ledger = resolve(root, "packages/content/assets/RUNTIME-ASSET-LEDGER.csv");
const legacyBaseline = resolve(root, "packages/content/assets/voice-legacy-baseline.json");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("voice pre-generation safety", () => {
  it("binds traversal dedupe to choice identity and text, not only choice count", () => {
    const shared = { sceneId: "scene", text: "同一段台词" };
    const first = voiceTraversalChunkKey({
      ...shared,
      choices: [{ id: "choice-a", text: "去左边" }],
    });
    const differentId = voiceTraversalChunkKey({
      ...shared,
      choices: [{ id: "choice-b", text: "去左边" }],
    });
    const differentText = voiceTraversalChunkKey({
      ...shared,
      choices: [{ id: "choice-a", text: "去右边" }],
    });

    expect(new Set([first, differentId, differentText])).toHaveLength(3);
  });

  it("binds paid text, cast, synthesis volume, binary hash, and orphan state", () => {
    const base = {
      synthesis: VOICE_SYNTHESIS_SPEC,
      configuredLines: [
        {
          key: "key-a",
          textHash: "text-a",
          cast: { voiceId: "voice-a", speed: 1, pitch: 0 },
        },
      ],
      staticBank: {
        orphanKeys: [],
        fileRecords: [{ key: "key-a", sha256: "binary-a", bytes: 123 }],
      },
    };

    expect(voicePlanDigest(base)).not.toBe(
      voicePlanDigest({
        ...base,
        configuredLines: [{ ...base.configuredLines[0], textHash: "text-b" }],
      }),
    );
    expect(voicePlanDigest(base)).not.toBe(
      voicePlanDigest({
        ...base,
        configuredLines: [
          { ...base.configuredLines[0], cast: { voiceId: "voice-b", speed: 1, pitch: 0 } },
        ],
      }),
    );
    expect(voicePlanDigest(base)).not.toBe(
      voicePlanDigest({
        ...base,
        staticBank: { ...base.staticBank, orphanKeys: ["orphan-a"] },
      }),
    );
    expect(voicePlanDigest(base)).not.toBe(
      voicePlanDigest({
        ...base,
        staticBank: {
          ...base.staticBank,
          fileRecords: [{ ...base.staticBank.fileRecords[0], sha256: "binary-b" }],
        },
      }),
    );
    expect(voicePlanDigest(base)).not.toBe(
      voicePlanDigest({
        ...base,
        synthesis: { ...VOICE_SYNTHESIS_SPEC, volume: 0.5 },
      }),
    );

    const request = createMiniMaxSynthesisBody({
      text: "contract probe",
      cast: { voiceId: "voice-a", speed: 1, pitch: 0, languageBoost: "English" },
    });
    expect(request.model).toBe(VOICE_SYNTHESIS_SPEC.model);
    expect(request.voice_setting.vol).toBe(VOICE_SYNTHESIS_SPEC.volume);
    expect(request.audio_setting).toEqual({
      sample_rate: VOICE_SYNTHESIS_SPEC.audio.sampleRate,
      bitrate: VOICE_SYNTHESIS_SPEC.audio.bitrate,
      format: VOICE_SYNTHESIS_SPEC.audio.format,
      channel: VOICE_SYNTHESIS_SPEC.audio.channels,
    });
  });

  it("rolls ledger, catalog, new clips, and orphan cleanup back after activation failure", async () => {
    const sandbox = mkdtempSync(join(tmpdir(), "supaluv-voice-bank-"));
    const live = join(sandbox, "live");
    const stage = join(sandbox, "stage");
    mkdirSync(live, { recursive: true });
    mkdirSync(stage, { recursive: true });
    const liveCatalog = join(live, "catalog.json");
    const liveLedger = join(live, "ledger.csv");
    const liveOrphan = join(live, "orphan.mp3");
    const liveNew = join(live, "new.mp3");
    writeFileSync(liveCatalog, "old catalog\n");
    writeFileSync(liveLedger, "old ledger\n");
    writeFileSync(liveOrphan, "old orphan\n");
    const stagedCatalog = join(stage, "catalog.json");
    const stagedLedger = join(stage, "ledger.csv");
    const stagedFinalLedger = join(stage, "ledger-final.csv");
    const stagedNew = join(stage, "new.mp3");
    writeFileSync(stagedCatalog, "new catalog\n");
    writeFileSync(stagedLedger, "interim ledger\n");
    writeFileSync(stagedFinalLedger, "final ledger\n");
    writeFileSync(stagedNew, "new audio\n");

    try {
      await expect(
        commitVoiceBankTransaction({
          transactionDirectory: join(stage, "transaction"),
          preActivationReplacements: [
            { stagedPath: stagedNew, targetPath: liveNew },
            { stagedPath: stagedLedger, targetPath: liveLedger },
          ],
          catalogReplacement: { stagedPath: stagedCatalog, targetPath: liveCatalog },
          postActivationReplacements: [{ stagedPath: stagedFinalLedger, targetPath: liveLedger }],
          postActivationDeletions: [liveOrphan],
          validate: () => undefined,
          onStep: (step) => {
            if (step === "post-activation-cleaned") {
              expect(readFileSync(liveCatalog, "utf8")).toBe("new catalog\n");
              expect(readFileSync(liveLedger, "utf8")).toBe("final ledger\n");
              expect(readFileSync(liveNew, "utf8")).toBe("new audio\n");
              expect(existsSync(liveOrphan)).toBe(false);
              throw new Error("injected post-activation failure");
            }
          },
        }),
      ).rejects.toThrow("injected post-activation failure");

      expect(readFileSync(liveCatalog, "utf8")).toBe("old catalog\n");
      expect(readFileSync(liveLedger, "utf8")).toBe("old ledger\n");
      expect(readFileSync(liveOrphan, "utf8")).toBe("old orphan\n");
      expect(existsSync(liveNew)).toBe(false);
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  });

  it("builds ledger and verbatim provenance for every newly governed clip", () => {
    const line = {
      key: "new-key",
      characterId: "suming",
      text: "逐字台词，不能润色。",
      chapterId: "draft-ch04",
      sceneId: "dch04_s001",
      language: "zh-CN" as const,
    };
    const ledgerText = buildVoiceLedgerText({
      currentText:
        "asset_id,path,sha256,bytes,source,release_status,notes\n" +
        "voice-old-key,apps/web/public/assets/voice/old-key.mp3," +
        `${"a".repeat(64)},512,ai_generated_minimax_speech02_turbo,pending,old\n`,
      generated: new Map([
        [line.key, { key: line.key, sha256: "b".repeat(64), bytes: 1024, valid: true }],
      ]),
      lines: new Map([[line.key, line]]),
      orphanKeys: ["old-key"],
    });

    expect(ledgerText).not.toContain("voice-old-key");
    expect(ledgerText).toContain(
      `voice-new-key,apps/web/public/assets/voice/new-key.mp3,${"b".repeat(64)},1024,ai_generated_minimax_speech02_turbo,demo_approved_commercial_evidence_pending,draft_ch04_static_voice_zh_CN_suming`,
    );

    const provenance = buildVoiceProvenance({
      line,
      cast: { voiceId: "male-qn-qingse", speed: 1, pitch: 0, languageBoost: "Chinese" },
      operator: "test-agent",
      generatedAt: "2026-07-22",
      sourceUrl: "https://api.minimaxi.com/v1/t2a_v2",
    });
    expect(provenance).toContain("assetId: voice-new-key");
    expect(provenance).toContain("operator: test-agent");
    expect(provenance).toContain("# Prompt (verbatim)\n\n逐字台词，不能润色。");
    expect(provenance).toContain("volume 1");
    expect(provenance).toContain("32 kHz; 64 kbps; mono MP3");
  });

  it("refuses the historical no-flag paid path before touching the catalog", () => {
    const before = sha256(catalog);
    const result = spawnSync(tsx, [script], { cwd: root, encoding: "utf8" });

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("Choose exactly one safe mode");
    expect(sha256(catalog)).toBe(before);
  });

  it("plan mode is machine-readable and reports a clean global bank without writes", () => {
    const before = sha256(catalog);
    const result = spawnSync(tsx, [script, "--plan", "--chapter=draft-ch01"], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const plan = JSON.parse(result.stdout) as {
      version: number;
      planDigest: string;
      totals: { missingClips: number };
      staticBank: {
        desiredKeys: number;
        fileContentDigest: string;
        orphanKeys: string[];
        missingDesiredKeys: string[];
        governance: {
          managedAssets: number;
          legacyUnregisteredAssets: number;
          legacyBaselineMatches: boolean;
        };
      };
    };
    expect(plan.version).toBe(4);
    expect(plan.planDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(plan.totals.missingClips).toBe(0);
    expect(plan.staticBank.desiredKeys).toBe(288);
    expect(plan.staticBank.fileContentDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(plan.staticBank.orphanKeys).toEqual([]);
    expect(plan.staticBank.missingDesiredKeys).toEqual([]);
    expect(plan.staticBank.governance).toMatchObject({
      managedAssets: 2,
      legacyUnregisteredAssets: 286,
      legacyBaselineMatches: true,
    });
    expect(sha256(catalog)).toBe(before);
  });

  it("rejects scoped paid sync before collection or API access", () => {
    const result = spawnSync(
      tsx,
      [script, "--sync", "--chapter=draft-ch01", "--expected-missing=0"],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("Scoped --sync is forbidden");
  });

  it("requires the exact reviewed global digest and safely performs a zero-cost sync", () => {
    const before = sha256(catalog);
    const ledgerBefore = sha256(ledger);
    const legacyBefore = sha256(legacyBaseline);
    const planResult = spawnSync(tsx, [script, "--plan", "--language=all"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(planResult.status).toBe(0);
    const plan = JSON.parse(planResult.stdout) as {
      planDigest: string;
      totals: { missingClips: number };
    };
    expect(plan.totals.missingClips).toBe(0);

    const rejected = spawnSync(
      tsx,
      [script, "--sync", "--expected-missing=0", `--expected-plan-digest=${"0".repeat(64)}`],
      { cwd: root, encoding: "utf8" },
    );
    expect(rejected.status).not.toBe(0);
    expect(`${rejected.stdout}${rejected.stderr}`).toContain("Voice plan drift");
    expect(sha256(catalog)).toBe(before);

    const accepted = spawnSync(
      tsx,
      [script, "--sync", "--expected-missing=0", `--expected-plan-digest=${plan.planDigest}`],
      { cwd: root, encoding: "utf8" },
    );
    expect(accepted.status).toBe(0);
    expect(accepted.stdout).toContain("generated=0 pruned=0");
    expect(sha256(catalog)).toBe(before);
    expect(sha256(ledger)).toBe(ledgerBefore);
    expect(sha256(legacyBaseline)).toBe(legacyBefore);
  }, 30_000);
});
