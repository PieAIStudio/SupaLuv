import { readFileSync } from 'node:fs';

export interface FrontmatterFile {
  path: string;
  body: string;
  raw: string;
  data: Record<string, string | boolean | string[] | null>;
}

export function readFrontmatterFile(path: string): FrontmatterFile | null {
  const content = readFileSync(path, 'utf8');
  if (!content.startsWith('---\n')) return null;
  const closing = content.indexOf('\n---', 4);
  if (closing === -1) return null;
  const raw = content.slice(4, closing).trimEnd();
  const body = content.slice(closing + 4).replace(/^\n/, '');
  return { path, body, raw, data: parseFrontmatter(raw) };
}

export function parseFrontmatter(raw: string): Record<string, string | boolean | string[] | null> {
  const data: Record<string, string | boolean | string[] | null> = {};
  let currentArrayKey = '';

  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const arrayItem = line.match(/^\s+-\s+(.+)$/);
    if (arrayItem && currentArrayKey) {
      const value = data[currentArrayKey];
      if (Array.isArray(value)) value.push(parseScalar(arrayItem[1] ?? '') as string);
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!keyValue) {
      currentArrayKey = '';
      continue;
    }

    const key = keyValue[1] ?? '';
    const value = keyValue[2] ?? '';
    if (!value) {
      data[key] = [];
      currentArrayKey = key;
      continue;
    }

    data[key] = parseScalar(value);
    currentArrayKey = '';
  }

  return data;
}

export function stringValue(value: string | boolean | string[] | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function booleanValue(
  value: string | boolean | string[] | null | undefined
): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

export function stringArrayValue(value: string | boolean | string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function parseScalar(value: string): string | boolean | null {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (trimmed === '[]') return [] as unknown as string;
  return trimmed;
}
