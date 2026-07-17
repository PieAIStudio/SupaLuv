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

## Amendment 2026-07-18：立绘上台标准（staging contract）

Owner 指出立绘外包了一圈"卡片"（边框+底板+投影），不合视觉小说惯例。定标准如下，
资产侧与运行时侧都必须遵守：

**资产侧（进三账的立绘 PNG）**

1. 绿幕抠像后的透明底 PNG（`tools/portrait-matte/` 管线），832×1248，2:3 半身。
2. 头顶留白约 7-12%（脸落在图内上三分之一）；裁切线在胸口下方。
3. 边缘干净无绿渗；穿透部位（发丝间隙）保留真实透明。

**运行时侧（`apps/web/src/styles/stage.css` `.portrait-image`）**

1. 立绘是**直接合成进场景的角色**，不是 UI 元素：禁止 border、border-radius、
   背景底板、box-shadow。分离感只允许用跟随人物剪影的 `filter: drop-shadow`。
2. 立绘底边锚定舞台底部，下半身藏在对话框后面（对话框 z-index 高于立绘），
   胸口裁切线因此不可见；小舞台（高度 <470px 容器查询档）回退为悬浮半身
   加底部 mask 渐隐。
3. 说话者全亮，非说话者压暗缩小（is-dim），不用边框或标签区分。
4. 立绘旁不放浮动人名标签；说话者名由对话框铭牌承担。

机器强制：`tests/e2e/visual-contract.spec.ts` 断言 `.portrait-image` 计算样式
无 border/背景/圆角/box-shadow，违反即测试失败。后续 AI 修改舞台样式前先读本节。
