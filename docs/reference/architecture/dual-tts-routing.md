---
id: REF-DUAL-TTS-ROUTING
title: Dual TTS Routing (ElevenLabs + Chinese Provider)
type: reference
status: active
canonical: false
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: architecture
tags:
  - tts
  - elevenlabs
  - minimax
  - voice
pinned: false
related:
  - REF-AI-VOICE-TTS-VENDOR-SELECTION-V1
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
---

# Dual TTS Routing

## Why two providers (beginner version)

One microphone cannot always sound right in every language.

- **ElevenLabs** is excellent for English / many Western languages and “actor”
  performance — but Mandarin often sounds **less native**.
- A **Chinese-first** API (default: **MiniMax**) is better for 普通话.
- SupaLuv ships bilingual product ambition (Chinese UI now, English market later),
  so we **route by language**, not “pick one forever”.

Like hiring two voice actors: one for English scenes, one for Chinese scenes.

## Route table

| Language tag | Route | Default provider | Env key(s) |
| --- | --- | --- | --- |
| `zh`, `zh-CN`, `zh-TW`, … | `chinese` | MiniMax T2A v2 | `MINIMAX_API_KEY`（**GROUP_ID 可选**，官方 Bearer 即可） |
| `en`, `es`, `fr`, `de`, `ja`, `ko`, … | `western` | ElevenLabs HTTP TTS | `ELEVENLABS_API_KEY` |

Implementation lives in **SwimmerAIKit** (`@pieai/swimmer-ai-kit/tts`):

- `resolveTtsRoute(language)`
- `createDualTtsRouter({ western, chinese })`

## Secrets

Place keys only in
`/Users/yuanfei/PieAI/.secrets/supaluv/local.server.env` (never `VITE_*`):

```bash
ELEVENLABS_API_KEY=
MINIMAX_API_KEY=
# Optional legacy only — official international T2A does not require this:
# MINIMAX_GROUP_ID=
SUPALUV_TTS_DEFAULT_LANG=zh-CN
```

### MiniMax Group ID?

Official docs (`POST /v1/t2a_v2`, Bearer API key) do **not** require GroupId for
pay-as-you-go keys. Some third-party wrappers still ask for it; SupaLuv treats it
as optional query `?GroupId=`.

### MiniMax CN vs International host (important)

| Console | Base URL | Notes |
| --- | --- | --- |
| **国内** `platform.minimaxi.com` | `https://api.minimaxi.com` | 中文控制台建的 key **必须**用这个 |
| **国际** `platform.minimax.io` | `https://api.minimax.io` | 用国内 key 会返回 `2049 invalid api key` |

Env: `MINIMAX_BASE_URL`（默认 `https://api.minimaxi.com`）。

### ElevenLabs “where do I top up?”

ElevenLabs bills via **subscription credits** (Free / Starter / Creator…) under
account **Subscription** / **Billing**, not a separate “wallet top-up” like MiniMax.
API keys spend the **same plan credits**. If the old key’s plan has 0 remaining
characters, TTS returns 401/429 — check [elevenlabs.io/app/subscription](https://elevenlabs.io/app/subscription).

## Product rules

1. Prefab Ink lines may be **pre-synthesized + CDN cached** (cheap, stable).
2. Live dialogue VO is **on-demand**, requires **login**, later **battery reserve**.
3. Failure → subtitle-only (never block story).
4. Character voice IDs map per provider in `services/ai-branch/src/ttsRoute.ts`.

## Status

- Routing + types: **done** in SwimmerAIKit.
- HTTP adapters ElevenLabs + MiniMax: **done**.
- Edge `POST /tts/synthesize` + browser voice channel: **done**.

## Swap Chinese provider later

If MiniMax quality/price disappoints, replace only the `chinese` TtsProvider
implementation; keep the dual-router contract.
