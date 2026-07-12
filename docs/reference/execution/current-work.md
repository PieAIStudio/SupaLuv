---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-12
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

这是项目当前唯一执行状态入口。代码决定实际行为；本文件解释当前阶段、边界和下一步。

## 当前结论

- **生产官网**：<https://supaluv.pieaistudio.com>
- **产品阶段**：核心技术 Demo 闭环已上线；完整商业内容尚未完成。
- **内容边界**：当前 `ch01` 是短篇、非正式验证内容，不是最终小说第一章。
- **开发原则**：小说与技术可以并行推进。正式内容到位后，应填入现有内容管线，
  不为每一章重做引擎。

“技术闭环完成”表示关键能力可以首尾连通，不表示所有章节、美术、文案、平台包装和
运营细节已经达到正式发行标准。就像影棚、摄影机、剪辑和放映系统已经能拍完一支样片，
但整部长片仍需要正式剧本、镜头和精修。

## 已上线能力

| 能力 | 当前真相 |
| --- | --- |
| 游戏外壳 | 标题、新游戏、继续、存档、设置、画廊、成就、帮助、结局页 |
| 剧情运行 | Ink/InkJS 作者主线，场景清单驱动立绘、背景、音频和演出 |
| 视听 | 16:9 横屏、静态电影化镜头、BGM、环境声、SFX、双路 TTS |
| AI 支线 | 预设选择旁提供受约束 AI 选择；短分支后回到作者主线 |
| 角色定制 | 新游戏锁定男女主形象；剧情指定节点锁定机器人形象；章节中不可反复更换 |
| 真人照片 | 仅允许成年人；输入审核、私有存储、生成资产与删除流程已接通 |
| AI 最终章 | 2–4 个选择或自由输入，最多 8 段，约 10–20 分钟，受作者方向约束 |
| 商业闭环 | 作者预制剧情免费；AI 行为扣电池；成功交付才计费；消费分析可追溯 |
| 协同试玩 | 本地双标签同玩、投票、冲突处理和章节末全局选择统计 |
| 线上部署 | Vercel Web + `ai-branch` 服务；SwimmerCore 提供账号、钱包与持久化边界 |

生产环境已完成过真人成年照片审核、角色基础图和 6 种表情生成、剧情绑定、完整
8 段 AI 最终章、钱包扣费/明细、失败退款和测试资产删除的端到端验收。

## 当前优先级

1. **正式内容**：作者继续创作和修订小说；进入游戏时按内容包流程转换为 Ink、
   场景清单和资产清单。
2. **商品打磨**：用真实内容校准节奏、文案、视觉一致性、音频混音、错误恢复和新手引导。
3. **运营可靠性**：持续观察模型成功率、审核误判、生成耗时、钱包对账和成本。
4. **发行准备**：当 Web 内容和留存得到验证后，再决定桌面、移动端和商店包装顺序。

没有已批准但尚未完成的 active plan/spec。新工作若超过一次小改，应新建计划或规格，
不要把 completed 文档重新改成 active。

## 运行时地图

| 关注点 | 位置 |
| --- | --- |
| 页面路由与存档编排 | `apps/web/src/App.tsx` |
| 游戏舞台与 HUD | `apps/web/src/views/VisualNovelPrototype.tsx`, `apps/web/src/views/play/` |
| Ink 与场景映射 | `apps/web/src/story/`, `packages/content/` |
| 角色生成与剧情绑定 | `apps/web/src/characters/`, `services/ai-branch/src/character*` |
| AI 选项与最终章 | `apps/web/src/ai/`, `services/ai-branch/src/` |
| 音频与 TTS | `apps/web/src/audio/`, `services/ai-branch/src/ttsCatalog.ts`, `ttsRoute.ts` |
| 存档与设置 | `apps/web/src/persistence/` |
| 产品分析 | `apps/web/src/analytics/` |

更细模块边界只在需要修改相应代码时读取 `apps/web/README.md` 或
`packages/content/README.md`，不要把完整模块清单复制回本文件。

## 锁定边界

- 不是 Supa 卡牌模式；不引入 Boss Race 或多人权威服务器。
- 语气是成人黑色幽默 / 性喜剧 + 机器人 + AI 结局，不改写成甜宠爱情故事。
- 不做色情生成器、裸露内容或未成年人真人生成；真人身份规则以 ADR-0005 为准。
- 主要人物不使用固定面孔的预渲染视频；以可定制立绘和静态电影化演出为主。
- 作者主线仍由 Ink 控制；AI 支线必须短且回归主线；最终章可以在受约束范围内成为终点。
- 浏览器不持有模型、审核或服务密钥；所有付费 AI 调用走服务端。
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

- 已完成产品打磨计划：`docs/plans/completed/PLAN-0003-ch01-polish-loops.md`
- 已完成 AI 角色与最终章计划：`docs/plans/completed/PLAN-0004-generative-character-packs-and-ai-endings.md`
- 已完成规格：`docs/specs/completed/`
- 已退休讨论和旧路线图：`docs/archive/`

这些材料用于追溯，不是默认启动阅读。
