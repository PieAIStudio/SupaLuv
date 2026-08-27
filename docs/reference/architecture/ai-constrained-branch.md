---
id: REF-AI-CONSTRAINED-BRANCH
title: Constrained AI Narrative Runtime
type: reference
status: active
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-12
domain: architecture
tags:
  - ai-branching
  - ai-ending
  - supaluv
  - swimmer
pinned: false
related:
  - REF-CURRENT-WORK
---

# Constrained AI Narrative Runtime

本文件说明已上线的两类 AI 叙事能力。产品边界由 ADR-0005 决定；代码是可执行真相。

## 两种合同

| 类型 | 入口 | 长度与选择 | 结束方式 |
| --- | --- | --- | --- |
| AI 支线 | 作者主线中的指定选择点 | 1–4 个短节拍；玩家看到预写选择和生成选择 | 必须跳回内容配置的 Ink 节点 |
| AI 最终章 | 作者剧情交出的终局入口 | 每轮 2–4 个选择或自由输入；最多 8 段，约 10–20 分钟 | 在作者允许的结局方向内终止，不回 Ink |

两者不能合并成一个无限生成器。前者像主路旁的一段观景支路，后者像导演给出边界后让演员
即兴完成最后一幕；都不是让模型随意重写整部小说。

## 请求链路

```text
Web 玩家端
  -> SupaLuv ai-branch 服务（鉴权、schema、审核、计费）
    -> SwimmerAIKit / OpenRouter 模型
    -> SwimmerBackend 钱包与产品数据
  <- 结构化、审核通过且已持久化的结果
```

| 关注点 | 代码位置 |
| --- | --- |
| 支线客户端和状态 | `apps/web/src/ai/`, `apps/web/src/hooks/useAiBranchSlot.ts` |
| 最终章客户端 | `apps/web/src/ai-ending/` |
| HTTP 路由 | `services/ai-branch/src/routeTable.ts` |
| 支线生成 | `services/ai-branch/src/mastraBranch.ts`, `prompts.ts` |
| 最终章生成与恢复 | `services/ai-branch/src/endingSessionService.ts`, `endingRoutes.ts` |
| 输入/输出审核 | `services/ai-branch/src/safetyGate.ts` |
| 身份验证 | `services/ai-branch/src/authGate.ts` |
| 钱包计量 | `services/ai-branch/src/walletMeter.ts`, `spendRoutes.ts` |

新增 HTTP 能力应进入 `routeTable.ts` 对应模块，不把 `server.ts` 重新变成业务集合体。

## 不可破坏的约束

- 浏览器只调用产品服务，不能拿到 OpenRouter、审核、SwimmerBackend 服务密钥。
- 服务端验证 SwimmerBackend Bearer session；付费 AI 不允许匿名绕过钱包。
- 所有自由输入先审，模型输出在交付前再审；不允许未成年人真人、裸体或色情生成。
- 输出必须通过结构化 schema；无效、失败或未交付结果退款且不进入消费明细。
- AI 支线返回的 `rejoinSceneId` 必须与作者配置一致，浏览器也要防御性校验。
- AI 最终章按 checkpoint 持久化，刷新或供应商故障后从已提交段恢复，不能重复扣费。
- 模型别名和价格属于服务端配置，不写进叙事内容或客户端分支逻辑。

## 本地与真实环境

- 本地密钥：`/Users/yuanfei/PieAI/.secrets/supaluv/local.server.env`
- 浏览器安全变量：`/Users/yuanfei/PieAI/.secrets/supaluv/local.public.env`
- 完整本地运行：`pnpm dev:full`
- 强制模拟：`VITE_SUPALUV_AI_FORCE_MOCK=1 pnpm dev:web`

Mock 用于确定性测试，不代表真实服务已经接通。修改模型、审核、钱包或存储后，仍需在
Preview 或 Production 做一次最小真实链路验收。
