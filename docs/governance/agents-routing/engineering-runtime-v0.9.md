---
id: GOV-AGENTS-ROUTING-ENGINEERING-RUNTIME-V0-9
title: Engineering Runtime Agents Routing v0.9
type: policy
status: stable
canonical: true
owner: human
created: 2026-05-09
last_reviewed: 2026-05-09
domain: agents-routing
tags:
  - agents-routing
  - engineering-runtime
  - workflow
pinned: true
related:
  - GOV-SSOT-V0-9
  - REF-DOC-GOVERNANCE-BOUNDARY
supersedes: []
superseded_by: null
---

# Engineering Runtime Agents Routing v0.9

Shared routing algorithm for app, game, runtime, and code-heavy projects.

This file decides **how to choose a workflow**, not what the project is currently building. Current work belongs in the project's `docs/reference/execution/current-work.md` or equivalent.

## Core Flow

```mermaid
flowchart TD
  A["Task arrives"] --> B["Read project router and current work"]
  B --> C["Classify with local lane profile"]
  C --> D{"Mixed / cross-domain / interdependent product work?"}
  D -- "yes" --> E["Use Directed Development to split ordered DD Blocks"]
  E --> C
  D -- "no" --> F["Enter local lane"]
  F --> G["Use matching Superpowers workflow if applicable"]
  G --> H["Use AI-in-the-Loop evidence cycle"]
  H --> I["Record evidence in doc-gov"]
```

## Keep It Small

Use this router only to pick depth and workflow. Do not use it as a project roadmap.

## DD Trigger

Use Directed Development only when all are true:

- the task is product work
- it crosses local lanes or shared contracts
- sequencing risk makes a flat plan unsafe

Do not trigger DD for broad mechanical edits, renames, formatting, or ordinary docs migration.

## Project-Local Lane Profile

Every engineering project must define its own lane profile in `AGENTS.md` or `docs/policy/best-practice-for-this-project.md`.

Typical lanes:

- visual / UX / game-feel
- content / config / canon
- behavior-critical code
- pure refactor

But the shared router must not define project-specific lanes.

## External Workflow Boundary

This route runs before external workflow systems such as Superpowers or GStack.
Those systems may provide skills, reviews, browser workflows, or shipping gates,
but they execute **inside** the lane selected by this route.

Host-specific adapters such as `CLAUDE.md` may adapt the route for a specific AI
client, but they must not replace the project `AGENTS.md` route.
