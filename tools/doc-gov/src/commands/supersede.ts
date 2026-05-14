import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocs } from '../core/checker';
import { todayIso } from '../core/paths';
import { writeManifest } from '../core/manifest';
import { updateFrontmatterField } from './approve';

export function runSupersede(args: string[]): number {
  const [oldId, newId] = args;
  if (!oldId || !newId) {
    console.error('Usage: pnpm doc-gov supersede <old-id> <new-id>');
    return 1;
  }

  const root = process.cwd();
  const result = checkDocs(root);
  if (!result.ok) {
    console.error('doc-gov check currently fails; fix issues before superseding.');
    return 1;
  }
  const oldRec = result.records.find((r) => r.id === oldId);
  const newRec = result.records.find((r) => r.id === newId);
  if (!oldRec) {
    console.error(`No doc with id: ${oldId}`);
    return 1;
  }
  if (!newRec) {
    console.error(`No doc with id: ${newId}`);
    return 1;
  }
  if (oldRec.type !== newRec.type) {
    console.error(
      `Cannot supersede across types: ${oldId}=${oldRec.type} vs ${newId}=${newRec.type}.`
    );
    return 1;
  }
  if (oldRec.pinned) {
    console.error(
      `${oldId} is pinned. Use commit message "Pinned-Override: ${oldId}" via human commit.`
    );
    return 1;
  }

  const today = todayIso();

  // Update old: status=superseded, canonical=false, superseded_by=newId
  const oldPath = join(root, oldRec.path);
  let oldContent = readFileSync(oldPath, 'utf8');
  oldContent = updateFrontmatterField(oldContent, 'status', 'superseded');
  oldContent = updateFrontmatterField(oldContent, 'canonical', 'false');
  oldContent = updateFrontmatterField(oldContent, 'superseded_by', newId);
  oldContent = updateFrontmatterField(oldContent, 'last_reviewed', today);
  writeFileSync(oldPath, oldContent);

  // Update new: append oldId to supersedes list
  const newPath = join(root, newRec.path);
  let newContent = readFileSync(newPath, 'utf8');
  newContent = appendToFrontmatterList(newContent, 'supersedes', newId === oldId ? '' : oldId);
  newContent = updateFrontmatterField(newContent, 'last_reviewed', today);
  writeFileSync(newPath, newContent);

  console.log(`Superseded ${oldId} (${oldRec.path}) by ${newId} (${newRec.path}).`);
  console.log(`  ${oldId}: status=superseded, canonical=false, superseded_by=${newId}`);
  console.log(`  ${newId}: supersedes += [${oldId}]`);

  try {
    writeManifest(root);
    console.log('MANIFEST.yml regenerated.');
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  return 0;
}

export function appendToFrontmatterList(content: string, key: string, value: string): string {
  if (!value) return content;
  if (!content.startsWith('---\n')) throw new Error('File has no frontmatter.');
  const closing = content.indexOf('\n---', 4);
  if (closing === -1) throw new Error('Frontmatter is unterminated.');
  const head = content.slice(4, closing);
  const tail = content.slice(closing);

  const lines = head.split('\n');
  const keyRe = new RegExp(`^${key}:\\s*(.*)$`);
  const idx = lines.findIndex((l) => keyRe.test(l));
  if (idx === -1) {
    lines.push(`${key}:`);
    lines.push(`  - ${value}`);
    return `---\n${lines.join('\n')}${tail}`;
  }
  const inlineMatch = lines[idx]?.match(keyRe);
  const existing = inlineMatch?.[1]?.trim() ?? '';
  if (existing === '[]' || existing === '') {
    // empty list — convert to multi-line and append
    lines[idx] = `${key}:`;
    lines.splice(idx + 1, 0, `  - ${value}`);
    return `---\n${lines.join('\n')}${tail}`;
  }
  // Already a list, append after last item.
  let insertAt = idx + 1;
  while (insertAt < lines.length && /^\s+-\s+/.test(lines[insertAt] ?? '')) insertAt++;
  lines.splice(insertAt, 0, `  - ${value}`);
  return `---\n${lines.join('\n')}${tail}`;
}
