import { spawn } from "node:child_process";
import { resolve } from "node:path";

export interface PipelineStepResult {
  readonly step: string;
  readonly command: string;
  readonly ok: boolean;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface PipelineRunResult {
  readonly ok: boolean;
  readonly steps: readonly PipelineStepResult[];
}

export type PipelineLogEvent =
  | { readonly type: "step_start"; readonly step: string; readonly command: string }
  | { readonly type: "stdout"; readonly step: string; readonly chunk: string }
  | { readonly type: "stderr"; readonly step: string; readonly chunk: string }
  | {
      readonly type: "step_end";
      readonly step: string;
      readonly ok: boolean;
      readonly exitCode: number | null;
    }
  | { readonly type: "done"; readonly ok: boolean };

const PIPELINE_STEPS = [
  {
    step: "compile-ink",
    args: ["--filter", "@supaluv/content", "compile-ink"],
  },
  {
    step: "generate-narrative-graph",
    args: ["--filter", "@supaluv/content", "generate-narrative-graph"],
  },
  {
    step: "typecheck",
    args: ["--filter", "@supaluv/content", "typecheck"],
  },
] as const;

function pnpmBin(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function runCommand(
  repoRoot: string,
  step: string,
  args: readonly string[],
  onEvent?: (event: PipelineLogEvent) => void,
): Promise<PipelineStepResult> {
  const command = `pnpm ${args.join(" ")}`;
  onEvent?.({ type: "step_start", step, command });
  return new Promise((resolvePromise) => {
    const child = spawn(pnpmBin(), [...args], {
      cwd: resolve(repoRoot),
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      onEvent?.({ type: "stdout", step, chunk: text });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      onEvent?.({ type: "stderr", step, chunk: text });
    });
    child.on("error", (error) => {
      const message = error instanceof Error ? error.message : String(error);
      stderr += message;
      onEvent?.({ type: "stderr", step, chunk: message });
      onEvent?.({ type: "step_end", step, ok: false, exitCode: null });
      resolvePromise({ step, command, ok: false, exitCode: null, stdout, stderr });
    });
    child.on("close", (code) => {
      const ok = code === 0;
      onEvent?.({ type: "step_end", step, ok, exitCode: code });
      resolvePromise({ step, command, ok, exitCode: code, stdout, stderr });
    });
  });
}

/** One-click: ink compile → narrative graph → content typecheck. */
export async function runCreatorPipeline(
  repoRoot: string,
  onEvent?: (event: PipelineLogEvent) => void,
): Promise<PipelineRunResult> {
  const steps: PipelineStepResult[] = [];
  for (const item of PIPELINE_STEPS) {
    const result = await runCommand(repoRoot, item.step, item.args, onEvent);
    steps.push(result);
    if (!result.ok) {
      onEvent?.({ type: "done", ok: false });
      return { ok: false, steps };
    }
  }
  onEvent?.({ type: "done", ok: true });
  return { ok: true, steps };
}

/** Gate for scene-manifest writes: content package typecheck only (no artifact rewrite). */
export async function runContentTypecheckGate(repoRoot: string): Promise<PipelineStepResult> {
  return runCommand(repoRoot, "typecheck", ["--filter", "@supaluv/content", "typecheck"]);
}
