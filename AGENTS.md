# SupaLuv AI Router

<!-- PGS-ROUTER:BEGIN v0.9 -->

## Project At A Glance

- **Name**: SupaLuv
- **Adopted profile**: `engineering-runtime`
- **Product type**: independent AI-assisted interactive cinema / visual-novel-like game
- **Source IP**: 超级爱人
- **Current stack hypothesis**: React, Vite, TypeScript, Ink / InkJS, optional Pixi'VN, HTML video, AI-assisted authoring, later server-side AI branch service
- **Not part of**: Supa card game, Boss Race, card rules, multiplayer match loop

## Startup Reading

`README.md` is the human-facing project introduction. Do not use it as the default AI startup path unless the task is about project positioning, public explanation, or the README itself.

Before main work, read:

1. All Markdown files directly under `docs/policy/`.
2. `docs/governance/boundary.md`.
3. `docs/governance/ssot-v0.9.md`.
4. `docs/governance/doc-agent-rules.md`.
5. `docs/governance/doc-types.md`.
6. The selected agents routing file: `docs/governance/agents-routing/engineering-runtime-v0.9.md`.
7. `docs/reference/execution/current-work.md`.
8. Relevant discussion briefs, active specs, or decisions named by current work.

## Governance

- Use doc-gov for governed Markdown.
- Governed Markdown lives under `docs/**` by default.
- Product artifacts outside `docs/**` are not governed docs unless SupaLuv explicitly opts them in.
- Before creating governed docs: `pnpm doc-gov find <topic>`.
- Before claiming doc work complete: `pnpm governance:check` and `git diff --check`.
- Do not create legacy root governance, routing, draft-dump, temp, AI-name, or non-root README documentation surfaces.

## Routing

SupaLuv uses the `engineering-runtime` profile because it is a game/runtime project with browser UI, video playback, AI service boundaries, save state, platform packaging, and later engine migration risk.

Use `docs/governance/agents-routing/engineering-runtime-v0.9.md` to choose workflow depth. External workflow systems such as Superpowers or Directed Development run inside the lane selected by this router; they do not replace it.

Local lane profile:

| Lane | Use for | Proof |
| --- | --- | --- |
| Product / narrative strategy | product thesis, story structure, engine choice, platform order | governed decision or spec |
| Content package | Ink scripts, story metadata, character variables, AI branch policy | schema validation once runtime exists |
| Visual / cinema surface | layout, staging, cutscenes, transitions, UI feel | browser screenshot or recording |
| AI branch runtime | user input, moderation, structured output, branch cache | deterministic tests plus live safety sample |
| Packaging / platform | Web, desktop, mobile, Steam/App Store/Google Play readiness | platform-specific build or review checklist |
| Pure refactor | names, seams, structure cleanup | tests or governance checks, no behavior change |

## Current Truth Hierarchy

When facts conflict, use this order:

1. User instruction in the current thread.
2. `docs/reference/execution/current-work.md`.
3. Accepted decisions under `docs/decisions/`.
4. Active specs under `docs/specs/active/`.
5. Project policy under `docs/policy/`.
6. Draft discussion/reference docs under `docs/reference/` and canon docs under `docs/canon/`.
7. Runtime source/config once implemented.

Runtime source/config wins for executable behavior after code exists; docs explain intent and constraints.

## Non-Negotiables

- Do not treat SupaLuv as a Supa card-game mode.
- Do not introduce card systems, Boss Race, or multiplayer authority unless a later accepted decision explicitly changes scope.
- Do not make the product an AI sex companion, porn game, or user-prompted erotic generator.
- Live AI branches must be short, constrained, moderated, and forced back to authored story.
- Public runtime AI branches are post-P0 unless the owner explicitly approves a safety-reviewed scope.
- Keep the authored story and metadata portable enough to migrate to Unity, Godot, Ren'Py, or another engine later.
- Do not let platform ambitions block the first 20-30 minute playable prototype.
- Do not treat draft discussion briefs as final implementation specs.

## Verification

Use the smallest sufficient set, but know the current ladder:

```bash
pnpm governance:check
git diff --check
```

When runtime packages are added, extend this section with typecheck, tests,
browser proof, AI safety samples, and platform build checks.

<!-- PGS-ROUTER:END -->

## Upstream Rule

Do not locally invent doc-gov core changes such as new document statuses, frontmatter schema, lifecycle rules, shared agents-routing rules, or shared AI rules. If such a change seems necessary, propose it upstream in `/Users/yuanfei/PieAI/project-governance-system` first.
