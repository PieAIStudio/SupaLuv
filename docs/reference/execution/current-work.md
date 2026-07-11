---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-11
domain: meta
tags:
  - current-work
  - navigation
  - supaluv
pinned: true
related:
  - REF-SUPALUV-INTERACTIVE-CINEMA-DISCUSSION-BRIEF
  - REF-DOCUMENTATION-MAP
  - ADR-0001
  - PLAN-0003
  - SPEC-0001
  - PLAN-0002
---

# SupaLuv Current Work

This file is the current project work index. It is not the agents-routing algorithm.

## Current Focus

- **Product phase**: Chapter 01 is a densified, noncanonical **playable commercial
  demo shell** (title → play → save → gallery → settings → ending modal).
- **Default player path**: open app → title screen → 新的游戏 → `ch01`.
- **Active polish plan**: `docs/plans/active/PLAN-0003-ch01-polish-loops.md`
  (Loops 1–6 largely landed; residual polish only).
- **Older pipeline plan/spec** (still valid provenance for trial dummy path):
  `PLAN-0002`, `SPEC-0001`.
- **Strategy docs remain discussion, not locked architecture**:
  discussion brief + `ADR-0001` (proposed).
- **Later chapters (2–30)**: content drops into the existing shell; do not rebuild
  engine per chapter.

## What “done” means for Ch1 demo shell

| Capability | Status |
| --- | --- |
| 16:9 stage + fullscreen | in runtime |
| Event CG cutscenes | cold open + demo echo |
| Dual portraits L/R | 苏明 / 林晓棠 / 周鹿 |
| Densified Ink (~40 beats) | `packages/content/ink/ch01.ink` |
| Title / continue / multi-slot save | localStorage |
| Gallery unlock table | architecture live |
| History log + auto-play | play HUD / settings |
| History persists across reload | `localStorage` per story |
| Keyboard Space/Enter + Esc | play stage |
| BGM + SFX | owner-generated Lyria beds + Mixkit demo SFX; unlock on first gesture |
| Mute / master volume / text speed / auto-play | localStorage |
| Gallery unlock toast | global toast on new unlock |
| Swimmer ending modal | `GameModal` |
| Constrained AI side choice | wait slot → live edge or mock → rejoin Ink |
| BGM / SFX separate volumes | settings |
| Local AI edge | `services/ai-branch` (Mastra + SwimmerAIKit + Gemini 3.5 Flash) |
| Secrets | `/Users/yuanfei/PieAI/.secrets/supaluv.env` |
| PostHog | `apps/web/src/analytics/productAnalytics.ts` + `VITE_POSTHOG_KEY` |
| Achievements / Help / End path | shipped — see `feature-status-and-roadmap.md` |
| Feature status + A/B/C/D roadmap | `docs/reference/execution/feature-status-and-roadmap.md` |
| Co-play local (host/guest/cursor/RPS) | `apps/web/src/coplay/*` + architecture doc |
| Protagonist names + local portrait pack | `displayNames.ts`, `portraitPack.ts` · ADR-0002 CG skip |
| Chapter-end global choice stats | `apps/web/src/stats/*` |
| Share card % + rare/RPS/pack achievements | end card + `achievements.ts` |

## Runtime map (for next AI)

| Concern | Where |
| --- | --- |
| Screen routing + save orchestration | `apps/web/src/App.tsx` |
| Play stage orchestration | `apps/web/src/views/VisualNovelPrototype.tsx` |
| Play HUD / system menu / dialogue panel | `apps/web/src/views/play/*` |
| Continue-choice helpers | `apps/web/src/views/play/vnHelpers.ts` |
| Title / gallery / settings / end / CG | `apps/web/src/views/*.tsx` |
| Ink runner | `apps/web/src/story/inkStoryRunner.ts` |
| Presentation / dual portraits | `apps/web/src/story/storyMapAdapter.ts` |
| Audio | `apps/web/src/audio/gameAudio.ts` |
| Save / settings | `apps/web/src/persistence/*` |
| Hooks (typewriter / history / fullscreen / keys / AI slot) | `apps/web/src/hooks/*` |
| Constrained AI branch (mock/remote) | `apps/web/src/ai/*` |
| AI branch contract doc | `docs/reference/architecture/ai-constrained-branch.md` |
| Story content | `packages/content/**` |
| Character locks | `packages/content/characters/**` |
| Public assets | `apps/web/public/assets/**` |

Boundary notes:

- `apps/web/README.md` — web package boundary + module map
- `packages/content/README.md` — content package boundary + pipeline

## Seam rules (AI/human-friendly)

1. **Do not grow `VisualNovelPrototype.tsx` back into a grab bag.**
   - UI chrome → `views/play/*`
   - Choice/RPS flow → `usePlayChoiceFlow.ts`
   - Beds/CG/SFX → `useStageMedia.ts`
   - Co-play pointers → `useCoPlayPointers.ts`
   - Pure rules → `vnHelpers.ts` / `persistence/*` / `story/*`
2. **App saves only via `writeStorySave`** (`persistence/saveWriter.ts`).
3. **Content changes do not require shell rewrites.** Add Ink + scene manifest +
   assets + catalog entry.
4. **SwimmerUIKit** for brand controls (pin registry version **1.0.1**); local CSS only
   for cinema stage / theme overrides.
5. **Save schema** `supaluv.save.v1.<slot>` and **settings** `supaluv.settings.v1`
   are stable contracts — change only with intentional migration.
6. **AI edge:** add HTTP routes in `services/ai-branch/src/routeTable.ts`, not
   `server.ts`.
7. **Behavior is the contract.** Prefer unit tests for pure helpers
   (`vnHelpers`, save/settings/unlocks) and e2e for shell path.
8. Full web module map: `apps/web/README.md`.
9. **Settings:** player panels in `views/settings/SettingsPlayerSection.tsx`;
   lab (portrait pack / unmetered notes) in `SettingsLabSection.tsx`.
10. **CSS:** do not re-merge into one blob — edit the matching
    `styles/{base,stage,meta,coplay,chrome}.css` partial.

## Non-negotiables

- Not a Supa card-game mode.
- Tone: **black humor / sex comedy**, not romance (ADR-0004). Sex-adjacent
  young-audience energy is required; not dirty; not sweet love story.
- Not a free-form porn / erotic generator; no explicit nude gen goal.
- Live public AI branches remain out of P0 unless owner reopens.
- Do not edit Obsidian source via
  `docs/reference/source-material/super-lover-outline.md`.
- Keep Ch1 noncanonical until owner promotes.

## Startup Notes For The Next AI Session

1. Read `AGENTS.md`.
2. Read this file completely.
3. Read `apps/web/README.md` and `packages/content/README.md`.
4. Prefer content pipeline over new engines.
5. Prefer small seams over new frameworks.
6. Verify with: `pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`.

## Audio truth (4 channels)

| Channel | Settings key | Content |
| --- | --- | --- |
| Music | `musicVolume` | `title-theme`, `soft-piano`, `chapter-end` (Lyria beds) |
| Ambient | `ambientVolume` | `night-ambient`, `lonely-pad` (Lyria room beds) |
| SFX | `sfxVolume` | UI clicks, payment, notify |
| Voice | `voiceVolume` | Dual TTS (MiniMax zh / ElevenLabs en…) via Howler + pan/reverb |

- **Controller**: `apps/web/src/audio/gameAudio.ts` — Howler façade; exclusive music beds; VO pan/reverb.
- **CG hard-pauses** music beds.
- **Beds (Lyria 3 / Gemini, 2026-07)**: see `packages/content/assets/ATTRIBUTION.md`.
- **Browser policy**: Boot splash first gesture unlocks audio.

## Owner decisions locked (2026-07-10 → refreshed same day)

See **ADR-0003** for freemium commercial model (canonical).

- Prefab story free; AI / face-gen / **networked** co-play → **battery** (SwimmerCore).
- **No free AI quota** — studio does not subsidize free users’ compute; show cost-transparency pitch at AI gate.
- Local dual-tab co-play demo stays free for testing.
- **Do not freeze systems work** while novels advance in parallel; defer only hard conflicts (e.g. AI faces vs lead CG — ADR-0002).
- Landscape-first; portrait is rotate-hint only (not full mobile product).
- Meta surfaces (gallery / achievements / co-play) stay visible unless later evidence says hide.
- Overseas first; China store later.
- Tone locked: black humor sex comedy, **not** rom-com / 黑色爱情 (ADR-0004).
- Public pitch stays adult comedy energy; no free-form porn generator.
- Public site CTA: open demo at `https://supaluv.pieaistudio.com`.
- Vercel project `supaluv` uses one **Services** deployment: Vite Web + Node
  `ai-branch`; Preview deployments keep Vercel authentication enabled.
- E21 image-gen pipeline: after framework solid.
- **TTS runtime truth**: Chinese → MiniMax; Western → ElevenLabs (`dual-tts-routing.md`). Research notes that still mention OpenAI fallback are **stale** for runtime.
- Lyria beds installed (C12); see `packages/content/assets/ATTRIBUTION.md`.
- **AI branch requires login** (SwimmerCore session; guest OK). Server verifies Bearer JWT.
- Content safety in **SwimmerAIKit** (`content-safety` + Sightengine visual); SupaLuv uses adult-comedy policy.
- External full commercial audit is **archived**; owner extract: `owner-approved-audit-extract-2026-07.md`.
- Framework shell map: `docs/reference/architecture/framework-shell-2026-07.md`.
- SwimmerUIKit **1.0.1** (exact npm registry version) — `GameCallout` + coarse-pointer button min-height.

## Residual / next optional polish (not blocking)

- More NPC mood portrait variants (林/周 still mostly neutral).
- Loudnorm / loop-seam polish on new Lyria beds if needed.
- Magenta chroma fringe audit on new portrait exports.
- Chapter 2 only when owner delivers novel text.
- Decide the welcome-battery / first-AI-use policy; new users correctly start at zero
  and receive `402 INSUFFICIENT_BATTERIES` rather than an unmetered AI call.
- Add `MINIMAX_GROUP_ID` before claiming Chinese TTS Preview is live; English
  ElevenLabs Preview is verified.
- Optional: upgrade ElevenLabs plan if free-tier voice limits bite; clone fixed cast voices.
- AI memory token → Ink callback; Help rewrite; production hide Developer Lab.

## Out of scope right now

- Chapters 2–30 novel production (unless owner delivers text).
- Unity/Godot/Ren'Py packaging.
- Seats SKU packages (prefer guest-minute battery later).
- Full image-gen face packs (E21+) until framework gate.
- Pixi'VN until a dedicated spike plan reopens.

## Local / optional-cloud co-play how-to

1. Title → **本机同玩（演示）** → 创建房间并开玩（记住房间码）。
2. 另一标签页（或已配置 Realtime 的另一设备）输入房间码 → 加入围观。
3. 房主推进；客人投票；冲突 → **RPS** 或房主 **听全球的**。
4. 运输：无 `VITE_SUPABASE_*` = BroadcastChannel；有 = Realtime broadcast。

## Custom faces / oracle

- 设定 → 本机立绘包；启用后跳过官方正脸 CG（ADR-0002）。
- 关键抉择上 **预言家** 猜多数；章末揭晓。≥3 次少数派 →「逆流订单」。

## Completed Proof History

Completed plans and specs live in:

- `docs/plans/completed/`
- `docs/specs/completed/`

Do not move completed work back into active. Create a new plan and link the completed record as provenance.
