# SupaLuv

SupaLuv（《超级爱人》）是一款独立的 AI 互动电影 / 视觉小说游戏，不属于
Supa 卡牌游戏，也不包含 Boss Race 或多人对战规则。

生产版可直接游玩：<https://supaluv.pieaistudio.com>

## 当前状态

- 已完成可公开体验的技术 Demo 闭环：标题、选角、剧情、存档、音频、画廊、
  成就、受约束 AI 选项、成年真人角色形象生成、AI 最终章、点数扣费与消费明细。
- 当前第一章是短篇、非正式内容，用来验证完整技术与产品骨架；它不等于最终小说，
  也不代表完整商业成品已经完成。
- 下一阶段以正式小说内容、视觉与交互打磨、线上运营验证为主；增加章节不应重建引擎。

## 技术基线

- React + Vite + TypeScript：Web 应用与界面
- Ink / InkJS：作者主线剧情
- Mastra + SwimmerAIKit：受约束 AI 剧情与生成能力
- SwimmerBackend / `@pieai/swimmer-backend-client`：账号、钱包、存储与服务边界
- SwimmerUIKit：共享品牌组件；产品页面组合和游戏视觉留在本仓库
- OpenRouter：当前模型路由；图片生成使用 Gemini 模型

所有出现主要人物的预渲染视频已退出产品方向，避免玩家定制形象与视频固定面孔冲突。
表现层以立绘、场景、镜头运动、音频和文字节奏为主。

## 文档入口

- AI 执行规则：[AGENTS.md](AGENTS.md)
- 当前唯一执行真相：[current-work.md](docs/reference/execution/current-work.md)
- 人与 AI 共用的文档地图：[documentation-map.md](docs/reference/documentation-map.md)

历史讨论、旧路线图和已完成实施记录不在默认阅读路径中；需要追溯时再查看
`docs/archive/`、`docs/plans/completed/` 和 `docs/specs/completed/`。

## 常用验证

```bash
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
pnpm docs:check
```
