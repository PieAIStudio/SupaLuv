# SupaLuv AI Router

<!-- PGS-ROUTER:BEGIN v1.0 -->

## Project At A Glance

- **Name**: SupaLuv
- **Adopted profile**: `engineering-runtime`
- **Product type**: independent AI-assisted interactive cinema / visual-novel-like game
- **Source IP**: 超级爱人
- **Current stack**: React, Vite, TypeScript, Ink / InkJS, still-first cinema staging, Mastra + SwimmerAIKit AI service, SwimmerCore account/wallet/storage, OpenRouter model routing
- **Not part of**: Supa card game, Boss Race, card rules, multiplayer match loop

## Startup Reading

`README.md` is the human-facing project introduction. Do not use it as the default AI startup path unless the task is about project positioning, public explanation, or the README itself.

Before main work, read:

1. All Markdown files under `docs/policy/**/*.md`, including files in
   subdirectories and symlinked shared-rule files.
2. `docs/governance/boundary.md`.
3. The selected agents routing file: `docs/governance/agents-routing/engineering-runtime-v1.0.md`.
4. `docs/reference/execution/current-work.md`.
5. Relevant discussion briefs, active specs, or decisions named by current work.
6. Before non-trivial implementation, debugging, release, architecture, or
   migration work, run `pro-gov learn recall --query "<task summary>"` and read
   any relevant prior-learning hits before changing files.

When the task creates, edits, moves, deletes, or governs documentation, also
read `docs/governance/ssot-v1.0.md`,
`docs/governance/doc-agent-rules.md`, and `docs/governance/doc-types.md` before
changing governed files.

## Governance

- Use doc-gov for governed Markdown.
- Governed Markdown lives under `docs/**` by default.
- Product artifacts outside `docs/**` are not governed docs unless SupaLuv explicitly opts them in.
- Before creating governed docs: `pnpm doc-gov find <topic>`.
- Before claiming doc work complete: `pnpm docs:check` and `git diff --check`.
- Do not create legacy root governance, routing, draft-dump, temp, AI-name, or non-root README documentation surfaces.

## Routing

SupaLuv uses the `engineering-runtime` profile because it is a game/runtime project with browser UI, AI service boundaries, generated character assets, save state, wallet accounting, platform packaging, and later engine migration risk.

Use `docs/governance/agents-routing/engineering-runtime-v1.0.md` to choose workflow depth. Codex and this router own normal execution; optional skills run only when a narrow trigger matches the selected lane.

Local lane profile:

| Lane | Use for | Proof |
| --- | --- | --- |
| Product / narrative strategy | product thesis, story structure, engine choice, platform order | ADR or governed spec |
| Content package | Ink scripts, story metadata, character variables, AI branch policy | schema validation once runtime exists |
| Visual / cinema surface | layout, still-first staging, transitions, UI feel | browser screenshot or recording |
| AI branch runtime | user input, moderation, structured output, branch cache | deterministic tests plus live safety sample |
| Packaging / platform | Web, desktop, mobile, Steam/App Store/Google Play readiness | platform-specific build or review checklist |
| Pure refactor | names, seams, structure cleanup | tests or governance checks, no behavior change |

## Current Truth Hierarchy

When facts conflict, use this order:

1. User instruction in the current thread.
2. `docs/reference/execution/current-work.md`.
3. Accepted decisions under `docs/adr/`.
4. Active specs under `docs/specs/active/`.
5. Project policy under `docs/policy/`.
6. Draft discussion/reference docs under `docs/reference/` and canon docs under `docs/canon/`.
7. Runtime source/config once implemented.

Runtime source/config wins for executable behavior after code exists; docs explain intent and constraints.

## Non-Negotiables

- Do not treat SupaLuv as a Supa card-game mode.
- Do not introduce card systems, Boss Race, or multiplayer authority unless a later accepted decision explicitly changes scope.
- Product pitch is **adult black-humor / sex comedy + robots + AI endings**
  (see **ADR-0004** + public site). Jokes, awkward desire, transactional
  intimacy, and spicy-but-not-dirty dialogue are in-scope and required for
  energy. This is **not** a romance / rom-com / “believe in love” product —
  never reframe novel or Ink as sweet love story.
- Do **not** make an AI sex companion, free-form erotic generator, or porn studio.
  No user-prompted porn or explicit nude content. Runtime AI is moderated and constrained.
- AI side branches must be short and forced back to authored Ink. Bounded AI final
  chapters are a separate terminal contract: at most 8 segments, author-directed,
  checkpointed, moderated, and not required to rejoin Ink (ADR-0005).
- Adult real-person character references are supported; reject minors and explicit
  uploads. Human-containing pre-rendered videos are outside the product path because
  they conflict with player-selected character identity.
- Keep the authored story and metadata portable enough to migrate to Unity, Godot, Ren'Py, or another engine later.
- Do not let platform ambitions block the first 20-30 minute playable prototype.
- Do not treat draft discussion briefs as final implementation specs.

## Verification

Use the smallest sufficient set, but know the current release ladder:

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm build:vercel
pnpm verify:vercel-output
pnpm docs:check
git diff --check
```

For AI, moderation, wallet, storage, or deployment changes, add a minimal live
Preview/Production proof; mocks do not prove service integration.

<!-- PGS-ROUTER:END -->

## Upstream Rule

Do not locally invent doc-gov core changes such as new document statuses,
frontmatter schema, lifecycle rules, shared agents-routing rules, or shared AI
rules. If such a change seems necessary, propose it in the Project Governance
System upstream repository first.
