---
id: POLICY-PROJECT-BEST-PRACTICE
title: SupaLuv Project Policy
type: policy
status: stable
canonical: true
owner: project
created: 2026-05-13
last_reviewed: 2026-07-12
domain: project-policy
tags:
  - project-policy
  - ai-development
  - supaluv
pinned: true
related:
  - POLICY-DOC-AGENT-RULES
  - POLICY-DOC-TYPES
  - ADR-0001
  - ADR-0003
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: null
---

# SupaLuv Project Policy

本文件只保存 SupaLuv 的长期产品与工程规则。跨项目治理规则应在 Project Governance
System 上游修改，不在这里另造一套。

## 产品边界

- SupaLuv 是基于《超级爱人》的独立 AI 互动电影 / 视觉小说游戏。
- 它不是 Supa 卡牌模式，不继承卡牌、Boss Race 或多人对战循环。
- 作者预制故事免费；产生真实模型成本的 AI 功能使用电池，且不提供免费 AI 配额。
- 小说创作与技术开发可以并行；正式章节应复用现有内容管线。
- 当前 Web Demo 验证的是完整产品骨架，不把非正式短篇第一章冒充完整商品。

## 内容与语气

- 主线是人类作者拥有的 Ink 故事，AI 不在运行时任意改写整个主线图。
- 产品语气是成人黑色幽默 / 性喜剧、机器人与 AI 亲密关系伦理；不是甜宠或传统爱情喜剧。
- 可以有暧昧、尴尬欲望、交易式亲密和辛辣对白，但不做色情生成器、裸露内容、
  非自愿内容或未成年人真人生成。
- 正式小说文本进入运行时前，要拆成剧情节拍、选择、Ink、场景清单和资产清单；
  内容变化不应要求重写应用外壳。

## AI 运行规则

- 作者选择点可提供 2–4 个受约束 AI 选择；自由输入必须先审核。
- AI **支线**必须短、有硬上限并回到指定 Ink 节点。
- AI **最终章**是例外：可以在作者给定方向内生成最多 8 段、约 10–20 分钟的终局，
  因为它本身就是终点，不需要假装回到已经结束的主线。
- 输入和输出都要审核；浏览器不得持有模型、审核或钱包密钥。
- 计费使用“成功交付后提交”：失败、无效输出或未交付结果不得成为玩家消费。
- 模型供应商通过 SwimmerAIKit 和服务端适配层接入，不在产品代码里重复实现通用客户端。

## 角色与资产

- 男女主在新游戏开始前锁定形象；两名机器人在作者指定剧情节点锁定；同一局中不反复更换。
- 支持成年真人照片；拒绝未成年人、裸体和明显违规输入。公众人物不因身份本身被本地规则拒绝。
- 原始照片和生成资产使用私有存储、可删除，并按产品保留策略到期清理。
- 主要人物不使用固定面孔的预渲染视频，避免与玩家定制形象冲突。
- 表现层以立绘、场景图、镜头运动、转场、文字节奏和声音为主；资产使用稳定 ID，
  发布前记录来源与授权。

## 技术边界

- React + Vite + TypeScript 负责应用外壳；Ink/InkJS 负责作者剧情。
- AI 请求走 `services/ai-branch`；账号、钱包、存储依赖 SwimmerCore/SwimmerClient。
- 共享组件、API 和设计 token 的通用修改进入 SwimmerUIKit；产品页面组合、局部主题和内容留在本项目。
- 不为视觉小说基础能力自造引擎；只有现有 React 表现层出现可测量瓶颈时，才重新评估 Pixi、Unity、Godot 或其他引擎。
- 故事与场景元数据保持可移植，但“未来可能迁移”不能拖慢当前 Web 商品化。

## 验证

按风险选择最小充分验证；发布主路径使用：

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

涉及 AI、审核、钱包、私有存储或部署时，必须增加 Preview/Production 的最小真实链路验收；
不得用 mock 全绿代替真实服务之间已经接通的证据。
