---
id: PLAN-0005
title: Draft chapters productization
type: plan
status: active
canonical: true
owner: ai-assisted
created: 2026-07-12
last_reviewed: 2026-07-14
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
- [x] 交付本地 Creator Studio：React Flow + Dagre + CodeMirror + 安全保存事务。
- [x] 交付 Player Path：探索遮罩、已走节点/边、回看与剧透裁剪。
- [x] 交付资源清单、首图 decode 门闩、下一可达节点预取和原子转场。
- [x] 优化标题、角色工作室与首幕关键图片的尺寸/格式/加载优先级。
- [x] 交付完整 loading composition 与 `vite:preloadError` 恢复。
- [x] 交付“情绪样本标注”小游戏并接入剧情变量与无障碍输入。
- [x] 交付中英玩家界面、运行时 toast、分享卡和选角长文案溢出修复。
- [x] 统一 co-play 深层 overlay 的中英界面文案与状态反馈；中途加入重播当前剧情帧，系统菜单层级与双标签验收补齐。
- [x] 交付协议、测试仪表、看房热点和手机问卷等剧情内互动。
- [x] 交付算法羞耻档案，并与玩家路径和回看关联。

### Stage 3 · Art, audio, and content polish

- [ ] 为两章制作并登记背景、道具 UI、NPC/主角情绪立绘和授权/hash。
- [x] 修复苏明 6 张残留洋红底的立绘，并增加透明蒙版像素门禁与舞台截图回归。
- [ ] 配置核心角色 TTS，完成雷欧中英路由、取消、跳过和混音 ducking。
- [ ] 配置 sequence 级 BGM、ambient 和 SFX，移除错用旧 Demo 音画。
- [x] 商品化选角与窄屏菜单：上传控件本地化、移动横屏可达性和清晰视觉层级。
- [ ] 校准长文本节拍、镜头变化、选项回响和小游戏出现频率。

### Stage 4 · Verification and release

- [x] 第一轮技术/视觉 playtest：加载、裁切、地图、选角和卡住点；内容节奏 critic 仍待正式稿。
- [ ] 修复后独立 critic pass，并保存对应 after evidence。
- [ ] 第二轮 playtest：选择感、视听、地图、存档与失败恢复。
- [x] 跑本轮完整 release ladder（格式、lint、资产、类型、384 个单测、24 个 E2E、构建和 Vercel 输出）。
- [ ] Production 最小试玩（真实 AI、审核、钱包和存储）仍需发布门单独验收。
- [ ] 更新 SSOT；完成后归档计划/规格并清理所有分支/worktree。

## Round 6 evidence

四个并行包已合入 `main`：Creator Studio、Player Path、portrait matte、casting/mobile polish。
合并提交为 `97957a8`、`9c7c4b9`、`60efd33`、`4810116`；主线完整 E2E 已通过 18/18。
这些是执行证据，不替代真实 Preview/Production 的 AI、审核、钱包和存储验收。

## Round 7 evidence

`f0292fb` 合入中英玩家界面覆盖和运行时 toast 本地化；主线完整 E2E 为 20/20，单测为 368/368。
英文选角页的长边界提示已通过截图与横向溢出断言复验。co-play 深层 overlay 尚未纳入本轮，
真实服务验收仍以 Preview/Production 最小链路为准。

## Round 8 evidence

`6587da7` 合入 co-play 深层 overlay 商品化：Banner、光标和 RPS 冲突层统一中英显示，稳定
`rock/paper/scissors` 协议值与显示文案分离，全球回声旧协议只在显示层翻译；打开系统菜单时
提升层级，避免对白层挡住菜单；客人中途加入会收到主机最近剧情帧。主线回归为 371/371 单测、
21/21 E2E，含双标签截图与无横向溢出检查。随后 `79b750b` 修复同玩状态条与短提示遮挡，
并以 Production 浏览器坐标测量确认 `overlap=false`。真实服务仍按发布门单独复验。

## Round 9 evidence

四个剧情互动与算法羞耻档案在隔离 worktree 中实现并通过完整回归。Ink 仍是拓扑 SSOT，新增互动均可跳过并回到作者
主线；画廊档案使用可选存档字段兼容旧版本。验收中特别补充了三轮条码连扫浏览器实玩，并修复中间反馈状态导致的
点击锁死。验证结果为 384/384 单测、24/24 E2E、lint、格式检查和 `git diff --check` 通过；本轮未触碰共享库、密钥、
部署或支付。

## Release gates

- 每个并行工作包独占 worktree、文件集和验证路径；失败不得污染 `main`。
- 共享库改动必须有目标仓库证据；本阶段无证据时保持 SwimmerAIKit、SwimmerCore、
  SwimmerUIKit 现状，不顺手升级。
- 部署、secret、云数据库、钱包和 package 发布由总监保留，不下放给执行者。
- 每个合并批次先读完整 diff，再亲自重跑对应验证；报告不是验收证据。

## Closeout

完成后把本计划与 `SPEC-0003` 移入 completed，并在 `current-work.md` 只保留最终状态与下一步。
