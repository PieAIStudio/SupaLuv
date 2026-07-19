---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-18
domain: meta
tags:
  - current-work
  - navigation
  - supaluv
pinned: true
related:
  - REF-DOCUMENTATION-MAP
  - POLICY-PROJECT-BEST-PRACTICE
---

# SupaLuv Current Work

这是项目当前唯一执行状态入口。代码决定实际行为；本文件只记录当前阶段、边界和发布门。

## 当前状态

| 项目 | 当前真相 |
| --- | --- |
| 配置的生产入口 | <https://supaluv.pieaistudio.com> |
| 默认内容 | `draft-ch01` → `draft-ch02` → `draft-ch03`；三章按 supa-luv-v2 小说重转，仍是 noncanonical 草稿，不是冻结终稿 |
| active work | `SPEC-0003`、`PLAN-0005` 与 `SPEC-0004`（Creator Studio 产品线，owner 2026-07-18 指定为重点）；`ADR-0008` AI 本地化管线（P0 三章英文 Ink 已合并，待 P0b 运行时按语言选剧本、P1 英文真选角+预生成语音库）；不要创建竞争规格，也不要把 completed/archive 改回 active |
| 阶段判断 | 产品骨架与关键技术链路已存在，但正式内容、完整视听和发行验收尚未完成 |

正式内容到位后应填入现有 Ink / scene manifest / asset 管线，不为每一章重做应用外壳。

## 已完成能力

| 能力 | 可验证入口 |
| --- | --- |
| 三章剧情运行与跨章会话 | `packages/content/src/index.ts`, `apps/web/src/story/session/` |
| 游戏外壳、舞台、存档、设置、画廊与帮助 | `apps/web/src/App.tsx`, `apps/web/src/views/`, `apps/web/src/persistence/` |
| 剧情内可跳过互动、玩家路线图与本地 Creator Studio | `apps/web/src/views/play/`, `apps/web/src/views/PlayerPathPanel.tsx`, `apps/web/src/creator/`, `PLAN-0005` 已完成项 |
| 受约束 AI 支线与 AI 最终章 | `apps/web/src/ai/`, `apps/web/src/ai-ending/`, `services/ai-branch/src/` |
| 成年真人照片输入、私有角色资产与删除流程 | `apps/web/src/characters/`, `services/ai-branch/src/character*` |
| 电池计量、消费提交/退款与产品消费记录 | `services/ai-branch/src/walletMeter.ts`, `services/ai-branch/src/persistence/` |
| 中英玩家界面与可选 co-play | `apps/web/src/i18n/`, `apps/web/src/coplay/` |
| 小说→内容包与资产生成技能 | `.agents/skills/novel-to-ink-script/`, `.agents/skills/script-to-assets/` |
| 全角色 CG 立绘（双主角情绪集 + 10 配角），官方选角直通授权情绪演出 | `apps/web/public/assets/portraits/`, `packages/content/characters/registry.ts`, `apps/web/src/characters/portraitResolver.ts` |
| 自动玩家遍历引擎（人设通关+回响量化） | `tools/auto-player/`, `tests/unit/auto-player.test.ts` |
| 视觉契约测试与 18+ 年龄门 | `tests/e2e/visual-contract.spec.ts`, `apps/web/src/views/BootSplash.tsx` |

这些能力表示代码路径和既有验证证据已经存在，不等于当前版本已经通过新的发行验收。

## 共享能力边界

| 边界 | 当前责任 |
| --- | --- |
| SwimmerBackend | 共享身份令牌校验与钱包客户端；承载 SupaLuv 产品 schema、RLS、私有存储桶与迁移 |
| SupaLuv | 浏览器账号适配、AI / 角色业务编排，以及调用共享数据基础设施的服务适配器 |
| SwimmerAIKit | AI 模型 / 供应商接入的共享适配层 |
| SwimmerUIKit | 共享组件、API 与 design token；页面组合、局部主题和游戏内容留在本项目 |

账号、钱包、产品服务适配器与数据基础设施必须按上表分别归属；客户端 package 不等于
整个 SwimmerBackend，也不拥有 SupaLuv 的业务编排。

## 当前未完成发布门

| 发布门 | 状态与证据 |
| --- | --- |
| 正式内容与视听 | 未完成；`PLAN-0005` Stage 3 仍有正式资产、BGM/ambient/SFX 和长文本节奏任务；对白 TTS 本地全链路已打通（游客登录→逐句 MiniMax 合成 200）；朱珠已按小说真相重制入库（2026-07-18，脸=近陈佳的机器人版，ch03 揭晓场景浏览器实证）；立绘上台标准已定（ADR-0006 amendment：无框合成+落地锚定，visual-contract 机器强制）；AI 支线触发点已恢复（小说重转时丢失，三章各一处，2026-07-18 真实 Gemini 生成+回归主线实证）；男款大力 v2 候选已按 owner 方向产出于 `Temp/dali-robot-v2-2026-07-18/`，等 owner 目选且大力尚无剧情戏份 |
| 发行级试玩 | 未完成；独立 critic pass 与第二轮选择感/视听/地图/存档/失败恢复试玩仍未关闭 |
| 真实服务验收 | 基本完成；本地真实调用证据已取得（auth/AI 支线/TTS/钱包 fail-closed/存储，见 `.scratch/director/playtest/2026-07-16/live-service-proof.md`）；2026-07-18 生产站云端 co-play 已实证（Supabase Realtime 全通）；Preview 验收通过（登录墙已关，匿名冒烟零错误）；owner 口头批准后 2026-07-18 已两次发布 Production（`pnpm vercel deploy --prod`，home 200 / health 200 / 新资产在线）；AI 支线浏览器全链路已实证（needs_battery 拦截 + unmetered 本地档生成 200 + 回归主线）；**发布纪律（2026-07-18 事故后确立）：GitHub push 会触发 Vercel 自动生产部署，任何 push 都等于发生产；本地 main 必须与 origin/main 保持同步，否则外部合并（如治理升级 PR）会用旧代码顶掉生产**（当日事故：origin 落后 94 提交，PGS 0.8.0 合并把生产退回旧版，已合并回推修复）；全角色中文配音已选角（MiniMax 16 音色逐一活体验证，主角色独立音色+旁白独立音色，本地对白合成 200 实证；生产 `SUPALUV_TTS_ALLOW_FREEFORM` 仍关闭，开启需 owner 成本决策）；**预生成配音库已上线**（2026-07-18：三章 136 条唯一台词离线合成入库 `apps/web/public/assets/voice/`，客户端先查静态库再考虑实时 TTS，游客在生产可听配音且零 AI 消耗；无后端纯前端环境浏览器实证静态 mp3 200 播放；工具 `tools/voice-pregen/generate.ts`，Ink 文本改动后需重跑；规模化后语音库应迁对象存储） |

当前优先级只保留三项：**正式内容 / 视听** → **发行级试玩** → **真实 Preview/Production 发布门**。
不新增下一阶段 roadmap。

## 运行时地图

| 关注点 | 位置 |
| --- | --- |
| 页面路由与存档编排 | `apps/web/src/App.tsx` |
| 游戏舞台与 HUD | `apps/web/src/views/VisualNovelPrototype.tsx`（composition-only 壳）, `apps/web/src/views/play/`（experience/ hooks + hooks/ + lib/ 分层） |
| Ink 与场景映射 | `apps/web/src/story/`, `packages/content/` |
| 共享剧情图 | `packages/shared/src/narrative-graph.ts`, `packages/content/generated/` |
| 角色生成与剧情绑定 | `apps/web/src/characters/`, `services/ai-branch/src/character*` |
| AI 选项与最终章 | `apps/web/src/ai/`, `services/ai-branch/src/` |
| 玩家界面语言 | `apps/web/src/i18n/`, `apps/web/src/views/` |
| 音频与 TTS | `apps/web/src/audio/`, `services/ai-branch/src/ttsCatalog.ts`, `services/ai-branch/src/ttsRoute.ts` |
| 美术方向与数值系统决定 | `docs/adr/0006-dual-track-art-direction.md`, `docs/adr/0007-diegetic-meter-system.md` |
| 立绘抠像与资产三账 | `tools/portrait-matte/`, `packages/content/assets/` |
| 自动玩家引擎 | `tools/auto-player/` |
| 存档与设置 | `apps/web/src/persistence/` |
| 产品分析 | `apps/web/src/analytics/` |

更细模块边界只在需要修改相应代码时读取 `apps/web/README.md` 或
`packages/content/README.md`，不要把完整模块清单复制回本文件。

## 锁定边界

- 不是 Supa 卡牌模式；不引入 Boss Race 或多人权威服务器。
- 语气是成人黑色幽默 / 性喜剧 + 机器人 + AI 结局，不改写成甜宠爱情故事。
- 不做色情生成器、裸露内容或未成年人真人生成；真人身份规则以 ADR-0005 为准。
- 成年真人照片仍在产品范围内；未成年人和明确违规输入仍拒绝。
- 主要人物不使用固定面孔的预渲染视频；以可定制立绘和静态电影化演出为主。
- 作者主线仍由 Ink 控制；AI 支线必须短且回归主线；最终章可以在受约束范围内成为终点。
- 浏览器不持有模型、审核或服务密钥；所有付费 AI 调用走服务端。
- 真实货币充值 / 购买入口当前保持关闭；电池计量已存在，不代表真实支付已经上线。
- SwimmerUIKit 只承载共享组件/API/token；本项目保留页面组合、局部主题和游戏内容。

## 验证门

代码交付至少执行与改动匹配的验证；发布主路径使用完整门：

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

涉及真实 AI、审核、钱包或存储时，模拟测试不能代替 Preview/Production 的最小端到端验收。

## 历史证据

- 当前执行与各轮证据：`docs/plans/active/PLAN-0005-draft-chapters-productization.md`
- 已完成产品打磨计划：`docs/plans/completed/PLAN-0003-ch01-polish-loops.md`
- 已完成 AI 角色与最终章计划：`docs/plans/completed/PLAN-0004-generative-character-packs-and-ai-endings.md`
- 已完成规格：`docs/specs/completed/`
- 已退休讨论和旧路线图：`docs/archive/`

历史材料用于追溯，不是默认启动阅读；不要把 completed/archive 文档重新激活。
