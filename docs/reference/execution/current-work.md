---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-22
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

| 项目           | 当前真相                                                                                                                                                                                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 配置的生产入口 | <https://supaluv.pieaistudio.com>                                                                                                                                                                                                                                                   |
| 默认内容       | `draft-ch01` → `draft-ch02` → `draft-ch03`；三章按 supa-luv-v2 小说重转，仍是 noncanonical 草稿，不是冻结终稿                                                                                                                                                                       |
| active work    | `SPEC-0003`、`PLAN-0005` 与 `SPEC-0004`（Creator Studio 产品线，owner 2026-07-18 指定为重点）；`ADR-0008` P0 文本与运行时选轨完成，P1 英文选角/静态库技术实现完成但发布验收未完成（仍需英文表演抽检与历史语音溯源债清理）；不要创建竞争规格，也不要把 completed/archive 改回 active |
| 阶段判断       | 产品骨架与关键技术链路已存在，但正式内容、完整视听和发行验收尚未完成                                                                                                                                                                                                                |

正式内容到位后应填入现有 Ink / scene manifest / asset 管线，不为每一章重做应用外壳。

## 已完成能力

| 能力                                                               | 可验证入口                                                                                                                                                      |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 三章剧情运行与跨章会话                                             | `packages/content/src/index.ts`, `apps/web/src/story/session/`                                                                                                  |
| 游戏外壳、舞台、存档、设置、画廊与帮助                             | `apps/web/src/App.tsx`, `apps/web/src/views/`, `apps/web/src/persistence/`                                                                                      |
| 剧情内可跳过互动、玩家路线图与本地 Creator Studio                  | `apps/web/src/views/play/`, `apps/web/src/views/PlayerPathPanel.tsx`, `apps/web/src/creator/`, `PLAN-0005` 已完成项                                             |
| 受约束 AI 支线与 AI 最终章                                         | `apps/web/src/ai/`, `apps/web/src/ai-ending/`, `services/ai-branch/src/`                                                                                        |
| 成年真人照片输入、私有角色资产与删除流程                           | `apps/web/src/characters/`, `services/ai-branch/src/character*`                                                                                                 |
| 电池计量、消费提交/退款与产品消费记录                              | `services/ai-branch/src/walletMeter.ts`, `services/ai-branch/src/persistence/`                                                                                  |
| 中英玩家界面与可选 co-play                                         | `apps/web/src/i18n/`, `apps/web/src/coplay/`                                                                                                                    |
| 小说→内容包与资产生成技能                                          | `.agents/skills/novel-to-ink-script/`, `.agents/skills/script-to-assets/`                                                                                       |
| 全角色 CG 立绘（双主角情绪集 + 10 配角），官方选角直通授权情绪演出 | `apps/web/public/assets/portraits/`, `packages/content/characters/registry.ts`, `apps/web/src/characters/portraitResolver.ts`                                   |
| 自动玩家遍历引擎（人设通关+回响量化）                              | `tools/auto-player/`, `tests/unit/auto-player.test.ts`                                                                                                          |
| 三章目录与原稿保真闸门                                             | `packages/content/catalog/story-catalog.json`, `packages/content/scripts/verify-fidelity.mjs`, `packages/content/ledgers/draft-2026-07-coverage-overrides.json` |
| 三章中英文静态对白库与安全同步                                     | `apps/web/public/assets/voice/`, `tools/voice-pregen/generate.ts`, `tests/unit/voice-pregen-safety.test.ts`                                                     |
| 开章产品分析事件 helper（成功后一次、失败零次）及四类 App 路径接线 | `apps/web/src/analytics/productAnalytics.ts`, `apps/web/src/App.tsx`, `tests/unit/product-analytics.test.ts`                                                    |
| 视觉契约测试与 18+ 年龄门                                          | `tests/e2e/visual-contract.spec.ts`, `apps/web/src/views/BootSplash.tsx`                                                                                        |

这些能力表示代码路径和既有验证证据已经存在，不等于当前版本已经通过新的发行验收。

## 共享能力边界

| 边界           | 当前责任                                                                      |
| -------------- | ----------------------------------------------------------------------------- |
| SwimmerBackend | 共享身份令牌校验与钱包客户端；承载 SupaLuv 产品 schema、RLS、私有存储桶与迁移 |
| SupaLuv        | 浏览器账号适配、AI / 角色业务编排，以及调用共享数据基础设施的服务适配器       |
| SwimmerAIKit   | AI 模型 / 供应商接入的共享适配层                                              |
| SwimmerUIKit   | 共享组件、API 与 design token；页面组合、局部主题和游戏内容留在本项目         |

账号、钱包、产品服务适配器与数据基础设施必须按上表分别归属；客户端 package 不等于
整个 SwimmerBackend，也不拥有 SupaLuv 的业务编排。

## 当前未完成发布门

| 发布门               | 状态与证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 正式内容与视听       | 未完成；`PLAN-0005` Stage 3 仍有正式资产、stage beds（music/ambient）/SFX 和长文本节奏任务；三章当前草稿已具备双语运行时保真闸门，仍不是小说终稿；朱珠已按小说真相重制入库（2026-07-18，脸=近陈佳的机器人版，ch03 揭晓场景浏览器实证）；立绘上台标准已定（ADR-0006 amendment：无框合成+落地锚定，visual-contract 机器强制）；AI 支线触发点已恢复（三章各一处，2026-07-18 真实 Gemini 生成+回归主线实证）；男款大力 v2 候选位于 `Temp/dali-robot-v2-2026-07-18/`，待 owner 目选且大力尚无剧情戏份                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 第四章计时演习       | **blocked — 尚无第四章小说草稿**；拿到任一可用草稿后，按“草稿→发行级双语有声章节 ≤5 个工作日、owner 决策 ≤1 天、全门绿”计时。前三章管线就绪不能替代这项吞吐能力证据                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 大资产存储与历史溯源 | 未完成；在第 4–18 章批量生成大体积二进制前，由 owner 决定对象存储/CDN 的 URL、hash、缓存、回滚和构建校验契约并立 ADR；当前语音库 288 条中，本轮新增 2 条具逐资产 provenance，其余 286 条历史债已由 key+SHA+bytes 摘要冻结、不可新增或漂移，但仍应迁移或形成正式 legacy exception，禁止补造旧 prompt                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 发行级试玩           | 未完成；独立 critic pass 与第二轮选择感/视听/地图/存档/失败恢复试玩仍未关闭                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 真实服务验收         | 基本完成；本地真实调用证据已取得（auth/AI 支线/TTS/钱包 fail-closed/角色包私有对象存储，见 `.scratch/director/playtest/2026-07-16/live-service-proof.md`）；2026-07-18 生产站云端 co-play 已实证（Supabase Realtime 全通）；Preview 验收通过（登录墙已关，匿名冒烟零错误）；owner 口头批准后 2026-07-18 已两次发布 Production（`pnpm vercel deploy --prod`，home 200 / health 200 / 新资产在线）；AI 支线浏览器全链路已实证（needs_battery 拦截 + unmetered 本地档生成 200 + 回归主线）；**发布纪律（2026-07-18 事故后确立）：GitHub push 会触发 Vercel 自动生产部署，任何 push 都等于发生产；本地 main 必须与 origin/main 保持同步，否则外部合并会用旧代码顶掉生产**；预生成配音库现有 288 条（zh-CN 137、en 151），目录/文件/catalog 已全局对账，客户端优先静态库且本轮同步零 API 成本；`--sync` 现要求显式缺失数、具体全局计划 digest 与预算，digest 绑定全文、选角、volume、完整 MP3 hash/元数据、账本、provenance 与历史债摘要；写路径以 catalog 为提交点并在普通失败时回滚整组资产 |
| 留存、身份与云端证据 | 未完成；`chapter_started` 代码与隐私 allowlist 已就绪，但周报/漏斗必须由 Preview/Production 的 PostHog 真实事件证明；注册不再隐含赠送电池。匿名身份升级、跨设备云存档和恢复策略属于独立 auth/storage tranche，不能在内容收口中顺手拼接                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

当前优先级：等待小说期间关闭管线缺口；第四章草稿一到即执行计时演习；随后才进入正式视听、
发行级试玩与真实 Preview/Production 发布门。不新增竞争 roadmap。

## 运行时地图

| 关注点                 | 位置                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 页面路由与存档编排     | `apps/web/src/App.tsx`                                                                                                                     |
| 游戏舞台与 HUD         | `apps/web/src/views/VisualNovelPrototype.tsx`（composition-only 壳）, `apps/web/src/views/play/`（experience/ hooks + hooks/ + lib/ 分层） |
| Ink 与场景映射         | `apps/web/src/story/`, `packages/content/`                                                                                                 |
| 共享剧情图             | `packages/shared/src/narrative-graph.ts`, `packages/content/generated/`                                                                    |
| 角色生成与剧情绑定     | `apps/web/src/characters/`, `services/ai-branch/src/character*`                                                                            |
| AI 选项与最终章        | `apps/web/src/ai/`, `services/ai-branch/src/`                                                                                              |
| 玩家界面语言           | `apps/web/src/i18n/`, `apps/web/src/views/`                                                                                                |
| 音频与 TTS             | `apps/web/src/audio/`, `services/ai-branch/src/ttsCatalog.ts`, `services/ai-branch/src/ttsRoute.ts`                                        |
| 美术方向与数值系统决定 | `docs/adr/0006-dual-track-art-direction.md`, `docs/adr/0007-diegetic-meter-system.md`                                                      |
| 立绘抠像与资产三账     | `tools/portrait-matte/`, `packages/content/assets/`                                                                                        |
| 自动玩家引擎           | `tools/auto-player/`                                                                                                                       |
| 存档与设置             | `apps/web/src/persistence/`                                                                                                                |
| 产品分析               | `apps/web/src/analytics/`                                                                                                                  |

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
pnpm content:fidelity
pnpm assets:check
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
