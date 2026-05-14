import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { docTypes } from '../core/schema';
import { planPath, todayIso } from '../core/paths';
import { loadTemplate, renderTemplate } from '../core/templates';
import { writeManifest } from '../core/manifest';

export function runNew(args: string[]): number {
  const positional = args.filter((a) => !a.startsWith('--'));
  const owner = readFlag(args, '--owner') ?? 'human';
  const force = args.includes('--force');
  const titleOverride = readFlag(args, '--title');
  const domainOverride = readFlag(args, '--domain') ?? 'meta';

  if (positional.length < 2) {
    console.error(
      'Usage: pnpm doc-gov new <type> <slug> [--owner <h|ai-assisted|team>] [--title <text>] [--domain <slug>] [--force]'
    );
    return 1;
  }
  const [type, slug] = positional as [string, string];

  if (!docTypes.includes(type as (typeof docTypes)[number])) {
    console.error(`Invalid type: ${type}. Allowed: ${docTypes.join(', ')}`);
    return 1;
  }

  const root = process.cwd();
  let plan;
  try {
    plan = planPath(root, type, slug);
  } catch (err) {
    console.error((err as Error).message);
    return 1;
  }

  const absPath = join(root, plan.filePath);
  if (existsSync(absPath) && !force) {
    console.error(`File already exists: ${plan.filePath}. Use --force to overwrite.`);
    return 1;
  }

  const template = loadTemplate(root, type);
  const status = type === 'decision' ? 'proposed' : 'draft';
  const canonical = type === 'decision';
  const today = todayIso();
  const title = titleOverride ?? slugToTitle(plan.slug);

  const rendered = renderTemplate(template, {
    id: plan.id,
    title,
    type,
    status,
    canonical,
    owner,
    created: today,
    lastReviewed: today,
    domain: domainOverride,
    tags: [plan.slug.split('-')[0] ?? 'replace-me'],
    pinned: false,
  });

  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, rendered);
  console.log(`Created ${plan.filePath} with id ${plan.id}.`);

  try {
    writeManifest(root);
    console.log('MANIFEST.yml regenerated.');
  } catch (err) {
    console.error(
      'Created file but MANIFEST regeneration failed (probably check errors). Fix the new file then run `pnpm doc-gov scan`.'
    );
    console.error((err as Error).message);
    return 0;
  }

  console.log(`\nNext steps:`);
  console.log(`  1. Edit ${plan.filePath} (replace placeholder content).`);
  console.log(`  2. Run: pnpm doc-gov check`);
  if (status === 'draft') {
    console.log(`  3. When ready: pnpm doc-gov approve ${plan.id}`);
  }
  return 0;
}

function readFlag(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
