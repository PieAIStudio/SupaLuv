---
id: GOV-SSOT-V1-1
title: SSOT Documentation Governance Rules v1.1
type: policy
status: stable
canonical: true
owner: human
created: 2026-07-13
last_reviewed: 2026-09-10
domain: doc-governance
tags:
  - ssot
  - doc-gov
  - boundary
  - ai-hosts
pinned: true
related:
  - REF-DOC-GOVERNANCE-BOUNDARY
supersedes: []
superseded_by: null
---

# SSOT Documentation Governance Rules v1.1

This rule defines how projects using Project Governance System handle
**SSOT (Single Source of Truth)** for governed documentation and project-level
AI-host entry and skill discovery.

Consult the relevant sections when changing scope, canonical ownership,
directory contracts, lifecycle or host aliases. For ordinary content edits,
use the short documentation guide selected by `AGENTS.md` instead of loading
the complete governance rules.

Beginner version: every important fact should have one home. Other files and
host compatibility paths may point to that home, but they must not become
competing copies.

## Governance Scope

Project Governance System governs:

- `AGENTS.md` and compatible project AI entry paths.
- `.agents/skills/` as the canonical project skill root and compatible
  project skill discovery paths.
- Governed Markdown under `docs/**`.
- Documentation governance rules, agent routing rules, templates, manifests,
  plans, specs, references, canon, and archives that live under `docs/**`.

Project Governance System does **not** automatically govern every Markdown file,
host-native runtime setting, user-level skill installation, or project asset.

Markdown outside `docs/**` can be a product artifact, source asset, prompt,
project package file, runtime note, generated media description, or local
workbench record. Do not move those files into `docs/**` just because they are
Markdown.

Extra governed roots are allowed only when a project explicitly opts in.

External and optional-tool artifacts are explicitly outside the default Doc Gov
schema:

- `CONTEXT.md` and `CONTEXT-MAP.md`
- `docs/brainstorms/**`
- `docs/pulse-reports/**`

PGS plans remain under `docs/plans/active/**` and
`docs/plans/completed/**`.

## Project AI Host SSOT

Every governed project uses these project-level truth surfaces:

| Concern | Canonical path | Compatibility contract |
| --- | --- | --- |
| Project AI router | `AGENTS.md` | Claude Code 2.1.277+ can read it natively; no root entry alias is required or created |
| Project skills | `.agents/skills/` | `.claude/skills` is the exact relative symlink `../.agents/skills` |

Claude Code native `AGENTS.md` reading starts at **2.1.277** (18 September 2026).
In the default mode, a `CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in
the working directory or an ancestor takes precedence. Check these files before
removing only the legacy root alias; preserve independent instruction files.
The built-in AGENTS plugin must be enabled; some sessions before 2.1.281 did
not support the fallback. Verify loaded instructions with `/context all`.
Claude Code does not discover the `.agents/` tree as a skill root, so keep the
exact `.claude/skills` adapter. See the [official memory contract](https://code.claude.com/docs/en/memory#agentsmd)
and [2.1.277 release](https://github.com/anthropics/claude-code/releases/tag/v2.1.277).

The compatibility paths are structural contracts, not alternate content
locations:

- `AGENTS.md` is the project entry. Preserve and list independent `CLAUDE.md`
  files; migrate only the legacy root symlink to `AGENTS.md`.
- `.claude/skills` must be a symbolic link whose raw link target is exactly
  `../.agents/skills`.
- `.agents/skills/` must still exist in a clean checkout. Track managed skill
  entries or a `.gitkeep`; if the directory is otherwise ignored, explicitly
  unignore that placeholder.
- A copied file, copied directory, absolute link, differently spelled relative
  link, wrong target, or dangling link is not compliant even when it currently
  resolves to similar content.
- Check the link object and raw target with `lstat` and `readlink`; resolving
  the final path alone is insufficient.
- Host-specific runtime settings may remain in native host configuration files,
  but they must not introduce a second project router or project skill tree.

On Windows, local materialization may use a directory link or junction for
`.claude/skills` that resolves to canonical `.agents/skills`. The host-aware
validators accept these proven aliases; copied files, copied directories,
wrong targets, and dangling links remain invalid. This is an existing local
adapter allowance. The portable Git representation remains the exact relative
skill-folder symlink above, and Git's plain-text symlink checkout must be materialized before
host use. It does not create another source of truth.

This exact-relative rule applies only to the skill-folder compatibility link.
Individual project entries under `.agents/skills/<skill>` link to their
registered skill sources. Those per-skill links may be absolute or relative;
the exact-relative rule applies only to the Claude skill-folder adapter.

User-level skill roots are a separate configuration scope. A user may maintain
one canonical `~/.agents/skills/` tree and link a compatible host root to it,
but project governance must not hard-code a user's home directory or inspect it
as part of a portable project router contract.

## Core Behavior

- **Discover before editing**: first identify the project's actual documentation
  system and current entrypoints.
- **One truth surface**: each durable fact should have one canonical source;
  other files should summarize and link.
- **One project router and skill tree**: host compatibility paths point to the
  canonical project surfaces instead of duplicating them.
- **Runtime beats Markdown**: when runtime code/config is the real product truth,
  docs must point to it instead of duplicating it.
- **Product artifacts stay in their product package**: prompts, generated media,
  asset manifests, project-package canon, and source materials should stay in
  the project's own production/workbench structure unless the project explicitly
  makes them governed docs.
- **No parallel systems**: do not keep old and new documentation, router, or
  skill structures alive unless the project explicitly says it is in a
  migration window.
- **Purpose, not session author**: directory indexes (including README.md) and
  tool-topic guides are allowed with normal governed metadata and ownership.
  Do not use AI-author folders to collect unowned temporary process drafts.

## Discovery Order

Start with `AGENTS.md` and its task-scoped guide. Use README.md, the existing
documentation index and `docs/policy/` for relevant context, not as a startup
checklist. Consult classification/lifecycle rules for metadata changes, the
boundary and this SSOT for scope/ownership/host changes, and agents-routing for
workflow changes. Follow the actual runtime sources named by the project.

Use existing tooling: `pnpm doc-gov find <topic>` discovers current documents;
`--include-history` includes retired records. Diagnostics and exit 1 indicate
invalid or incomplete input even when useful matches are returned. Discovery
is not a health gate or permission to write. Run relevant checks and required
delivery gates; do not build a parallel document system.

Small tasks do not require new Spec, Plan, ADR or proof documents. Use the
existing roles below for substantial work, cross-session handoff and durable
decisions; keep current-work as an index, not a duplicate plan or task database.

## Choosing The Truth Layer

Use the project's own vocabulary when available. If none exists, this fallback
works for governed docs:

| Need | Usually belongs in |
| --- | --- |
| AI entry and startup routing | `AGENTS.md`, reached through exact host compatibility links when required |
| Project skill discovery | `.agents/skills/`, reached through exact host compatibility links when required |
| Agents-routing rules | `docs/governance/agents-routing/` |
| Doc-system rules, templates, and manifest | `docs/governance/` |
| Project AI/development policy | `docs/policy/` |
| Durable decisions | `docs/adr/`, governed decision records |
| Product or feature requirement | `docs/specs/` |
| Step-by-step implementation work | `docs/plans/` |
| Reusable learning records | `docs/reference/learnings/**`, governed as `reference` documents and recalled on demand |
| Durable workspace/system truth | `docs/canon/` |
| How-to guides, architecture maps, tool notes | `docs/reference/` |
| Retired governed history | `docs/archive/` |
| Runtime ids, values, generated asset paths | code/config/manifests, not Markdown body |
| Product prompts, project-package canon, generated media notes | project package or workbench, not `docs/**` by default |

If the project has different layers, use the project layers instead of this
table.

## Editing And Completion

When modifying documentation or project AI-host compatibility:

1. Identify the canonical source and whether the path is a governed doc,
   compatibility link or product artifact. Edit only the authorized source.
2. Preserve the host-link contract above and valid per-skill links. Do not edit
   through a symlink into a source outside the authorized workspace.
3. Update affected references, navigation, manifests and symlinks after changes;
   replace competing copies with a summary and link. Runtime truth comes first.
4. Preserve decision rationale, source/approval records and original evidence.
5. Run relevant project checks and required delivery gates before completion.
   Repeat or expand only after related changes, failure or unresolved questions;
   old logs do not verify new content.

## Moving Or Deleting Docs

- If the content is still useful governed history, archive it under the
  project-approved `docs/archive/**` path.
- If the content is stale, misleading, and already superseded, deletion can be
  better than hoarding.
- If a file is moved, update indexes, manifests, and symlinks.
- Do not move product artifacts into `docs/**` as a cleanup shortcut.
- Before replacing an incompatible skill directory, preserve any unique skills
  by moving them into the canonical `.agents/skills/` tree.
