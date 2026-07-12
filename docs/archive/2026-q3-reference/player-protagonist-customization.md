---
id: REF-PLAYER-PROTAGONIST-CUSTOMIZATION
title: Player Protagonist Customization (Discussion)
type: archive
status: archived
canonical: false
owner: human
created: 2026-07-10
last_reviewed: 2026-07-12
domain: architecture
tags:
  - character-customization
  - image-gen
  - ai
  - monetization
  - supaluv
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
  - REF-AI-CONSTRAINED-BRANCH
  - REF-CO-PLAY-INVITE-SESSION
  - POLICY-PROJECT-BEST-PRACTICE
archive_reason: The discussion was resolved by ADR-0005 and SPEC-0002.
---

# 玩家自定义双主角（讨论稿，今日不实现）

This is a **product + AI-asset pipeline discussion**, not an implementation plan
and not an accepted ADR. Do not ship public free image gen from this file alone.

## 1. 创意（有没有意思？）

**有意思，而且是「影游 + AI」里真正差异化的一块。**

玩家不只是点选项，还能把**两位主角**变成「像自己 / 恶搞朋友 / 自己脑补的样子」，
同时**名字也能改**。整局故事仍是作者骨架，但屏幕上是「我的苏明 / 我的林晓棠」。

| 体验点 | 说明 |
| --- | --- |
| 可改对象 | **仅两位主角**：程序员男主（苏明）、女主（林晓棠） |
| 不可改（现阶段） | 周鹿等配角 / NPC — 暂不开放，避免范围爆炸与风格失控 |
| 外形 | 不是传统滑条捏脸，而是 **AI 生图 / 改图** |
| 输入 | 上传照片 **或** 文字描述（或两者） |
| 风格锁 | 玩家输入 **叠在** 产品锁定的美术基础提示词上，保证全剧统一 |
| 表情包 | 先定一张正面主图 → 再批量生成 ~N 个 mood / 动作，整套替换立绘 |
| 名字 | 对白名牌、存档摘要、分享卡等走 **显示名映射**，Ink 内可仍用逻辑 ID |
| 收费 | 可免费额度 / 可按次 / 可订阅 — **后议**；先验证可玩性 |

**为什么牛：**

- 传统 VN 捏脸库是有限 combos；这里是 **有限角色位 × 无限包装**（受安全与风格约束）。
- 与现有 **character lock 包**（`packages/content/characters/**`：base ref + mood map）同构，只是把「作者锁」扩成「作者风格锁 + 玩家身份层」。
- 和 constrained AI 旁支同一哲学：**作者控骨架，AI 控包装**。

## 2. 不是什么

| 不是 | 原因 |
| --- | --- |
| 全角色开放捏脸 | 配角一开，资产与审核成本失控；本阶段只双主角 |
| 无风格自由写实/二次元乱切 | 全剧 CG、背景、立绘会「一桌人几个画风」 |
| 开放色情换装生成器 | 产品红线；提示词与审核必须挡 |
| 改剧本人设内核 | 可改长相与显示名，不改主线因果与作者意图 |
| 在客户端直连生图厂商 | 必须走 SwimmerAIKit + 产品边沿服务，密钥与审核在服务端 |

## 3. 与现有资产管线的关系

当前作者侧已有模式（以苏明为例）：

```text
base ref（脸+服装）
  -> image_edit 只改表情 / 微姿态
  -> chroma key
  -> public/assets/portraits/<id>-<mood>.png
```

玩家自定义应 **复用同一管线**，只是把 `base ref` 从「官方 base」换成「玩家生成的官方风格 base」：

```text
[产品] style lock + character slot template（半身、品红底、镜头、服装默认…）
     +
[玩家] 照片 ref 和/或 文字描述（外貌意图层）
     →
[AI 生图模型] 产出 player-base（一张正面/3/4 主图）
     →
[AI 改图 / 批处理] mood 矩阵（约 10–20：羞、慌、空、烦、欲、僵、决…）
     →
[运行时] portrait pack 挂到 suming / lin_xiaotang 槽位
     + displayName 覆盖
```

全局美术风格未最终锁定时（写实 / 半写实 / 动漫 / 某统一画风）：

- **只改 style lock 模板与官方默认包**，不要改「双主角可替换」的产品合同。
- 玩家历史自定义包在大换皮后可能需 **一键按新风格重生**（研究项）。

## 4. 运行时合同（概念）

### 4.1 逻辑 ID vs 显示

| 层 | 例子 | 谁拥有 |
| --- | --- | --- |
| 逻辑角色 ID | `suming`, `lin_xiaotang` | 内容 / registry，永不因玩家改名而变 |
| 默认显示名 | 苏明、林晓棠 | 内容包 |
| 玩家显示名 | 「阿飞」「我室友」 | 本地或账号档案 |
| 默认 portrait stem | `suming-shame` | 内容包 |
| 玩家 portrait pack | `userPacks/<packId>/suming-shame.png` … | 生成结果存储 |

Ink 对白里的 speaker 可继续写逻辑名或默认中文名；**UI 名牌**在渲染前做 `displayName` 替换。
这样剧本可移植，不因玩家改名碎掉。

### 4.2 可替换槽位（仅此二）

| Slot | 默认角色 | 可替换 |
| --- | --- | --- |
| male_lead | 苏明 | 外形 pack + 显示名 |
| female_lead | 林晓棠 | 外形 pack + 显示名 |
| 其他 | 周鹿等 | **否**（本阶段） |

### 4.3 Mood / 动作集合

与现有 mood map 对齐，玩家 pack 必须 **齐套** 才启用替换，否则回退官方：

- 最少集：与当前 `suming` mood 表同构（shame / panic / lonely / …）。
- 目标集：约 **10–20** 表情/微动作（产品定表，玩家不可自创 mood key）。
- 缺图策略：该 mood 回退官方，或整包不可用直到补全（推荐：**生成流水线必须齐套才 commit**）。

## 5. AI 放置（与 co-play / AI 旁支一致）

| 能力 | 放哪 | 说明 |
| --- | --- | --- |
| 文生图 / 图生图 / 表情衍生 | **产品边沿服务** + **SwimmerAIKit**（可切生图模型） | 密钥、预算、审核在服务端 |
| 风格锁与 prompt 模板 | 产品仓库（可版本化） | 不进客户端明文「可被改成黄游」的裸提示 |
| 玩家 pack 存储 | 本地 demo 可先 local；正式 → 对象存储 + 账号 | 与 SwimmerCore 身份挂钩时再上 |
| 计费次数 | 与 B8 同一计量思想 | 生一套 pack 比一次文本旁支贵，要单独 SKU |
| 对白 AI 旁支 | 现有 `services/ai-branch` | **不要**和生图流水线搅成一个巨服务；可同仓不同 handler |

模型切换（文本 Flash vs 生图模型）是 **SwimmerAIKit adapter 配置问题**，不是产品里写死厂商 SDK。

## 6. 安全与产品红线（必须写进以后 spec）

- 上传图：人脸/未成年人检测、NSFW、暴力 — 失败则拒生成。
- 输出图：二次审核；品红底/半身/服装默认等约束降低「脱衣」自由度。
- 禁止把自定义做成 **用户提示色情生成器**；描述词过滤 + 模板覆盖。
- 恶搞朋友：产品文案可提示「请勿未经同意使用他人肖像」——法务文案后补。
- 公共分享卡：若带自定义脸，需考虑默认用水印/仅本地。

## 6.5 未决张力：玩家换脸 vs 预渲染视频（后面再拍板）

**问题：** 影游会用**预先生成的视频/CG 镜头**。镜头里若出现男女主角正脸/全身，
玩家自定义了立绘之后，**视频里仍是官方脸** → 违和。

**不能默认走的路：** 按每个玩家的脸把全部视频重渲一遍 — **成本与延迟对玩家过高**，
也不可运营。

| 候选方向（均未选型） | 利 | 弊 |
| --- | --- | --- |
| A. 预渲染视频里**永远不出**双主角正脸/可辨认全身 | 一套视频服务所有人；换脸零冲突 | 分镜/编剧很难：关键情感戏常要给主角脸 |
| B. **弱化或砍掉**强依赖正脸的预渲染视频，改静帧 + 立绘 + 短特效 | 与换脸天然兼容 | 牺牲「影游大片感」 |
| C. 视频只拍 **环境 / 配角 / 物件 / 主观镜头 / 背影剪影** | 仍有电影感 | 仍限制导演语言 |
| D. 仅官方脸路径用视频；开启自定义后**降级**为静帧分镜 | 两套体验可并存 | 实现与测试分叉；沟通成本 |
| E. 实时/半实时换脸进视频（deepfake 管线） | 理论上完美 | 贵、慢、审核与伦理重；**非当前阶段** |
| F. 产品二选一战略：要么主打换脸、要么主打全片预渲染正脸 | 决策清晰 | 牺牲另一侧卖点 |

**当前态度（owner）：**

- 这是**真问题**，不是实现细节。
- **后面再商量**：是保「可改主角」创意，还是保「正脸预渲染大片」，或找中间态。
- **今天不定案**；实现换脸或大上视频管线前，必须先写 ADR 选型。
- Demo 阶段：现有 Event CG / 视频可继续用官方脸；与 E 档自定义解耦，互不阻塞。

## 7. 趣味与商业（草图）

| 玩法 | 说明 |
| --- | --- |
| 代入 | 男主长得像我，女主像想象中的对象 |
| 恶搞 | 朋友脸进悲剧程序员 | 局后截图传播 |
| 二周目换皮 | 同一故事不同「演员」 |
| 与 co-play | 同玩时是否同步自定义 pack — **另议**（带宽与隐私）；第一版可仅 host 自定义 |

收费后议，可能方向：

- 每套完整 pack 按次；
- 会员每月 N 套；
- 仅改名免费、生图收费。

## 8. 解耦与实现顺序（将来，勿提前大重构）

1. **显示名映射**（零生图）：设置里改双主角名字，对白名牌生效。
2. **Portrait pack 槽位**：运行时按 slot 解析路径，官方为 default pack。
3. **官方 mood 齐套** 作为模板合同（C13 林/周 mood 仍是作者资产，与玩家 pack 无关）。
4. **边沿：base 生成 + mood 批处理** spike（非公开）。
5. **审核 + 计量** 后再谈公网开关。
6. 与 co-play / 分享卡 的交叉最后做。

原则：**一项一项加**；改名、换包、生图流水线三个模块可独立合并。

## 9. 进度（2026-07）

| 步 | 状态 |
| --- | --- |
| 1 显示名映射 | **done** — `apps/web/src/persistence/displayNames.ts` + 设定 UI |
| 2 Portrait pack 槽位 | 未做 |
| 3–6 生图 / 审核 | 未做；视频正脸 ADR 仍 open |

## 10. 明确不做（生图前）

- 不接生图 API、不改 registry 为玩家包
- 不开放配角自定义
- 不在客户端堆传统捏脸骨骼
- 不定「换脸 vs 正脸视频」ADR
- 不把本讨论当成已承诺上线功能

## 10. 与路线图编号

见 `docs/reference/execution/feature-status-and-roadmap.md` **E 档**（E19–E23；视频张力记在讨论稿 §6.5）。

## Related

- Character locks: `packages/content/characters/**`
- Runtime registry: `packages/content/characters/registry.ts`
- AI branch contract: `docs/reference/architecture/ai-constrained-branch.md`
- Co-play discussion: `docs/reference/architecture/co-play-invite-session.md`
- Chapter-end global choice stats: `docs/reference/architecture/chapter-end-global-choice-stats.md`
