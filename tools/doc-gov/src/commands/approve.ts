import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocs } from '../core/checker';
import { todayIso } from '../core/paths';
import { writeManifest } from '../core/manifest';

export function runApprove(args: string[]): number {
  const id = args[0];
  if (!id) {
    console.error('Usage: pnpm doc-gov approve <id>');
    return 1;
  }

  const root = process.cwd();
  const result = checkDocs(root);
  if (!result.ok) {
    console.error('doc-gov check currently fails; fix issues before approving.');
    return 1;
  }
  const record = result.records.find((r) => r.id === id);
  if (!record) {
    console.error(`No doc found with id: ${id}`);
    return 1;
  }

  const fromStatus = record.status;
  let toStatus: string;
  if (fromStatus === 'draft') toStatus = 'active';
  else if (fromStatus === 'proposed') toStatus = 'accepted';
  else {
    console.error(
      `Cannot approve doc with status=${fromStatus}. Only draft or proposed can be approved.`
    );
    return 1;
  }

  const filePath = join(root, record.path);
  const content = readFileSync(filePath, 'utf8');
  let next = content;
  next = updateFrontmatterField(next, 'status', toStatus);
  next = updateFrontmatterField(next, 'canonical', 'true');
  next = updateFrontmatterField(next, 'last_reviewed', todayIso());
  writeFileSync(filePath, next);

  console.log(`Approved ${id}: ${fromStatus} → ${toStatus}, canonical=true.`);
  console.log(`\nIMPORTANT: when committing this change, include in the commit message:`);
  console.log(`  Approves: ${id}`);
  console.log(`(Lefthook commit-msg hook checks for this line on draft→active transitions.)`);

  try {
    writeManifest(root);
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }
  return 0;
}

export function updateFrontmatterField(content: string, key: string, value: string): string {
  // Simple line-based update inside the frontmatter block (between first `---\n` and `\n---`).
  if (!content.startsWith('---\n')) {
    throw new Error('File has no frontmatter.');
  }
  const closing = content.indexOf('\n---', 4);
  if (closing === -1) throw new Error('Frontmatter is unterminated.');
  const head = content.slice(4, closing);
  const tail = content.slice(closing);

  const lines = head.split('\n');
  const re = new RegExp(`^${key}:`);
  let replaced = false;
  const newLines = lines.map((line) => {
    if (re.test(line) && !replaced) {
      replaced = true;
      return `${key}: ${value}`;
    }
    return line;
  });
  if (!replaced) {
    // Append before the end of frontmatter.
    newLines.push(`${key}: ${value}`);
  }
  return `---\n${newLines.join('\n')}${tail}`;
}
