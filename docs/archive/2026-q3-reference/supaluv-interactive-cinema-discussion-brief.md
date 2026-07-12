---
id: REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
title: SupaLuv Interactive Cinema Discussion Brief
type: archive
status: archived
canonical: false
owner: human
created: 2026-05-13
last_reviewed: 2026-07-12
domain: strategy-discussion
tags:
  - supaluv
  - interactive-cinema
  - ink
  - pixivn
  - ai-branching
  - platform-policy
  - discussion
pinned: false
related:
  - ADR-0001
  - POLICY-PROJECT-BEST-PRACTICE
supersedes: []
superseded_by: null
archive_reason: Initial strategy discussion was resolved by shipped runtime and accepted ADRs; keep only as history.
---

# SupaLuv Interactive Cinema Discussion Brief

## Document Status

This is a process document for discussion, revision, and AI-assisted critique.
It is not a final strategy, not an active spec, and not an implementation plan.

This revision absorbs useful points from the external OPUS4.7 draft at:

```text
/Users/yuanfei/Desktop/2026-05-13-super-lover-vn-tech-design.md
```

Use this document to:

- brief another AI on the current thinking;
- critique engine and workflow choices;
- identify hidden risks before implementation starts;
- prepare a future decision, spec, or implementation plan.

Do not use this document as proof that the architecture is locked. When the
human owner approves a direction, promote the relevant parts into an accepted
ADR, an active spec, or an active implementation plan.

## Current Working Question

How should SupaLuv turn the 超级爱人 story material into an efficient,
AI-assisted interactive cinema / visual-novel-like game without accidentally
becoming:

- a Supa card-game mode;
- a free-form porn generator or AI sex companion product;
- an overbuilt custom engine project;
- a platform-porting project before the story experience is proven;
- a many-pipeline AI production trap where art, TTS, BGM, video, translation,
  and live generation all become blockers at once.

## Current Working Hypothesis

The strongest current hypothesis is:

SupaLuv should start as a Web-first TypeScript interactive cinema prototype.
Ink should be the primary authored narrative format because it gives AI a
learnable text format and gives the project a compiler/lintable story artifact.
React / Vite / TypeScript should own the app shell. Pixi'VN should be evaluated
as the visual-novel presentation layer, but not treated as locked until a small
spike proves it is faster than a simpler React + InkJS player.

Live AI generation should be constrained to short side branches that return to
authored story, and should not be the main story engine. AI is most valuable in
P0 as an authoring assistant that drafts Ink scenes, dialogue variants, asset
prompts, and continuity checks.

This hypothesis is plausible because it matches the current Web/TypeScript
skill base, avoids a custom narrative engine, keeps AI useful without giving it
control of canon, and does not block later packaging to desktop, mobile, Steam,
or another engine.

It is still a hypothesis. The next revision pass should actively challenge it.

## Product Boundary Under Discussion

SupaLuv is currently being framed as:

- an independent game based on 超级爱人;
- an adult sex comedy / black comedy about shame, loneliness, objectification,
  intimacy, and AI personhood;
- an interactive cinema / visual-novel-like experience;
- a product that may later publish on Web, desktop, Steam, Android, iOS, or be
  remade in another engine.

SupaLuv should not become:

- a Supa card-game mode;
- a card game;
- a Boss Race or multiplayer match-loop project;
- an AI sex companion;
- a pornographic live-generation product;
- a free-form chatbot where the player can ask for arbitrary erotic content.

Important wording boundary:

- Do not promise that the game is "PG-13" unless the actual script and platform
  rating process support that claim.
- Use "adult black humor / sex comedy (not romance; no free-form porn generator; no explicit nude gen goal)" as the working description (ADR-0004 + public site energy).
- Store pages and content surveys must disclose adult themes and AI use
  honestly, even when the shipped scenes avoid explicit depiction.

## Experience Mix To Test

Possible first playable prototype target:

| Layer | Target share | Notes |
| --- | ---: | --- |
| Authored VN / interactive cinema mainline | 80% | Ink-authored scenes, choices, variables, callbacks |
| Authored cinematic moments | 10% | Still CG first; at most one skippable HTML-video cutscene in P0 |
| AI-assisted authoring output | 10% | AI drafts and revises content during production, then human approves |
| Live AI side branches | 0% shipping P0, one dev-only spike allowed | Do not make runtime AI a public promise until guardrails are proven |

This mix is not final. It is mainly a discipline device: authored story stays
primary, video stays selective, and runtime AI does not become the load-bearing
feature before safety, cost, and platform review are understood.

## Engine Choice Matrix

| Option | Best use | Strength | Risk | Current judgment |
| --- | --- | --- | --- | --- |
| React + InkJS | Fastest Web story proof | Smallest moving parts, all TypeScript, easy AI-generated Ink loop | More custom presentation work | Best P0 baseline |
| Pixi'VN + Ink | VN polish with PixiJS rendering | Built for VN, supports Ink, React/Vue UI integration, modern TS ecosystem | Smaller ecosystem, single-team maintenance risk | Run a short spike before locking |
| Ren'Py | Traditional VN production | Mature VN tooling, strong desktop/mobile export, huge community | Python stack, Web is weaker, less aligned with Supa/Web skills | Good fallback if Web/AI runtime becomes less important |
| Custom StoryGraph | Full control | Can encode exactly this project's needs | Highest rabbit-hole risk, duplicates what Ink already solves | Do not build in P0 |
| Unity/Godot | Larger interactive game | Better if mechanics or 3D grow later | Slower validation and more engine overhead | Defer until story pull is proven |

Current recommendation:

1. Use Ink as the story truth format.
2. Build the first story proof with React + InkJS unless Pixi'VN spike clearly
   saves time.
3. Treat Pixi'VN as the likely polish layer, not as a pre-approved dependency.
4. Do not self-research a custom StoryGraph in P0. If extra metadata is needed,
   put it beside Ink in a small manifest.

## Candidate Stack

| Layer | Candidate | Why it is attractive | What still needs critique |
| --- | --- | --- | --- |
| Authoring format | Ink | Mature interactive narrative format, AI can learn it, compiler/lint path exists | Need confirm authoring workflow is comfortable enough for the owner |
| Runtime bridge | InkJS | Runs Ink in browser and Node-style JavaScript contexts | Need prototype save/load, variables, tags, and metadata hooks |
| App shell | React / Vite / TypeScript | Matches current project skill and Web-first packaging | Need avoid UI complexity before story proof |
| Visual staging | React baseline, Pixi'VN spike | Start light; add Pixi'VN when staging, transitions, sprites, or VN polish need it | Need a 1-2 day spike, not a theoretical debate |
| State | small store such as Zustand/Jotai, or plain reducer first | Keeps save/payment/settings outside renderer | Do not over-architect before runtime exists |
| Video | HTML video | Good enough for selective cutscenes | Need test preload, captions, skip, fallback stills |
| AI authoring | local CLI or scripts | Solves the real pain: AI drafts branchable Ink, human controls quality | Must lint and review before merging story text |
| AI branch service | server-side structured output service | Keeps API keys, moderation, cost, and safety outside client code | Do not ship publicly before policy and cost tests |
| Backend | none for first local proof; Supabase later | Supabase can handle auth, cloud save, payment state, analytics | Accounts and payments should not block P0 |
| Packaging | Web/PWA first, Tauri desktop later, Capacitor mobile later | Avoid platform work before story validation | Re-check latest platform policies before each release lane |

## Supa Reuse Boundary

SupaLuv can reuse Supa's engineering habits, not Supa's game systems.

Reusable from Supa:

- pnpm / TypeScript / React / Vite conventions;
- Supabase experience when auth, cloud save, or payment state becomes needed;
- Vercel-style Web deployment habits;
- Playwright/Vitest-style testing habits;
- doc-gov and project governance discipline.

Do not reuse from Supa:

- Phaser card table runtime;
- Colyseus multiplayer authority;
- card rules, Boss Race, or match-loop assumptions;
- Supa's content/gameplay ontology.

This matters because "reuse" should mean "borrow the workshop", not "put a
card engine inside a VN". The carpenter keeps the drill; he does not bolt the
old dining table to the new bicycle.

## AI-Assisted Authoring Workflow

The most valuable OPUS4.7 idea is the authoring loop:

```text
human scene brief
  -> branch-author prompt
  -> AI drafts Ink scene
  -> inklecate / inkjs syntax check
  -> continuity and tone review
  -> human accepts into story package
  -> browser player loads it
```

This directly answers the owner's core pain: "I do not want to write every
branch point by hand." The answer is not runtime chaos; it is an editing-time
factory where AI produces structured, testable Ink files.

Minimum P0 authoring tool:

- input: a Markdown scene brief with emotional target, characters, variables,
  forbidden moves, and desired choice count;
- output: one `.ink` scene or stitch;
- validation: compile or run through Ink tooling before the scene is accepted;
- review: human checks emotional truth, continuity, and comedy rhythm;
- provenance: record whether a scene was AI-drafted, human-edited, or fully
  authored.

Possible scene brief template:

```yaml
scene_id: act1_order_robot
purpose: "男主从羞耻和失恋里滑向荒唐的购买决定"
characters:
  - male_lead
emotional_beats:
  - shame
  - rationalization
  - absurd temptation
variables_to_touch:
  - shame
  - curiosity
choices:
  count: 2-3
  style: "comic but not pornographic"
must_return_to: act1_waiting
forbidden:
  - explicit sexual description
  - non-consensual framing
  - free-form chatbot promises
```

## Content Package Idea

Start thin, then expand only when needed:

```text
story/
  superlover.ink
  superlover.meta.yaml
```

Possible later package shape:

```text
packages/content/
  ink/
    act1.ink
    act2.ink
  manifests/
    scenes.yaml
    characters.yaml
    assets.yaml
    ai-policy.yaml
  assets/
    characters/
    backgrounds/
    cg/
    video/
  i18n/
    zh-CN.json
    en-US.json
```

Ink owns:

- mainline prose;
- authored choices;
- variables;
- conditional text;
- branch and return flow.

Metadata owns:

- stable scene IDs;
- video, background, character, sound, and music asset IDs;
- whether a node allows live AI branch generation;
- maximum AI branch length;
- required return node;
- content rating notes;
- forbidden content categories;
- migration hints for future engines.

Open critique: this structure may still be too much for the very first test.
A thinner P0 can start with one Ink file plus one small YAML manifest.

## AI Branch Contract Idea

Live AI branches should be allowed only when all conditions are true:

- the current authored node explicitly permits AI branching;
- user input passes moderation and project policy checks;
- generated output conforms to a strict schema;
- the branch contains at most 1-3 generated nodes;
- the branch must return to a specific authored Ink knot or stitch;
- generated text cannot create permanent canon unless an author later promotes it;
- the game has a safe fallback if the AI call fails or is blocked;
- the shipped platform accepts the disclosure and guardrail story.

Possible structured return shape:

```yaml
branch_id: ai_branch_uuid
source_node: act2_robot_home_07
return_to: act2_robot_home_08
nodes:
  - id: ai_branch_uuid_01
    text: "..."
    choices:
      - label: "Continue"
        next: ai_branch_uuid_02
safety:
  moderation_passed: true
  explicit_sex: false
  non_consensual_content: false
  real_person_deepfake: false
```

Open critique: generated content may feel shallow if it is too short, but if it
is too open it can break tone, safety, platform review, cost, and authored
continuity. The likely product answer is to treat AI branches as special
moments, not the whole game.

P0 stance:

- AI authoring is in.
- Public runtime AI is out.
- A hidden/dev-only runtime AI spike is allowed if it does not block the story
  proof.

## Video Contract Idea

Video cutscenes should be authored and referenced by ID:

```yaml
cutscene:
  id: act3-burial-flashback-v1
  file: videos/act3-burial-flashback-v1.mp4
  duration_target: 10-45s
  skippable: true
  captions: true
  fallback_still: cg/act3-burial-flashback-v1.png
```

Working rules:

- video should serve key emotional turns, not replace core play;
- captions should be planned early;
- every video needs a fallback still image or text summary;
- video assets should be replaceable without changing story IDs;
- P0 should support video technically, but not require an automated video
  generation pipeline.

## AI Media And Asset Pipeline Notes

OPUS4.7 correctly flags that AI art, TTS, BGM, video, and translation are each
separate pipelines. P0 should not turn all of them on.

P0 media stance:

- AI art is allowed, but style lock is required before mass generation.
- Character, background, CG, and UI assets need stable IDs.
- Generated media provenance should be recorded before public release.
- TTS, BGM, video automation, and translation are future lanes, not P0 blockers.
- If BGM is needed in P0, use placeholder or clearly licensed music.

Tooling caution:

- Midjourney should not be used for fetish, explicit, or borderline sexual
  prompts. It may be useful only for safe backgrounds, props, and mood boards.
- Flux, NovelAI, Runway, Kling, Udio, Suno, Fish Audio, CosyVoice, and similar
  tools must be rechecked before production use. Their capability, pricing,
  licensing, and safety policies can change quickly.
- Do not write exact model prices or vendor rankings into an active spec unless
  they were freshly verified and are necessary for that phase.

## Commercial And Localization Hypotheses

These are useful product hypotheses, not implementation requirements:

- Free demo plus paid full version is a plausible first monetization shape.
- The demo should reduce the player's fear of the premise and prove the tone.
- Architecture can reserve i18n early, but MVP content should be Chinese first.
- English localization should wait until story, tone, and monetization are
  validated.
- A monthly cost ceiling should exist before runtime AI is public.
- Accounts, cloud save, analytics, and payment state should not block the first
  local story proof.

## Platform Path To Debate

Possible publication path:

| Phase | Platform | Goal |
| --- | --- | --- |
| P0 | local Web prototype | prove 20-30 minute story flow |
| P1 | private hosted Web test | collect real play feedback |
| P2 | public Web / itch-style release | validate page, demo, payment hypothesis, and AI disclosure wording |
| P3 | desktop / Steam candidate | package with Tauri or Electron if the story works |
| P4 | Android candidate | only after content policy and AI guardrails are strong |
| P5 | iOS candidate | latest and most conservative, because adult and UGC/AI review risk is higher |
| P6 | Unity/Godot/Ren'Py remake | only if successful validation justifies engine migration |

Evidence-informed constraints:

- Steam requires honest disclosure of mature content and generative AI use.
- Steam live-generated AI requires guardrail disclosure.
- itch.io is friendly to indie Web releases, but adult content and AI use still
  need accurate labeling.
- Google Play and Apple are much stricter for sexual content, UGC, and AI
  generation. Treat mobile store release as a separate compliance project.
- "All platforms" is not a P0 strategy. It is a future packaging backlog.

Open critique: broad platform ambition is valuable, but it should not make P0
heavy. The first validation target is player pull, not store readiness.

## Possible First Prototype Scope

If this direction survives critique, the first implementation plan might target:

- one playable route through the first act and the start of the second act;
- around 20-30 minutes of play;
- 15-25 authored Ink nodes;
- 3-5 meaningful choices;
- 2-3 variables that visibly affect callbacks;
- 3-5 main characters with a small expression set;
- 5-8 backgrounds or placeholder backgrounds;
- 1-3 key CGs;
- at most one short skippable video cutscene, if asset production is ready;
- local save/load;
- an AI-assisted authoring script or manual workflow;
- a content policy note for adult/AI risks;
- no public runtime AI, no payments, no accounts, no multiplayer, no mobile
  store submission.

## Loopholes And Fixes

| Loophole | Why it can hurt | Fix |
| --- | --- | --- |
| "Pixi'VN is selected, so start building everything on it" | Small ecosystem risk may show up late | Run a tiny spike against React + InkJS before locking |
| "AI can write the branches, so scope can grow" | AI reduces typing, not judgment, testing, art, or continuity work | Keep node count small; every AI scene must compile and be human reviewed |
| "PG-13 wording solves platform risk" | The premise itself is adult-coded even without explicit scenes | Use honest adult-theme disclosure and non-explicit script boundaries |
| "Live AI is only 10%, so it is small" | Safety, moderation, cost, failure states, and store review can dominate engineering | Keep public runtime AI out of P0; spike privately |
| "Video is only 10%, so it is easy" | Generation consistency and asset polish can eat weeks | Support video playback, but do not require a video pipeline |
| "Mobile is just Capacitor" | Store policy, payments, privacy, and content ratings are the real work | Treat mobile as a later compliance project |
| "Tool X is best in May 2026" | AI vendors and policies move fast | Vendor choices expire; re-verify before each production lane |

## Questions For The Next AI Revision

Ask the next AI to challenge at least these points:

1. Is Ink still the fastest authoring format for this creator, or would another
   format reduce friction?
2. Does a React + InkJS P0 prove the story faster than Pixi'VN, or does Pixi'VN
   save enough VN work to justify the dependency?
3. What is the smallest content schema that supports video and AI branches
   without becoming custom-engine overwork?
4. What adult-content and AI-generated-content platform risks matter before
   Web prototype, and what can wait?
5. What exact writing template should the creator give AI so AI can draft Ink
   branches reliably without losing emotional control?
6. What should be tested first: story pull, visual mood, video integration, or
   AI branch safety?
7. Which parts of OPUS4.7 are implementation-plan material rather than strategy
   discussion material?

## Promotion Criteria

This discussion brief is ready to promote into governed decisions or specs only
after:

- the owner explicitly approves the direction;
- the React + InkJS vs Pixi'VN spike has produced evidence;
- the first prototype scope is narrow enough to execute;
- the AI-assisted authoring loop has a concrete template and validation path;
- the live AI branch safety boundary is written as a testable contract;
- platform policy claims have been freshly verified for the target release
  phase;
- current work links to the accepted decision or active spec instead of this
  draft discussion brief.
