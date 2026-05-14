---
id: REF-DOCUMENTATION-MAP
title: SupaLuv Documentation Map
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-05-14
domain: meta
tags:
  - navigation
  - supaluv
pinned: false
related:
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - ADR-0001
  - PLAN-0001
  - SPEC-0001
  - PLAN-0002
---

# SupaLuv Documentation Map

This is a human and AI map of the governed document shelves. It is not the AI startup entrypoint; `AGENTS.md` is.

## AI Startup Source

Use `AGENTS.md` for startup reading. It should point agents to:

- `docs/policy/*.md`
- `docs/governance/boundary.md`
- `docs/governance/ssot-v0.9.md`
- `docs/governance/doc-agent-rules.md`
- `docs/governance/doc-types.md`
- `docs/governance/agents-routing/<selected-profile>-v0.9.md`
- `docs/reference/execution/current-work.md` when present

## Areas

| Area | Purpose |
| --- | --- |
| `docs/policy/` | Project policy and AI development rules |
| `docs/decisions/` | Durable decisions |
| `docs/specs/active/` | Active requirements |
| `docs/specs/completed/` | Completed specs |
| `docs/plans/active/` | Active implementation plans |
| `docs/plans/completed/` | Completed execution records |
| `docs/canon/` | Durable project truth |
| `docs/reference/` | Guides and references |
| `docs/archive/` | Retired history |
| `docs/governance/` | Governance core rules, SSOT, agents routing, doc types, templates, and manifest |
| `docs/reference/source-material/` | Read-only source-material entrypoints and provenance pointers |

Markdown outside `docs/**` is not governed by default. Product prompts, assets,
project-package canon, generated media notes, and source-package files stay in
their product/workbench structure unless this project explicitly opts them into
doc-gov.

## Current SupaLuv Truth

| Need | Current source |
| --- | --- |
| AI startup and routing | `AGENTS.md` |
| Current execution index | `docs/reference/execution/current-work.md` |
| Current strategy discussion brief | `docs/reference/strategy/supaluv-interactive-cinema-discussion-brief.md` |
| Proposed engine/content-format decision | `docs/decisions/ADR-0001-propose-web-first-ink-pixivn-evaluation-supaluv.md` |
| Active implementation plan | `docs/plans/active/PLAN-0002-chapter-01-trial-pipeline.md` |
| Active implementation spec | `docs/specs/active/SPEC-0001-chapter-01-trial-pipeline.md` |
| Project-local policy | `docs/policy/best-practice-for-this-project.md` |
| Original 超级爱人 outline provenance | `docs/reference/source-material/super-lover-outline.md` symlink |

There is no final architecture spec yet. Create one under `docs/specs/active/`
only after the owner approves the strategy direction.

## Source Material

| Entry | Role | Canonical source | Editing rule |
| --- | --- | --- | --- |
| `docs/reference/source-material/super-lover-outline.md` | Read-only symlink entry for the original 超级爱人 outline | Obsidian vault file under `PieVaultLocal/我的IPs/.../A超级爱人/超级爱人-骨架情节点.md` | Do not edit through the symlink; create project adaptation notes separately if needed |

The folder name `A超级爱人` is historical path provenance. The IP name used by
SupaLuv is 超级爱人.

## Runtime Package Map

| Path | Package | Current role |
| --- | --- | --- |
| `apps/web/` | `@supaluv/web` | Minimal React / Vite shell for the default VN player plus story selector and creator-map drawer |
| `packages/content/` | `@supaluv/content` | Seed manifest plus noncanonical prototype and Chapter 01 trial scene metadata, Ink fixtures, and generated Canvas overview artifacts |
| `packages/shared/` | `@supaluv/shared` | Shared runtime/content types and small utilities |
| `tools/doc-gov/` | `@pieai/doc-gov` | Existing documentation governance CLI |

This runtime map records the current bootstrap only. It does not accept Pixi'VN,
Supabase, payments, accounts, public runtime AI, Phaser, Colyseus, or Supa
card-game systems into the P0 baseline.

## Active Prototype Planning

| Plan | Role |
| --- | --- |
| `docs/plans/active/PLAN-0001-react-inkjs-pixivn-spike.md` | Compare a React + InkJS baseline with a narrow Pixi'VN spike, using non-canonical trial content only to prove the visible prototype and story-overview workflow |
| `docs/plans/active/PLAN-0002-chapter-01-trial-pipeline.md` | Build the minimal read-only Chapter 01 trial pipeline from short scene cards to Ink, player selection, and generated Obsidian Canvas overview |

## Current Trial Pipeline Artifacts

| Path | Role |
| --- | --- |
| `packages/content/manifests/chapter-01-trial-scenes.ts` | Noncanonical Chapter 01 trial scene cards derived from read-only source material |
| `packages/content/ink/chapter-01-trial.ink` | Placeholder-grade Ink fixture for the Chapter 01 trial |
| `packages/content/canvas/chapter-01-trial.canvas` | Generated Obsidian Canvas creator overview; not runtime truth and not canonical source |
| `tools/storygraph/ink-to-canvas.ts` | Local generator used to build the Chapter 01 trial Canvas overview |

The experimental `chapter-01.md` in the Obsidian `proxy-love` manuscript path is
not a SupaLuv canonical source. It may inform a tiny derived fixture only when
the fixture is clearly marked non-canonical. Current local examples under
`packages/content/` remain pipeline dummies, not final chapter content. The
generated Canvas overview is for creators only and must not become runtime
source-of-truth.
