---
id: REF-FRAMEWORK-SHELL-2026-07
title: Framework shell inventory (co-play, wallet, TTS, audio, deploy)
type: reference
status: active
canonical: false
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: architecture
tags:
  - framework
  - co-play
  - wallet
  - tts
  - audio
  - deploy
pinned: false
related:
  - ADR-0003
  - ADR-0004
  - REF-CURRENT-WORK
  - REF-CO-PLAY-INVITE-SESSION
  - REF-DUAL-TTS-ROUTING
---

# Framework shell inventory (2026-07)

This is the **runtime skeleton** while novels land in parallel. Not a freeze list.

## Commercial (ADR-0003)

| Piece | Location | Notes |
| --- | --- | --- |
| Free prefab story | Ink + local save | Always free |
| No free AI quota | `useAiBranchSlot` + pitch | Client gate + cost copy |
| Wallet reserve/commit | `services/ai-branch/src/walletMeter.ts` | **service_role only** via edge |
| Balance read | `GET /wallet/balance` → client `fetchWalletBatteries` | Never browser→RPC |
| AI cost | `SUPALUV_AI_BRANCH_COST_BATTERIES` (default 1) | Commit on success, refund fail |

Local without secret key:

```bash
SUPALUV_WALLET_OPTIONAL=1   # server may skip reserve
VITE_SUPALUV_AI_ALLOW_UNMETERED=1  # client allows AI while balance null
```

Preview and Production billing are wired with the product-specific
`supaluv_server` secret key and the active `core.apps.id = 'supaluv'`
registration. New users intentionally start at zero batteries; onboarding grants
require a separate product decision.

## TTS

| Piece | Location |
| --- | --- |
| Fixed preview phrases | `ttsCatalog.ts` + `POST /tts/preview` |
| Free-form synthesize | Disabled unless `SUPALUV_TTS_ALLOW_FREEFORM=1` |
| Dual route | MiniMax zh / ElevenLabs western (AIKit) |
| Howler play + pan + reverb | `gameAudio.ts` + `howlerEngine.ts` |

## Co-play

| Piece | Location |
| --- | --- |
| Host authority Ink | host runner + story mirror |
| BroadcastChannel local | `broadcastTransport` |
| Realtime cross-device | `realtimeTransport` (Supabase broadcast) |
| Shared cursor (fine pointer) | `pointerPolicy` + `CursorOverlay` |
| Touch mobile | no continuous fake mouse; **one-shot tap focus** |
| RPS conflict | `rpsRules` + overlay |

Deferred: seat SKUs, Colyseus, voice chat (players use phone voice).

## UI layers

| Layer | Where |
| --- | --- |
| Brand tokens / GameButton / **GameCallout** | `@pieai/swimmer-ui-kit@1.0.1` |
| Cinema stage, dialogue clip, orientation gate | `apps/web/src/styles.css` |

## Deploy

| Surface | Config |
| --- | --- |
| Web | Vercel Services `web` → `apps/web` (Vite) |
| AI edge | Vercel Services `ai-branch` → `services/ai-branch/src/server.ts` (Node) |
| Public routing | `/api/*` → `ai-branch`; everything else → `web` |
| Secrets | Local: `/Users/yuanfei/PieAI/.secrets/supaluv.env`; cloud: Vercel Sensitive vars in Preview + Production |

Production is live at `https://supaluv.pieaistudio.com`. DNS stays at Namecheap
with a `supaluv` CNAME to Vercel.

Operational checks and current limitations live in
`docs/reference/execution/vercel-preview-runbook.md`.

## Explicitly deferred

- AI custom lead faces (ADR-0002 conflict with video CG)
- Steam packaging
- Full EN Ink localization
