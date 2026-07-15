---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-15
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
| 默认内容 | `draft-ch01` → `draft-ch02`；两章仍是 noncanonical 草稿，不是冻结终稿 |
| active work | 只有 `SPEC-0003` 与 `PLAN-0005`；不要创建竞争规格，也不要把 completed/archive 改回 active |
| 阶段判断 | 产品骨架与关键技术链路已存在，但正式内容、完整视听和发行验收尚未完成 |

正式内容到位后应填入现有 Ink / scene manifest / asset 管线，不为每一章重做应用外壳。

## 已完成能力

| 能力 | 可验证入口 |
| --- | --- |
| 两章剧情运行与跨章会话 | `packages/content/src/index.ts`, `apps/web/src/story/session/` |
| 游戏外壳、舞台、存档、设置、画廊与帮助 | `apps/web/src/App.tsx`, `apps/web/src/views/`, `apps/web/src/persistence/` |
| 剧情内可跳过互动、玩家路线图与本地 Creator Studio | `apps/web/src/views/play/`, `apps/web/src/views/PlayerPathPanel.tsx`, `apps/web/src/creator/`, `PLAN-0005` 已完成项 |
| 受约束 AI 支线与 AI 最终章 | `apps/web/src/ai/`, `apps/web/src/ai-ending/`, `services/ai-branch/src/` |
| 成年真人照片输入、私有角色资产与删除流程 | `apps/web/src/characters/`, `services/ai-branch/src/character*` |
| 电池计量、消费提交/退款与产品消费记录 | `services/ai-branch/src/walletMeter.ts`, `services/ai-branch/src/persistence/` |
| 中英玩家界面与可选 co-play | `apps/web/src/i18n/`, `apps/web/src/coplay/` |

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
| 正式内容与视听 | 未完成；`PLAN-0005` Stage 3 仍有正式资产、TTS、BGM/ambient/SFX 和长文本节奏任务 |
| 发行级试玩 | 未完成；独立 critic pass 与第二轮选择感/视听/地图/存档/失败恢复试玩仍未关闭 |
| 真实服务验收 | 未完成；当前版本仍需取得真实 AI、审核、钱包和私有存储的 Preview/Production 最小端到端证据 |

当前优先级只保留三项：**正式内容 / 视听** → **发行级试玩** → **真实 Preview/Production 发布门**。
不新增下一阶段 roadmap。

## 运行时地图

| 关注点 | 位置 |
| --- | --- |
| 页面路由与存档编排 | `apps/web/src/App.tsx` |
| 游戏舞台与 HUD | `apps/web/src/views/VisualNovelPrototype.tsx`, `apps/web/src/views/play/` |
| Ink 与场景映射 | `apps/web/src/story/`, `packages/content/` |
| 共享剧情图 | `packages/shared/src/narrative-graph.ts`, `packages/content/generated/` |
| 角色生成与剧情绑定 | `apps/web/src/characters/`, `services/ai-branch/src/character*` |
| AI 选项与最终章 | `apps/web/src/ai/`, `services/ai-branch/src/` |
| 玩家界面语言 | `apps/web/src/i18n/`, `apps/web/src/views/` |
| 音频与 TTS | `apps/web/src/audio/`, `services/ai-branch/src/ttsCatalog.ts`, `services/ai-branch/src/ttsRoute.ts` |
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
