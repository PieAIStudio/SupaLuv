---
id: REF-DOCUMENTATION-MAP
title: SupaLuv Documentation Map
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-10
domain: meta
tags:
  - navigation
  - supaluv
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - ADR-0001
  - PLAN-0001
  - PLAN-0002
  - PLAN-0003
  - SPEC-0001
---

# SupaLuv Documentation Map

This is a human and AI map of the governed document shelves. It is not the AI startup entrypoint; `AGENTS.md` is.

## AI Startup Source

Use `AGENTS.md` for startup reading. It should point agents to:

- `docs/policy/*.md`
- `docs/governance/*` core files listed in `AGENTS.md`
- `docs/reference/execution/current-work.md` (**execution truth index**)

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
| `docs/governance/` | Governance core rules |
| `docs/reference/source-material/` | Read-only IP provenance pointers |

Markdown outside `docs/**` is not governed by default (runtime READMEs under
packages are product boundary notes, not parallel strategy truth).

## Current SupaLuv Truth

| Need | Current source |
| --- | --- |
| AI startup and routing | `AGENTS.md` |
| Current execution index | `docs/reference/execution/current-work.md` |
| Web runtime boundary + module map | `apps/web/README.md` |
| Content package boundary + pipeline | `packages/content/README.md` |
| Ch1 polish loops plan | `docs/plans/active/PLAN-0003-ch01-polish-loops.md` |
| Trial pipeline plan/spec (provenance) | `PLAN-0002`, `SPEC-0001` |
| Strategy discussion brief | `docs/reference/strategy/supaluv-interactive-cinema-discussion-brief.md` |
| Proposed engine decision | `docs/decisions/ADR-0001-...` (status: proposed) |
| Character locks | `packages/content/characters/**` |
| Play UI seams | `apps/web/src/views/play/*` |
| Constrained AI branch contract | `docs/reference/architecture/ai-constrained-branch.md` |
| Co-play invite session (discussion) | `docs/reference/architecture/co-play-invite-session.md` |
| Player protagonist customization (discussion) | `docs/reference/architecture/player-protagonist-customization.md` |
| Chapter-end global choice stats (discussion) | `docs/reference/architecture/chapter-end-global-choice-stats.md` |
| Feature status + A/B/C/D/E/F roadmap | `docs/reference/execution/feature-status-and-roadmap.md` |
| Save / settings contracts | `apps/web/src/persistence/*` |
| Source outline (read-only) | `docs/reference/source-material/super-lover-outline.md` |

## Next-session anti-patterns

- Do not invent a second VN engine for chapter 2.
- Do not dump new play chrome back into `VisualNovelPrototype.tsx`.
- Do not treat discussion briefs or proposed ADRs as locked architecture.
- Do not edit the Obsidian source outline under `source-material/`.

## Content production order (next chapters)

1. Novel draft under `packages/content/narrative/chapter-XX/`
2. Script densification (beats / continues / branches)
3. Ink + scene manifest 1:1
4. Portrait / scene / audio / video assets
5. Catalog entry + tests

Do not invent a second narrative engine for each chapter.
