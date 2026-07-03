---
id: GOV-SSOT-V0-9
title: SSOT Documentation Governance Rules v0.9
type: policy
status: stable
canonical: true
owner: human
created: 2026-05-09
last_reviewed: 2026-05-09
domain: doc-governance
tags:
  - ssot
  - doc-gov
  - boundary
pinned: true
related:
  - REF-DOC-GOVERNANCE-BOUNDARY
supersedes: []
superseded_by: null
---

# SSOT Documentation Governance Rules v0.9

This rule defines how projects using Project Governance System handle
**SSOT (Single Source of Truth)** for governed documentation.

Use it whenever an AI agent creates, modifies, moves, deletes, archives, or
cross-references project documents.

Beginner version: every important fact should have one home. Other files can
point to that home, but they should not become competing copies.

## Governance Scope

Project Governance System governs:

- `AGENTS.md` and equivalent AI entry files.
- Governed Markdown under `docs/**`.
- Documentation governance rules, agent routing rules, templates, manifests,
  plans, specs, decisions, references, canon, and archives that live under
  `docs/**`.

Project Governance System does **not** automatically govern every Markdown file
or every asset in the repository.

Markdown outside `docs/**` can be a product artifact, source asset, prompt,
project package file, runtime note, generated media description, or local
workbench record. Do not move those files into `docs/**` just because they are
Markdown.

Extra governed roots are allowed only when a project explicitly opts in.

Compound Engineering external artifacts are explicitly outside the default Doc
Gov schema:

- `docs/solutions/**`
- `docs/brainstorms/**`
- `docs/pulse-reports/**`
- CE-native root artifacts under `docs/plans/*`

PGS plans remain under `docs/plans/active/**` and
`docs/plans/completed/**`.

## Core Behavior

- **Discover before editing**: first identify the project's actual documentation
  system and current entrypoints.
- **One truth surface**: each durable fact should have one canonical source;
  other files should summarize and link.
- **Runtime beats Markdown**: when runtime code/config is the real product truth,
  docs must point to it instead of duplicating it.
- **Product artifacts stay in their product package**: prompts, generated media,
  asset manifests, project-package canon, and source materials should stay in
  the project's own production/workbench structure unless the project explicitly
  makes them governed docs.
- **No parallel systems**: do not keep old and new documentation structures alive
  unless the project explicitly says it is in a migration window.
- **No AI dump folders inside governed docs**: do not create ad-hoc `Temp/`,
  `Drafts/`, `Opus/`, `Codex/`, or AI-name folders under `docs/**`.

## Discovery Order

Before changing docs, look for project-local guidance in this order:

1. `AGENTS.md`, `CLAUDE.md`, or equivalent AI router/config adapter.
2. `docs/governance/boundary.md`.
3. `docs/governance/ssot-v0.9.md`.
4. `docs/governance/agents-routing/` and the project's selected agents-routing file.
5. `docs/reference/documentation-map.md`, root `README.md` for human-facing
   orientation, or another project-defined documentation index.
6. `docs/policy/`, `docs/governance/`, or equivalent project rules.
7. Any project-specific doc tooling such as `doc-gov`, `mintlify`,
   `docusaurus`, `vitepress`, or custom scripts.
8. Runtime truth locations named by the project, such as config files, schemas,
   manifests, source packages, product packages, or asset manifests.

If the project uses `doc-gov`, follow it:

```bash
pnpm doc-gov find <topic>
pnpm doc-gov check
pnpm doc-gov scan --check
```

Do not invent a second structure when doc-gov already defines one.

## Choosing The Truth Layer

Use the project's own vocabulary when available. If none exists, this fallback
works for governed docs:

| Need | Usually belongs in |
| --- | --- |
| AI entry and startup routing | `AGENTS.md` plus thin host-specific adapters such as `CLAUDE.md` |
| Agents-routing rules | `docs/governance/agents-routing/` |
| Doc-system rules, templates, and manifest | `docs/governance/` |
| Project AI/development policy | `docs/policy/` |
| Product or feature requirement | `docs/specs/` |
| Step-by-step implementation work | `docs/plans/` |
| Compound Engineering learning records | `docs/solutions/**`, governed by CE schema |
| Durable workspace/system truth | `docs/canon/` |
| How-to guides, architecture maps, tool notes | `docs/reference/` |
| Retired governed history | `docs/archive/` |
| Runtime ids, values, generated asset paths | code/config/manifests, not Markdown body |
| Product prompts, project-package canon, generated media notes | project package or workbench, not `docs/**` by default |

If the project has different layers, use the project layers instead of this
table.

## Editing Rules

When modifying documentation:

1. Find the canonical source first.
2. Decide whether the file is a governed doc or a product artifact.
3. Edit only the canonical source for the durable fact.
4. Update navigation links if names or paths change.
5. Replace duplicated content with a one-line summary plus link.
6. If code/runtime behavior changed, update the runtime truth first, then align
   docs.
7. Run the project's doc checks before claiming completion.

## Moving Or Deleting Docs

- If the content is still useful governed history, archive it under the
  project-approved `docs/archive/**` path.
- If the content is stale, misleading, and already superseded, deletion can be
  better than hoarding.
- Do not preserve obsolete drafts just to feel safe; excessive history increases
  AI cognitive load.
- If a file is moved, update indexes, manifests, and symlinks.
- Do not move product artifacts into `docs/**` as a cleanup shortcut.

## Completion Checklist

Before reporting doc work complete:

- [ ] I found the project documentation system.
- [ ] I identified whether the changed file is governed documentation or a
      product artifact.
- [ ] I updated the canonical source, not a duplicate.
- [ ] I did not create ungoverned temp/draft/AI-name folders under `docs/**`.
- [ ] I updated links/navigation after moves or renames.
- [ ] I kept runtime data in runtime/config files, not Markdown copies.
- [ ] I kept product prompts/assets in the product package unless explicitly
      governed.
- [ ] I ran the project's doc validation command when available.

## Common Mistakes

| Mistake | Better move |
| --- | --- |
| Copying the same design rule into five docs | Keep one canonical doc, link from the others. |
| Treating old migration sources as current truth | Archive or delete them after migration. |
| Letting Markdown override runtime config | Runtime/config wins; docs explain intent. |
| Moving every `.md` file into `docs/**` | Govern discussion records; keep product artifacts in their product package. |
| Creating a new folder because the current structure feels inconvenient | Use the governed structure or update governance first. |
| Keeping outdated drafts forever | Archive only useful history; delete misleading noise. |
