---
id: PLAN-0003
title: Chapter 01 Polish Loops (Layout, Brand UI, Portraits, Prose)
type: plan
status: active
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-10
domain: implementation
tags:
  - supaluv
  - chapter-01
  - ui
  - portraits
  - narrative
related:
  - REF-CURRENT-WORK
  - SPEC-0001
---

# PLAN-0003: Chapter 01 Polish Loops

## Goal

把第 1 章 demo 从「能跑」提升到「界面不飘、品牌 UI 可用、立绘统一、可玩文本够厚、商业壳完整」。

## Scope Boundary

In:

- SupaLuv 本地布局 / 主题覆写 / 内容 / 立绘资产
- 场景 manifest + Ink 扩写
- 产品壳（标题 / 存档 / 设定 / 图鉴 / 历史 / 自动播放 / 键盘）
- AI/human-friendly 边界拆分（`views/play/*`、persistence、README）

Out:

- 改 SwimmerUIKit 共享组件源码（只覆写 token/class）
- 第 2–30 章正文
- 公开 runtime AI

## Loop Contract

每轮固定：

1. **目标**（本轮只解决什么）
2. **边界**（本轮绝不碰什么）
3. **次数上限**（失败则记录债务，不无限迭代）
4. **产出物**（文件 / 截图 / 测试）
5. **对比验收**（Before → After 可观察）

---

## Loop status

| Loop | 目标 | Status |
| --- | --- | --- |
| 1 布局与立绘槽 | 经典 VN 安全区；立绘不裁碎 | done |
| 2 影游深色主题 | Swimmer 本地覆写 | done |
| 3 人物锁定包 | 苏明同人多 mood | done（林/周基础包） |
| 4 小说→分支加厚 | densified Ink | done |
| 5 证据闭环 | unit/e2e | done（持续维护） |
| 6 商业壳 + 输入 | 历史/自动/键盘/设定同步 | done |
| 7 seam 重构 | PlayHud 等拆分 + 边界文档 | done |

## Loop 6 — 商业壳与输入（已完成）

| 项 | 内容 |
| --- | --- |
| 目标 | 历史回看、自动播放 continue、静音同步 settings、Space/Enter/Esc |
| 边界 | 不改 Ink 主剧情；不引入新引擎 |
| 产出 | `useDialogueLog`、`usePlayInput`、Settings autoPlay、e2e Esc |
| 验收 | 系统菜单可存档；AUTO 标记；键盘可推进；Esc 关菜单 |

## Loop 7 — AI/human-friendly seams（已完成）

| 项 | 内容 |
| --- | --- |
| 目标 | 降低 `VisualNovelPrototype` 职责；边界可推理 |
| 边界 | 行为保持；一次只拆 UI seam |
| 产出 | `views/play/{PlayHud,SystemMenu,DialoguePanel,PortraitStage,vnHelpers}`；`apps/web/README.md` 模块表；`current-work` 同步 |
| 验收 | 下一功能改 HUD 不必读整份 play orchestrator；unit 覆盖 helpers/save/settings |

## Loop 8 — 音频真正听得见 + residual UX（进行中 / 本轮）

| 项 | 内容 |
| --- | --- |
| 目标 | 修 BGM 解锁链路；主音量；历史持久化；解锁 toast；继续指示 |
| 边界 | 不作曲；继续用 Mixkit 免费床 |
| 产出 | `gameAudio` fade/duck/volume；Title 首次手势解锁；`useDialogueLog` localStorage |
| 验收 | 标题点击后可听见 soft-piano；进章后 night-ambient；支付 payment-chime |

## Residual (optional, not blocking)

- 林晓棠 / 周鹿多 mood 立绘
- 原创配乐替换 Mixkit（需 owner / 音乐人）
- 标题专用全动 CG 包
- 新导出立绘 chroma fringe 复查
- 第 2 章仅在 owner 交付正文后

## Execution Order

Loop1 → … → Loop7（已完成主路径）→ residual 按需

## Risks

- 立绘生成风格漂移 → 强制 base ref + image_edit
- 对话框内容过长 → 限高 + 节拍拆分
- Swimmer 权重 → 未分层本地 CSS 覆盖 `@layer swimmer-ui`
- 巨型 play 文件回潮 → 新 UI 只进 `views/play/*`
