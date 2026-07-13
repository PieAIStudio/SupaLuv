---
id: GOV-AGENTS-ROUTING-ENGINEERING-RUNTIME-V1-1
title: Engineering Runtime Agents Routing v1.1
type: policy
status: stable
canonical: true
owner: human
created: 2026-07-13
last_reviewed: 2026-07-13
domain: agents-routing
tags:
  - agents-routing
  - engineering-runtime
  - workflow
pinned: true
related:
  - GOV-SSOT-V1-1
  - REF-DOC-GOVERNANCE-BOUNDARY
supersedes: []
superseded_by: null
---

# Engineering Runtime Agents Routing v1.1

Shared routing algorithm for app, game, runtime, and code-heavy projects.

This file decides **how to choose a workflow**, not what the project is currently building. Current work belongs in the project's `docs/reference/execution/current-work.md` or equivalent.

## Core Flow

```mermaid
flowchart TD
  A["Task arrives"] --> B["Read project router and current work"]
  B --> C["Classify with local lane profile"]
  C --> F["Enter local lane"]
  F --> H["Use AI-in-the-Loop evidence cycle"]
  H --> I["Record evidence in doc-gov"]
```

## Keep It Small

Use this router only to pick depth and workflow. Do not use it as a project roadmap.

## Project-Local Lane Profile

Every engineering project must define its own lane profile in `AGENTS.md` or `docs/policy/best-practice-for-this-project.md`.

Typical lanes:

- visual / UX / game-feel
- content / config / canon
- behavior-critical code
- pure refactor

But the shared router must not define project-specific lanes.

## Host Compatibility Boundary

Follow the Project AI Host SSOT in `docs/governance/ssot-v1.1.md`. Host-specific
runtime settings must not create a second project router or skill tree.
