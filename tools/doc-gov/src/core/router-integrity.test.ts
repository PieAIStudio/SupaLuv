import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRouterIntegrity } from './router-integrity';

test('passes when router entrypoints and profile wiring are present', () => {
  const root = createFixture({
    agents: [
      '# Router',
      '<!-- PGS-ROUTER:BEGIN v0.9 -->',
      'Read docs/governance/boundary.md.',
      'Read docs/governance/ssot-v0.9.md.',
      'Read starter/docs/governance/doc-agent-rules.md.',
      'Read starter/docs/governance/doc-types.md.',
      'Read docs/governance/agents-routing/engineering-runtime-v0.9.md.',
      'Read docs/governance/agents-routing/doc-only-v0.9.md.',
      'Read integrations/superpowers.md.',
      'Read integrations/directed-development.md.',
      'Use profiles/engineering-runtime/ and profiles/doc-only/.',
      '<!-- PGS-ROUTER:END -->',
    ].join('\n'),
    superpowers: [
      '# Superpowers Integration',
      'This repository does not vendor or rewrite it.',
      'Agents routing classifies first.',
      'Superpowers executes inside the selected lane.',
      'Durable outputs should map back to doc-gov layers.',
    ].join('\n'),
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('fails when AGENTS does not point agents to agents-routing files', () => {
  const root = createFixture({
    agents: '# Router\nRead README.md only.',
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /AGENTS.md must mention docs\/governance\/agents-routing\/engineering-runtime-v0.9.md/
  );
});

test('fails when AGENTS points to a local path that does not exist', () => {
  const root = createFixture({
    agents: [
      '# Router',
      '<!-- PGS-ROUTER:BEGIN v0.9 -->',
      'Read `docs/governance/boundary.md`.',
      'Read `docs/governance/ssot-v0.9.md`.',
      'Read `docs/governance/doc-agent-rules.md`.',
      'Read `starter/docs/governance/doc-types.md`.',
      'Read `docs/governance/agents-routing/engineering-runtime-v0.9.md`.',
      'Read `docs/governance/agents-routing/doc-only-v0.9.md`.',
      'Read `integrations/superpowers.md`.',
      'Read `integrations/directed-development.md`.',
      'Use `profiles/engineering-runtime/` and `profiles/doc-only/`.',
      '<!-- PGS-ROUTER:END -->',
    ].join('\n'),
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /references a local path that does not exist: docs\/governance\/doc-agent-rules\.md/
  );
});

test('fails when README points to a local path that does not exist', () => {
  const root = createFixture({
    readme: 'See `docs/governance/missing.md`.\n',
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /README.md references a local path that does not exist: docs\/governance\/missing\.md/
  );
});

test('fails when starter AGENTS template points to a local path that does not exist', () => {
  const root = createFixture({
    starterAgents: [
      '<!-- PGS-ROUTER:BEGIN v0.9 -->',
      'Read `docs/governance/boundary.md`.',
      'Read `docs/governance/missing-template-target.md`.',
      'Read `docs/governance/ssot-v0.9.md`.',
      'Read `docs/governance/agents-routing/`.',
      'Read `docs/governance/doc-agent-rules.md`.',
      'Read `docs/governance/doc-types.md`.',
      'Read `docs/policy/best-practice-for-this-project.md`.',
      '<!-- PGS-ROUTER:END -->',
    ].join('\n'),
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /starter\/AGENTS.template.md references a local path that does not exist: docs\/governance\/missing-template-target\.md/
  );
});

test('fails when Superpowers integration does not state routing first', () => {
  const root = createFixture({
    superpowers: '# Superpowers Integration\nUse Superpowers workflows.',
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Superpowers integration must state that agents routing classifies first/
  );
});

test('fails when legacy governance roots come back', () => {
  const root = createFixture();
  mkdirSync(join(root, 'governance'), { recursive: true });
  mkdirSync(join(root, 'starter/governance'), { recursive: true });
  mkdirSync(join(root, 'starter/docs-governance'), { recursive: true });
  writeFileSync(join(root, 'governance/MANIFEST.yml'), 'legacy manifest\n');
  writeFileSync(join(root, 'starter/governance/agent-rules.md'), 'legacy rules\n');
  writeFileSync(join(root, 'starter/docs-governance/doc-types.md'), 'legacy docs governance\n');

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Legacy governance path must not exist: governance/
  );
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Legacy governance path must not exist: starter\/governance/
  );
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Legacy governance path must not exist: starter\/docs-governance/
  );
});

test('fails when non-root README files come back', () => {
  const root = createFixture();
  mkdirSync(join(root, 'docs/reference'), { recursive: true });
  writeFileSync(join(root, 'docs/reference/README.md'), 'Nested readme.\n');

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Governed README\.md must not exist outside the repository root: docs\/reference\/README\.md/
  );
});

test('allows README files outside governed docs', () => {
  const root = createFixture();
  mkdirSync(join(root, 'projects/example-package'), { recursive: true });
  writeFileSync(join(root, 'projects/example-package/README.md'), 'Product package README.\n');

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('fails when external workflow routing appears before the PGS router block', () => {
  const root = createFixture({
    agents: [
      '# Router',
      '## gstack',
      '<!-- PGS-ROUTER:BEGIN v0.9 -->',
      'Read docs/governance/boundary.md.',
      'Read docs/governance/ssot-v0.9.md.',
      'Read starter/docs/governance/doc-agent-rules.md.',
      'Read starter/docs/governance/doc-types.md.',
      'Read docs/governance/agents-routing/engineering-runtime-v0.9.md.',
      'Read docs/governance/agents-routing/doc-only-v0.9.md.',
      'Read integrations/superpowers.md.',
      'Read integrations/directed-development.md.',
      'Use profiles/engineering-runtime/ and profiles/doc-only/.',
      '<!-- PGS-ROUTER:END -->',
    ].join('\n'),
  });

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /must place ## gstack after the PGS router block/
  );
});

test('passes for a downstream project with one selected agents-routing file', () => {
  const root = createProjectFixture();

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('fails for a downstream project when legacy shared SSOT remains in policy', () => {
  const root = createProjectFixture();
  mkdirSync(join(root, 'docs/policy/shared-rules'), { recursive: true });
  writeFileSync(join(root, 'docs/policy/shared-rules/ssot.md'), 'legacy ssot symlink target\n');

  const result = checkRouterIntegrity(root);

  assert.equal(result.ok, false);
  assert.match(
    result.issues.map((issue) => issue.message).join('\n'),
    /Legacy project policy path must not exist: docs\/policy\/shared-rules\/ssot\.md/
  );
});

function createFixture(
  overrides: { agents?: string; superpowers?: string; readme?: string; starterAgents?: string } = {}
): string {
  const root = mkdtempSync(join(tmpdir(), 'doc-gov-router-check-'));
  mkdirSync(join(root, 'docs/governance/agents-routing'), { recursive: true });
  mkdirSync(join(root, 'integrations'), { recursive: true });
  mkdirSync(join(root, 'profiles/engineering-runtime'), { recursive: true });
  mkdirSync(join(root, 'profiles/doc-only'), { recursive: true });
  mkdirSync(join(root, 'starter/docs/governance'), { recursive: true });
  mkdirSync(join(root, 'starter/docs/governance/agents-routing'), { recursive: true });
  mkdirSync(join(root, 'starter/docs/policy'), { recursive: true });
  mkdirSync(join(root, 'starter/docs/reference/execution'), { recursive: true });

  writeFileSync(join(root, 'package.json'), '{ "name": "project-governance-system" }\n');
  writeFileSync(
    join(root, 'README.md'),
    overrides.readme ??
      'docs/governance/agents-routing/, profiles/, and integrations/superpowers.md are documented here.\n'
  );
  writeFileSync(
    join(root, 'AGENTS.md'),
    overrides.agents ??
      [
        '# Router',
        '<!-- PGS-ROUTER:BEGIN v0.9 -->',
        'Read docs/governance/boundary.md.',
        'Read docs/governance/ssot-v0.9.md.',
        'Read starter/docs/governance/doc-agent-rules.md.',
        'Read starter/docs/governance/doc-types.md.',
        'Read docs/governance/agents-routing/engineering-runtime-v0.9.md.',
        'Read docs/governance/agents-routing/doc-only-v0.9.md.',
        'Read integrations/superpowers.md.',
        'Read integrations/directed-development.md.',
        'Use profiles/engineering-runtime/ and profiles/doc-only/.',
        '<!-- PGS-ROUTER:END -->',
      ].join('\n')
  );
  writeFileSync(join(root, 'docs/governance/boundary.md'), 'Governance boundary.\n');
  writeFileSync(join(root, 'docs/governance/ssot-v0.9.md'), 'SSOT rules.\n');
  mkdirSync(join(root, 'docs/governance/templates'), { recursive: true });
  for (const template of [
    'adr.md',
    'spec.md',
    'plan.md',
    'canon-entry.md',
    'reference.md',
    'policy.md',
    'archive.md',
  ]) {
    writeFileSync(join(root, `docs/governance/templates/${template}`), 'template\n');
  }
  writeFileSync(join(root, 'docs/governance/agents-routing/engineering-runtime-v0.9.md'), 'Read project router and current-work.md.\nUse matching Superpowers workflow if applicable.\n');
  writeFileSync(join(root, 'docs/governance/agents-routing/doc-only-v0.9.md'), 'This route does not use Superpowers TDD or Directed Development by default.\n');
  writeFileSync(
    join(root, 'integrations/superpowers.md'),
    overrides.superpowers ??
      [
        '# Superpowers Integration',
        'This repository does not vendor or rewrite it.',
        'Agents routing classifies first.',
        'Superpowers executes inside the selected lane.',
        'Durable outputs should map back to doc-gov layers.',
      ].join('\n')
  );
  writeFileSync(join(root, 'integrations/directed-development.md'), 'Directed Development is an optional workflow.\n');
  writeFileSync(join(root, 'profiles/engineering-runtime/manifest.yml'), 'agents_routing: docs/governance/agents-routing/engineering-runtime-v0.9.md\nsuperpowers: integrations/superpowers.md\n');
  writeFileSync(join(root, 'profiles/engineering-runtime/profile.md'), 'Engineering profile.\n');
  writeFileSync(join(root, 'profiles/doc-only/manifest.yml'), 'agents_routing: docs/governance/agents-routing/doc-only-v0.9.md\nsuperpowers: false\n');
  writeFileSync(join(root, 'profiles/doc-only/profile.md'), 'Doc-only profile.\n');
  writeFileSync(
    join(root, 'starter/AGENTS.template.md'),
      overrides.starterAgents ??
        [
          'The target project must name its adopted profile and chosen agents-routing file.',
          '<!-- PGS-ROUTER:BEGIN v0.9 -->',
          'Read docs/governance/boundary.md.',
          'Read docs/governance/ssot-v0.9.md.',
          'Read docs/governance/agents-routing/.',
          'Read docs/governance/doc-agent-rules.md.',
          'Read docs/governance/doc-types.md.',
          'Read docs/policy/best-practice-for-this-project.md.',
          '<!-- PGS-ROUTER:END -->',
        ].join('\n')
  );
  writeFileSync(join(root, 'starter/docs/reference/execution/current-work.md'), 'Current work index.\n');
  writeFileSync(join(root, 'starter/docs/policy/best-practice-for-this-project.md'), 'Project AI development policy.\n');
  writeFileSync(join(root, 'starter/docs/governance/boundary.md'), 'Documentation governance boundary.\n');
  writeFileSync(join(root, 'starter/docs/governance/ssot-v0.9.md'), 'Starter SSOT rules.\n');
  writeFileSync(join(root, 'starter/docs/governance/agents-routing/engineering-runtime-v0.9.md'), 'Starter engineering route.\n');
  writeFileSync(join(root, 'starter/docs/governance/agents-routing/doc-only-v0.9.md'), 'Starter doc-only route.\n');
  writeFileSync(join(root, 'starter/docs/governance/doc-agent-rules.md'), 'Documentation governance rules.\n');
  writeFileSync(join(root, 'starter/docs/governance/doc-types.md'), 'Documentation type rules.\n');
  mkdirSync(join(root, 'starter/docs/governance/templates'), { recursive: true });
  for (const template of [
    'adr.md',
    'spec.md',
    'plan.md',
    'canon-entry.md',
    'reference.md',
    'policy.md',
    'archive.md',
  ]) {
    writeFileSync(join(root, `starter/docs/governance/templates/${template}`), 'starter template\n');
  }
  return root;
}

function createProjectFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'doc-gov-project-router-check-'));
  mkdirSync(join(root, 'docs/governance/agents-routing'), { recursive: true });
  mkdirSync(join(root, 'docs/policy'), { recursive: true });
  mkdirSync(join(root, 'docs/reference/execution'), { recursive: true });
  mkdirSync(join(root, 'projects/example-package'), { recursive: true });

  writeFileSync(join(root, 'package.json'), '{ "name": "example-project" }\n');
  writeFileSync(join(root, 'README.md'), 'Human introduction.\n');
  writeFileSync(join(root, 'projects/example-package/README.md'), 'Product package README.\n');
  writeFileSync(
    join(root, 'AGENTS.md'),
    [
      '# Example Project AI Router',
      '<!-- PGS-ROUTER:BEGIN v0.9 -->',
      'README.md is human-facing and is not the default AI startup path.',
      'Read docs/policy/.',
      'Read docs/governance/boundary.md.',
      'Read docs/governance/ssot-v0.9.md.',
      'Read docs/governance/doc-agent-rules.md.',
      'Read docs/governance/doc-types.md.',
      'Read docs/governance/agents-routing/doc-only-v0.9.md.',
      'Read docs/reference/execution/current-work.md.',
      '<!-- PGS-ROUTER:END -->',
    ].join('\n')
  );
  writeFileSync(
    join(root, 'docs/governance/boundary.md'),
    'Product artifacts outside governed docs stay outside docs/** by default.\n'
  );
  writeFileSync(
    join(root, 'docs/governance/ssot-v0.9.md'),
    'Project Governance System does not automatically govern every Markdown file.\n'
  );
  writeFileSync(
    join(root, 'docs/governance/doc-agent-rules.md'),
    'Doc-gov governs `docs/**` by default.\n'
  );
  writeFileSync(
    join(root, 'docs/governance/doc-types.md'),
    'Markdown outside `docs/**` is not a governed doc by default.\n'
  );
  writeFileSync(
    join(root, 'docs/governance/agents-routing/doc-only-v0.9.md'),
    'This route does not use Superpowers TDD or Directed Development by default.\n'
  );
  writeFileSync(join(root, 'docs/reference/execution/current-work.md'), 'Current work.\n');
  return root;
}
