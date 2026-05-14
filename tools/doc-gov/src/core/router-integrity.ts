import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface RouterIntegrityIssue {
  file: string;
  code: string;
  message: string;
}

export interface RouterIntegrityResult {
  ok: boolean;
  issues: RouterIntegrityIssue[];
}

interface RequiredNeedle {
  file: string;
  needle: string;
  message: string;
}

const CENTRAL_REQUIRED_FILES = [
  'AGENTS.md',
  'README.md',
  'docs/governance/boundary.md',
  'docs/governance/ssot-v0.9.md',
  'docs/governance/templates/adr.md',
  'docs/governance/templates/spec.md',
  'docs/governance/templates/plan.md',
  'docs/governance/templates/canon-entry.md',
  'docs/governance/templates/reference.md',
  'docs/governance/templates/policy.md',
  'docs/governance/templates/archive.md',
  'docs/governance/agents-routing/engineering-runtime-v0.9.md',
  'docs/governance/agents-routing/doc-only-v0.9.md',
  'integrations/superpowers.md',
  'integrations/directed-development.md',
  'profiles/engineering-runtime/profile.md',
  'profiles/engineering-runtime/manifest.yml',
  'profiles/doc-only/profile.md',
  'profiles/doc-only/manifest.yml',
  'starter/AGENTS.template.md',
  'starter/docs/reference/execution/current-work.md',
  'starter/docs/policy/best-practice-for-this-project.md',
  'starter/docs/governance/boundary.md',
  'starter/docs/governance/ssot-v0.9.md',
  'starter/docs/governance/agents-routing/engineering-runtime-v0.9.md',
  'starter/docs/governance/agents-routing/doc-only-v0.9.md',
  'starter/docs/governance/doc-agent-rules.md',
  'starter/docs/governance/doc-types.md',
  'starter/docs/governance/templates/adr.md',
  'starter/docs/governance/templates/spec.md',
  'starter/docs/governance/templates/plan.md',
  'starter/docs/governance/templates/canon-entry.md',
  'starter/docs/governance/templates/reference.md',
  'starter/docs/governance/templates/policy.md',
  'starter/docs/governance/templates/archive.md',
] as const;

const PROJECT_REQUIRED_FILES = [
  'AGENTS.md',
  'docs/governance/boundary.md',
  'docs/governance/ssot-v0.9.md',
  'docs/governance/doc-agent-rules.md',
  'docs/governance/doc-types.md',
  'docs/reference/execution/current-work.md',
] as const;

const PROJECT_AGENTS_ROUTING_FILES = [
  'docs/governance/agents-routing/engineering-runtime-v0.9.md',
  'docs/governance/agents-routing/doc-only-v0.9.md',
] as const;

const FORBIDDEN_LEGACY_PATHS = [
  'governance',
  'docs-governance',
  'routing',
  'starter/governance',
  'starter/docs-governance',
] as const;

const FORBIDDEN_PROJECT_PATHS = [
  'docs/policy/shared-rules/ssot.md',
  'docs/policy/shared-rules/task-routing.md',
] as const;

const ROUTER_BLOCK_BEGIN = '<!-- PGS-ROUTER:BEGIN v0.9 -->';
const ROUTER_BLOCK_END = '<!-- PGS-ROUTER:END -->';
const EXTERNAL_ROUTER_MARKERS = [
  '## gstack',
  '## GStack',
  '## Skill routing',
  '## Superpowers',
] as const;

const CENTRAL_REQUIRED_NEEDLES: RequiredNeedle[] = [
  {
    file: 'AGENTS.md',
    needle: ROUTER_BLOCK_BEGIN,
    message: 'AGENTS.md must include the PGS router block.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/boundary.md',
    message: 'AGENTS.md must mention docs/governance/boundary.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/ssot-v0.9.md',
    message: 'AGENTS.md must mention docs/governance/ssot-v0.9.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'starter/docs/governance/doc-agent-rules.md',
    message: 'AGENTS.md must mention starter/docs/governance/doc-agent-rules.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'starter/docs/governance/doc-types.md',
    message: 'AGENTS.md must mention starter/docs/governance/doc-types.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/agents-routing/engineering-runtime-v0.9.md',
    message: 'AGENTS.md must mention docs/governance/agents-routing/engineering-runtime-v0.9.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/agents-routing/doc-only-v0.9.md',
    message: 'AGENTS.md must mention docs/governance/agents-routing/doc-only-v0.9.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'integrations/superpowers.md',
    message: 'AGENTS.md must mention integrations/superpowers.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'integrations/directed-development.md',
    message: 'AGENTS.md must mention integrations/directed-development.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'profiles/engineering-runtime/',
    message: 'AGENTS.md must mention profiles/engineering-runtime/.',
  },
  {
    file: 'AGENTS.md',
    needle: 'profiles/doc-only/',
    message: 'AGENTS.md must mention profiles/doc-only/.',
  },
  {
    file: 'README.md',
    needle: 'docs/governance/agents-routing/',
    message: 'README.md must point readers to agents-routing under docs/governance/.',
  },
  {
    file: 'docs/governance/agents-routing/engineering-runtime-v0.9.md',
    needle: 'Use matching Superpowers workflow if applicable',
    message: 'Engineering routing must delegate Superpowers only inside the selected lane.',
  },
  {
    file: 'docs/governance/agents-routing/engineering-runtime-v0.9.md',
    needle: 'current-work.md',
    message: 'Engineering routing must separate routing from current-work.md.',
  },
  {
    file: 'docs/governance/agents-routing/doc-only-v0.9.md',
    needle: 'does not use Superpowers TDD or Directed Development by default',
    message: 'Doc-only routing must exclude engineering Superpowers/DD by default.',
  },
  {
    file: 'integrations/superpowers.md',
    needle: 'Agents routing classifies first',
    message: 'Superpowers integration must state that agents routing classifies first.',
  },
  {
    file: 'integrations/superpowers.md',
    needle: 'Superpowers executes inside the selected lane',
    message: 'Superpowers integration must state that Superpowers executes inside the lane.',
  },
  {
    file: 'integrations/superpowers.md',
    needle: 'does not vendor',
    message: 'Superpowers integration must preserve the external-plugin boundary.',
  },
  {
    file: 'integrations/directed-development.md',
    needle: 'optional workflow',
    message: 'Directed Development integration must stay optional.',
  },
  {
    file: 'profiles/engineering-runtime/manifest.yml',
    needle: 'docs/governance/agents-routing/engineering-runtime-v0.9.md',
    message: 'Engineering profile manifest must point to engineering routing.',
  },
  {
    file: 'profiles/engineering-runtime/manifest.yml',
    needle: 'integrations/superpowers.md',
    message: 'Engineering profile manifest must include the Superpowers integration.',
  },
  {
    file: 'profiles/doc-only/manifest.yml',
    needle: 'docs/governance/agents-routing/doc-only-v0.9.md',
    message: 'Doc-only profile manifest must point to doc-only routing.',
  },
  {
    file: 'profiles/doc-only/manifest.yml',
    needle: 'superpowers: false',
    message: 'Doc-only profile manifest must keep Superpowers disabled by default.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: ROUTER_BLOCK_BEGIN,
    message: 'Starter AGENTS template must include the PGS router block.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'adopted profile',
    message: 'Starter AGENTS template must make projects name their adopted profile.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'chosen agents-routing file',
    message: 'Starter AGENTS template must make projects name their chosen agents-routing file.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/governance/boundary.md',
    message: 'Starter AGENTS template must point agents to docs/governance/boundary.md.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/governance/ssot-v0.9.md',
    message: 'Starter AGENTS template must point agents to docs/governance/ssot-v0.9.md.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/governance/agents-routing/',
    message: 'Starter AGENTS template must point agents to docs/governance/agents-routing/.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/governance/doc-agent-rules.md',
    message: 'Starter AGENTS template must point agents to docs/governance/doc-agent-rules.md.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/governance/doc-types.md',
    message: 'Starter AGENTS template must point agents to docs/governance/doc-types.md.',
  },
  {
    file: 'starter/AGENTS.template.md',
    needle: 'docs/policy/',
    message:
      'Starter AGENTS template must keep project AI development policy in docs/policy/.',
  },
];

const PROJECT_REQUIRED_NEEDLES: RequiredNeedle[] = [
  {
    file: 'AGENTS.md',
    needle: ROUTER_BLOCK_BEGIN,
    message: 'AGENTS.md must include the PGS router block.',
  },
  {
    file: 'AGENTS.md',
    needle: 'README.md',
    message: 'AGENTS.md must state how README.md is used.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/policy/',
    message: 'AGENTS.md must point agents to docs/policy/.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/boundary.md',
    message: 'AGENTS.md must mention docs/governance/boundary.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/ssot-v0.9.md',
    message: 'AGENTS.md must mention docs/governance/ssot-v0.9.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/doc-agent-rules.md',
    message: 'AGENTS.md must mention docs/governance/doc-agent-rules.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/doc-types.md',
    message: 'AGENTS.md must mention docs/governance/doc-types.md.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/governance/agents-routing/',
    message: 'AGENTS.md must point agents to docs/governance/agents-routing/.',
  },
  {
    file: 'AGENTS.md',
    needle: 'docs/reference/execution/current-work.md',
    message: 'AGENTS.md must mention docs/reference/execution/current-work.md.',
  },
  {
    file: 'docs/governance/boundary.md',
    needle: 'Product artifacts outside governed docs',
    message: 'Governance boundary must preserve the product artifact boundary.',
  },
  {
    file: 'docs/governance/ssot-v0.9.md',
    needle: 'automatically govern every Markdown file',
    message: 'SSOT rule must state that not every Markdown file is governed.',
  },
  {
    file: 'docs/governance/doc-agent-rules.md',
    needle: 'Doc-gov governs `docs/**` by default',
    message: 'Doc agent rules must keep the docs-only governed scope.',
  },
  {
    file: 'docs/governance/doc-types.md',
    needle: 'Markdown outside `docs/**` is not a governed doc by default',
    message: 'Doc types must keep Markdown outside docs/** out of governance by default.',
  },
];

export function checkRouterIntegrity(rootDir = process.cwd()): RouterIntegrityResult {
  const issues: RouterIntegrityIssue[] = [];
  const isCentral = isCentralRepository(rootDir);
  const requiredFiles = isCentral ? CENTRAL_REQUIRED_FILES : PROJECT_REQUIRED_FILES;
  const requiredNeedles = isCentral ? CENTRAL_REQUIRED_NEEDLES : PROJECT_REQUIRED_NEEDLES;

  for (const file of requiredFiles) {
    if (!existsSync(join(rootDir, file))) {
      issues.push({
        file,
        code: 'missing-router-file',
        message: `Required router/integration file is missing: ${file}`,
      });
    }
  }

  if (!isCentral) {
    issues.push(...validateProjectAgentsRouting(rootDir));
  }

  for (const file of FORBIDDEN_LEGACY_PATHS) {
    if (existsSync(join(rootDir, file))) {
      issues.push({
        file,
        code: 'legacy-governance-path',
        message: `Legacy governance path must not exist: ${file}`,
      });
    }
  }

  if (!isCentral) {
    for (const file of FORBIDDEN_PROJECT_PATHS) {
      if (existsSync(join(rootDir, file))) {
        issues.push({
          file,
          code: 'legacy-project-policy-path',
          message: `Legacy project policy path must not exist: ${file}`,
        });
      }
    }
  }

  for (const file of findGovernedReadmes(rootDir)) {
    issues.push({
      file,
      code: 'non-root-readme',
      message: `Governed README.md must not exist outside the repository root: ${file}`,
    });
  }

  for (const requirement of requiredNeedles) {
    const path = join(rootDir, requirement.file);
    if (!existsSync(path)) continue;
    const content = readFileSync(path, 'utf8');
    if (!content.includes(requirement.needle)) {
      issues.push({
        file: requirement.file,
        code: 'missing-router-reference',
        message: requirement.message,
      });
    }
  }

  const routerBlockFiles = isCentral
    ? ['AGENTS.md', 'starter/AGENTS.template.md']
    : ['AGENTS.md'];

  for (const file of routerBlockFiles) {
    issues.push(...validateRouterBlock(rootDir, file));
  }

  issues.push(...validateBacktickedLocalPaths(rootDir, 'AGENTS.md'));
  issues.push(...validateBacktickedLocalPaths(rootDir, 'README.md'));
  if (isCentral) {
    issues.push(...validateBacktickedLocalPaths(rootDir, 'starter/AGENTS.template.md', 'starter'));
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function isCentralRepository(rootDir: string): boolean {
  const packageJsonPath = join(rootDir, 'package.json');
  if (!existsSync(packageJsonPath)) return false;
  const packageJson = readFileSync(packageJsonPath, 'utf8');
  return (
    packageJson.includes('"name": "project-governance-system"') &&
    existsSync(join(rootDir, 'profiles')) &&
    existsSync(join(rootDir, 'starter')) &&
    existsSync(join(rootDir, 'integrations'))
  );
}

function validateProjectAgentsRouting(rootDir: string): RouterIntegrityIssue[] {
  const issues: RouterIntegrityIssue[] = [];
  const existingRoutes = PROJECT_AGENTS_ROUTING_FILES.filter((file) =>
    existsSync(join(rootDir, file))
  );

  if (existingRoutes.length === 0) {
    issues.push({
      file: 'docs/governance/agents-routing',
      code: 'missing-project-agents-routing',
      message:
        'Project must install one agents-routing file under docs/governance/agents-routing/.',
    });
    return issues;
  }

  const agentsPath = join(rootDir, 'AGENTS.md');
  if (!existsSync(agentsPath)) return issues;
  const agents = readFileSync(agentsPath, 'utf8');
  if (!existingRoutes.some((file) => agents.includes(file))) {
    issues.push({
      file: 'AGENTS.md',
      code: 'missing-selected-agents-routing',
      message:
        'AGENTS.md must name the selected agents-routing file under docs/governance/agents-routing/.',
    });
  }

  return issues;
}

function validateRouterBlock(rootDir: string, file: string): RouterIntegrityIssue[] {
  const path = join(rootDir, file);
  if (!existsSync(path)) return [];
  const content = readFileSync(path, 'utf8');
  const begin = content.indexOf(ROUTER_BLOCK_BEGIN);
  const end = content.indexOf(ROUTER_BLOCK_END);
  const issues: RouterIntegrityIssue[] = [];

  if (begin === -1 || end === -1 || end < begin) {
    issues.push({
      file,
      code: 'invalid-router-block',
      message: `${file} must contain a valid ${ROUTER_BLOCK_BEGIN} block before external workflow routing.`,
    });
    return issues;
  }

  for (const marker of EXTERNAL_ROUTER_MARKERS) {
    const markerIndex = content.indexOf(marker);
    if (markerIndex !== -1 && markerIndex < end) {
      issues.push({
        file,
        code: 'external-routing-before-pgs',
        message: `${file} must place ${marker} after the PGS router block.`,
      });
    }
  }

  return issues;
}

function validateBacktickedLocalPaths(
  rootDir: string,
  file: string,
  pathRoot = ''
): RouterIntegrityIssue[] {
  const path = join(rootDir, file);
  if (!existsSync(path)) return [];

  const content = readFileSync(path, 'utf8');
  const issues: RouterIntegrityIssue[] = [];
  const seen = new Set<string>();
  const matches = content.matchAll(/`([^`]+)`/g);

  for (const match of matches) {
    const value = match[1]?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    if (!isLocalPathReference(value)) continue;

    const normalized = value.endsWith('/') ? value.slice(0, -1) : value;
    if (
      existsSync(join(rootDir, pathRoot, normalized)) ||
      existsSync(join(rootDir, normalized))
    ) {
      continue;
    }

    issues.push({
      file,
      code: 'missing-backticked-path',
      message: `${file} references a local path that does not exist: ${value}`,
    });
  }

  return issues;
}

function isLocalPathReference(value: string): boolean {
  if (/\s/.test(value)) return false;
  if (/^[a-z]+:\/\//i.test(value)) return false;
  if (value.includes('*')) return false;
  if (value.startsWith('<') || value.endsWith('>')) return false;
  return (
    value === 'README.md' ||
    value.endsWith('.md') ||
    value.endsWith('/') ||
    value.startsWith('docs/') ||
    value.startsWith('starter/') ||
    value.startsWith('profiles/') ||
    value.startsWith('integrations/')
  );
}

function findGovernedReadmes(rootDir: string): string[] {
  const matches: string[] = [];
  for (const relRoot of ['docs', 'starter/docs']) {
    const absRoot = join(rootDir, relRoot);
    if (existsSync(absRoot)) walk(absRoot);
  }
  return matches.sort();

  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        walk(join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (entry.name.toLowerCase() !== 'readme.md') continue;
      const repoPath = relative(rootDir, join(dir, entry.name)).split(/\\/g).join('/');
      if (repoPath !== 'README.md') matches.push(repoPath);
    }
  }
}
