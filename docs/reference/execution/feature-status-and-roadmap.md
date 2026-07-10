---
id: REF-FEATURE-STATUS-ROADMAP
title: SupaLuv Feature Status and Roadmap
type: reference
status: active
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: product
tags:
  - roadmap
  - current-work
  - supaluv
pinned: true
related:
  - REF-CURRENT-WORK
  - REF-AI-CONSTRAINED-BRANCH
  - REF-CO-PLAY-INVITE-SESSION
  - REF-PLAYER-PROTAGONIST-CUSTOMIZATION
  - REF-CHAPTER-END-GLOBAL-CHOICE-STATS
  - PLAN-0003
---

# SupaLuv Feature Status and Roadmap

This file is for **next AI sessions** and the owner. Keep it short and accurate.
When shipping a batch, update the status table — do not invent parallel roadmaps.

## Already shipped (demo shell)

| Feature | Status | Where |
| --- | --- | --- |
| 16:9 stage + fullscreen | done | `VisualNovelPrototype`, `useFullscreen` |
| Event CG | done | `CutscenePlayer` |
| Dual portraits | done | `PortraitStage`, character registry |
| Ch1 densified Ink | done | `packages/content/ink/ch01.ink` |
| Title / multi-slot save | done | `TitleScreen`, `gameSave` |
| Gallery unlocks | done | `GalleryScreen` |
| History + auto-play | done | `useDialogueLog`, settings |
| Keyboard Space/Enter/Esc | done | `usePlayInput` |
| 4-channel audio (music/ambient/sfx/voice) | done | `gameAudio`, settings |
| Constrained AI side branch + rejoin | done | `services/ai-branch`, `useAiBranchSlot` |
| Mastra + SwimmerAIKit + Gemini 3.5 Flash | done | `services/ai-branch` |
| PostHog typed analytics | done | `productAnalytics` |
| **Achievements system** | **done** | `achievements.ts`, `AchievementsScreen` |
| **操作说明 Help** | **done** | `HelpScreen` |
| **结局升级** (订单号/路径/复制摘要/回标题) | **done** | `ChapterEndCard` |
| **路径记忆** (本局是否 AI 旁支) | **done** | `VisualNovelPrototype` + end card |

### Architecture note (keep simple)

- Achievements = pure persistence + toast unlock. UI list is intentionally simple.
- Help / Achievements / Gallery / Settings = sibling meta screens under `App` routing.
- Do **not** dump new chrome into `VisualNovelPrototype`; use `views/play/*` or meta screens.
- AI remains **side branch + forced rejoin**, never free novel.

## A — Near-term wow (do next, decoupled)

| # | Item | Status | Notes / seam |
| --- | --- | --- | --- |
| A1 | AI 结局批注 | done | End card button; same AI provider; no Ink rewrite |
| A2 | 再挂 2 个 AI 锚点 | done | `ch01_forum_search`, `ch01_courier_fantasy` |
| A3 | 二周目 / 已选路径灰显 | done | `pathMemory.ts` + choice `曾选` tag |
| A4 | 成就驱动图鉴 | done | Clear chapter seeds gallery unlocks |
| A5 | 分享卡导出 | done | `ShareCardExporter.ts` 16:9 PNG |

Implement **one module per item**. Do not merge into a mega PR.

## B — Mid-term product depth

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| B6 | 人物语音 VO / TTS → `voiceVolume` | **partial done** | 双路 HTTP + `/tts/synthesize` + 登录后台词播报；设定页可试听中文 |
| B7 | AI 旁支资产池扩展 | **done** | ch01 三锚点 art/portrait pool 加厚；仍无自由生图 |
| B8 | 计费计量 (电池 AI，无免费次数) | partial | Edge `walletMeter` reserve/commit/refund；`GET /wallet/balance`；无 secret 时需 OPTIONAL/UNMETERED |
| B8b | TTS 固定样句 | done | `POST /tts/preview`；自由文本默认关闭 |
| B8c | 同玩光标策略 | done | fine 连续光标；touch 单击焦点；`pointerPolicy` |
| B9 | 第 2 章 content drop | blocked | Owner delivers novel → pipeline |

## C — Later / packaging

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| C10 | 多结局网 (有限锚点 × 无限包装) | pending | Same rejoin model at scale |
| C11 | Steam / 移动包装 | pending | After story pull proven |
| C12 | 原创配乐替换 Mixkit | **done (Lyria beds)** | 5 beds in `public/assets/audio/bgm/`；见 ATTRIBUTION |
| C13 | 林/周多 mood 立绘 | pending | Character lock packs |

## D — Co-play invite

**Architecture doc:** `docs/reference/architecture/co-play-invite-session.md`
**Local demo (2026-07):** `apps/web/src/coplay/*` — BroadcastChannel 同机双标签；协议可换 Realtime。

| # | Item | Status | Placement |
| --- | --- | --- | --- |
| D14 | 拥有者邀请同玩（host 权威 Ink） | **local demo** | Title「本机同玩」；host 开房，guest 围观 |
| D15 | 同屏 + 光标可见 | **local demo** | Presence 节流自 TuringPact 思路；`CursorOverlay` |
| D16 | 选项冲突 → 小对决（如 RPS） | **done (local)** | `rpsRules` + `RpsDuelOverlay`；平局重出 |
| D17 | 访客席位 / 加购 | research | SwimmerCore entitlements |
| D18 | 语音 | out of scope | Players use phone; product does not build VoIP |
| D14b | 跨网 Realtime 房间 | **done (opt-in)** | `createCoPlayTransport`：有 `VITE_SUPABASE_*` 用 Realtime broadcast，否则本机 |

**Server placement summary（已按 TuringPact 修订）：**

| Layer | Put it here | Not here |
| --- | --- | --- |
| Live co-play + 光标 | **SwimmerCore Supabase Realtime**（v1） | Vercel Edge 当房间；默认不上 Colyseus |
| Ownership / seats / invites | SwimmerCore 表 / RLS | 仅浏览器内存 |
| AI side branch | 短 edge/Node（可 Vercel Function） | presence 每帧 |
| Static web | Vercel / Vite | — |
| Colyseus / GameServerKit | **升级阀**（Realtime 不够时） | v1 默认 |

详见 `docs/reference/architecture/co-play-invite-session.md` §3。
Co-play must stay **decoupled** from single-player: solo remains fully playable offline.

## E — Player protagonist customization (research only)

**Discussion doc (do not implement yet):**
`docs/reference/architecture/player-protagonist-customization.md`

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| E19 | 双主角显示名可改 | **done** | `displayNames.ts` + 设定 + 名牌/正文/分享卡 |
| E20 | 双主角外形 pack 替换 | **local done** | 本机上传 lead 覆盖；无 AI 生图 |
| E21 | 非捏脸：照片/文案 → 风格锁生图 | research | 生图流水线未接；**ADR-0002** 已定视频策略 |
| E22 | 主图 → mood/动作批处理齐套 | research | ~10–20 表情，复用 character lock 管线 |
| E23 | 生图计费 / 审核 | blocked | 与 B8 计量对齐；公网前必须有 |

**Not in E:** 周鹿等配角自定义；传统滑条捏脸；客户端直连生图厂商。

Custom packs must stay **decoupled**: default official portraits always work with zero AI.

**Resolved tension:** custom faces vs lead-face video → **ADR-0002** hybrid soft-degrade (skip CG when custom pack active).

## F — Chapter-end global choice stats

**Doc:** `docs/reference/architecture/chapter-end-global-choice-stats.md`

Telltale-style「全球有多少玩家和你选一样」— 异步社交证明。

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| F24 | 重大抉择 `choiceId` 埋点 | **done** | catalog + PostHog `choice_made.choiceId` |
| F25 | 聚合（seed ⊕ 本机 ⊕ 可选在线池） | **done** | 在线=`/api/choice-stats`；生产可换 PostHog 快照 |
| F26 | 章末「全球回声」UI | **done** | `ChapterEndCard` 条 + 多数/少数标签 |
| F27 | 分享卡带全球 % | **done** | `ShareCardExporter.echoLines` |
| F28 | 稀有路径成就 | **done** | `rare_echo_path`（少数派 ≤32%） |
| F29 | 预言家模式 | **done** | 抉择前猜多数；章末揭晓；`oracle_hit` |
| F30 | co-play 全球裁判彩蛋 | **done** | RPS 上「听全球的」；`rps_global_pick` |
| F31 | 逆流订单 | **done** | 一局 ≥3 次少数派 → `reverse_current` |

**Later hooks:** 每周社区议题、付费深度榜 — see doc §4.

## Original mapping (for continuity)

1–5 = A · 6–9 = B · 10–13 = C · 14–18 = D · 19–23 = E · 24–26 = F stats.

## Verification ladder

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm docs:check
```

AI live: `pnpm dev:ai` + `pnpm dev:web` · secrets `/Users/yuanfei/PieAI/.secrets/supaluv.env`.
