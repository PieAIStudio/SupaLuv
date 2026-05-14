import { booleanValue, stringArrayValue, stringValue, type FrontmatterFile } from './frontmatter';
import { toRepoPath } from './files';
import { decisionStatuses, normalStatuses } from './lifecycle';

export const docTypes = [
  'policy',
  'decision',
  'spec',
  'plan',
  'canon',
  'reference',
  'archive',
] as const;
export interface DocRecord {
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
  related: string[];
  supersedes: string[];
  supersededBy?: string;
  archiveReason?: string;
  path: string;
}

export interface DocIssue {
  file: string;
  code: string;
  message: string;
}

export function validateFrontmatter(
  rootDir: string,
  file: FrontmatterFile
): { record?: DocRecord; issues: DocIssue[] } {
  const path = toRepoPath(rootDir, file.path);
  const issues: DocIssue[] = [];
  const data = file.data;
  const id = stringValue(data.id);
  const title = stringValue(data.title);
  const type = stringValue(data.type);
  const status = stringValue(data.status);
  const canonical = booleanValue(data.canonical);
  const owner = stringValue(data.owner);
  const created = stringValue(data.created);
  const lastReviewed = stringValue(data.last_reviewed);
  const domain = stringValue(data.domain);
  const tags = stringArrayValue(data.tags);
  const related = stringArrayValue(data.related);
  const pinned = booleanValue(data.pinned) ?? false;
  const supersedes = stringArrayValue(data.supersedes);
  const supersededByRaw = stringValue(data.superseded_by);
  const supersededBy = supersededByRaw ? supersededByRaw : undefined;
  const archiveReasonRaw = stringValue(data.archive_reason);
  const archiveReason = archiveReasonRaw ? archiveReasonRaw : undefined;

  for (const [field, value] of Object.entries({
    id,
    title,
    type,
    status,
    owner,
    created,
    last_reviewed: lastReviewed,
  })) {
    if (!value)
      issues.push({
        file: path,
        code: 'missing-field',
        message: `Missing required frontmatter field: ${field}`,
      });
  }
  if (canonical === null)
    issues.push({
      file: path,
      code: 'invalid-canonical',
      message: 'canonical must be true or false.',
    });
  if (!docTypes.includes(type as (typeof docTypes)[number])) {
    issues.push({ file: path, code: 'invalid-type', message: `Invalid type: ${type}` });
  }
  const allowedStatuses = type === 'decision' ? decisionStatuses : normalStatuses;
  if (!allowedStatuses.includes(status as never)) {
    issues.push({
      file: path,
      code: 'invalid-status',
      message: `Invalid status for ${type}: ${status}`,
    });
  }
  if (
    (status === 'archived' || status === 'superseded' || status === 'rejected') &&
    canonical !== false
  ) {
    issues.push({
      file: path,
      code: 'terminal-canonical',
      message: `${status} documents must have canonical: false.`,
    });
  }
  if (!isPathAllowedForType(path, type)) {
    issues.push({
      file: path,
      code: 'path-type-mismatch',
      message: `Path does not match type ${type}.`,
    });
  }
  if (tags.length === 0) {
    issues.push({
      file: path,
      code: 'missing-tags',
      message: 'tags must contain at least one item.',
    });
  }
  if (created && lastReviewed && lastReviewed < created) {
    issues.push({
      file: path,
      code: 'bad-review-date',
      message: 'last_reviewed cannot be earlier than created.',
    });
  }

  if (status === 'superseded' && !supersededBy) {
    issues.push({
      file: path,
      code: 'missing-superseded-by',
      message: 'status=superseded requires superseded_by to point at the successor document id.',
    });
  }

  if (issues.length > 0) return { issues };

  return {
    issues,
    record: {
      id,
      title,
      type,
      status,
      canonical: canonical ?? false,
      owner,
      created,
      lastReviewed,
      domain,
      tags,
      pinned,
      related,
      supersedes,
      supersededBy,
      archiveReason,
      path,
    },
  };
}

function isPathAllowedForType(path: string, type: string): boolean {
  if (
    path.startsWith('docs/governance/') &&
    !path.startsWith('docs/governance/templates/')
  ) {
    return type === 'policy' || type === 'reference';
  }
  if (type === 'policy') return path.startsWith('docs/policy/');
  if (type === 'decision') return path.startsWith('docs/decisions/');
  if (type === 'spec') return path.startsWith('docs/specs/');
  if (type === 'plan') return path.startsWith('docs/plans/');
  if (type === 'canon') return path.startsWith('docs/canon/');
  if (type === 'reference') return path.startsWith('docs/reference/');
  if (type === 'archive') return path.startsWith('docs/archive/');
  return false;
}
