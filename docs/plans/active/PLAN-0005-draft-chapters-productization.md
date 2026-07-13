---
id: PLAN-0005
title: Draft chapters productization
type: plan
status: active
canonical: true
owner: ai-assisted
created: 2026-07-12
last_reviewed: 2026-07-13
domain: execution
tags:
  - narrative
  - story-studio
  - playtest
pinned: true
related:
  - SPEC-0003
  - REF-CURRENT-WORK
---

# PLAN-0005: Draft chapters productization

## Goal

以 `SPEC-0003` 为冻结规格，把两章草稿替换为可玩的默认内容，同时交付共享剧情图、
游戏式加载、首个剧情小游戏和每轮真实试玩证据。

## Dependency map

### Stage 0 · Baseline and specification

- [x] 核对本地/远端 branch、worktree、候选报告和干净状态。
- [x] 审读两章草稿、当前内容管线、故事图、存档和加载代码。
- [x] 真实试玩 Production，保存首屏、标题、加载和章节首幕证据。
- [x] 研究成熟图编辑、文本编辑、布局、小游戏和预加载方案。
- [x] 冻结 `SPEC-0003`。

### Stage 1 · Content foundation (serial)

- [x] 固化两份 source snapshot、hash 和 coverage ledger schema。
- [x] 退休旧 Demo 默认故事与冲突人物/事件引用，并给旧存档明确提示。
- [x] 通用化 story catalog、chapter checkpoint、runner 和跨章存档。
- [x] 完整编写第一章 Ink、scene manifest 与来源覆盖映射。
- [x] 完整编写第二章 Ink、scene manifest 与来源覆盖映射。
- [x] 注册陈佳、雷欧、石佩欣及所需 NPC/声线稳定 ID。
- [x] 建来源覆盖、图可达性、manifest 对齐、章间变量与旧 ID 清理测试。
- [x] 用占位资产跑通两章至少两条差异路径。

### Stage 2 · Parallel product lanes (after Stage 1)

- [x] 建 `NarrativeGraph` 适配层与 fixture 回归测试。
- [ ] 交付本地 Creator Studio：React Flow + Dagre + CodeMirror + 安全保存事务。
- [ ] 交付 Player Path：探索遮罩、已走节点/边、回看与剧透裁剪。
- [x] 交付资源清单、首图 decode 门闩、下一可达节点预取和原子转场。
- [ ] 优化标题、角色工作室与首幕关键图片的尺寸/格式/加载优先级。
- [x] 交付完整 loading composition 与 `vite:preloadError` 恢复。
- [x] 交付“情绪样本标注”小游戏并接入剧情变量与无障碍输入。
- [ ] 交付协议、测试仪表、看房热点和手机问卷等剧情内互动。
- [ ] 交付算法羞耻档案，并与玩家路径和回看关联。

### Stage 3 · Art, audio, and content polish

- [ ] 为两章制作并登记背景、道具 UI、NPC/主角情绪立绘和授权/hash。
- [ ] 修复苏明 6 张残留洋红底的立绘，并增加透明蒙版像素门禁与舞台截图回归。
- [ ] 配置核心角色 TTS，完成雷欧中英路由、取消、跳过和混音 ducking。
- [ ] 配置 sequence 级 BGM、ambient 和 SFX，移除错用旧 Demo 音画。
- [ ] 校准长文本节拍、镜头变化、选项回响和小游戏出现频率。

### Stage 4 · Verification and release

- [ ] 第一轮 playtest：来源遗漏、节奏、加载、裁切和卡住点。
- [ ] 修复后独立 critic pass，并保存对应 after evidence。
- [ ] 第二轮 playtest：选择感、视听、地图、存档与失败恢复。
- [ ] 跑完整 release ladder 与 Production 最小试玩。
- [ ] 更新 SSOT；完成后归档计划/规格并清理所有分支/worktree。

## Release gates

- 每个并行工作包独占 worktree、文件集和验证路径；失败不得污染 `main`。
- 共享库改动必须有目标仓库证据；本阶段无证据时保持 SwimmerAIKit、SwimmerCore、
  SwimmerUIKit 现状，不顺手升级。
- 部署、secret、云数据库、钱包和 package 发布由总监保留，不下放给执行者。
- 每个合并批次先读完整 diff，再亲自重跑对应验证；报告不是验收证据。

## Closeout

完成后把本计划与 `SPEC-0003` 移入 completed，并在 `current-work.md` 只保留最终状态与下一步。
