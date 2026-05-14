import { readFrontmatterFile } from './frontmatter';
import { listGovernedMarkdownFiles } from './files';
import { validateFrontmatter, type DocIssue, type DocRecord } from './schema';

export interface CheckResult {
  ok: boolean;
  records: DocRecord[];
  issues: DocIssue[];
}

export function checkDocs(rootDir = process.cwd()): CheckResult {
  const issues: DocIssue[] = [];
  const records: DocRecord[] = [];

  for (const path of listGovernedMarkdownFiles(rootDir)) {
    const repoPath = pathToRepo(rootDir, path);
    issues.push(...validateGovernedPath(repoPath));

    const file = readFrontmatterFile(path);
    if (!file) {
      issues.push({
        file: repoPath,
        code: 'missing-frontmatter',
        message: 'Markdown file must start with YAML frontmatter.',
      });
      continue;
    }

    const result = validateFrontmatter(rootDir, file);
    issues.push(...result.issues);
    if (result.record) records.push(result.record);
  }

  issues.push(...validateGlobalIntegrity(records));
  return {
    ok: issues.length === 0,
    records: records.sort((a, b) => a.path.localeCompare(b.path)),
    issues,
  };
}

function validateGlobalIntegrity(records: DocRecord[]): DocIssue[] {
  const issues: DocIssue[] = [];
  const byId = new Map<string, DocRecord[]>();
  for (const record of records) {
    byId.set(record.id, [...(byId.get(record.id) ?? []), record]);
  }

  for (const [id, matches] of byId.entries()) {
    if (matches.length > 1) {
      for (const match of matches) {
        issues.push({
          file: match.path,
          code: 'duplicate-id',
          message: `Duplicate document id: ${id}`,
        });
      }
    }
  }

  const ids = new Set(records.map((record) => record.id));
  for (const record of records) {
    for (const relatedId of record.related) {
      if (!ids.has(relatedId)) {
        issues.push({
          file: record.path,
          code: 'missing-related',
          message: `related id does not exist: ${relatedId}`,
        });
      }
    }

    for (const supersededId of record.supersedes) {
      if (!ids.has(supersededId)) {
        issues.push({
          file: record.path,
          code: 'missing-supersedes',
          message: `supersedes id does not exist: ${supersededId}`,
        });
      }
    }

    if (record.supersededBy && !ids.has(record.supersededBy)) {
      issues.push({
        file: record.path,
        code: 'missing-superseded-by-target',
        message: `superseded_by id does not exist: ${record.supersededBy}`,
      });
    }
  }

  return issues;
}

function validateGovernedPath(path: string): DocIssue[] {
  const issues: DocIssue[] = [];
  const segments = path.split('/');
  const fileName = segments[segments.length - 1] ?? '';
  const baseName = fileName.replace(/\.md$/i, '').toLowerCase();

  if (fileName.toLowerCase() === 'readme.md') {
    issues.push({
      file: path,
      code: 'non-root-readme',
      message:
        'Governed docs must use purpose-based names, not README.md. Keep README.md as the root human introduction only.',
    });
  }

  const forbiddenFileNames = new Set([
    'temp',
    'tmp',
    'scratch',
    'notes',
    'untitled',
    'new',
    'copy',
    'final',
    'final-final',
    'final-v2',
    'latest',
    'wip',
    'todo',
  ]);

  if (forbiddenFileNames.has(baseName)) {
    issues.push({
      file: path,
      code: 'forbidden-doc-name',
      message:
        'Governed docs must use content-based names, not temp/latest/final/todo-style names.',
    });
  }

  const aiNameSegment = segments.find((segment) =>
    /^(opus|codex|copilot|claude|gemini|cursor)(?:[-_ .]?\d.*)?$/i.test(segment)
  );
  if (aiNameSegment) {
    issues.push({
      file: path,
      code: 'ai-name-directory',
      message: `Do not classify governed docs by AI/tool name (${aiNameSegment}); classify by type and domain.`,
    });
  }

  return issues;
}

function pathToRepo(rootDir: string, path: string): string {
  return path.startsWith(rootDir)
    ? path
        .slice(rootDir.length + 1)
        .split(/\\/g)
        .join('/')
    : path;
}
