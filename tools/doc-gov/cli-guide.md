# @pieai/doc-gov

Documentation governance CLI for PieAI projects.

This package is currently the upstream source for project-local `tools/doc-gov` copies in Supa, PieFlow, and PieIP. It is not published yet.

## Lifecycle

Normal documents:

```text
draft -> active -> completed -> stable -> superseded -> archived
```

Decision documents:

```text
proposed -> accepted -> rejected | superseded
```

`completed` means an execution artifact is done but still valuable as proof history. It is especially useful for:

- `docs/plans/completed/**`
- `docs/specs/completed/**`

Unlike `archived`, a `completed` document may remain `canonical: true`.

## Commands

```bash
pnpm doc-gov find <topic>
pnpm doc-gov new <type> <slug>
pnpm doc-gov check
pnpm doc-gov scan
pnpm doc-gov scan --check
pnpm doc-gov audit
pnpm doc-gov links
pnpm doc-gov router-check
```

`init` creates the directory skeleton and writes default templates under
`docs/governance/templates/`, so `doc-gov init` followed by
`doc-gov new spec test-spec` is a supported first-user path.

`router-check` is intentionally thin:

- In this upstream repo, it verifies that `AGENTS.md`,
  `docs/governance/agents-routing/`, `profiles/`, and
  `integrations/superpowers.md` stay connected in the expected order.
- In a downstream project, it verifies the project router block,
  `docs/governance/ssot-v0.9.md`, the selected agents-routing file, and old
  shared SSOT/task-routing leftovers.
- It also checks that local paths written in backticks inside `AGENTS.md` can
  actually be opened, which catches stale startup instructions early.

It does not choose a workflow for a specific task.

## Build

```bash
pnpm --filter @pieai/doc-gov build
pnpm --filter @pieai/doc-gov test
pnpm --filter @pieai/doc-gov typecheck
```

## Current Status

This package is a central source, not yet the only runtime dependency. Projects should upgrade by comparing their local tool copy against this package until package-based installation is deliberately enabled.
