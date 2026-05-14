import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { toRepoPath } from './files';

export interface LinkIssue {
  file: string;
  line: number;
  target: string;
  message: string;
}

export interface LinkCheckResult {
  ok: boolean;
  checkedFiles: number;
  checkedLinks: number;
  issues: LinkIssue[];
}

const CURRENT_MARKDOWN_ROOTS = ['AGENTS.md', 'README.md', 'docs'] as const;

const CURRENT_DOC_DIR_PREFIXES = [
  'docs/canon/',
  'docs/reference/',
  'docs/plans/',
  'docs/specs/',
  'docs/decisions/',
  'docs/policy/',
] as const;

const LINK_PATTERN = /!??\[[^\]\n]*\]\(([^)\n]+)\)/g;

export function checkCurrentMarkdownLinks(rootDir = process.cwd()): LinkCheckResult {
  const files = listCurrentMarkdownFiles(rootDir);
  const issues: LinkIssue[] = [];
  let checkedLinks = 0;

  for (const filePath of files) {
    const content = readText(filePath);
    let match: RegExpExecArray | null;
    while ((match = LINK_PATTERN.exec(content))) {
      const rawTarget = match[1]?.trim();
      if (!rawTarget) continue;
      const target = parseMarkdownLinkTarget(rawTarget);
      if (!target || shouldIgnoreTarget(target)) continue;

      checkedLinks += 1;
      if (!localTargetExists(rootDir, filePath, target)) {
        const file = toRepoPath(rootDir, filePath);
        const line = lineNumberAt(content, match.index);
        issues.push({
          file,
          line,
          target,
          message: `Broken current doc link: ${file}:${line} -> ${target}`,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    checkedFiles: files.length,
    checkedLinks,
    issues,
  };
}

function listCurrentMarkdownFiles(rootDir: string): string[] {
  const files: string[] = [];
  for (const root of CURRENT_MARKDOWN_ROOTS) {
    const fullPath = join(rootDir, root);
    if (!existsSync(fullPath)) continue;
    const stat = lstatSync(fullPath);
    if (stat.isSymbolicLink()) continue;
    if (stat.isDirectory()) files.push(...walkMarkdown(rootDir, fullPath));
    else if (stat.isFile() && fullPath.endsWith('.md')) files.push(fullPath);
  }
  return Array.from(new Set(files)).sort();
}

function walkMarkdown(rootDir: string, dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const repoPath = toRepoPath(rootDir, fullPath);
    if (shouldSkipTree(repoPath)) continue;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...walkMarkdown(rootDir, fullPath));
    if (entry.isFile() && entry.name.endsWith('.md') && shouldIncludeSource(repoPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldSkipTree(repoPath: string): boolean {
  if (repoPath.startsWith('docs/archive/')) return true;
  if (repoPath.startsWith('docs/governance/templates/')) return true;
  if (repoPath === 'docs/governance/MANIFEST.yml') return true;
  return false;
}

function shouldIncludeSource(repoPath: string): boolean {
  if (repoPath.startsWith('docs/')) {
    if (repoPath.startsWith('docs/governance/')) return true;
    return CURRENT_DOC_DIR_PREFIXES.some((prefix) => repoPath.startsWith(prefix));
  }
  return false;
}

function parseMarkdownLinkTarget(rawTarget: string): string {
  const trimmed = rawTarget.trim();
  if (trimmed.startsWith('<')) {
    const closeIndex = trimmed.indexOf('>');
    if (closeIndex > 0) return trimmed.slice(1, closeIndex);
  }
  return trimmed.split(/\s+/)[0] ?? '';
}

function shouldIgnoreTarget(target: string): boolean {
  if (target.startsWith('#')) return true;
  if (target.startsWith('//')) return true;
  return /^[a-z][a-z0-9+.-]*:/i.test(target);
}

function localTargetExists(rootDir: string, sourcePath: string, target: string): boolean {
  const pathPart = decodeTarget(target).split('#')[0]?.split('?')[0] ?? '';
  if (!pathPart) return true;

  const resolved = pathPart.startsWith('/')
    ? resolve(rootDir, `.${pathPart}`)
    : resolve(dirname(sourcePath), pathPart);

  const candidates = [resolved];
  if (!extname(resolved)) {
    candidates.push(`${resolved}.md`);
  }
  return candidates.some((candidate) => existsSync(candidate));
}

function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target);
  } catch {
    return target;
  }
}

function lineNumberAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function readText(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}
