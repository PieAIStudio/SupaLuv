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
- 冷启动测试必须覆盖**五类任务**才算表面合格：读取、修改、冲突处理、
  非法输入被拒、失败回滚。只演示"改一个字段成功"不算过。
- 内容管线的代表任务：定位一条对白在 Ink 源文件中的位置。
- 每新增一个大表面（新模块/新服务），验收里加一条冷启动测试。

## 九条原则（2026-07-19 外部评审后修订 v2）

1. **行为真相必须是文本**：一切运行时行为可追溯到 git 里人和 AI 都能读的文本
   （Ink、TS manifest、JSON/CSV 台账）。二进制资产（音频/图像/模型）当然存在，
   但必须有可读台账、稳定 ID、来源溯源与可再现的参数转换链；关键状态不得
   只活在编辑器内存里。
2. **单一真相 + 稳定 ID**：每个事实只住一处，其余地方用稳定 ID 引用
   （SPEC-0004 铁律的推广）。AI 最怕的是两处说法不一致。
3. **标准优先的自描述**：HTTP 表面用**标准 OpenAPI 3.1** 描述（从代码内同一
   注册表生成，不许手写平行文档），产品级工作流/铁律放 `x-supaluv-*` 扩展；
   破坏性/幂等语义显式标注。CLI 工具的 `--help` 必须与实际行为一致。
   MCP 适配是触发式 P2：真有外部代理客户端接入需求时再做，不做投机工程。
4. **生成物带溯源**：见 [[POLICY-AI-ASSET-PROVENANCE]]。提示词即源码。
5. **可执行验证优先于文字描述**：断言用命令表达（typecheck/test/audit），
   让 AI 能自己验证自己的改动。Studio 的"保存过闸门"就是范式：写入→校验→
   失败回滚，AI 用它不可能把仓库改坏。
6. **双受众分离的入口制度**：开发 AI（进仓库改代码）走 `AGENTS.md`，只放在
   真实子项目边界（包/服务/工具目录/产品模块/根），不逐小模块滥建；
   产品用户 AI（操作 Studio 等工具）走稳定自描述接口，不依赖仓库文件。
7. **术语处处一致**：同一概念全仓库同名（sceneId / artKey / 稳定 ID）。
   改名必须全局改，不留同义词；确因兼容无法改的契约名，必须在术语表里
   显式登记映射与冻结原因。
8. **可操作接口的安全底线**：即使是本地开发工具也要输入校验、破坏性操作
   显式标注、仅绑定 localhost、操作留痕；暴露面升级（远程/多用户）时同步
   升级权限隔离与确认机制。
9. **语义化 UI**：Web UI 用语义 HTML/ARIA，让视觉代理、浏览器自动化与
   辅助技术读到稳定语义树，不做只有像素坐标能操作的界面。

## 惯性维持（这条最容易丢）

- 每个新功能的验收清单必须包含"AI 与人类都便于理解"检查：新表面有入口文件或
  自描述接口吗？新概念沿用既有术语吗？新状态有文本真相吗？
- Code review / grok 任务书里把上述检查写成显式条目。
- 每季度跑一次全表面冷启动测试抽查（用一个全新 AI 会话实测）。

## 现状与差距（2026-07-19）

已经做对的：Ink 文本剧情、TS manifest、CSV/JSON 台账、保存闸门、NDJSON 流式
任务日志、五个子项目边界的 AGENTS.md 入口、Studio 自描述端点与首次冷启动
实测（改 speaker 闭环）。v2 修订后的缺口：describe 迁移为标准 OpenAPI 3.1
（同一注册表生成）、五类任务冷启动复测、localhost 绑定与输入校验核查、
术语统一执行（bgm/bed 双轨清理）。
