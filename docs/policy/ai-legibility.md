---
id: POLICY-AI-LEGIBILITY
title: AI Legibility — the product must be machine-comprehensible
type: policy
status: active
canonical: true
owner: project
created: 2026-07-19
last_reviewed: 2026-07-19
domain: project-policy
tags:
  - project-policy
  - ai-legibility
  - architecture
  - creator-studio
pinned: true
related:
  - POLICY-PROJECT-BEST-PRACTICE
  - POLICY-AI-ASSET-PROVENANCE
supersedes: []
superseded_by: null
---

# AI Legibility — 产品必须让 AI 秒懂

Owner 决策（2026-07-19）：SupaLuv 的游戏与 Creator Studio 都是 AI 时代的产品，
**对 AI 的可理解性是一等公民需求**，与对人类的可用性同级。Unity/Unreal 的最大
历史包袱正是 AI 难以理解其二进制场景、编辑器内部状态与 GUID 迷宫；我们反着做。

## 可测标准：冷启动测试（Cold-Agent Test）

一个从未见过本项目的 AI，只拿到该表面的**入口文件/自描述接口**（不许读实现
源码），必须能完成一个代表性任务。这是唯一算数的验收方式——"文档看起来清楚"
不算，跑通才算。

- Creator Studio 的代表任务：改一个场景的 speaker 并保存成功。
- 内容管线的代表任务：定位一条对白在 Ink 源文件中的位置。
- 每新增一个大表面（新模块/新服务），验收里加一条冷启动测试。

## 七条原则

1. **文本即真相**：一切运行时行为可追溯到 git 里人和 AI 都能读的文本
   （Ink、TS manifest、JSON/CSV 台账）。禁止二进制真相源、禁止只存在于
   编辑器内存里的状态。
2. **单一真相 + 稳定 ID**：每个事实只住一处，其余地方用稳定 ID 引用
   （SPEC-0004 铁律的推广）。AI 最怕的是两处说法不一致。
3. **表面自描述**：每个 API/工具能机读地回答"我能做什么"。Creator Studio
   提供 `GET /__creator-studio/describe`（全部端点、参数形状、工作流序列）；
   CLI 工具的 `--help` 必须与实际行为一致。
4. **生成物带溯源**：见 [[POLICY-AI-ASSET-PROVENANCE]]。提示词即源码。
5. **可执行验证优先于文字描述**：断言用命令表达（typecheck/test/audit），
   让 AI 能自己验证自己的改动。Studio 的"保存过闸门"就是范式：写入→校验→
   失败回滚，AI 用它不可能把仓库改坏。
6. **入口文件制度**：每个供 AI 操作的表面放一份 `AGENTS.md`（做什么、怎么驱动、
   铁律、验证命令），路径贴着代码住，不另设文档迷宫。
7. **术语处处一致**：同一概念全仓库同名（sceneId / artKey / bgmKey / 稳定 ID）。
   改名必须全局改，不留同义词。

## 惯性维持（这条最容易丢）

- 每个新功能的验收清单必须包含"AI 与人类都便于理解"检查：新表面有入口文件或
  自描述接口吗？新概念沿用既有术语吗？新状态有文本真相吗？
- Code review / grok 任务书里把上述检查写成显式条目。
- 每季度跑一次全表面冷启动测试抽查（用一个全新 AI 会话实测）。

## 现状与差距（2026-07-19）

已经做对的：Ink 文本剧情、TS manifest、CSV/JSON 台账、保存闸门、NDJSON 流式
任务日志。缺口：Studio 无自描述端点、无 AGENTS.md 入口、冷启动测试从未跑过。
缺口由 Creator Studio AI-legibility P0 补齐。
