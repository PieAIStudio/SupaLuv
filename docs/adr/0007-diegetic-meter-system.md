---
id: ADR-0007
title: Diegetic meter system — 体面 vs 情感评分
type: decision
status: accepted
canonical: true
owner: agent
created: 2026-07-17
last_reviewed: 2026-07-17
domain: product
tags:
  - supaluv
  - game-design
  - meters
  - ink
  - hud
pinned: false
related:
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: null
---

# ADR-0007: 叙事内数值系统——体面 vs 情感评分

## Status

Accepted（owner 授权 agent 设计，2026-07-17）。

## Context

现状：dignity/impulse 两条 0-100 计量在 HUD 常驻，三章共 144 处写入、**0 处条件判断**——
数值在动但纯装饰，玩家的选择不留可见痕迹。且"尊严/冲动"是心理学抽象轴，
与本作"成人黑色幽默：系统把感情量化成绩效"的喜剧引擎不同构。

## Decision

### 1. 双计语义重定（保留双计结构，换语义）

| 计 | VAR | 语义 | 归属视角 |
| --- | --- | --- | --- |
| **体面** | `mianzi`（替换 dignity） | 人类世界怎么看他：在老板娘、前女友、邻居面前还剩多少脸 | 人间 |
| **情感评分** | `ai_score`（替换 impulse） | 平台/机器人系统给他的"情感真实度"绩效分 | 系统 |

**耦合律（黑色幽默主旨的机制化）**：越取悦系统的选择（配合问卷、交出隐私、按协议表演亲密），
`ai_score` 越高、`mianzi` 越低；维护人的体面（嘴硬、拒绝、隐瞒）反之。**两头都想要是做不到的**，
这个不可能三角就是每个选择点的张力来源。少数稀有选项允许双升/双降（写进作弊感/灾难感场景）。

### 2. 系统播报（评分的可见化，零新 UI）

`ai_score` 的关键变动由**系统自己用画外音宣布**（纯 Ink 文本行，样式沿用现有旁白）：

> 【系统】情感真实度 +5。该数据已同步至企业后台。祝您今天也保持真诚。

播报本身就是笑点与惊悚点的复合体。`mianzi` 不播报——人间的脸面丢了没人给你发通知，
只会体现在 NPC 台词变化里（不对称呈现是刻意的）。

### 3. 阈值回响（每章 2-3 处硬性预算）

- `mianzi < 30`：人间 NPC 台词降格（老板娘开始送临期食品、雷欧不再借钱开始劝退租）
- `mianzi >= 70`：嘴硬路线专属台词（前台以为他是来投诉的领导）
- `ai_score >= 70`：机器人亲密度升级但更瘆人（开始引用他没说出口的心事）
- `ai_score < 30`：平台催办/降权（补贴短信变催办短信，问卷从请求变通牒）

每处阈值回响必须配单测断言；auto-player 的 dignity/impulse 人设改为 mianzi/ai_score 策略，
transcript 差异行数是回响密度的量化验收线。

### 4. 事实旗标不变

clue_*、态度选择记录（breakup_delivery 等）体系保持现状；本 ADR 只动两条计量。

## Consequences

- 三章 Ink 的 VAR 更名 + 写入语义复核（部分 impulse 写入要按新耦合律翻转）；HUD 标签、
  单测、auto-player 关键词表同步。18 章定稿（约 2026-08）前完成迁移，后续章节按新系统转换。
- novel-to-ink-script 技能的选择点设计规则更新为耦合律。
- AI 最终章（ADR-0005）可读取两计终值作为人设输入——"系统眼里的他"与"人间的他"
  的差值是结局分化的天然素材。
