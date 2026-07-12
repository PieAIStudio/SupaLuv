---
id: REF-DOCUMENTATION-MAP
title: SupaLuv Documentation Map
type: reference
status: active
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-12
domain: meta
tags:
  - navigation
  - supaluv
pinned: false
related:
  - REF-CURRENT-WORK
  - POLICY-PROJECT-BEST-PRACTICE
  - ADR-0001
  - ADR-0003
  - ADR-0004
  - ADR-0005
---

# SupaLuv Documentation Map

本页帮助人和 AI 用最短路径找到项目真相。AI 的强制启动规则仍以 `AGENTS.md` 为准。

## 默认阅读路径

1. `AGENTS.md`：路由、非协商边界和验证规则。
2. `docs/reference/execution/current-work.md`：当前阶段、已上线能力和下一步。
3. 只读取本次任务直接相关的政策、ADR、规格或代码边界说明。

默认不要读取 `docs/archive/`、`docs/plans/completed/`、
`docs/specs/completed/`；它们只用于追溯“为什么曾经这样做”。

## 真相来源

| 问题 | 唯一优先来源 |
| --- | --- |
| 当前在做什么、线上到哪一步 | `docs/reference/execution/current-work.md` |
| 产品与工程硬边界 | `docs/policy/best-practice-for-this-project.md` |
| Web + Ink 技术基线 | `ADR-0001` |
| 免费剧情与 AI 电池计费 | `ADR-0003` |
| 成人黑色幽默 / 性喜剧语气 | `ADR-0004` |
| 真人形象、角色锁定、AI 最终章 | `ADR-0005` |
| 实际可执行行为 | 当前代码、配置和测试 |
| Web 包局部模块边界 | `apps/web/README.md` |
| 内容包生产边界 | `packages/content/README.md` |

若文档与代码冲突：已实现行为以代码为准，同时立即修正文档；产品方向冲突则按
`AGENTS.md` 的 Current Truth Hierarchy 处理。

## 文档货架

| 位置 | 用途 | 默认读取 |
| --- | --- | --- |
| `docs/policy/` | 项目规则 | 是，按 AGENTS 要求 |
| `docs/decisions/` | 长期稳定决策 | 仅任务相关 |
| `docs/specs/active/` | 当前未完成需求 | 有内容时读取 |
| `docs/plans/active/` | 当前执行计划 | 有内容时读取 |
| `docs/reference/` | 当前架构、运行和导航说明 | 仅任务相关 |
| `docs/plans/completed/`, `docs/specs/completed/` | 已完成证据 | 否 |
| `docs/archive/` | 已退休或被取代材料 | 否 |
| `docs/governance/` | PGS 规则与清单 | 按 AGENTS 要求 |

## 维护规则

- 一项事实只保留一个 SSOT；其他文档用链接，不复制整段状态表。
- `current-work.md` 只写当前状态和下一步，不积累每轮开发日志。
- 完成的 plan/spec 移入 completed；过期讨论和路线图移入 archive。
- 新建 governed Markdown 前运行 `pnpm doc-gov find <topic>`。
- 改文档后运行 `pnpm docs:check` 和 `git diff --check`。
- 源小说指针是只读来源，不通过本仓库改写作者原稿。
