---
id: REF-AI-CONSTRAINED-BRANCH
title: Constrained AI Side Branch Contract
type: reference
status: active
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: architecture
tags:
  - ai-branching
  - supaluv
  - swimmer
pinned: false
related:
  - REF-CURRENT-WORK
  - ADR-0001
  - PLAN-0003
---

# Constrained AI Side Branch Contract

## Product idea

On some authored choice points:

1. Player sees **pre-written choices** immediately.
2. An extra slot shows **「灵感生成中…」** then becomes **one AI-written choice**.
3. If the player picks it, AI also supplies a **short** sequence of text (+ optional art/portrait from an allow-list).
4. After N beats (hard cap), runtime **must rejoin** an authored Ink knot (`rejoinSceneId`).

This is the differentiator: living choices without open-ended free story.

## Hard rules

| Rule | Why |
| --- | --- |
| Spine stays Ink | Portable, lintable, human-owned |
| AI is a side branch only | Avoid infinite unmoderated novel |
| Forced rejoin | Prevents “all remaining story is AI forever” |
| Max AI beats small (1–4) | Cost, safety, playfeel |
| Art/portrait pools | No free porn/unsafe image gen in public demo |
| No product secrets in browser | Keys live server-side |

## Runtime modules (SupaLuv)

| Path | Role |
| --- | --- |
| `packages/shared` `AiBranchSceneConfig` | Content contract on scene cards |
| `apps/web/src/ai/*` | Provider interface + mock + remote stub |
| `apps/web/src/hooks/useAiBranchSlot.ts` | Wait / ready / play state machine |
| `inkStoryRunner.jumpTo` | Rejoin authored path |

Demo content flag: `ch01_office_delete_or_shot.aiBranch` in `ch01-scenes.ts`.

## Swimmer stack mapping (live later)

| Concern | Kit | Notes |
| --- | --- | --- |
| Chat completion transport | **SwimmerAIKit** (`requestOpenRouterChatCompletion`) | Server-only; model aliases product-owned |
| Env / budget / generator registry | **SwimmerAIKit** | Do not invent a second OpenRouter client |
| Auth / wallet / moderation tables | **SwimmerCore** | Edge functions + RLS; not Colyseus |
| Browser API client | **SwimmerClient** | Call product edge, never raw keys |
| Brand UI loading/choice chrome | **SwimmerUIKit** | Compose buttons/panels only |
| Multiplayer rooms | **SwimmerGameServerKit** | **Not** for single-player AI branch |

Live topology (target):

```text
Browser (SupaLuv web)
  -> VITE_SUPALUV_AI_BRANCH_URL (product edge)
    -> SwimmerAIKit OpenRouter + budget
    -> moderation pass
    -> structured JSON { choiceLabel, beats[], rejoinSceneId }
  <- browser enforces rejoinSceneId === authored config
  -> InkStoryRunner.jumpTo(rejoin)
```

## Mock vs live

### Local live edge (current)

```bash
# 1) Fill OpenRouter key
cp /Users/yuanfei/PieAI/.secrets/supaluv.env.example /Users/yuanfei/PieAI/.secrets/supaluv.env
# edit OPENROUTER_API_KEY=...

# 2) Run edge + web
pnpm dev:ai     # services/ai-branch @ :8787
pnpm dev:web    # proxies /api/ai/branch → :8787
# or: pnpm dev:full
```

| Piece | Path |
| --- | --- |
| Edge server | `services/ai-branch` |
| Prompts | `services/ai-branch/src/prompts.ts` |
| Mastra agent | `mastraBranch.ts` (`@mastra/core` Agent + structured JSON) |
| Model config | SwimmerAIKit `createOpenRouterModel` → OpenRouter |
| Fallback | direct `requestOpenRouterChatCompletion` if Mastra path fails |
| Default model | `google/gemini-3.5-flash` + `SUPALUV_THINKING_LEVEL=high` |
| Secrets | `/Users/yuanfei/PieAI/.secrets/supaluv.env` |
| Browser provider | hybrid: live first, mock fallback |
| Analytics | PostHog typed adapter `apps/web/src/analytics/productAnalytics.ts` |

### Force mock

`VITE_SUPALUV_AI_FORCE_MOCK=1 pnpm dev:web`

## Ending variants (future)

Same contract: AI may flavor an ending **card** (copy + badge) then rejoin `ch01_chapter_end` or a small set of ending knots. Infinite *presentation*, finite *anchors*.

## Safety non-negotiables

- Adult black comedy ≠ free erotic generator.
- Public runtime AI remains moderated and short.
- Owner may keep mock-only for demos until safety review.
