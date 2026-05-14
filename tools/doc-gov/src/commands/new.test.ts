import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkDocs } from '../core/checker';
import { runInit } from './init';
import { runNew } from './new';

test('init writes templates and new creates every creatable doc type', () => {
  const root = mkdtempSync(join(tmpdir(), 'doc-gov-new-journey-'));

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runInit([]), 0);
    for (const template of [
      'adr.md',
      'spec.md',
      'plan.md',
      'canon-entry.md',
      'reference.md',
      'policy.md',
      'archive.md',
    ]) {
      assert.equal(existsSync(join(root, 'docs/governance/templates', template)), true);
    }

    assert.equal(runNew(['decision', 'adopt-doc-gov']), 0);
    assert.equal(runNew(['spec', 'test-spec']), 0);
    assert.equal(runNew(['plan', 'test-plan']), 0);
    assert.equal(runNew(['canon', 'test-canon']), 0);
    assert.equal(runNew(['policy', 'test-policy']), 0);
    assert.equal(runNew(['reference', 'test-reference']), 0);
  }));

  assert.equal(existsSync(join(root, 'docs/decisions/ADR-0001-adopt-doc-gov.md')), true);
  assert.equal(existsSync(join(root, 'docs/specs/active/SPEC-0001-test-spec.md')), true);
  assert.equal(existsSync(join(root, 'docs/plans/active/PLAN-0001-test-plan.md')), true);
  assert.equal(existsSync(join(root, 'docs/canon/test-canon.md')), true);
  assert.equal(existsSync(join(root, 'docs/policy/test-policy.md')), true);
  assert.equal(existsSync(join(root, 'docs/reference/test-reference.md')), true);
  assert.equal(existsSync(join(root, 'docs/governance/MANIFEST.yml')), true);

  const result = checkDocs(root);
  assert.equal(result.ok, true);
  assert.equal(result.records.length, 6);
});

test('new can use built-in fallback templates when project templates are missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'doc-gov-new-fallback-'));

  withCwd(root, () => withMutedConsole(() => {
    assert.equal(runNew(['spec', 'fallback-spec']), 0);
  }));

  assert.equal(existsSync(join(root, 'docs/specs/active/SPEC-0001-fallback-spec.md')), true);
  assert.equal(checkDocs(root).ok, true);
});

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
