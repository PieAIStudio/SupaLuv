import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

export interface VoiceBankReplacement {
  readonly stagedPath: string;
  readonly targetPath: string;
}

export type VoiceBankTransactionStep =
  | "pre-activation-installed"
  | "catalog-activated"
  | "post-activation-cleaned"
  | "validated";

export interface VoiceBankTransactionInput {
  readonly transactionDirectory: string;
  readonly preActivationReplacements: readonly VoiceBankReplacement[];
  readonly catalogReplacement: VoiceBankReplacement;
  readonly postActivationReplacements?: readonly VoiceBankReplacement[];
  readonly postActivationDeletions: readonly string[];
  readonly validate: () => void | Promise<void>;
  /** Test seam for deterministic failure injection; production callers omit it. */
  readonly onStep?: (step: VoiceBankTransactionStep) => void;
}

interface Mutation {
  readonly targetPath: string;
  readonly backupPath: string | null;
}

/**
 * Install a governed voice bank with catalog activation as the commit point.
 * Ordinary filesystem/validation failures roll every target back. New files,
 * ledger, provenance and debt baseline land before catalog activation; files
 * made orphan by the new catalog are removed only afterwards.
 */
export async function commitVoiceBankTransaction(input: VoiceBankTransactionInput): Promise<void> {
  mkdirSync(input.transactionDirectory, { recursive: true });
  const backupDirectory = join(input.transactionDirectory, "backups");
  mkdirSync(backupDirectory, { recursive: true });
  const mutations: Mutation[] = [];

  const phaseTargets = [
    input.preActivationReplacements.map((replacement) => replacement.targetPath),
    [input.catalogReplacement.targetPath],
    (input.postActivationReplacements ?? []).map((replacement) => replacement.targetPath),
    [...input.postActivationDeletions],
  ];
  for (const targets of phaseTargets) {
    const uniqueTargets = new Set<string>();
    for (const targetPath of targets) {
      if (uniqueTargets.has(targetPath)) {
        throw new Error(`voice bank transaction repeats a target within one phase: ${targetPath}`);
      }
      uniqueTargets.add(targetPath);
    }
  }
  const replacementTargets = new Set(phaseTargets.slice(0, 3).flatMap((targets) => targets));
  for (const targetPath of input.postActivationDeletions) {
    if (replacementTargets.has(targetPath)) {
      throw new Error(`voice bank transaction cannot replace and delete one target: ${targetPath}`);
    }
  }

  function backupTarget(targetPath: string): string | null {
    if (!existsSync(targetPath)) {
      return null;
    }
    const backupPath = join(backupDirectory, `${String(mutations.length).padStart(4, "0")}.bak`);
    renameSync(targetPath, backupPath);
    return backupPath;
  }

  function install(replacement: VoiceBankReplacement): void {
    mkdirSync(dirname(replacement.targetPath), { recursive: true });
    const backupPath = backupTarget(replacement.targetPath);
    mutations.push({ targetPath: replacement.targetPath, backupPath });
    renameSync(replacement.stagedPath, replacement.targetPath);
  }

  function remove(targetPath: string): void {
    if (!existsSync(targetPath)) {
      return;
    }
    const backupPath = backupTarget(targetPath);
    mutations.push({ targetPath, backupPath });
  }

  try {
    for (const replacement of input.preActivationReplacements) {
      install(replacement);
    }
    input.onStep?.("pre-activation-installed");

    install(input.catalogReplacement);
    input.onStep?.("catalog-activated");

    for (const replacement of input.postActivationReplacements ?? []) {
      install(replacement);
    }
    for (const targetPath of input.postActivationDeletions) {
      remove(targetPath);
    }
    input.onStep?.("post-activation-cleaned");

    await input.validate();
    input.onStep?.("validated");
  } catch (error) {
    for (const mutation of [...mutations].reverse()) {
      rmSync(mutation.targetPath, { recursive: true, force: true });
      if (mutation.backupPath) {
        mkdirSync(dirname(mutation.targetPath), { recursive: true });
        renameSync(mutation.backupPath, mutation.targetPath);
      }
    }
    throw error;
  }
}
