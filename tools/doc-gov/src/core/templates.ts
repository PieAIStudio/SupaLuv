import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Render a template by replacing the placeholder frontmatter values
 * (id, title, type, status, canonical, owner, created, last_reviewed, domain).
 *
 * Body is left untouched so the user can fill it manually.
 */
export interface TemplateValues {
  id: string;
  title: string;
  type: string;
  status: string;
  canonical: boolean;
  owner: string;
  created: string;
  lastReviewed: string;
  domain: string;
  tags: string[];
  pinned: boolean;
}

const TEMPLATE_FILES: Record<string, string> = {
  decision: 'adr.md',
  spec: 'spec.md',
  plan: 'plan.md',
  canon: 'canon-entry.md',
  reference: 'reference.md',
  policy: 'policy.md',
  archive: 'archive.md',
};

// `archive.md` is kept for init/reference parity even though `doc-gov new`
// blocks direct archive creation; the archive command derives archives from
// existing docs so history is preserved.
const DEFAULT_TEMPLATES: Record<string, string> = {
  'adr.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: decision',
    'status: proposed',
    'canonical: true',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: meta',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Context',
    '',
    '## Decision',
    '',
    '## Consequences',
    '',
  ].join('\n'),
  'spec.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: spec',
    'status: draft',
    'canonical: false',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: meta',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Problem',
    '',
    '## Requirements',
    '',
    '## Acceptance',
    '',
  ].join('\n'),
  'plan.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: plan',
    'status: draft',
    'canonical: false',
    'owner: ai-assisted',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: meta',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Goal',
    '',
    '## Scope',
    '',
    '## Steps',
    '',
    '- [ ] Step 1',
    '',
    '## Acceptance',
    '',
    '- [ ] Verification completed',
    '',
    '## Closeout',
    '',
    'When complete, move this plan to `docs/plans/completed/` and set `status: completed`.',
    '',
  ].join('\n'),
  'canon-entry.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: canon',
    'status: draft',
    'canonical: false',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: canon',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Current Truth',
    '',
    '## Source / Provenance',
    '',
    '## Open Questions',
    '',
  ].join('\n'),
  'reference.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: reference',
    'status: draft',
    'canonical: false',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: reference',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Purpose',
    '',
    '## Details',
    '',
    '## Related Commands / Files',
    '',
  ].join('\n'),
  'policy.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: policy',
    'status: draft',
    'canonical: false',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: policy',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    '---',
    '',
    '# REPLACE-ME: Replace Me',
    '',
    '## Rule',
    '',
    '## Rationale',
    '',
    '## Examples',
    '',
  ].join('\n'),
  'archive.md': [
    '---',
    'id: REPLACE-ME',
    'title: Replace Me',
    'type: archive',
    'status: archived',
    'canonical: false',
    'owner: human',
    'created: YYYY-MM-DD',
    'last_reviewed: YYYY-MM-DD',
    'domain: archive',
    'tags:',
    '  - replace-me',
    'pinned: false',
    'related: []',
    'archive_reason: Replace me',
    '---',
    '',
    '# REPLACE-ME: Replace Me (archived)',
    '',
    '## Archived Reason',
    '',
    '## Historical Notes',
    '',
  ].join('\n'),
};

export function loadTemplate(rootDir: string, type: string): string {
  const file = TEMPLATE_FILES[type];
  if (!file) throw new Error(`No template file mapped for type: ${type}`);
  const path = join(rootDir, 'docs/governance/templates', file);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const fallback = DEFAULT_TEMPLATES[file];
  if (fallback) return fallback;
  throw new Error(`Template file is missing: docs/governance/templates/${file}`);
}

export function ensureDefaultTemplates(rootDir: string): number {
  const templatesDir = join(rootDir, 'docs/governance/templates');
  mkdirSync(templatesDir, { recursive: true });

  let created = 0;
  for (const [file, content] of Object.entries(DEFAULT_TEMPLATES)) {
    const path = join(templatesDir, file);
    if (existsSync(path)) continue;
    writeFileSync(path, content);
    created++;
  }
  return created;
}

export function renderTemplate(template: string, values: TemplateValues): string {
  const closing = template.indexOf('\n---', 4);
  if (closing === -1) throw new Error('Template is missing closing frontmatter marker.');
  const body = template.slice(closing + 4).replace(/^\n/, '');

  const tagsBlock =
    values.tags.length > 0 ? values.tags.map((t) => `  - ${t}`).join('\n') : '  - replace-me';

  const frontmatter = [
    '---',
    `id: ${values.id}`,
    `title: ${values.title}`,
    `type: ${values.type}`,
    `status: ${values.status}`,
    `canonical: ${values.canonical}`,
    `owner: ${values.owner}`,
    `created: ${values.created}`,
    `last_reviewed: ${values.lastReviewed}`,
    `domain: ${values.domain}`,
    'tags:',
    tagsBlock,
    `pinned: ${values.pinned}`,
    'related: []',
    '---',
    '',
  ].join('\n');

  // Replace placeholder ID/title in body H1 if it still says "Replace Me".
  const replacedBody = body
    .replace(/^# REPLACE-ME: Replace Me/m, `# ${values.id}: ${values.title}`)
    .replace(/^# Replace Me$/m, `# ${values.title}`)
    .replace(/^# Replace Me \(archived\)$/m, `# ${values.title} (archived)`);

  return frontmatter + replacedBody;
}
