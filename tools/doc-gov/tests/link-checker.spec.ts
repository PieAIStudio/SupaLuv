import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkCurrentMarkdownLinks } from '../src/core/link-checker';

let roots: string[] = [];

afterEach(() => {
  for (const root of roots) rmSync(root, { force: true, recursive: true });
  roots = [];
});

describe('checkCurrentMarkdownLinks', () => {
  it('fails current docs with broken relative links', () => {
    const root = createFixture({
      'docs/reference/architecture/tech.md':
        '---\nid: T\ntitle: T\ntype: reference\n---\n[broken](deployment/deployment-guide.md)\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([
      {
        file: 'docs/reference/architecture/tech.md',
        line: 6,
        target: 'deployment/deployment-guide.md',
        message:
          'Broken current doc link: docs/reference/architecture/tech.md:6 -> deployment/deployment-guide.md',
      },
    ]);
  });

  it('passes current docs with valid relative links', () => {
    const root = createFixture({
      'docs/reference/architecture/tech.md':
        '---\nid: T\ntitle: T\ntype: reference\n---\n[deployment](../deployment/deployment-guide.md)\n',
      'docs/reference/deployment/deployment-guide.md': '# Deployment\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('ignores broken links inside archive docs', () => {
    const root = createFixture({
      'docs/archive/old.md': '[old broken](../missing.md)\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(true);
  });

  it('does not treat doc-governance templates as current link truth', () => {
    const root = createFixture({
      'docs/governance/templates/plan.md': '[template broken](missing.md)\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(true);
  });

  it('ignores external URLs', () => {
    const root = createFixture({
      'README.md': '[external](https://example.com/no-local-file)\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(true);
  });

  it('ignores anchor-only links', () => {
    const root = createFixture({
      'README.md': '[same page](#section)\n',
    });

    const result = checkCurrentMarkdownLinks(root);

    expect(result.ok).toBe(true);
  });
});

function createFixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'pieflow-doc-gov-links-'));
  roots.push(root);
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(root, relativePath);
    mkdirSync(join(fullPath, '..'), { recursive: true });
    writeFileSync(fullPath, content);
  }
  return root;
}
