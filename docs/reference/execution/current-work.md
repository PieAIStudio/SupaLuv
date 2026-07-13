---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-13
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
- **产品阶段**：功能闭环已齐，两章草稿已在官网可玩；加载、正式视听资产和内容演出仍需产品化。
- **当前主线工作**：`PLAN-0005` Stage 1 与首批 Stage 2 已完成；游戏式原子加载、第一个
  剧情内互动和共享 `NarrativeGraph` 已交付。下一批并行交付 Creator Studio、玩家路线图与
  立绘透明蒙版修复。
- **内容边界**：官网默认内容已经是 `draft-ch01`、`draft-ch02`；两章仍是 noncanonical 草稿，
  不是作者已经冻结的最终小说。旧短篇 Demo 仅保留为开发 fixture，不再是玩家默认故事。
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

1. **两种剧情地图**：共享 NarrativeGraph 已就绪；并行实现本地 Creator Studio 与玩家路线图。
2. **立绘商品修复**：苏明 8 张立绘仅 2 张透明背景合格，其余 6 张残留洋红底；修复资产并建立自动门禁。
3. **剩余剧情互动**：协议测试、看房热点、手机问卷和算法羞耻档案。
4. **视听与试玩打磨**：正式资产、TTS/BGM/SFX、两轮 playtest 与修复后证据。

已完成的两章内容基线包括 169 个正文段落的来源覆盖、跨章存档、完整 Ink/manifest、
旧 Demo 退休和 Production 最小试玩。游戏式加载现已等待关键图片解码后原子换幕，生产入口
chunk 从约 521 KB 降到约 65 KB；第一章已接入可跳过、可存档恢复的情绪样本校准互动。
共享 NarrativeGraph 现从真实 Ink 路径生成 93 个场景节点、119 条边，并分别输出本地创作全图与
不携带剧情语义的玩家安全骨架。当前主要缺口转为两种地图、立绘透明蒙版、剩余互动和正式视听资产，
而不是基础加载或图数据闭环。

当前 active work 只有 `SPEC-0003` 与 `PLAN-0005`。不要并行创建竞争规格或把 completed 文档
重新改成 active。

## 运行时地图

| 关注点 | 位置 |
| --- | --- |
| 页面路由与存档编排 | `apps/web/src/App.tsx` |
| 游戏舞台与 HUD | `apps/web/src/views/VisualNovelPrototype.tsx`, `apps/web/src/views/play/` |
| Ink 与场景映射 | `apps/web/src/story/`, `packages/content/` |
| 共享剧情图 | `packages/shared/src/narrative-graph.ts`, `packages/content/generated/` |
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
