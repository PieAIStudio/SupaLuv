import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { checkDocs } from '../core/checker';
import { quarterTag, todayIso } from '../core/paths';
import { writeManifest } from '../core/manifest';
import { updateFrontmatterField } from './approve';

export function runArchive(args: string[]): number {
  const positional = args.filter((a) => !a.startsWith('--'));
  const id = positional[0];
  const reasonIdx = args.indexOf('--reason');
  const reason = reasonIdx !== -1 ? (args[reasonIdx + 1] ?? '') : '';

  if (!id) {
    console.error('Usage: pnpm doc-gov archive <id> [--reason <text>]');
    return 1;
  }
  if (!reason) {
    console.error('--reason is required (one short sentence describing why this doc is retired).');
    return 1;
  }

  const root = process.cwd();
  const result = checkDocs(root);
  if (!result.ok) {
    console.error('doc-gov check currently fails; fix issues before archiving.');
    return 1;
  }
  const record = result.records.find((r) => r.id === id);
  if (!record) {
    console.error(`No doc with id: ${id}`);
    return 1;
  }
  if (record.pinned) {
    console.error(
      `${id} is pinned. A human must commit the archival with "Pinned-Override: ${id}".`
    );
    return 1;
  }
  if (record.type === 'archive') {
    console.error(`${id} is already archived.`);
    return 1;
  }

  const oldPath = record.path;
  const fileName = basename(oldPath);
  const archiveDir = `docs/archive/${quarterTag()}-${record.type}`;
  const newPath = `${archiveDir}/${fileName}`;
  const absNew = join(root, newPath);

  // Update frontmatter first.
  const absOld = join(root, oldPath);
  let content = readFileSync(absOld, 'utf8');
  content = updateFrontmatterField(content, 'type', 'archive');
  content = updateFrontmatterField(content, 'status', 'archived');
  content = updateFrontmatterField(content, 'canonical', 'false');
  content = updateFrontmatterField(content, 'last_reviewed', todayIso());
  content = updateFrontmatterField(content, 'archive_reason', reason);

  // Move file (use git mv if inside a git repo for history preservation).
  mkdirSync(dirname(absNew), { recursive: true });
  let movedByGit = false;
  try {
    execSync(`git mv "${oldPath}" "${newPath}"`, { cwd: root, stdio: 'ignore' });
    movedByGit = true;
  } catch {
    renameSync(absOld, absNew);
  }
  writeFileSync(absNew, content);

  console.log(
    `Archived ${id}: ${oldPath} → ${newPath}${movedByGit ? ' (git mv)' : ' (fs rename)'}`
  );

  try {
    writeManifest(root);
    console.log('MANIFEST.yml regenerated.');
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  return 0;
}
