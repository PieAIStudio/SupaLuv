import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkDocs } from './checker';
import type { DocRecord } from './schema';

export function buildManifest(rootDir = process.cwd()): string {
  const result = checkDocs(rootDir);
  if (!result.ok) {
    const error = result.issues
      .map((issue) => `${issue.file}: ${issue.code}: ${issue.message}`)
      .join('\n');
    throw new Error(`Cannot build manifest while doc-gov check fails:\n${error}`);
  }
  return renderManifest(result.records);
}

export function writeManifest(rootDir = process.cwd()): void {
  const manifest = buildManifest(rootDir);
  const path = join(rootDir, 'docs/governance/MANIFEST.yml');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, manifest);
}

export function manifestInSync(rootDir = process.cwd()): boolean {
  const path = join(rootDir, 'docs/governance/MANIFEST.yml');
  if (!existsSync(path)) return false;
  return (
    normalizeManifest(readFileSync(path, 'utf8')) === normalizeManifest(buildManifest(rootDir))
  );
}

function normalizeManifest(value: string): string {
  return value.replace(/^generated_at: .*$/m, 'generated_at: <ignored>');
}

function renderManifest(records: DocRecord[]): string {
  const lines = [
    '# docs/governance/MANIFEST.yml — auto-generated, DO NOT EDIT MANUALLY',
    '# Regenerate: pnpm doc-gov scan',
    `generated_at: ${new Date().toISOString()}`,
    'generator_version: doc-gov@0.2.0',
    `docs_count: ${records.length}`,
    'docs:',
  ];

  for (const record of records) {
    lines.push(`  - id: ${record.id}`);
    lines.push(`    path: ${record.path}`);
    lines.push(`    type: ${record.type}`);
    lines.push(`    status: ${record.status}`);
    lines.push(`    canonical: ${record.canonical}`);
    lines.push(`    last_reviewed: ${record.lastReviewed}`);
    lines.push(`    pinned: ${record.pinned}`);
  }

  lines.push('');
  return lines.join('\n');
}
