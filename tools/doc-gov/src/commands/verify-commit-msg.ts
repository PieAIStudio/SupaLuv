import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import {
  booleanValue,
  parseFrontmatter,
  readFrontmatterFile,
  stringValue,
} from '../core/frontmatter';

/**
 * Verifies that the commit message contains the proper override markers when:
 *
 * - pinned: true documents are modified
 * - a document is promoted from draft→active
 * - a decision is promoted from proposed→accepted
 *
 * Used by lefthook commit-msg hook.
 */
export function runVerifyCommitMsg(args: string[]): number {
  const msgFile = args[0];
  if (!msgFile || !existsSync(msgFile)) {
    // Lefthook may pass an empty arg in some hook contexts; do not block.
    return 0;
  }
  const message = readFileSync(msgFile, 'utf8');

  // Skip merge / revert commits.
  if (/^Merge\b/m.test(message) || /^Revert\b/m.test(message)) return 0;

  let stagedFiles: string[] = [];
  try {
    stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(isGovernedMarkdownPath);
  } catch {
    // Not in a git repo or git not available — skip silently.
    return 0;
  }

  const failures: string[] = [];

  for (const file of stagedFiles) {
    if (!existsSync(file)) continue;
    const fm = readFrontmatterFile(file);
    if (!fm) continue;
    const id = stringValue(fm.data.id);
    if (!id) continue;

    const pinned = booleanValue(fm.data.pinned) === true;
    if (pinned) {
      const re = new RegExp(`^Pinned-Override:\\s*${escapeRegex(id)}\\b`, 'm');
      if (!re.test(message)) {
        failures.push(
          `Pinned doc ${id} (${file}) modified without "Pinned-Override: ${id}" in commit message.`
        );
      }
    }

    const previous = readHeadFrontmatter(file);
    if (!previous) continue;
    const oldStatus = stringValue(previous.status);
    const newStatus = stringValue(fm.data.status);
    const requiresApproval =
      (oldStatus === 'draft' && newStatus === 'active') ||
      (oldStatus === 'proposed' && newStatus === 'accepted');

    if (requiresApproval) {
      const re = new RegExp(`^Approves:\\s*${escapeRegex(id)}\\b`, 'm');
      if (!re.test(message)) {
        failures.push(
          `Doc ${id} (${file}) changed status ${oldStatus}→${newStatus} without "Approves: ${id}" in commit message.`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error('doc-gov verify-commit-msg failed:');
    for (const f of failures) console.error('  - ' + f);
    console.error('\nAdd the required line(s) to your commit message and try again.');
    return 1;
  }
  return 0;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isGovernedMarkdownPath(path: string): boolean {
  if (!/\.md$/.test(path)) return false;
  if (path.startsWith('docs/governance/templates/')) return false;
  if (path === 'docs/governance/MANIFEST.yml') return false;
  if (path.startsWith('docs/')) return true;
  return false;
}

function readHeadFrontmatter(
  file: string
): Record<string, string | boolean | string[] | null> | null {
  try {
    const content = execSync(`git show HEAD:${shellQuote(file)}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (!content.startsWith('---\n')) return null;
    const closing = content.indexOf('\n---', 4);
    if (closing === -1) return null;
    return parseFrontmatter(content.slice(4, closing).trimEnd());
  } catch {
    // New files have no HEAD version; only existing-doc promotions require approval.
    return null;
  }
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
