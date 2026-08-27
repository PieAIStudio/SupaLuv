---
id: ADR-0001
title: Web-first React and Ink baseline; PixiVN deferred
type: decision
status: accepted
canonical: true
owner: human
created: 2026-05-13
last_reviewed: 2026-07-12
domain: architecture
tags:
  - supaluv
  - architecture
  - engine-choice
  - ai-branching
pinned: true
related:
  - POLICY-PROJECT-BEST-PRACTICE
  - ADR-0005
  - REF-CURRENT-WORK
supersedes: []
superseded_by: null
---

# ADR-0001: Web-first React and Ink baseline; PixiVN deferred

## Context

SupaLuv 已用 Web 技术完成可部署、可游玩的产品闭环。早期方案曾把 PixiVN、人物视频和
“以后再接入服务端 AI”列为候选；实际实现证明 React + Ink 足以承载当前视觉小说舞台，
人物固定面孔视频又与玩家生成角色身份冲突，而运行时 AI 已成为正式能力。

继续把已落地架构写成“待讨论假设”，会诱导后续开发重复选型甚至推倒有效实现。

## Decision

- 使用 React、Vite、TypeScript 作为 Web 应用和表现层基线。
- 使用 Ink / InkJS 作为人类作者主线剧情格式和运行时桥梁。
- 场景清单承载背景、立绘、音频、镜头提示和 AI 权限，不把这些职责塞进原始小说文本。
- AI 调用通过产品服务端、SwimmerAIKit 和 SwimmerBackend 边界完成，不让浏览器直连密钥。
- 当前不引入 PixiVN、Unity、Godot、Ren'Py 或自研叙事引擎。
- 不以包含主要人物固定面孔的预渲染视频作为产品路径；采用可定制立绘与静态电影化演出。
- Web 优先。桌面、移动端或商店包装只在内容与 Web 留存得到验证后推进。

## Consequences

- 新章节复用同一 Ink、场景清单和应用外壳，不按章节重新选引擎。
- React 表现层只有在出现可测量的性能或演出瓶颈时，才开启独立技术验证；“看起来更像游戏”
  不是增加渲染引擎的充分理由。
- 故事和元数据继续保持可移植，但迁移能力是保险，不是当前开发目标。
- 早期 PixiVN/视频讨论保留在 archive，仅作历史证据，不再参与默认决策。

## Revisit triggers

只有满足至少一项可验证条件时才重新评估引擎：

- React DOM 无法在目标设备稳定达到已定义的帧率或内存指标；
- 正式内容需要当前架构无法合理实现的复杂 2D 场景、骨骼动画或物理交互；
- 已确定的平台发行要求无法由现有 Web 包装满足。

重新评估必须用可运行 spike 和测量结果比较迁移成本，不以框架流行度替代证据。
