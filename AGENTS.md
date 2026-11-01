# SupaLuv AI Router

<!-- PGS-ROUTER:BEGIN v1.1 -->

## Project At A Glance

- **Name**: SupaLuv
- **Adopted profile**: `engineering-runtime`
- **Product type**: independent AI-assisted interactive cinema / visual-novel-like game
- **Source IP**: 超级爱人
- **Current stack**: React, Vite, TypeScript, Ink / InkJS, still-first cinema staging, Mastra + SwimmerAIKit AI service, SwimmerBackend account/wallet/storage, OpenRouter model routing
- **Not part of**: Supa card game, Boss Race, card rules, multiplayer match loop

## Startup Reading

Read the human-facing `README.md` for relevant setup, verification, positioning
or README work; do not duplicate it as an AI-only README. Read
`docs/reference/execution/current-work.md` only when the task depends on current
priorities or in-flight work, then only the relevant briefs/specs it names.

## Boundary And Policy Discovery

- `AGENTS.md` is canonical; `CLAUDE.md` must be the exact relative symlink
  `AGENTS.md`. The canonical skill root is `.agents/skills/`; `.claude/skills`
  must be the exact relative symlink `../.agents/skills`.
- All Markdown under `docs/policy/**/*.md`, including shared-rule symlinks, is a
  discoverable policy index, not a compulsory startup glob. Read the project-local
  baseline and only the shared rules matching the task.

## Skill Availability

Manifests and locks record desired state, not installed or invoked skills. Use a
skill only when its SKILL.md exists and can be read. Missing optional links must
not hide or replace portable policy rules.

## Documentation Tasks

For ordinary content edits, read `docs/governance/doc-agent-rules.md` and guidance
for the changed subject. Expand `docs/governance/boundary.md` and
`docs/governance/ssot-v1.1.md` for scope, ownership or host aliases;
`docs/governance/doc-types.md` for metadata/lifecycle; and the selected routing
file for workflow changes. Small tasks do not require a new Spec, Plan, ADR or
proof document. Use relevant checks and required delivery gates, not every
expensive test or a reinstall for an ordinary edit. Expand or repeat checks only
for related changes, failures or unresolved questions; stop when the gates and
acceptance are met.

## Governance

- Use doc-gov for governed Markdown.
- Governed Markdown lives under `docs/**` by default.
- Product artifacts outside `docs/**` are not governed docs unless SupaLuv explicitly opts them in.
- Before creating governed docs: `pnpm doc-gov find <topic>`.
- Before claiming doc work complete: `pnpm docs:check` and `git diff --check`.
- Do not create legacy root governance, routing, draft-dump, temp, AI-name, or non-root README documentation surfaces.

## Routing

SupaLuv uses the `engineering-runtime` profile because it is a game/runtime project with browser UI, AI service boundaries, generated character assets, save state, wallet accounting, platform packaging, and later engine migration risk.

Use `docs/governance/agents-routing/engineering-runtime-v1.1.md` to choose workflow depth. Codex and this router own normal execution; optional skills run only when a narrow trigger matches the selected lane.

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
- Every new feature must stay AI-legible per `docs/policy/ai-legibility.md`:
  new surfaces need an entry file or self-describe API, acceptance includes a
  cold-agent test, and AI-generated assets need provenance records per
  `docs/policy/ai-asset-provenance.md`.

## Verification

Use [Three-Stage Delivery](docs/governance/agents-routing/engineering-runtime-v1.1.md#three-stage-delivery) for automatic related-check selection and
pre-release full gates. Commands below are a reference, not an every-push checklist.

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

## Credentials And Local Environment

For credentials, login or local environment files, first read
`<portfolio-root>/.secrets/README.md`, then
`docs/policy/shared-rules/cloud-platform-access.md`. Use the project's existing
adapter and recorded central location; do not infer local secret storage from a
missing `.env`. Read only task-required configuration.

## Document Convergence

When creating docs, changing documented truth, or completing a feature/phase,
read `docs/policy/shared-rules/document-convergence.md` and reconcile the affected
facts and references. Preserve decision rationale and original evidence; do not
turn routine development into a whole-repository cleanup.

<!-- PGS-ROUTER:END -->

## Three-Stage Delivery

<!-- PGS-DELIVERY:THREE-STAGE -->

1. **Edit locally.** Run relevant local checks with isolated data and mocks; do
   not start paid external validation during ordinary development.
2. **Verify, then push — related checks only.** For the complete outgoing change
   range against the target base, tooling selects checks automatically from
   changed paths and dependency relationships, not a hand-picked test list:
   formatting, lint, type checks and unit tests for affected packages, plus the
   browser tests affected by the change. Documentation-only changes run their
   relevant document/governance checks, not unrelated engineering suites.
   Do not run repository-wide full verification, the entire browser suite or
   the entire timing suite before an ordinary push or merely to finish a task.
   Any failing related check blocks the push. Ordinary push/PR saves code; it
   must not start hosted Actions or Vercel preview/production deployments.
3. **Release explicitly — full suite for the release candidate.** Only before
   an authorized release, run all applicable unit tests, browser tests, timing
   tests and full verification once for that exact candidate. Any failure or
   missing required evidence blocks release. Keep existing release/security
   gates and production runtime monitoring. Check credentials, environment and
   budget before cloud acceptance/publication; publish only the tested source
   or artifact. Reuse results only while source, dependencies, relevant
   environment and retained artifacts remain valid.

Dependency-based browser selection (for example Playwright
`--only-changed=<ref>` where supported) sees changed tests and their imports;
it does not infer application-source-to-browser-test coverage when tests do not
import the application. Each project must therefore supply a maintained source
path-to-test mapping or a fixed smoke set, used by the selector, and document
its blind spots. Missing selection evidence is a gap to report, not proof that
zero tests cover the change and not a reason to silently run the full suite.

Never use `--no-verify`, bypass hooks, or rerun failures merely to obtain green.
Investigate failures with a smaller reproducer and retain the original result;
rerun only after a relevant fix or new evidence. Do not add nightly full runs:
full suites belong only to pre-release validation. Delivery reports name the
selected related checks, their selection basis, results and coverage limits.
An explicitly requested preview/staging acceptance belongs to stage 3. An edit
or push request stops at stage 2; do not relabel routine saves as releases.
These rules govern engineering validation, not separately authorized creative
production, and do not introduce engineering tests for unrelated prose.


### Fast Release Gate

<!-- PGS-DELIVERY:FAST-RELEASE -->

A full run is paid once per candidate: make it fail early and never pay twice
for the same mistake. Each project implements these with its own commands.

- **Preflight before queuing.** Before waiting for a heavy-work lock, run a
  light preflight (about a minute) that checks the candidate and worktree,
  required environment flags, budget files and credentials by name, and the
  cheap deterministic global checks. A failed preflight never enters the queue.
- **Cheapest first, stop at the first red.** Run fast deterministic checks and
  a small fixed smoke set (navigation, sign-in, the main phone screen) before
  long unit and browser stages.
- **After a red: narrow, fix, then one full run.** Keep the original result,
  reproduce the single failure, fix it, and verify the failing test plus what
  the fix affects. Narrow runs are diagnosis, never release evidence. Then run
  the full suite once on the fixed candidate, reusing passed results only where
  the project can prove their inputs are unchanged.
- **Close the gap that let it through.** When a release-only red could have
  been caught before push, the same fix adds the missing source-to-test mapping
  or moves the cheap check into the push gate.
- **Separate waiting from working.** Release receipts record queue/lock wait
  and each stage's execution time separately; speed claims name what they
  measured.
- **Reuse proven results; balance long suites.** A project whose full run takes
  more than about 30 minutes must keep a result-reuse record: each passed check
  is stored with the identity of its inputs (source, test code, dependencies,
  fixtures, content, tool versions, relevant config and built artifacts), and a
  later full run re-executes only checks whose identity changed. Timing tests,
  live paid-AI tests and production read-backs are always re-executed. It must
  also split long test files so parallel workers finish close together.


## Upstream Rule

Do not locally invent doc-gov core changes such as new document statuses,
frontmatter schema, lifecycle rules, shared agents-routing rules, or shared AI
rules. If such a change seems necessary, propose it in the Project Governance
System upstream repository first.

## Website Release Entry

Only after an explicit website release request and the relevant local gates:

1. Use a clean, committed candidate. Run required manual Actions acceptance for
   that exact commit, if the project requires it; failure blocks publication.
2. Confirm Vercel binding to `supaluv` (`pie-0f420159`); use
   `vercel link --project supaluv --scope pie-0f420159` if unbound.
3. Create a production-configured candidate with
   `vercel deploy --prod --skip-domain --yes --scope pie-0f420159`.
   This is paid release work; it must not run during ordinary edit/push.
4. Verify the returned deployment URL with the project's smoke checks, then
   `vercel promote <verified-deployment-url> --scope pie-0f420159`.
   Promote that artifact; do not rebuild, guess a URL, or promote after failure.

Existing package publishing or backend migration gates remain separate.
