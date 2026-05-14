import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureDefaultTemplates } from '../core/templates';

/**
 * Lightweight init: creates the directory skeleton and prints next steps.
 *
 * For the full starter (templates / agent-rules / optional hooks / optional
 * GitHub Action), use this repository's `starter/` and profile docs as the
 * upstream reference. Stage 0 target projects may still keep a local
 * `tools/doc-gov/` copy, but the source of truth is no longer Supa.
 * Phase 2 will publish a fully self-contained `npx @pieai/doc-gov init` that
 * embeds all fixtures.
 */
export function runInit(args: string[]): number {
  const force = args.includes('--force');
  const root = process.cwd();

  const dirs = [
    'docs',
    'docs/governance',
    'docs/governance/agents-routing',
    'docs/governance/templates',
    'docs/policy',
    'docs/decisions',
    'docs/specs/active',
    'docs/specs/completed',
    'docs/plans/active',
    'docs/plans/completed',
    'docs/canon',
    'docs/reference',
    'docs/archive',
  ];

  let created = 0;
  for (const dir of dirs) {
    const abs = join(root, dir);
    if (!existsSync(abs)) {
      mkdirSync(abs, { recursive: true });
      created++;
    } else if (!force) {
      // Already there; skip silently.
    }
  }

  // Add a .gitkeep marker in the always-empty starter dirs so git tracks them.
  for (const dir of ['docs/specs/completed', 'docs/plans/completed', 'docs/archive']) {
    const keep = join(root, dir, '.gitkeep');
    if (!existsSync(keep)) writeFileSync(keep, '');
  }

  const templatesCreated = ensureDefaultTemplates(root);

  console.log(
    `doc-gov init: ${created} directories created, ${templatesCreated} templates created (existing files left untouched).`
  );
  console.log(`\nNext steps for a brand-new project:`);
  console.log(`  1. Copy starter/AGENTS.template.md to AGENTS.md and fill the project name.`);
  console.log(`  2. Copy starter/docs/governance/boundary.md, ssot-v0.9.md,`);
  console.log(`     doc-agent-rules.md, doc-types.md, and one agents-routing file.`);
  console.log(`  3. Copy starter/docs/policy/best-practice-for-this-project.md and replace`);
  console.log(`     placeholder policy with this project's real AI/development rules.`);
  console.log(`  4. Copy starter/docs/reference/documentation-map.md and`);
  console.log(`     starter/docs/reference/execution/current-work.md when useful.`);
  console.log(`  5. Pick a profile: profiles/engineering-runtime or profiles/doc-only.`);
  console.log(`  6. Stage 0: either sync a local tools/doc-gov copy from packages/doc-gov`);
  console.log(`     or run the built CLI directly while package install is not enabled.`);
  console.log(`  7. Optional hard guardrails: add lefthook.yml and docs-check GitHub Action`);
  console.log(`     only after the target project has those files wired intentionally.`);
  console.log(`  8. Add the target project's doc-gov script or package bin wiring.`);
  console.log(`  9. Validate the router: doc-gov router-check`);
  console.log(`  10. Write your first ADR: doc-gov new decision adopt-doc-gov`);
  return 0;
}
