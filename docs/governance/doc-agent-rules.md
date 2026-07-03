---
id: POLICY-DOC-AGENT-RULES
title: Documentation Agent Rules
type: policy
status: stable
canonical: true
owner: project
created: 2026-05-08
last_reviewed: 2026-06-12
domain: doc-governance
tags:
  - doc-gov
  - agent-rules
pinned: true
related:
  - POLICY-DOC-TYPES
supersedes: []
superseded_by: null
---

# Documentation Agent Rules

This file belongs in `docs/governance/` because it governs how the documentation
system itself behaves.

Doc-gov governs `docs/**` by default. Do not move product prompts, generated
media notes, source assets, runtime docs, or project-package Markdown into
`docs/**` unless the project explicitly opts those files into governance.

## Before Creating Docs

Run:

```bash
pnpm doc-gov find <topic>
```

If a canonical document exists, update it instead of creating a parallel document.

## Closed Document Types

Use only:

- `policy`
- `decision`
- `spec`
- `plan`
- `canon`
- `reference`
- `archive`

## Status Machine

Normal documents:

```text
draft -> active -> completed -> stable -> superseded -> archived
```

Decision documents:

```text
proposed -> accepted -> rejected | superseded
```

`completed` is for finished execution records or specs that should no longer appear in active folders.

## Upstream Rule

Do not locally invent doc-gov core changes. Propose core changes upstream in
the Project Governance System upstream repository.
