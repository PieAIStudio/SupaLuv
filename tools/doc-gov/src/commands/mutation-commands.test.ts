import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkDocs } from '../core/checker';
import { parseFrontmatter } from '../core/frontmatter';
import { quarterTag } from '../core/paths';
import { runApprove } from './approve';
import { runArchive } from './archive';
import { runSupersede } from './supersede';
import { runVerifyCommitMsg } from './verify-commit-msg';

test('approve promotes draft docs to active canonical docs', () => {
  const root = createRoot();
  writeDoc(root, 'docs/specs/active/SPEC-0001-draft-spec.md', {
    id: 'SPEC-0001',
    title: 'Draft Spec',
    type: 'spec',
    status: 'draft',
    canonical: 'false',
  });

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runApprove(['SPEC-0001']), 0);
  }));

  const fm = readFrontmatter(root, 'docs/specs/active/SPEC-0001-draft-spec.md');
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(fm.status, 'active');
  assert.equal(fm.canonical, true);
  assert.equal(fm.last_reviewed, today);
  assert.equal(existsSync(join(root, 'docs/governance/MANIFEST.yml')), true);
  assert.equal(checkDocs(root).ok, true);
});

test('approve promotes proposed decisions to accepted canonical decisions', () => {
  const root = createRoot();
  writeDoc(root, 'docs/decisions/ADR-0001-adopt.md', {
    id: 'ADR-0001',
    title: 'Adopt',
    type: 'decision',
    status: 'proposed',
    canonical: 'true',
  });

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runApprove(['ADR-0001']), 0);
  }));

  const fm = readFrontmatter(root, 'docs/decisions/ADR-0001-adopt.md');
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(fm.status, 'accepted');
  assert.equal(fm.canonical, true);
  assert.equal(fm.last_reviewed, today);
  assert.equal(checkDocs(root).ok, true);
});

test('supersede updates old and new docs bidirectionally', () => {
  const root = createRoot();
  writeDoc(root, 'docs/policy/old-rule.md', {
    id: 'POLICY-OLD-RULE',
    title: 'Old Rule',
    type: 'policy',
    status: 'stable',
    canonical: 'true',
  });
  writeDoc(root, 'docs/policy/new-rule.md', {
    id: 'POLICY-NEW-RULE',
    title: 'New Rule',
    type: 'policy',
    status: 'stable',
    canonical: 'true',
  });

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runSupersede(['POLICY-OLD-RULE', 'POLICY-NEW-RULE']), 0);
  }));

  const oldFm = readFrontmatter(root, 'docs/policy/old-rule.md');
  const newFm = readFrontmatter(root, 'docs/policy/new-rule.md');
  assert.equal(oldFm.status, 'superseded');
  assert.equal(oldFm.canonical, false);
  assert.equal(oldFm.superseded_by, 'POLICY-NEW-RULE');
  assert.deepEqual(newFm.supersedes, ['POLICY-OLD-RULE']);
  assert.equal(checkDocs(root).ok, true);
});

test('archive moves a doc and marks it archived', () => {
  const root = createRoot();
  writeDoc(root, 'docs/plans/active/PLAN-0001-old-plan.md', {
    id: 'PLAN-0001',
    title: 'Old Plan',
    type: 'plan',
    status: 'active',
    canonical: 'true',
  });

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runArchive(['PLAN-0001', '--reason', 'No longer current.']), 0);
  }));

  const archivedPath = `docs/archive/${quarterTag()}-plan/PLAN-0001-old-plan.md`;
  assert.equal(existsSync(join(root, 'docs/plans/active/PLAN-0001-old-plan.md')), false);
  assert.equal(existsSync(join(root, archivedPath)), true);

  const fm = readFrontmatter(root, archivedPath);
  assert.equal(fm.type, 'archive');
  assert.equal(fm.status, 'archived');
  assert.equal(fm.canonical, false);
  assert.equal(fm.archive_reason, 'No longer current.');
  assert.equal(checkDocs(root).ok, true);
});

test('verify-commit-msg requires Pinned-Override when a pinned doc is staged', () => {
  const root = createGitRoot();
  writeDoc(root, 'docs/policy/pinned-rule.md', {
    id: 'POLICY-PINNED-RULE',
    title: 'Pinned Rule',
    type: 'policy',
    status: 'stable',
    canonical: 'true',
    pinned: 'true',
  });
  commitAll(root, 'seed pinned doc');

  append(root, 'docs/policy/pinned-rule.md', '\nChanged.\n');
  execSync('git add docs/policy/pinned-rule.md', { cwd: root });

  const badMsg = writeMessage(root, 'docs: update pinned doc\n');
  const goodMsg = writeMessage(
    root,
    'docs: update pinned doc\n\nPinned-Override: POLICY-PINNED-RULE\n'
  );

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runVerifyCommitMsg([badMsg]), 1);
    assert.equal(runVerifyCommitMsg([goodMsg]), 0);
  }));
});

test('verify-commit-msg requires Approves when status is promoted', () => {
  const root = createGitRoot();
  writeDoc(root, 'docs/specs/active/SPEC-0001-approval.md', {
    id: 'SPEC-0001',
    title: 'Approval',
    type: 'spec',
    status: 'draft',
    canonical: 'false',
  });
  commitAll(root, 'seed draft doc');

  replace(root, 'docs/specs/active/SPEC-0001-approval.md', 'status: draft', 'status: active');
  replace(root, 'docs/specs/active/SPEC-0001-approval.md', 'canonical: false', 'canonical: true');
  execSync('git add docs/specs/active/SPEC-0001-approval.md', { cwd: root });

  const badMsg = writeMessage(root, 'docs: approve spec\n');
  const goodMsg = writeMessage(root, 'docs: approve spec\n\nApproves: SPEC-0001\n');

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runVerifyCommitMsg([badMsg]), 1);
    assert.equal(runVerifyCommitMsg([goodMsg]), 0);
  }));
});

function createRoot(): string {
  return mkdtempSync(join(tmpdir(), 'doc-gov-mutation-'));
}

function createGitRoot(): string {
  const root = createRoot();
  execSync('git init', { cwd: root, stdio: 'ignore' });
  execSync('git config user.email test@example.com', { cwd: root });
  execSync('git config user.name "Doc Gov Test"', { cwd: root });
  return root;
}

function writeDoc(
  root: string,
  path: string,
  values: {
    id: string;
    title: string;
    type: string;
    status: string;
    canonical: string;
    pinned?: string;
  }
): void {
  const abs = join(root, path);
  execSync(`mkdir -p ${shellQuote(dirname(abs))}`);
  writeFileSync(
    abs,
    [
      '---',
      `id: ${values.id}`,
      `title: ${values.title}`,
      `type: ${values.type}`,
      `status: ${values.status}`,
      `canonical: ${values.canonical}`,
      'owner: human',
      'created: 2026-05-09',
      'last_reviewed: 2026-05-09',
      'domain: test',
      'tags:',
      '  - test',
      `pinned: ${values.pinned ?? 'false'}`,
      'related: []',
      'supersedes: []',
      'superseded_by: null',
      '---',
      '',
      `# ${values.title}`,
      '',
    ].join('\n')
  );
}

function readFrontmatter(root: string, path: string): Record<string, string | boolean | string[] | null> {
  const content = readFileSync(join(root, path), 'utf8');
  const closing = content.indexOf('\n---', 4);
  return parseFrontmatter(content.slice(4, closing).trimEnd());
}

function commitAll(root: string, message: string): void {
  execSync('git add .', { cwd: root });
  execSync(`git commit -m ${shellQuote(message)}`, { cwd: root, stdio: 'ignore' });
}

function writeMessage(root: string, message: string): string {
  const path = join(root, `.git/COMMIT_EDITMSG-${Math.random().toString(16).slice(2)}`);
  writeFileSync(path, message);
  return path;
}

function append(root: string, path: string, value: string): void {
  const abs = join(root, path);
  writeFileSync(abs, readFileSync(abs, 'utf8') + value);
}

function replace(root: string, path: string, from: string, to: string): void {
  const abs = join(root, path);
  writeFileSync(abs, readFileSync(abs, 'utf8').replace(from, to));
}

function withCwd(root: string, fn: () => void): void {
  const previous = process.cwd();
  try {
    process.chdir(root);
    fn();
  } finally {
    process.chdir(previous);
  }
}

function withMutedConsole(fn: () => void): void {
  const originalLog = console.log;
  const originalError = console.error;
  try {
    console.log = () => undefined;
    console.error = () => undefined;
    fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
