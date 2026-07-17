---
id: ADR-0006
title: Dual-track art direction — 3D CG characters in photoreal environments
type: decision
status: accepted
canonical: true
owner: human
created: 2026-07-17
last_reviewed: 2026-07-17
domain: product
tags:
  - supaluv
  - art-direction
  - portraits
  - backgrounds
  - assets
pinned: true
related:
  - ADR-0004
  - ADR-0005
supersedes: []
superseded_by: null
---

# ADR-0006: 双轨美术方向——3D CG 角色活在写实环境里

## Status

Accepted（owner 2026-07-17 目选拍板）。

## Context

Round 16 做了 5 块同构图风格试板（写实摄影 / 绘画感写实 Arcane / 厚涂 / 轻水彩 /
2.5D 赛璐璐，`Temp/style-tiles-2026-07-17/`）。Owner 全部否决了人物侧方案，并给出
此前独立测试形成的美学基准：`Temp/基准美学/A.png` 及其身份套件（多视角、表情九宫格、
服装卡、prompt 模板）。

## Decision

1. **人物**：半写实风格化 3D 动画 CG（semi-realistic stylized 3D animated CG）。
   Matte simplified skin、grounded adult proportions、clean studio lighting。
   明确排除：photorealistic photography、anime、oil painting、fashion editorial。
   美学种子与 prompt 模板以 `Temp/基准美学/` 为准。
2. **环境**：写实质感（photoreal cinematic still，参照
   `Temp/style-tiles-2026-07-17/style-1-photoreal.png`）。
3. **合成律**：明显非真人的 3D 角色，活在现实质感的环境里。人物不写实化迁就背景，
   背景不卡通化迁就人物；用统一光源、匹配色温与接触阴影缝合。
4. 每个主要角色建立身份套件（character token + owner 目选定妆 + prompt 存档），
   定妆通过后锁脸，不许重绘。执行细则冻结在
   `.agents/skills/script-to-assets/`（SKILL.md 与 references/generation.md）。

## Consequences

- 现有写实系官方立绘（suming-base、zhou-neutral 等）属过渡资产，将由 3D CG 版
  按锁脸流程替换；替换前游戏照常可玩。
- 玩家上传真人照片的选角输出也必须落入 3D CG 人物风格（ADR-0005 的身份定制
  与本决定叠加：定制的是"这个人的 3D CG 化"，不是照片写实复刻）。
- 生成侧不得擅自漂移风格；风格重开需 owner 重新目选。
