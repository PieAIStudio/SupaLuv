import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export function listGovernedMarkdownFiles(rootDir: string): string[] {
  const roots = [join(rootDir, 'docs')];
  const files: string[] = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    files.push(...walk(rootDir, root));
  }
  return files.sort();
}

function walk(rootDir: string, dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    const rel = toRepoPath(rootDir, path);
    if (shouldSkip(rel)) continue;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walk(rootDir, path));
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}

function shouldSkip(repoPath: string) {
  return (
    repoPath.startsWith('docs/governance/templates/') ||
    repoPath === 'docs/governance/MANIFEST.yml'
  );
}

export function toRepoPath(rootDir: string, absolutePath: string): string {
  return relative(rootDir, absolutePath).split(/\\/g).join('/');
}

export function fileExists(rootDir: string, repoPath: string): boolean {
  return existsSync(join(rootDir, repoPath));
}

export function isDirectory(rootDir: string, repoPath: string): boolean {
  const path = join(rootDir, repoPath);
  return existsSync(path) && statSync(path).isDirectory();
}
