---
id: PLAN-0005
title: Draft chapters productization
type: plan
status: active
canonical: true
owner: ai-assisted
created: 2026-07-12
last_reviewed: 2026-07-22
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

以 `SPEC-0003` 为冻结规格，把当前三章草稿替换为可玩的默认内容，同时交付共享剧情图、
游戏式加载、首个剧情小游戏和每轮真实试玩证据。

## Dependency map

### Stage 0 · Baseline and specification

- [x] 核对本地/远端 branch、worktree、候选报告和干净状态。
- [x] 审读两章草稿、当前内容管线、故事图、存档和加载代码。
- [x] 真实试玩 Production，保存首屏、标题、加载和章节首幕证据。
- [x] 研究成熟图编辑、文本编辑、布局、小游戏和预加载方案。
- [x] 冻结 `SPEC-0003`。

### Stage 1 · Content foundation (serial)

- [x] 固化三份 source snapshot、hash、reviewed override 与 coverage digest schema。
- [x] 退休旧 Demo 默认故事与冲突人物/事件引用，并给旧存档明确提示。
- [x] 通用化 story catalog、chapter checkpoint、runner 和跨章存档。
- [x] 完整编写第一章 Ink、scene manifest 与来源覆盖映射。
- [x] 完整编写第二章 Ink、scene manifest 与来源覆盖映射。
- [x] 完整注册第三章 Ink、scene manifest、英文轨与来源覆盖映射。
- [x] 交付三章双语运行时保真闸门，拒绝 dead Ink 文本与漂移 adaptation receipt 伪造。
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

- [x] 冻结 Round 15 演出圣经：13 个 sequence、8 个回响槽、视觉 shot/mood/prop 表、分层音频与正文语音经济。
- [ ] 为三章制作并登记背景、道具 UI、NPC/主角情绪立绘和授权/hash。
- [x] 修复苏明 6 张残留洋红底的立绘，并增加透明蒙版像素门禁与舞台截图回归。
- [ ] 配置核心角色 TTS，完成雷欧中英路由、取消、跳过和混音 ducking（双语静态库与离线选角已完成；英文实时 TTS 路由及发布抽检未关闭）。
- [ ] 配置 sequence 级 BGM、ambient 和 SFX，移除错用旧 Demo 音画。
- [x] 商品化选角与窄屏菜单：上传控件本地化、移动横屏可达性和清晰视觉层级。
- [ ] 校准长文本节拍、镜头变化、选项回响和小游戏出现频率。
- [ ] 在第 4–18 章批量大资产生成前，由 owner 决定对象存储/CDN 的 URL、hash、缓存、回滚与构建校验契约并立 ADR。
- [ ] 为历史语音补正式 legacy exception 或可证明的迁移记录；禁止为缺失历史信息补造 prompt。

### Stage 4 · Verification and release

- [x] 第一轮技术/视觉 playtest：加载、裁切、地图、选角和卡住点；内容节奏 critic 仍待正式稿。
- [ ] 修复后独立 critic pass，并保存对应 after evidence。
- [ ] 第二轮 playtest：选择感、视听、地图、存档与失败恢复。
- [x] 截至 Round 14 的最新组合态 release ladder：格式、lint、资产 intake、类型、514 个单测、29 个 E2E、构建、Vercel Services 输出和治理检查通过。
- [ ] Production 最小试玩（真实 AI、审核、钱包和存储）仍需发布门单独验收。
- [ ] **blocked：缺第四章草稿**；收到后执行 ≤5 工作日、owner ≤1 决策日的双语有声章节计时演习。
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

## Round 14 evidence

四个候选经独立对抗审计与定向返工后合入：内容 adaptation receipt 防注释/控制语句/重叠切片
伪造；选择统计只展示诚实的本地演示数据；对白语音守卫阻止设置往返和音量变化重复合成；
正式资产门从运行时/角色/档案真源反推 41 个生产 blocker，并要求本地哈希 evidence，不能靠
manifest 自证 `resolved`。组合态额外修复两处 lint、六个格式问题和过宽 E2E route mock。
最终证据：83 个测试文件、514 个单测、29/29 E2E、普通构建、Vercel Services 输出合同、
`docs:check` 与 `git diff --check` 全部通过；正式资产仍按设计阻断，不等于 Stage 3 完成。

## Round 15 evidence

2026-07-22 完成“当前三章内容管线就绪”收口：`story-catalog.json` 成为章节、双语标签、
能力、语音语言与文件名的目录 SSOT；所有生产章节通过冷加载注册测试，资产审计也从该目录
反推范围。来源覆盖拆成 434 条派生 ledger 与 117 条带 `sourceHash` 的 reviewed override，
digest v2 覆盖完整 adaptation receipt；双语 fidelity gate 用 Ink 实际输出 witness 验证原稿、
可达 scene、choice 与 terminal，dead branch 对抗测试证明“源码里出现过”不能冒充玩家可见。
终审又抓出两条重复原文错图并修正，新增 literal occurrence 容量与原稿邻接约束，防止多个
source occurrence 复用同一 witness 或在多个候选 scene 中选错语境。

语音工具改为只读计划或显式全局 `--sync`，付费模式需要预期缺失数、绑定文本/选角/volume/
完整 MP3 hash 与元数据/孤儿/catalog/账本/provenance/历史债摘要的具体计划 digest 和最高预算；
写入会同步维护 MP3、账本、逐字 provenance、历史债摘要与 catalog，以 catalog 激活为提交点并
在普通失败时回滚整组资产。回归测试覆盖无参数拒绝、计划只读、菜单指纹、binary/digest 漂移、
scoped sync 拒绝、事务故障注入与零成本同步。安全同步零 API 调用清理 2 个孤儿并保留 288 条
双语静态语音。本轮新增 2 条生成语音已登记 hash 与逐资产溯源；其余 286 条历史债只做不可增长/
不可漂移的摘要冻结，不冒充正式 provenance。分析 helper 保证成功一次、blocked/throw 零次，App 的
new/resume/advance/manual load 四类路径均已接线；注册逻辑不再暗赠电池。以上是管线就绪，
不代表第四章吞吐演习、正式小说、正式视听、独立 critic、生产 PostHog 证据或 Production
发布门已经完成。

## Release gates

- 每个并行工作包独占 worktree、文件集和验证路径；失败不得污染 `main`。
- 共享库改动必须有目标仓库证据；本阶段无证据时保持 SwimmerAIKit、`@pieai/swimmer-backend-client`、
  SwimmerUIKit 现状，不顺手升级。
- 部署、secret、云数据库、钱包和 package 发布由总监保留，不下放给执行者。
- 每个合并批次先读完整 diff，再亲自重跑对应验证；报告不是验收证据。

## Closeout

完成后把本计划与 `SPEC-0003` 移入 completed，并在 `current-work.md` 只保留最终状态与下一步。
