import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Type → directory and naming conventions.
 *
 * Naming rules:
 *   - decision: docs/decisions/ADR-NNNN-<slug>.md, id: ADR-NNNN
 *   - spec:     docs/specs/active/SPEC-NNNN-<slug>.md, id: SPEC-NNNN
 *   - plan:     docs/plans/active/PLAN-NNNN-<slug>.md, id: PLAN-NNNN
 *   - canon:    docs/canon/[<subdir>/]<slug>.md, id: <SLUG-UPPER>
 *   - policy:   docs/policy/<slug>.md, id: <SLUG-UPPER>
 *   - reference: docs/reference/[<subdir>/]<slug>.md, id: REF-<SLUG-UPPER>
 *   - archive:  not creatable via `doc-gov new`; use `doc-gov archive <id>` instead.
 */

export interface NewPathPlan {
  filePath: string;
  id: string;
  slug: string;
  subdir: string;
}

export function planPath(rootDir: string, type: string, slugInput: string): NewPathPlan {
  const cleanSlug = slugInput.replace(/^\/+|\/+$/g, '');
  if (!cleanSlug) throw new Error('Slug is required.');

  const parts = cleanSlug.split('/').filter(Boolean);
  const baseSlug = parts[parts.length - 1] ?? '';
  const subdir = parts.slice(0, -1).join('/');

  if (!isKebabCase(baseSlug)) {
    throw new Error(`Slug "${baseSlug}" must be kebab-case (lowercase, digits, hyphens).`);
  }

  if (type === 'decision') {
    const n = nextSerial(rootDir, 'docs/decisions', /^ADR-(\d{4})-/);
    return {
      filePath: `docs/decisions/ADR-${n}-${baseSlug}.md`,
      id: `ADR-${n}`,
      slug: baseSlug,
      subdir: '',
    };
  }
  if (type === 'spec') {
    const n = nextSerial(rootDir, 'docs/specs', /^SPEC-(\d{4})-/);
    return {
      filePath: `docs/specs/active/SPEC-${n}-${baseSlug}.md`,
      id: `SPEC-${n}`,
      slug: baseSlug,
      subdir: '',
    };
  }
  if (type === 'plan') {
    const n = nextSerial(rootDir, 'docs/plans', /^PLAN-(\d{4})-/);
    return {
      filePath: `docs/plans/active/PLAN-${n}-${baseSlug}.md`,
      id: `PLAN-${n}`,
      slug: baseSlug,
      subdir: '',
    };
  }
  if (type === 'canon') {
    const dir = subdir ? `docs/canon/${subdir}` : 'docs/canon';
    return {
      filePath: `${dir}/${baseSlug}.md`,
      id: kebabToUpper(baseSlug),
      slug: baseSlug,
      subdir,
    };
  }
  if (type === 'policy') {
    return {
      filePath: `docs/policy/${baseSlug}.md`,
      id: kebabToUpper(baseSlug),
      slug: baseSlug,
      subdir: '',
    };
  }
  if (type === 'reference') {
    const dir = subdir ? `docs/reference/${subdir}` : 'docs/reference';
    return {
      filePath: `${dir}/${baseSlug}.md`,
      id: `REF-${kebabToUpper(baseSlug)}`,
      slug: baseSlug,
      subdir,
    };
  }
  if (type === 'archive') {
    throw new Error('Use "doc-gov archive <id>" instead of "doc-gov new archive ...".');
  }
  throw new Error(`Unknown type: ${type}`);
}

function nextSerial(rootDir: string, scanDir: string, regex: RegExp): string {
  const root = join(rootDir, scanDir);
  if (!existsSync(root)) return '0001';
  let max = 0;
  walkSerial(root, regex, (n) => {
    if (n > max) max = n;
  });
  return String(max + 1).padStart(4, '0');
}

function walkSerial(dir: string, regex: RegExp, onMatch: (n: number) => void): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkSerial(path, regex, onMatch);
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      const m = entry.name.match(regex);
      if (m && m[1]) onMatch(parseInt(m[1], 10));
    }
  }
}

function isKebabCase(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function kebabToUpper(slug: string): string {
  return slug.toUpperCase();
}

export function quarterTag(date = new Date()): string {
  const y = date.getUTCFullYear();
  const q = Math.floor(date.getUTCMonth() / 3) + 1;
  return `${y}-q${q}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
