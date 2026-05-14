---
id: GOV-AGENTS-ROUTING-DOC-ONLY-V0-9
title: Doc-Only Agents Routing v0.9
type: policy
status: stable
canonical: true
owner: human
created: 2026-05-09
last_reviewed: 2026-05-09
domain: agents-routing
tags:
  - agents-routing
  - doc-only
  - workflow
pinned: true
related:
  - GOV-SSOT-V0-9
  - REF-DOC-GOVERNANCE-BOUNDARY
supersedes: []
superseded_by: null
---

# Doc-Only Agents Routing v0.9

Shared routing algorithm for non-runtime projects such as AI media, IP development, research, and asset governance workspaces.

This route does not use Superpowers TDD or Directed Development by default.

## Core Flow

```mermaid
flowchart TD
  A["Task arrives"] --> B["Read project router and current work"]
  B --> C{"What is being changed?"}
  C --> D["canon / durable truth"]
  C --> E["asset / provenance"]
  C --> F["reference / operating guide"]
  C --> G["archive / cleanup"]
  C --> H["review / synthesis"]
  D --> I["Update canonical doc"]
  E --> J["Preserve source and approval trail"]
  F --> K["Update reusable guide"]
  G --> L["Archive or delete stale material"]
  H --> M["Write summary and evidence"]
  I --> N["Run doc-gov checks"]
  J --> N
  K --> N
  L --> N
  M --> N
```

## Rules

- Do not ask whether the task needs TDD unless the project has actual runtime code.
- Do not trigger Directed Development unless the project explicitly opts in.
- Prefer SSOT, provenance, and approval clarity over engineering ceremonies.
- Use AI-in-the-Loop for evidence: inspect source, change one thing, verify the target document or asset path.

## Typical Lanes

- canon truth
- asset intake and promotion
- production/reference guide
- archive and cleanup
- research synthesis

The local project decides exact lane names.

## Product Artifact Boundary

Doc-only projects often produce Markdown, prompts, images, scripts, bibles,
reference packs, and asset manifests as product artifacts.

Those artifacts do not become governed `docs/**` files just because they are
written as Markdown. Governed docs record decisions, plans, references, policies,
and workspace truth. Product artifacts stay in the project package or workbench
unless the project explicitly opts them into doc-gov.

## External Workflow Boundary

This route runs before external workflow systems such as Superpowers or GStack.
Host-specific files such as `CLAUDE.md` or `GEMINI.md` may adapt the route for a
specific AI client, but they must not replace the project `AGENTS.md` route.
