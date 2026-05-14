import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocs } from '../core/checker';
import { checkCurrentMarkdownLinks } from '../core/link-checker';

export function runAudit(): number {
  const root = process.cwd();
  const result = checkDocs(root);
  let warnings = 0;

  if (!result.ok) {
    for (const issue of result.issues) {
      console.error(`${issue.file}: ${issue.code}: ${issue.message}`);
    }
    return 1;
  }

  const migrationSource = join(root, 'Docs-for trans');
  if (existsSync(migrationSource)) {
    const count = countFiles(migrationSource);
    warnings += 1;
    console.log(
      `Migration source still exists: Docs-for trans (${count} files). This was a one-time migration shell; it should not be reintroduced.`
    );
  }

  if (existsSync(join(root, 'DocSystemStarter.md'))) {
    warnings += 1;
    console.log(
      'Stray root-level DocSystemStarter.md exists. The original draft has been archived; remove or re-archive.'
    );
  }

  const rootEntries = new Set(readdirSync(root));
  if (rootEntries.has('Docs')) {
    console.error(
      'Old Docs/ directory still exists. Move remaining files into docs/ or archive them.'
    );
    return 1;
  }

  const linkResult = checkCurrentMarkdownLinks(root);
  if (!linkResult.ok) {
    for (const issue of linkResult.issues) {
      console.error(issue.message);
    }
    return 1;
  }

  console.log(`doc-gov audit completed with ${warnings} warning(s).`);
  return 0;
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) count += countFiles(path);
    if (entry.isFile() || entry.isSymbolicLink()) count += 1;
  }
  return count;
}
