---
id: REF-CURRENT-WORK
title: SupaLuv Current Work
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-14
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
- **产品阶段**：核心商业与技术闭环已齐，两章草稿已在官网可玩；Creator Studio、玩家路线图、
  选角移动端体验、立绘透明蒙版和中英玩家界面已完成首轮商品化。正式内容、视听资产、剩余互动和发行验收仍未完成。
- **当前主线工作**：`PLAN-0005` Stage 1 与 Stage 2 的地图/加载/首个互动/选角/立绘/中英界面与
  co-play 深层界面工作已完成；下一步集中在剩余剧情互动、正式视听与内容节奏，再做两轮发行级试玩。
- **内容边界**：官网默认内容已经是 `draft-ch01`、`draft-ch02`；两章仍是 noncanonical 草稿，
  不是作者已经冻结的最终小说。旧短篇 Demo 仅保留为开发 fixture，不再是玩家默认故事。
- **开发原则**：小说与技术可以并行推进。正式内容到位后，应填入现有内容管线，
  不为每一章重做引擎。
- **重构裁决**：六个证据驱动的结构回合已经收口故事会话、播放/决策、商业持久化与服务组合；
  停止按文件大小继续拆分，后续只在真实功能改动碰到具体边界时做窄修复。

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
| 剧情地图 | DEV-only Creator Studio 可搜索/编辑/编译/安全保存；玩家路线图只读、剧透裁剪 |
| AI 最终章 | 2–4 个选择或自由输入，最多 8 段，约 10–20 分钟，受作者方向约束 |
| 商业闭环 | 作者预制剧情免费；AI 行为扣电池；成功交付才计费；消费分析可追溯 |
| 协同试玩 | 本地双标签/可选 Realtime 同玩、投票、冲突处理、章节末全局选择统计；中英覆盖层、无障碍状态和中途加入剧情帧重播已接通 |
| 线上部署 | Vercel Web + `ai-branch` 服务；SwimmerCore 提供账号、钱包与持久化边界 |

历史发布记录包含真人成年照片审核、角色基础图和 6 种表情生成、剧情绑定、AI 最终章、
钱包扣费/明细、失败退款和测试资产删除的端到端验收；每次服务或部署变更仍必须重新做
Preview/Production 最小实测，自动化 mock 不能替代真实服务证据。

## 当前优先级

1. **剩余剧情互动**：协议测试、看房热点、手机问卷和算法羞耻档案。
2. **正式视听与内容**：背景/道具/NPC 资产、TTS、BGM、ambient、SFX，以及长文本节奏。
3. **发行级试玩**：内容 critic、选择感、地图、存档、失败恢复和真实 Preview/Production 验收。

已完成的两章内容基线包括 169 个正文段落的来源覆盖、跨章存档、完整 Ink/manifest、
旧 Demo 退休和 Production 最小试玩。游戏式加载现已等待关键图片解码后原子换幕，生产入口
chunk 从约 521 KB 降到约 65 KB；第一章已接入可跳过、可存档恢复的情绪样本校准互动。
共享 NarrativeGraph 现从真实 Ink 路径生成 93 个场景节点、119 条边，并分别输出本地创作全图与
不携带剧情语义的玩家安全骨架。当前主要缺口已转为剩余互动、正式内容/视听和发行验收，
而不是基础加载、图数据、选角控件或立绘透明度。

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
| 玩家界面语言 | `apps/web/src/i18n/`, `apps/web/src/views/` |
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

## Round 7 evidence

- 中英玩家界面已覆盖标题、选角、设置、画廊、帮助、成就、AI 消费、播放 HUD、历史、结算和分享卡；
  运行时解锁 toast 也跟随语言切换。
- 修复英文选角长文案横向溢出；测试环境固定 `zh-CN`，英文场景显式切换，避免机器区域设置造成假失败。
- 主线 `f0292fb`：格式、lint、资产、类型、368 单测、20 个 E2E、构建和 Vercel 输出契约均通过。
- Round 8 已完成 co-play 深层 overlay：中英文案、RPS 显示映射、无障碍状态、系统菜单层级、客人中途加入重播；
  双标签截图证据与 21 个 E2E 通过。真实 AI、审核、钱包和存储服务的 Preview/Production 证据仍按发布门单独复验。

这些材料用于追溯，不是默认启动阅读。
