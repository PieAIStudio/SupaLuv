---
id: REF-LEGACY-SUPER-LOVER-VN-TECH-DESIGN-2026-05
title: Legacy Super Lover VN Technical Design (2026-05)
type: archive
status: archived
canonical: false
owner: human
created: 2026-05-13
last_reviewed: 2026-07-12
domain: archive
tags:
  - legacy
  - engine-evaluation
  - supaluv
pinned: false
related: []
archive_reason: Early engine, video, schedule, and product assumptions were superseded by the shipped runtime and ADR-0001/ADR-0005.
---

# 《超级爱人》互动视觉小说 —— 技术方案设计文档

> 历史说明：本文保存 2026 年 5 月的早期选型讨论，其中 PixiVN、人物视频和阶段规划
> 已被实际实现与 ADR-0001/ADR-0005 取代。它不属于当前执行或默认阅读路径。

## 0. 文档元信息

| 字段 | 值 |
|---|---|
| 文档日期 | 2026-05-13 |
| 作者 | 用户（PieAI / PieAIStudio）+ Claude（brainstorming 协作） |
| 文档状态 | **待审阅 (Draft for Review)** —— 等待第三方 AI / 顾问审阅 |
| 项目代号 | SuperLover-VN（暂定） |
| 原作来源 | `~/PieAI/.../AI-Writing-FutureImperfect/第1稿/A超级爱人/超级爱人-骨架情节点.md` |
| 关联项目 | Supa（卡牌游戏，`~/PieAI/Supa`）—— 技术栈参考与潜在复用源 |
| 阶段 | brainstorming 结束 → 等待审阅 → 进入 writing-plans |

### 给审阅 AI 的指引

请重点审阅以下 5 点，按优先级排：

1. **VN 引擎选型是否合理**（§5 + §6.1）—— Pixi'VN + Ink 这条路对一个兼职业余 + Twine 经验背景的开发者是否最优？
2. **Midjourney → Flux 切换的判断是否充分**（§4.1）—— Midjourney NSFW 政策对"恋足 / 性爱机器人 PG-13"题材的实际杀伤范围是否被高估或低估？
3. **MVP 范围是否切实可达**（§7）—— 30-60 分钟通关、3-4 个月、兼职 2-3h/天，对方案 A 的复杂度是否够？
4. **跨平台策略（Tauri 桌面 + Capacitor 移动）是否过度工程**（§6.1 + §8）—— 是否应该 MVP 阶段只做 Web，桌面/移动留到 Phase 2？
5. **AI 工作流分阶段是否过于保守**（§3.6）—— 把 TTS/BGM/视频/实时分支推到 Phase 2-3 是否会让 MVP 缺少卖点？

---

## 1. 项目背景与定位

### 1.1 IP 来源

《超级爱人》是用户原创小说，目前为骨架情节点状态（约 100 行），三幕剧结构：

- **第一幕（困境与诱惑）**：程序员男主因暴露恋足癖被女友分手，机缘巧合订购了性爱机器人
- **第二幕（机器人到来）**：男主与女款机器人发展，合租胖女孩订购男款机器人，社区/家人/警察发现，外部压力袭来
- **第三幕（逃亡与埋葬）**：藏匿失败 → 树林埋葬 → 道德反转 → 重新组装 → 搬郊区让两个机器人谈恋爱 → 男女主回归正常生活

**题材关键词**：黑色幽默 / 怪诞 / 赛博伦理 / 性癖羞耻 / 道德困境 / 社会规训 / 人机情感

### 1.2 项目目标

将小说改编为**互动视觉小说（Visual Novel, VN）**，用 AI 辅助高效生产，目标商业化发行（付费用户）。

### 1.3 与 Supa 项目的关系

| 维度 | Supa | 本项目 |
|---|---|---|
| 类型 | 4 人 PvE 卡牌战斗 | 单人互动视觉小说 |
| 联机性 | 强（Colyseus 实时同步） | 无（单机叙事） |
| 视觉密度 | 中（卡牌动画+战斗） | 低（立绘+背景+对话） |
| 技术栈 | TS + React + Phaser + Colyseus + Supabase | TS + React + **Pixi'VN** + **Ink** + Supabase |
| 复用方向 | 不复用 Colyseus / Phaser；**复用** TS 工程结构、React、Supabase、Vercel、Playwright、pnpm monorepo 习惯 |

**核心理念**：本项目不依附 Supa，但**继承 Supa 的工程化能力**（doc-gov、TypeScript 风格、Supabase 经验、CI 流水线、Vercel 部署），快速 bootstrap。

---

## 2. 需求确认过程（来龙去脉）

本节记录从初始模糊需求到清晰约束的全过程，以便审阅 AI 理解每个决策的语境。

### 2.1 用户初始需求

> "supa卡牌游戏，你能看到他用了什么技术引擎。而我想用《超级爱人》这个小说来做互动影游AI互动影游，那问题就是在于我应该用什么样的引擎和技术，我是想比较符合咱们技术已经用的技术的。
> 有没有什么简便的包啊什么之类的。为什么说聊到这个呢？就是我在做互动引流的时候……我已经有想说了。或一大致的情节点有了，但是我不想一个点一个点的写。所以我是希望你帮我思考一下，有没有什么比如说模板或者是什么东西，我直接跟AI一说，AI就是这个模板自己写分支写什么东西，最后那边就能够直接读取，而不是说我一个一个的告诉他教育分支应该怎么怎么写怎么怎么弄。"

**提炼出的 3 个核心痛点**：

1. 技术选型对齐 Supa（已有技术栈复用）
2. AI 辅助高效铺分支（不想一个点一个点写）
3. AI 输出 → 引擎直接读取（中间格式自动化）

### 2.2 第一轮 clarify：形态 + 内容定位

| 问题 | 用户选择 | 决策依据 |
|---|---|---|
| 形态 | **A. VN（80%）+ C. AI 实时分支（10%）+ D. 图转视频（10%）** | 用户判断这种混合更"精彩"、更易付费 |
| 内容定位 | **PG-13 化**（用隐喻/留白代替直接描写） | 用户接受 |

**Claude 当时指出的问题**（被采纳）：
- "互动影游"如果指真人/CG 视频游戏（《底特律：变人》《Late Shift》），单人独立做不出。用户实际想做的是 VN
- 大量成人内容会卡死 AI 工作流（主流模型拒绝生成 NSFW）；PG-13 化解锁了 Claude/GPT/Gemini 辅助写作

### 2.3 第二轮 clarify：发行平台

| 平台 | 用户初始意愿 | Claude push back 后的决策 |
|---|---|---|
| Web (itch.io / pieflow.app) | 想发 | ✅ MVP 优先 |
| Steam | 想发 | ✅ Phase 2，Tauri 打包 Web |
| 海外 iOS/Android | 想发 | ⚠️ Phase 3，Capacitor 套壳，需内容微调 |
| 微信小程序 | 想发 | ❌ 放弃（性话题几乎不可能过审） |
| App Store 中国区 | 想发 | ❌ 放弃（同上） |
| TapTap / bilibili | 想发 | ⚠️ 后置，需包装为"黑色幽默科幻" |

**Claude 当时指出的问题**（被采纳）：
> "所有平台都发"是商业幻觉而不是技术决策。打个比方：做菜要在家、摆摊、五星餐厅、清真餐厅、便利店都卖，但你做的是夫妻肺片——清真餐厅过不了。强行做你得开两套厨房。

**核心洞察**：内容审核是平台选择的硬约束。一份内容多套发行渠道是不可能的；要么删减内容（伤害故事核心），要么按平台过审能力分级。

### 2.4 第三轮 clarify：规模 + 经验 + 时间

| 维度 | 用户答 | 校准 |
|---|---|---|
| 经验 | (ii) HTML 小游戏 + Twine 故事 | Twine 经验意味着"节点 + 选项 + 变量"思维模型已建立，可平移到 Ink |
| 时间 | 兼职业余 2-3h/天 | 真实生产力 ≈ 全职 1/4-1/3 |
| 规模 | 用户未直接选；Claude 推荐 **A 小品级 demo（30-60 min 通关）** | 行业基准：全职做 2-3h VN 需 6-9 个月；兼职业余对应 18-24 个月。MVP 必须从最小可上线版本做起 |

**Claude 当时指出的问题**（被采纳）：
> itch.io 上 60% 的 VN 项目从未完成。打个比方：你说做菜每天 2-3 小时，第一次就要做 10 层婚礼蛋糕，大概率烤到第 3 层就放弃。先做 6 寸单层。

### 2.5 第四轮 clarify：美术 + AI 用途

| 维度 | 用户答 |
|---|---|
| 美术 | **A. AI 全包**（Midjourney/Flux/SD + LoRA + 图转视频工具） |
| AI 用途 | **全部 8 项要**（写分支文案 / 写对话 / 实时分支 / 美术生成 / 图转视频 / TTS / BGM / 翻译） |

**Claude push back**（被采纳）：
- "8 项全要"是工作流管理灾难。每项都是一条独立 pipeline，第一次做 VN 同步铺开会被压垮
- 推出分阶段方案：MVP 只做 3 项（分支文案 / 对话 / 美术）；Phase 2 加 TTS + BGM；Phase 3 加视频 + 实时分支；Phase 4 加翻译
- 美术工具也需要分级：主美术 vs 辅助美术（详见 §4.1）

### 2.6 第五轮 clarify：商业化约束

| 维度 | 用户答 | Claude 后续校准 |
|---|---|---|
| 预算 | D. 不在意，能花就花 | 校准为 **MVP 月 $200-400** 上限（理性化，留余量给 Phase 2 + 意外） |
| 语言 | C. 同步中英双语 | 校准为 **架构 i18n 100% 预留，MVP 只填中文**，Phase 3-4 出 Steam 国际版再做英文 |
| 付费模式 | E. 还没想过 | 决策为 **免费试玩 + 付费解锁完整版**（针对性话题降低用户决策门槛） |

**Claude 当时指出的问题**（被采纳）：
- 同步双语 = 工作量 1.6-2x，对兼职业余项目是炸弹。打比方：中餐和西餐同步出，两个都做不出来
- 性话题用户有"我会不会被恶心到"心理障碍，免费试玩降低决策成本，通关时机最高转化

---

## 3. 关键决策与依据（汇总）

本节是 §2 的浓缩 + 加上每个决策的"为什么"。

### 3.1 形态：**80% VN 主体 + 10% AI 实时分支 + 10% 图转视频片段**

**为什么**：纯 VN 容易"看完就完"，加 10% AI 实时分支是产品差异化卖点（玩家会感觉"每次都不一样"），加 10% 图转视频是电影感增强（关键 CG 转 5-10 秒短片，提升 demo 视频转化）。

**反对意见**：
- 实时 AI 分支工程复杂度高（上下文 / 一致性 / 安全过滤 / 离线模式），10% 内容可能占 30% 工程量 → **缓解**：推到 Phase 3
- 图转视频成本高且 AI 视频在 2026 仍有一致性问题 → **缓解**：只用于 3-5 个关键 CG，不滥用

### 3.2 内容：**PG-13 化**

**为什么**：
- 解锁主流 AI 写作辅助（Claude/GPT/Gemini）
- 扩大可上架平台范围（Steam / itch.io 都接受 PG-13）
- 性话题用"隐喻 + 留白 + 镜头切换"反而比直白更有文学性

**反对意见**：
- 原作的"性爱机器人"主题在 PG-13 化后是否还保留张力？→ **回应**：参考《Her》《银翼杀手 2049》《黑镜》，赛博/性/情感主题完全可以非露骨表达且更高级

### 3.3 平台优先级：**Web → Steam → 海外移动端；放弃国内移动端**

**为什么**：
- Web：上架成本最低、内容审核最宽松、验证最快
- Steam：变现潜力最大、技术上 Tauri 几乎零额外工作
- 海外移动端：用户基数大、Capacitor 套壳可行、但内容评级要处理
- 国内移动端：性话题硬性壁垒，浪费精力

**反对意见**：
- "放弃国内移动端"是否放弃了最大用户市场？→ **回应**：这部分用户在国内 Web 渠道（个人站 / itch.io 镜像 / TapTap 边缘）仍可触达，不必走小程序

### 3.4 规模：**A 小品级 demo（30-60 min 通关）**

**为什么**：
- 兼职业余 + 第二个项目，真实生产力 = 全职 1/4-1/3
- itch.io VN 完成率 < 40%，不完成 = 0 价值
- demo 验证后扩成规模 B/C 心理成本更低

**MVP 内容范围**：
- 第一幕完整 + 第二幕中段（机器人到来 + 胖女孩订购）
- 3 个结局：happy / bad / 中性（用 AI 实时生成的"诡异 ending"作为亮点）
- ~15-25 个剧情节点
- ~3-5 处玩家选择
- ~5 个主要角色立绘 × 5-8 套表情 ≈ 25-40 张
- ~10 个场景背景
- ~3-5 张关键 CG

### 3.5 美术：**AI 全包，Flux 为主 + Midjourney 为辅 + NovelAI 备选**

**为什么**：见 §4.1，Midjourney 全面禁止 fetish 主题，主力换 Flux。

### 3.6 AI 工作流：**分阶段引入**

| 阶段 | AI 工作流 |
|---|---|
| **MVP（3-4 个月）** | ①分支文案 + ②对话 + ④美术 |
| **Phase 2** | + ⑥中文 TTS + ⑦BGM |
| **Phase 3** | + ⑤图转视频 + ③实时 AI 分支 |
| **Phase 4** | + ⑧多语言翻译 |

**为什么分阶段**：每条 AI pipeline 都需要独立的 prompt 调试 + 资源管理 + 异常处理 + 成本监控。同步上线 = 必然失控。

### 3.7 语言：**架构 100% 预留 i18n，MVP 只填中文**

**为什么**：架构成本 ≈ 5%（用 i18next 抽象字符串），MVP 内容成本省 40%（不用同步双语写作 + 翻译 + 校对 + 配音）。

### 3.8 付费模式：**免费试玩 + 付费解锁完整版**

**为什么**：
- 性话题用户决策门槛高，免费降低 friction
- demo 通关时机是最高转化点
- Steam / itch.io 都支持（Steam 是 demo + 主游戏分开上架）
- 定价：完整版 ¥30-50 / $5.99-9.99

### 3.9 预算：**MVP 月 $200-400**

**分配**（估算）：
| 项 | 月成本 |
|---|---|
| Claude API（写分支辅助） | $30-80 |
| Midjourney 订阅（辅助美术） | $30 |
| Flux API 或 ComfyUI 算力 | $50-100 |
| Cursor / Claude Code 订阅 | $20-100 |
| Supabase（开发期免费） | $0-25 |
| Vercel（开发期免费） | $0-20 |
| 域名 / 其他 | $5-10 |
| **合计** | **$135-365** |

---

## 4. 2026 年技术调研发现

本节记录关键技术验证，**含一个推翻自身假设的发现**。

### 4.1 ⚠️ Midjourney 完全禁止 fetish 主题 —— 推翻原推荐

**初步假设**：用 Midjourney V7 做主美术（--cref / --oref 角色一致性强、易用性高）

**搜索发现**（2026 年 5 月）：
- Midjourney 官方 Community Guidelines 明确禁止：nudity, sexual organs, **fetishes**, sexualized imagery
- 重复违规可永久封号
- 即使 PG-13 化，prompt 含 "foot fetish" / "sex robot" / "sensual" 等词可能触发自动封号

**结论修正**：
- **主美术换 Flux 2 Pro（Black Forest Labs）或 Flux 1 Dev + ComfyUI 本地**
- **备选 NovelAI**（专门做 anime style，对成人内容宽松）
- **Midjourney 降级为辅助**，仅用于安全场景：风景背景图、UI 装饰、非角色物品

**支撑来源**：
- https://docs.midjourney.com/hc/en-us/articles/32013696484109-Community-Guidelines
- https://midjourneyai.online/does-midjourney-allow-nsfw-content/

### 4.2 ✅ Pixi'VN 成熟度合格

**搜索发现**：
- 最新版 1.8.0（5 天前发布）
- 由 DRincs Productions 维护，TypeScript + PixiJS 底层
- 提供模板、Ink 解析器（pixi-vn-ink）、React/Vue UI 集成
- 官网：https://pixi-vn.web.app/

**风险评估**：
- 单一团队主导项目，commercial 大规模生产案例较少
- 缓解：底层 PixiJS + inkjs 都是行业标准，最坏情况自己 fork 续命

### 4.3 ✅ Tauri 2.x 桌面生产可用，移动"基础够"

**搜索发现**（2026 年 5 月）：
- Tauri 2.9.6 是最新（2025 年 12 月）
- 桌面生产用户：Hoppscotch, Spacedrive, Padloc, AppFlowy
- 官方明说：**v2.0 不是 "mobile as first-class citizen" 发布，是坚实基础但移动仍不完美**

**修正决策**：
- 桌面（Steam）用 Tauri 2.x
- 移动（iOS/Android）用 Capacitor（更成熟）
- 不强行用 Tauri 移动端

### 4.4 ✅ Claude API 实时分支成本完全可控

**2026 年 5 月定价**：
| 模型 | input | output |
|---|---|---|
| Haiku 4.5 | $1 / M | $5 / M |
| Sonnet 4.6 | $3 / M | $15 / M |
| Opus 4.7 | $5 / M | $25 / M |

**实时分支估算**（Sonnet 4.6 + prompt caching）：
- 单次调用 ~2K input + 1K output ≈ $0.021
- 一个玩家通关 10 个实时节点 ≈ $0.21
- 1000 付费用户 ≈ **$210 总成本**（配 prompt caching 可降 90%）

**结论**：Phase 3 引入实时 AI 分支在经济上完全可行。

### 4.5 ⚠️ BGM：Udio 合规、Suno 仍在打官司

**2026 年 5 月版权诉讼状态**：
| 关系 | 状态 |
|---|---|
| UMG + Udio | ✅ 2025-10 和解，联合做合规 AI 音乐平台，每生成 $0.002-0.005 版税 |
| Warner + Suno | ✅ 2025-11 和解 |
| Sony + Suno | ⚠️ 仍在打官司，2026-07 有 fair use 关键听证 |

**决策**：
- 商业 BGM 用 **Udio**（合规路径最清晰）
- 备份方案：AIVA / Mubert（专门做版权友好 BGM）
- **不要用 Suno** 直到 2026-07 判决出来

### 4.6 ✅ 中文 TTS 顶级选择

**搜索发现**：
| 工具 | 评价 |
|---|---|
| **Fish Audio S2 Pro** | EmergentTTS-Eval 第一（81.88% 胜率），中文 WER 0.54%，超越 ElevenLabs/MiniMax/Google/OpenAI |
| **CosyVoice 2 (FunAudioLLM)** | 150ms 流式延迟，MOS 5.53，支持粤语/川/沪/津方言、跨语种，开源 |
| 豆包 seed-tts-2.0 | 字节官方 API，质量高，国内调用方便 |
| MiniMax Speech | 也有中文，但 benchmark 数据少 |
| ~~ElevenLabs~~ | 英文强中文弱，不推荐做中文配音主力 |

**决策**：
- 主力：**Fish Audio S2 Pro**（云端 API，质量最高）
- 备选：**CosyVoice 2** 本地（成本极低、支持方言、可控）

---

## 5. 方案对比与选定

### 5.1 三个候选方案

#### 方案 A：**Pixi'VN + Ink + React + Tauri/Capacitor**（选定）

- 核心引擎：Pixi'VN（TypeScript + PixiJS）
- 剧本：Ink 语言 + pixi-vn-ink 解析器
- UI：React（与 Supa 同栈）
- 后端：Supabase
- 桌面打包：Tauri 2.x
- 移动打包：Capacitor

#### 方案 B：**Ren'Py**

- 核心引擎：Ren'Py（Python）
- 剧本：Ren'Py .rpy 脚本
- 桌面/移动：Ren'Py 原生打包（行业最成熟）
- Web：Ren'Py Web（emscripten 编译，体验较差）

#### 方案 C：**自建 React + inkjs**

- 核心：React + inkjs + 自定义 UI / 状态机
- 视觉层：纯 CSS / Tailwind / 必要时 Pixi.js
- 其他与方案 A 相同

### 5.2 对比表

| 维度 | 方案 A | 方案 B | 方案 C |
|---|---|---|---|
| 核心引擎 | Pixi'VN | Ren'Py | 自建 |
| 编程语言 | TypeScript | Python | TypeScript |
| 与 Supa 技术栈对齐度 | ⭐⭐⭐ 高 | ⭐ 低 | ⭐⭐⭐ 高 |
| Web 上架体验 | ⭐⭐⭐ 原生 | ⭐⭐ emscripten | ⭐⭐⭐ 原生 |
| Steam 桌面 | Tauri 打包 | 原生导出 | Tauri 打包 |
| 移动端打包 | Capacitor（中） | Ren'Py 原生（强） | Capacitor（中） |
| 实时 AI 分支集成 | ⭐⭐⭐ 顺畅 | ⭐⭐ HTTP 调用 | ⭐⭐⭐ 顺畅 |
| 图转视频 / TTS 集成 | ⭐⭐⭐ Web 原生 | ⭐⭐ Python 包装 | ⭐⭐⭐ |
| Twine 经验复用 | ⭐⭐ 思维平移 | ⭐⭐ 同左 | ⭐⭐ 同左 |
| 社区 / 教程量 | 中 | ⭐⭐⭐ 大 | N/A |
| MVP 开发周期 | 4-6 个月（详见 §7.3） | **3-4 个月** | 7-10 个月 |
| 学习曲线 | 中 | 中 | ⭐⭐⭐ 高 |
| 维护风险 | 中（单团队） | ⭐⭐⭐ 低（10+ 年） | 低（自控） |

### 5.3 选定方案 A 的核心理由

**理由 1：工程对齐度最高，复用 Supa 经验**

打个比方：方案 A 是"用乐高在你家已有的桌子上拼"——桌子（Supa 技术基础：TS / React / Supabase / pnpm / Vercel / Playwright）已经在，乐高（Pixi'VN）按你想法搭。方案 B 是"另起一间屋子用木匠工具做"——好工具，但要重新搬家。方案 C 是"自己造木匠工具再做"——理想但做不完。

**理由 2：Ink 对 AI 工作流最友好，直接解决用户核心痛点**

Ink 是 inkle Studios 开源的成熟脚本语言（用于 Heaven's Vault、80 Days、Sorcery!）。GitHub 上海量训练数据，Claude/GPT 能直接生成**语法正确、可编译运行**的 .ink 文件。这就是用户说的"AI 一说就铺出引擎能读的分支"的工业化解决方案。

**理由 3：实时 AI 分支 + 图转视频 + TTS 集成最顺**

这些 AI 增量都是 HTTP API，React 直接 fetch 即可。方案 B 走 Python 包装会让架构变啰嗦。

**理由 4：Web 优先匹配发行平台优先级**

方案 A 是 Web 原生，匹配 §3.3 的 Web → Steam → 海外移动端优先级。方案 B 主要为桌面/移动设计，Web 是次要选项。

---

## 6. 方案 A 完整技术栈

### 6.1 技术栈一览表

| 层 | 技术 | 版本 | 备注 |
|---|---|---|---|
| 包管理 | pnpm | ≥ 10 | 与 Supa 一致 |
| 语言 | TypeScript | ≥ 5 | 与 Supa 一致 |
| 主框架 | React | ≥ 19（与 Supa 同步） | 与 Supa 一致 |
| **VN 引擎** | **Pixi'VN** | 1.8+ | 底层 PixiJS |
| **剧本语言** | **Ink** + pixi-vn-ink | 最新 | 关键选型 |
| **AI 辅助写分支** | Claude Sonnet 4.6 API | — | 配自定义 Ink prompt |
| **AI 实时分支**（P3） | Claude Sonnet 4.6 + prompt caching | — | |
| **美术主力** | **Flux 2 Pro** API 或 Flux 1 Dev + ComfyUI 本地 | — | 取代 Midjourney |
| **美术备选** | NovelAI（anime style）+ Midjourney（仅安全场景） | — | |
| **图转视频**（P3） | Kling 3.0（cinematic）+ Runway Gen-4.5（备选） | — | |
| **中文 TTS**（P2） | Fish Audio S2 Pro（主）+ CosyVoice 2（备） | — | |
| **BGM**（P2） | Udio（合规）+ AIVA / Mubert（备） | — | 避开 Suno |
| **后端** | Supabase | 与 Supa 同版本 | 账号 + 云存档 + 付费状态 |
| **支付** | Stripe（海外）+ 易支付/微信 H5（国内 Web） | — | 看渠道 |
| **桌面打包** | Tauri | 2.9+ | Steam 上架 |
| **移动打包** | Capacitor | 最新稳定版 | iOS / Android |
| **i18n** | i18next | — | 架构预留，MVP 只填中文 |
| **测试** | Vitest + Playwright | 与 Supa 一致 | |
| **代码质量** | Oxlint + Oxfmt | 与 Supa 一致 | |
| **CI / 部署** | Vercel（Web）+ Steamworks + App Stores | — | |

### 6.2 架构分层

```
┌─────────────────────────────────────────────────┐
│  发行壳（Distribution Shells）                   │
│  ├─ Vercel (Web)                                 │
│  ├─ Tauri 2.x  → Steam                           │
│  └─ Capacitor → iOS / Google Play                │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  应用层（App Shell）                              │
│  ├─ React Router（路由：菜单 / 设置 / 游戏）       │
│  ├─ i18next（多语言）                            │
│  ├─ Zustand or Jotai（全局状态：存档、用户、付费）│
│  └─ Tailwind CSS（UI 样式）                      │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  VN 引擎层（Pixi'VN）                            │
│  ├─ Story Engine（基于 inkjs 解析 .ink 文件）    │
│  ├─ Renderer（PixiJS：立绘、背景、转场）          │
│  ├─ Audio（BGM、音效、TTS 播放）                  │
│  └─ Save System（存档接口）                       │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  内容层（packages/content）                       │
│  ├─ ink/（剧本 .ink 文件）                       │
│  ├─ assets/                                       │
│  │   ├─ characters/（立绘 PNG + 表情元数据）      │
│  │   ├─ backgrounds/（场景背景）                  │
│  │   ├─ cg/（关键 CG）                            │
│  │   └─ video/（图转视频 mp4）                    │
│  ├─ audio/（BGM + SFX + 配音 mp3）                │
│  └─ i18n/zh-CN.json, en-US.json                  │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  AI 工作流（独立 services，不阻塞主游戏）         │
│  ├─ branch-author/（编辑期：Claude API 生成 .ink）│
│  ├─ runtime-branch/（运行期 Phase 3：Claude API）│
│  ├─ tts-pipeline/（Phase 2：Fish Audio API）     │
│  ├─ bgm-pipeline/（Phase 2：Udio API）           │
│  └─ video-pipeline/（Phase 3：Kling / Runway API）│
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  后端（Supabase）                                 │
│  ├─ Auth（账号）                                  │
│  ├─ Postgres（存档、付费状态、玩家行为日志）       │
│  └─ Storage（云存档同步）                         │
└─────────────────────────────────────────────────┘
```

### 6.3 关键数据流（用户核心痛点的解决方案）

**痛点**：用户不想一个分支一个分支写，希望 AI 一说就铺出来引擎直接读。

**流程**：

```
1. 用户在 Markdown / 自然语言里描述一个剧情节点
   ↓
2. branch-author CLI 工具读取节点描述
   ↓
3. 调用 Claude API，传入：
   - 节点描述
   - 系统 prompt：Ink 语法规范 + 角色设定 + 已有剧本上下文
   - few-shot examples
   ↓
4. Claude 输出 .ink 文件片段（含 stitches、choices、变量、跳转）
   ↓
5. 自动 lint：用 inklecate（Ink 官方编译器）验证语法
   ↓
6. 通过后写入 packages/content/ink/<scene>.ink
   ↓
7. Pixi'VN 引擎热加载，玩家立即可玩
```

**为什么 Ink 是这个流程的关键**：
- Ink 是文本格式（不是 GUI），AI 输出后直接落盘
- inklecate 能验证语法，AI 输出错误能被捕获
- Ink 有 stitches / choices / variables / weaves 等成熟概念，覆盖 VN 90% 需求
- 行业 10+ 年实践沉淀，AI 训练数据丰富

### 6.4 各 AI 工作流的集成方式

| 工作流 | 阶段 | 集成方式 | 触发时机 |
|---|---|---|---|
| ① 写分支文案 | MVP | CLI 工具 + Claude API | 开发者本地，按节点触发 |
| ② 写对话细节 | MVP | 同上，更细粒度 prompt | 开发者本地 |
| ④ 美术生成 | MVP | Flux / NovelAI Web UI + 资产管理脚本 | 开发者本地，每次手动 |
| ⑥ TTS 配音 | Phase 2 | 自动化脚本：Ink 文件 → 提取台词 → Fish Audio API → mp3 → 资产目录 | 开发者本地，批量 |
| ⑦ BGM 生成 | Phase 2 | Udio Web UI + 手动选择 | 开发者本地 |
| ③ 实时 AI 分支 | Phase 3 | 玩家进入特定节点 → 前端调用后端 proxy → Claude API → 返回 Ink 片段 → 热加载 | 运行时，玩家触发 |
| ⑤ 图转视频 | Phase 3 | 关键 CG → Kling / Runway → 5-10 秒 mp4 → 资产目录 | 开发者本地，关键节点 |
| ⑧ 多语言翻译 | Phase 4 | 脚本：Ink 文件 → 提取字符串 → Claude API 翻译 → i18n/en-US.json | 开发者本地，批量 |

---

## 7. MVP 范围定义

### 7.1 MVP 包含

**剧情范围**：
- 第一幕完整（男主分手 → 订购机器人 → 等待）
- 第二幕中段（机器人到来 → 组装 → 男主沉迷 → 胖女孩订购）
- 3 个分支结局：happy / bad / 中性

**节点估算**：
- 主线节点 15-25 个
- 玩家选择点 3-5 处
- 选择影响：通过 Ink 变量影响后续 2-3 个节点

**美术资源**：
- 5 个主要角色（男主、胖女孩、女机器人、男机器人、前女友）× 5-8 套表情 ≈ 25-40 张立绘
- ~10 个场景背景（合租屋客厅/卧室、男主公司、街道、快递柜、组装间、新郊区院子）
- 3-5 张关键 CG
- UI 元素：菜单、对话框、选项按钮

**AI 工作流**（仅 3 项）：
- ① 写分支文案（Claude API 辅助）
- ② 写对话细节（同上）
- ④ 美术生成（Flux 主 + NovelAI 备 + Midjourney 安全场景）

**发行**：
- Web 优先（itch.io + pieflow.app/SuperLover 子路径）
- 免费试玩前 15-20 分钟（第一幕）
- 付费解锁完整版

### 7.2 MVP **不包含**（推到 Phase 2+）

| 推迟项 | 阶段 |
|---|---|
| TTS 中文配音 | Phase 2 |
| BGM AI 生成 | Phase 2（MVP 用 1-2 段免费授权 BGM 占位） |
| 图转视频片段 | Phase 3 |
| 实时 AI 分支 | Phase 3 |
| 英文翻译 | Phase 4 |
| Steam 上架 | Phase 2（先 Web 验证） |
| iOS / Android 上架 | Phase 3 |
| 微信小程序 / 国内移动端 | **永不**（内容硬性壁垒） |

### 7.3 工时估算

| 模块 | 工时（兼职业余 2-3h/天）|
|---|---|
| 项目脚手架 + Pixi'VN 学习 | 2 周 |
| Ink 学习 + AI 辅助写分支工具搭建 | 2 周 |
| 美术生成 pipeline（Flux + LoRA 训练） | 3-4 周 |
| 剧本写作（含 AI 辅助） | 4-6 周 |
| 立绘 + 背景 + CG 生成 | 4-6 周（与剧本并行） |
| UI / UX / 存档 / 设置 | 2-3 周 |
| Supabase 集成（账号 + 付费） | 1-2 周 |
| 测试 + 修 bug | 2-3 周 |
| itch.io 上架 + 营销页面 | 1 周 |
| **总计** | **17-25 周 ≈ 4-6 个月** |

**注意**：原推荐"3-4 个月"略乐观，更现实是 **4-6 个月**。建议按 6 个月规划，3-4 个月达到 MVP（提早就提早发）。

---

## 8. 已知风险与缓解

### 8.1 技术风险

| 风险 | 严重度 | 缓解 |
|---|---|---|
| Pixi'VN 单团队维护，可能停更 | 中 | 底层 PixiJS + inkjs 行业标准，最坏 fork 续命 |
| Tauri 移动端不够成熟 | 中 | 移动用 Capacitor，Tauri 仅桌面 |
| 中文 Ink 编码问题 | 低 | Ink 原生 UTF-8，但要在 design 阶段写 spike 验证 |
| Flux LoRA 训练学习曲线 | 中 | MVP 先用 Flux 2 Pro API + character reference，不一定要本地 LoRA |
| Claude API 实时分支 rate limit | 中 | 服务端做队列 + 缓存常见分支，付费用户优先 |
| 跨平台 Web/Tauri/Capacitor 测试矩阵爆炸 | 中高 | MVP 只测 Web，Phase 2 再加 Tauri，Phase 3 加 Capacitor |

### 8.2 内容 / 合规风险

| 风险 | 严重度 | 缓解 |
|---|---|---|
| Midjourney 因 prompt 含 fetish 词被封号 | 高 | 完全避免在 Midjourney 跑敏感 prompt；主美术用 Flux |
| Steam 上架审核（PG-13 性话题） | 中 | 正确填评级（Adult Only Sexual Content = No, Some Adult Content = Yes），参考已上架同类作品 |
| Apple App Store 拒审"性爱机器人"主题 | 高 | 海外应用商店上架延期到 Phase 3，且需要重新包装（"赛博伦理黑色喜剧"） |
| Udio AI 音乐 commercial 使用条款变动 | 中 | 跟进 2026-07 Suno 判决，准备 AIVA / Mubert 备份 |
| 玩家用实时 AI 分支生成违规/危险内容 | 中 | 服务端做内容过滤 + 用户行为审计 |

### 8.3 商业 / 项目管理风险

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 兼职业余项目中途放弃 | 高 | MVP 范围严格控制（30-60 min），里程碑式 release（每月一次内部 demo） |
| AI 工作流"全要"诱惑回潮 | 中 | 文档化分阶段规划，严守 MVP 不加新 AI 工作流 |
| 双语同步诱惑 | 中 | i18n 架构留好，但 MVP 阶段拒绝写英文内容 |
| 美术风格反复改 | 高 | 第一周确定角色 reference + LoRA，之后不许改 |
| 用户对"AI 实时分支"期望过高 | 中 | 营销文案不过度承诺；实际只 10% 节点用 AI 实时 |

---

## 9. 下一步

### 9.1 当前状态

- [x] brainstorming 阶段完成
- [x] 关键决策达成（§3）
- [x] 2026 技术调研完成（§4）
- [x] 方案选定（§5：方案 A）
- [x] 技术栈定型（§6）
- [x] MVP 范围定义（§7）
- [x] 风险识别（§8）
- [ ] **待第三方 AI 审阅本文档**
- [ ] 根据审阅意见迭代
- [ ] 进入 writing-plans 阶段：写详细实现计划（PLAN-0001-mvp.md）
- [ ] 创建项目仓库（SuperLover-VN 或类似）
- [ ] 第一个 Sprint：脚手架 + Pixi'VN hello world + Ink 第一个场景

### 9.2 审阅建议

请第三方 AI（建议至少 2 个不同模型，例如 GPT-5 + Gemini 3）审阅本文档，重点关注：

1. 方案 A 选型的合理性
2. MVP 范围是否切实
3. 风险识别是否充分
4. 是否有遗漏的 2026 年更优技术
5. 工时估算是否乐观/悲观

审阅返回后，作者（用户）整理意见 → 与 Claude 一起迭代文档 → 通过后进入 writing-plans。

---

## 附录 A：信息来源（2026-05-13 搜索）

### Ink / VN 引擎
- [inkjs - npm](https://www.npmjs.com/package/inkjs)
- [Pixi'VN Quick Start](https://pixi-vn.web.app/)
- [Pixi'VN GitHub](https://github.com/DRincs-Productions/pixi-vn)
- [pixi-vn-ink GitHub](https://github.com/DRincs-Productions/pixi-vn-ink)
- [ink - inkle's narrative scripting language](https://www.inklestudios.com/ink/)
- [14 Free and Open-source Visual Novel Engines for 2025](https://medevel.com/14-free-and-open-source-visual-novel-engines-for-2025/)
- [Naninovel](https://naninovel.com/)

### 美术 / AI 生图
- [Midjourney V7 vs Flux 2 (2026)](https://aividpipeline.com/blog/midjourney-vs-flux-2026)
- [Maintain Consistent Characters in Midjourney V7](https://flowith.io/blog/midjourney-v7-consistent-characters-masterclass/)
- [Midjourney NSFW Policy 2026](https://midjourneyai.online/does-midjourney-allow-nsfw-content/)
- [Midjourney Community Guidelines](https://docs.midjourney.com/hc/en-us/articles/32013696484109-Community-Guidelines)
- [Flux 2 Pro vs Midjourney v7 for Commercial Artists](https://flowith.io/blog/flux-2-pro-vs-midjourney-v7-commercial-artists-full-control/)

### 图转视频
- [Best AI Video Generator in 2026](https://pixflow.net/blog/best-ai-video-generator/)
- [AI Video Generation 2026: Sora 2 vs Veo 3.1 vs Kling 3.0](https://lushbinary.com/blog/ai-video-generation-sora-veo-kling-seedance-comparison/)
- [AI Video Model Benchmark 2026](https://magichour.ai/blog/ai-video-model-benchmark)

### 音乐版权
- [Music Industry AI Lawsuits Tracker 2026](https://www.chartlex.com/blog/business/music-industry-ai-lawsuits-tracker-2026)
- [Suno Music in 2026 - Medium](https://medium.com/@J.S.Matkowski/suno-music-in-2026-what-creators-actually-own-what-they-only-license-and-why-the-lawsuits-still-7f7c3c455c0e)

### 中文 TTS
- [Best Lightweight TTS Models 2026 (SiliconFlow)](https://www.siliconflow.com/articles/en/best-lightweight-speech-to-text-models)
- [CosyVoice](https://cosyvoice.org/)
- [CosyVoice GitHub](https://github.com/FunAudioLLM/CosyVoice)

### 跨平台打包
- [Tauri 2.0 Stable Release](https://v2.tauri.app/blog/tauri-20/)
- [Tauri GitHub](https://github.com/tauri-apps/tauri)
- [Tauri vs Electron 2026](https://tech-insider.org/tauri-vs-electron-2026/)

### Claude API
- [Anthropic Claude API Pricing 2026 (CloudZero)](https://www.cloudzero.com/blog/claude-api-pricing/)
- [Using Claude AI in Game Development](https://kevurugames.com/blog/using-claude-ai-in-game-development-tools-use-cases-and-industry-statistics/)

---

## 附录 B：与 Supa 技术栈对照

| Supa 技术 | 本项目复用程度 | 备注 |
|---|---|---|
| pnpm monorepo | ✅ 完全复用 | 包结构 packages/content, packages/engine, apps/web |
| TypeScript | ✅ 完全复用 | 风格一致 |
| React | ✅ 完全复用 | UI 层同栈 |
| Phaser | ❌ 不复用 | 换 Pixi'VN（PixiJS 底层） |
| Colyseus | ❌ 不复用 | 单机游戏不需要多人服务器 |
| Supabase | ✅ 完全复用 | 账号 + 云存档 + 付费状态 |
| Vercel | ✅ 完全复用 | Web 部署 |
| Playwright | ✅ 完全复用 | E2E 测试 |
| Vitest | ✅ 完全复用 | 单元测试 |
| Oxlint + Oxfmt | ✅ 完全复用 | 代码质量 |
| doc-gov | 🆕 选用 | 文档治理（如果项目复杂度上来） |

**复用率估算**：技术栈层面约 **70%** 复用，运行时层面约 **40%** 复用（VN 引擎和卡牌引擎完全不同）。

---

## 附录 C：术语表

| 术语 | 解释 |
|---|---|
| VN | Visual Novel，视觉小说，以立绘 + 背景 + 文字 + 选项为主的叙事游戏 |
| IF | Interactive Fiction，互动小说，纯文字版 |
| Ink | inkle Studios 开源的叙事脚本语言，类似 Markdown 但有 stitches / choices / variables 等结构 |
| inkjs | Ink 的 JavaScript 实现，可在浏览器和 Node.js 运行 |
| Pixi'VN | 基于 PixiJS 和 inkjs 的 TypeScript VN 引擎 |
| PixiJS | 业界主流的 2D WebGL 渲染库 |
| Ren'Py | 老牌 Python VN 引擎，10+ 年沉淀，移动端导出最强 |
| LoRA | Low-Rank Adaptation，AI 图像模型微调技术，用于角色一致性 |
| ComfyUI | 开源 Stable Diffusion / Flux 节点式工作流工具 |
| Flux | Black Forest Labs 开源的图像生成模型，Stable Diffusion 团队前成员创立 |
| NovelAI | 专门做 anime 风格内容生成的商业服务，对成人内容宽松 |
| Tauri | Rust + Web 技术的桌面打包框架，比 Electron 小 96% |
| Capacitor | Ionic 团队的跨平台 native 包装框架，从 Cordova 演进，对 iOS/Android 支持最成熟 |
| Stitch / Choice / Weave | Ink 的核心叙事结构概念 |
| MVP | Minimum Viable Product，最小可行产品 |
| PG-13 | 美国电影分级，13 岁以上观众可观看，含暗示但不直接描写 |
| TTS | Text-to-Speech，文字转语音 |
| BGM | Background Music，背景音乐 |
| CG | Computer Graphics，特指 VN 中插入的全屏关键画面 |

---

**文档结束**

如审阅 AI 需要原始对话记录或更多上下文，可联系作者获取 brainstorming session 完整 transcript。
