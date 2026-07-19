---
id: ADR-0008
title: AI-native multilingual localization — translation and dubbing at scale
type: decision
status: accepted
canonical: true
owner: human
created: 2026-07-19
last_reviewed: 2026-07-19
domain: product
tags:
  - supaluv
  - localization
  - voice
  - ai-pipeline
  - differentiation
pinned: true
related:
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: null
---

# ADR-0008: AI 原生多语言本地化——翻译与配音全部由 AI 完成

## Status

Accepted（owner 2026-07-19 拍板）。

## Decision

SupaLuv 的多语言本地化（文本翻译 + 全角色配音）**全部由 AI 管线完成**，
目标覆盖玩家群体最大的 8–10 种语言。英文配音**必须做**，不采用
"原声配音 + 外语字幕"的传统日式出海惯例。

理由：传统工作室做十国配音需要十套录音班底，成本使中小团队根本不做；
AI 管线下每种新语言只是"一份翻译 + 一张选角表 + 一次批量生成"。
这是 AI 原生工作室相对传统游戏的结构性差异点，属于产品护城河，不是
可选优化。

## Consequences

1. 本地化是**管线资产**：翻译风格指南、各语言选角表、预生成语音库都入库、
   有溯源（POLICY-AI-ASSET-PROVENANCE）、可再生成。
2. 剧本翻译必须保持 Ink 结构不变（只译展示文本，不动逻辑/divert/标签），
   使同一剧情拓扑服务所有语言。
3. 语音键契约已含 language 维度（character, language, text-hash），预生成
   语音库天然按语言扩展。
4. 服务端已是双供应商语音路由（中文 MiniMax / 西语 ElevenLabs）；每种语言
   需要真实的按角色选角表，占位的"全员同声"不可发布。
5. 喜剧语气翻译质量是创作问题：每种语言需要风格指南与抽检，不能只靠
   机器直译（ADR-0004 的黑色幽默基调必须在译文里存活）。
6. 分期：EN 是第一个非中文语言（P0 翻译 → P1 选角+语音库）；管线跑通后
   按玩家规模排后续语言。

## Alternatives considered

- **原声 + 字幕（日式惯例）**：省成本，但放弃了 AI 原生的核心差异点，
  且黑色幽默强依赖台词表演。Rejected by owner。
- **真人配音**：质量上限高但成本结构回到传统工作室，与产品形态矛盾。Rejected。
