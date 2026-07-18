/**
 * Creator Studio task console: stream long-running pipeline tools via NDJSON.
 * Reuses the same event shape as creatorPipeline.
 */

import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { PipelineLogEvent, PipelineRunResult, PipelineStepResult } from "./creatorPipeline";

export type CreatorTaskId = "asset-audit" | "auto-player" | "voice-reconcile";

export interface CreatorTaskDef {
  readonly id: CreatorTaskId;
  readonly label: string;
  readonly description: string;
}

export const CREATOR_TASK_DEFS: readonly CreatorTaskDef[] = [
  {
    id: "asset-audit",
    label: "资产审计",
    description: "node tools/asset-audit.mjs（默认 intake 模式）",
  },
  {
    id: "auto-player",
    label: "自动玩家遍历",
    description: "pnpm auto-player --persona mianzi（全章节）",
  },
  {
    id: "voice-reconcile",
    label: "语音库对账",
    description: "voice-pregen --dry-run（只统计，不合成）",
  },
] as const;

export function isCreatorTaskId(value: unknown): value is CreatorTaskId {
  return value === "asset-audit" || value === "auto-player" || value === "voice-reconcile";
}

function pnpmBin(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function resolveTsxBin(repoRoot: string): string {
  return join(repoRoot, "services/ai-branch/node_modules/.bin/tsx");
}

export interface TaskCommandSpec {
  readonly step: string;
  readonly command: string;
  readonly bin: string;
  readonly args: readonly string[];
}

export async function resolveTaskCommand(
  repoRoot: string,
  taskId: CreatorTaskId,
): Promise<TaskCommandSpec> {
  if (taskId === "asset-audit") {
    return {
      step: "asset-audit",
      command: "node tools/asset-audit.mjs",
      bin: process.execPath,
      args: [join(repoRoot, "tools/asset-audit.mjs")],
    };
  }
  if (taskId === "auto-player") {
    const outDir = await mkdtemp(join(tmpdir(), "supaluv-creator-auto-player-"));
    return {
      step: "auto-player",
      command: `node tools/auto-player/cli.mjs --persona mianzi --out ${outDir}`,
      bin: process.execPath,
      args: [
        join(repoRoot, "tools/auto-player/cli.mjs"),
        "--persona",
        "mianzi",
        "--out",
        outDir,
      ],
    };
  }
  // voice-reconcile
  const tsxBin = resolveTsxBin(repoRoot);
  const script = join(repoRoot, "tools/voice-pregen/generate.ts");
  return {
    step: "voice-reconcile",
    command: "tsx tools/voice-pregen/generate.ts --dry-run",
    bin: tsxBin,
    args: [script, "--dry-run"],
  };
}

function runCommand(
  repoRoot: string,
  spec: TaskCommandSpec,
  onEvent?: (event: PipelineLogEvent) => void,
): Promise<PipelineStepResult> {
  onEvent?.({ type: "step_start", step: spec.step, command: spec.command });
  return new Promise((resolvePromise) => {
    const child = spawn(spec.bin, [...spec.args], {
      cwd: resolve(repoRoot),
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      onEvent?.({ type: "stdout", step: spec.step, chunk: text });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      onEvent?.({ type: "stderr", step: spec.step, chunk: text });
    });
    child.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      stderr += message;
      onEvent?.({ type: "stderr", step: spec.step, chunk: message });
      onEvent?.({ type: "step_end", step: spec.step, ok: false, exitCode: null });
      resolvePromise({
        step: spec.step,
        command: spec.command,
        ok: false,
        exitCode: null,
        stdout,
        stderr,
      });
    });
    child.on("close", (code) => {
      const ok = code === 0;
      onEvent?.({ type: "step_end", step: spec.step, ok, exitCode: code });
      resolvePromise({
        step: spec.step,
        command: spec.command,
        ok,
        exitCode: code,
        stdout,
        stderr,
      });
    });
  });
}

/** Run one Studio console task with the shared NDJSON event stream. */
export async function runCreatorTask(
  repoRoot: string,
  taskId: CreatorTaskId,
  onEvent?: (event: PipelineLogEvent) => void,
): Promise<PipelineRunResult> {
  const spec = await resolveTaskCommand(repoRoot, taskId);
  const result = await runCommand(repoRoot, spec, onEvent);
  onEvent?.({ type: "done", ok: result.ok });
  return { ok: result.ok, steps: [result] };
}

/**
 * Simple exclusive lock for pipeline + task console.
 * Shared so only one long-running Studio job runs at a time.
 */
export function createTaskLock() {
  let busy: string | null = null;

  return {
    get busyTask(): string | null {
      return busy;
    },
    tryAcquire(taskId: string): boolean {
      if (busy) return false;
      busy = taskId;
      return true;
    },
    release(taskId: string): void {
      if (busy === taskId) busy = null;
    },
  };
}
