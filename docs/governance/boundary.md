---
id: REF-DOC-GOVERNANCE-BOUNDARY
title: Documentation Governance Boundary
type: reference
status: stable
canonical: true
owner: project
created: 2026-05-08
last_reviewed: 2026-05-08
domain: doc-governance
tags:
  - doc-gov
  - boundary
pinned: true
related:
  - POLICY-DOC-AGENT-RULES
  - POLICY-DOC-TYPES
supersedes: []
superseded_by: null
---

# Project Governance Boundary

Use this folder for the Project Governance System's own rules.

Beginner version: `docs/governance/` is the filing-cabinet manual and traffic
desk. It explains how governed documents work, how agents choose a workflow,
and what the system does not govern.

It is not where project product truth, source assets, generated media, or
project-specific AI development habits live.

## Put Here

- Document types and lifecycle rules.
- SSOT rules for governed docs.
- Agents-routing rules.
- Documentation agent behavior rules.
- Document templates.
- The generated doc manifest.

## Do Not Put Here

- Project-specific AI development practices.
- Product canon, runtime truth, or content truth.
- Product prompts, generated media notes, or project-package workbench files.
- Current project plans or active specs.
- Superpowers plugin content.
- Compound Engineering plugin content.

## Put Those Elsewhere

| Need | Put it in |
| --- | --- |
| AI startup entry | `AGENTS.md` |
| Agent routing algorithm | `docs/governance/agents-routing/` |
| Governed SSOT rules | `docs/governance/ssot-v0.9.md` |
| Project AI development practices | `docs/policy/best-practice-for-this-project.md` |
| Current work index | `docs/reference/execution/current-work.md` |
| Product or world truth | `docs/canon/` |
| Active implementation work | `docs/plans/active/` |
| Completed proof records | `docs/plans/completed/` |
| Compound Engineering learnings | `docs/solutions/**` as CE-owned external artifacts |
| Product artifacts outside governed docs | Project package, workbench, assets, runtime config, or source tree |

When unsure, ask this question: is this rule about how the document system works,
how agents should route work, or about how this particular project works?
System rules go here. Project-specific rules go to `docs/policy/`.

## Governed Scope

By default, doc-gov governs Markdown under `docs/**` and AI entry files such as
`AGENTS.md`.

It does not govern every Markdown file in the repository. Markdown under
product packages, workbenches, prompt libraries, source folders, or asset
folders can be product artifacts. Keep those files where the product package
expects them unless a project explicitly opts them into doc-gov.

Compound Engineering external artifacts under `docs/solutions/**`,
`docs/brainstorms/**`, `docs/pulse-reports/**`, and CE-native root files under
`docs/plans/*` are not governed docs by default. They remain valid project
artifacts, but their frontmatter belongs to Compound Engineering, not Doc Gov.
