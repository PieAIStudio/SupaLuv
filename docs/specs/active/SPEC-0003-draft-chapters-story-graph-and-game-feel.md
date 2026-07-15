---
id: SPEC-0003
title: Draft chapters, shared story graph, and game-feel baseline
type: spec
status: active
canonical: true
owner: human
created: 2026-07-12
last_reviewed: 2026-07-16
domain: product
tags:
  - narrative
  - story-graph
  - loading
  - mini-games
pinned: true
related:
  - PLAN-0005
  - REF-CURRENT-WORK
---

# SPEC-0003: Draft chapters, shared story graph, and game feel

## Goal

把 `Temp/draft01.md` 与 `Temp/draft02.md` 完整改编为当前默认游戏内容，并让这次长文本导入
验证一条可重复使用的正式章节生产线。草稿仍为 noncanonical；作者后续改稿应能重新导入，
不要求重做应用外壳。

## Product decisions

- 旧 `ch01` 与新草稿设定冲突，退出默认产品路径；不得把两套人物、职业和事件混写。
- “一点不打折”指来源事实、对白、笑点和人物动机可追溯，不是把每个自然段做成巨型文本框。
- 作者写定的关键事实必须发生；玩家选择苏明如何应对，并积累后续会回响的人格与线索变量。
- 第一章结束进入第二章 checkpoint，不触发 AI 最终章；这两章默认不开放自由 AI 改写。
- 收藏使用“算法羞耻档案”：协议、评分短信、样机、收条、招募、NDA、审核短信；不做金币背包。
- 第一轮小游戏为“情绪样本标注”，第二候选为“条码连扫”；每次 20–60 秒，失败不阻断主线。

## Content contract

1. 导入两个带日期和 SHA-256 的 source snapshot；`Temp/` 不成为运行时 SSOT。
2. coverage ledger 覆盖导入时全部有效正文段落；状态不得为 `omitted`。
3. 引号对白默认逐字保留；改写必须在 ledger 中标记并可审查。
4. 两章分别拥有稳定 chapter/scene/choice IDs；章间继承变量、线索、角色绑定和存档。
5. 完整回看记录可恢复所有文字信息；视觉化叙述必须有可访问文本替代。
6. 所有路径均必须到达作者终点：第一章“先看房”，第二章“初审通过/就当我有病”。
7. Ink 保存对白、选择、跳转和变量的唯一拓扑；scene manifest 只保存演出元数据，不再手写
   `choices/autoNext` 复制边。
8. 发布构建预编译 Ink 为章节 JSON 并异步分包；玩家浏览器不携带完整编译器，也不在开始游戏时
   同步编译原始 Ink。

## Shared story graph

```text
.ink (唯一剧情真源)
  -> InkJS adapter
  -> NarrativeGraph (chapter / scene / line / choice / edge / source range)
       -> Creator Studio projection
       -> Player Path projection
```

- 图渲染使用 `@xyflow/react`，确定性布局使用 `@dagrejs/dagre`；不自研节点画布。
- Creator Studio 是本地开发能力。第一版支持搜索、缩放、断链提示、节点展开、来源定位、
  CodeMirror 文本修改、编译校验和原子保存；生产官网不暴露写仓库接口。
- 第一版禁止通过任意拖线改 Ink 结构。结构编辑以后只能通过受约束命令完成。
- Player Path 只读：已走节点与已选边点亮，看到但没选的边置灰，未来内容在数据投影层脱敏，
  不能只靠 CSS 隐藏剧透。

## Loading and transition contract

- 启动和换幕只在关键代码、字体、首图完成下载与 `decode()` 后原子呈现。
- 当前完整画面保留到下一幕就绪；不得先清空为黑屏或裸露的“正在加载”。
- 标题页空闲或明确意图时预取角色工作室、故事运行时和下一幕关键资产。
- 背景/立绘转换为适合 Web 的尺寸与格式；大图预算由构建或资产检查验证。
- 等待超过短阈值才展示完整 loading composition；内容使用已解锁档案、世界观或“找协议漏洞”
  小互动，加载完成即可离开，不强迫玩家等动画结束。
- 动态 chunk 和资产失败必须有重试/刷新恢复；漂亮遮罩不能代替真实耗时测量。

## Experience and accessibility

- 长旁白按动作、物件、UI、环境和人物镜头编排；不是持续站桩读小说。
- 选择与小游戏支持鼠标、键盘和触屏；音频不是唯一反馈。
- 性相关回忆不增加裸体或露骨镜头；儿童资产与成人亲密内容隔离。
- 雷欧中英混排按语言分句试听；不使用愚化口音。
- 1440×900、1920×1080、常见移动横屏无关键 UI 裁切；文本速度、语音和动效可调。

## Acceptance

- 来源覆盖为 100%，无 `omitted`，必经事实图可达性检查通过。
- Ink、scene manifest、NarrativeGraph 节点/边与来源范围自动校验通过。
- 两条差异路径均可从新游戏跨章存档/读档并到达第二章终点。
- Creator Studio 可从节点定位并修正一处标点，编译失败不覆盖磁盘。
- Player Path 正确点亮已走路线，未走内容不泄露正文。
- 首访与复访均有录屏/网络证据；换幕不出现逐块拼装，失败可恢复。
- 至少一个剧情内小游戏完成真实 playtest，且失败不阻断主线。
- 发布门与 Production 最小试玩通过；视觉问题必须用修复后截图复核。

## Presentation bible (Round 15 freeze)

本节冻结的是当前两章的**演出接口**，不是作者正在修改的最终台词。后续小说改稿可以替换句子，
但只要人物、地点与事件语义未变，就沿用以下 sequence、回响槽、镜头与声音需求；若改稿改变
事实或顺序，先由总监重映射稳定 ID，再进入资产和语音生产。不得让旧 scene ID 反过来绑架新稿。

### Sequence map

一个 sequence 是一次可感知的地点、目标或张力变化。任何连续超过 5 次的纯“继续”操作必须
通过有意义的选择、剧情互动、道具插入或明确镜头转折打断；不得制造没有后果的假选项。

| ID | Scene 范围 | 戏剧任务 | 入画 → 出画 | 张力 |
| --- | --- | --- | --- | --- |
| SQ01 | `dch01_s001`–`dch01_s005`，含 `dch01_emotion_calibration`、`dch01_protocol_test` | 让玩家亲手签进“痛苦流水线”，建立公司温柔话术与剥削规则 | 测试间协议特写 → AI 女声第一次越界 | 好奇 → 不安 |
| SQ02 | `dch01_s006`–`dch01_s014` | 倾诉开始，质检室与走廊旁观者把私人痛苦变成商品 | 苏明看评分条 → 陈佳的拒绝定格 | 防御 → 羞耻峰值 |
| SQ03 | `dch01_s015`–`dch01_s023` | 分手后果落地，AI 用数据假装懂人 | 反锁声 → 苏明识破安慰算法 | 崩塌 → 冷静反讽 |
| SQ04 | `dch01_s024`–`dch01_s030` | 会员弹窗完成第二次收割，雷欧误入质检室揭穿监听 | 粉色付费弹窗 → 质检室灯亮 | 荒谬 → 爆炸 |
| SQ05 | `dch01_s031`–`dch01_s036` | 公开羞辱转为苏明与雷欧的笨拙同盟 | 众人围观 → “耳朵不算库” | 羞耻 → 同仇敌忾 |
| SQ06 | `dch01_s037`–`dch01_s044` | 前台对峙被补贴到账瓦解，完成“尊严可定价”主题 | 冲向前台 → 夜风中的到账短信 | 愤怒 → 苦涩妥协 |
| SQ07 | `dch01_s045`–`d1_chapter_end` | 雷欧把危机导向看房，给第二章一个具体行动钩子 | 夜街电话 → 进入旧巷 | 松弛 → 新风险 |
| SQ08 | `dch02_s001`–`dch02_s005`，含 `dch02_barcode_sweep` | 交代酒店与超市生存线，用孩子事故测试苏明的控制方式 | 酒店账单 → 超市门口余怒 | 疲惫 → 应激 |
| SQ09 | `dch02_s006`–`dch02_s009`，含 `dch02_housing_hotspots` | 石佩欣登场；看房像另一场审核 | 巷口上楼 → 房屋缺陷全景 | 戒备 → 黑色幽默 |
| SQ10 | `dch02_s010`–`dch02_s021` | 搬入、房东规则与“带女朋友”问题暴露苏明的自尊伤口 | 垃圾袋行李 → 猫爪审核章 | 暂稳 → 尴尬 |
| SQ11 | `dch02_s022`–`dch02_s031` | 夜访与雷欧带来机器人体验官招募，工作与亲密关系开始重叠 | 敲门惊吓 → “什么都能当官” | 疑惧 → 诱惑 |
| SQ12 | `dch02_s032`–`dch02_s037`，含 `dch02_mobile_questionnaire` | 孤独夜晚、交友软件与产品落地页把需求变成申请 | 新床板 → NDA/问卷提交 | 空虚 → 主动越线 |
| SQ13 | `dch02_s038`–`d2_chapter_end` | 用“初审通过”把苏明和玩家推向机器人主线 | 同意勾选 → “就当我有病” | 悬停 → 决定 |

### Choice-payoff map

回响只增加 1–2 行或一个镜头/道具变化，不创建宽分支；两个选项必须共享作者终点。每个源选择
写入独立枚举变量，不得只从 `dignity` / `impulse` 总分猜测，因为多个决定会污染阈值。

| 槽 | 源选择 | 冻结变量 | 可见回响位置 | 回响语义 |
| --- | --- | --- | --- | --- |
| P01 | `d1_bones_accept` / `d1_bones_cold` | `bones_answer` | `dch01_s038` | 面对“第三页写明”时，是引用对方的诚实，还是指出诚实不等于同意。 |
| P02 | `d1_tell_flat` / `d1_tell_hard` | `breakup_delivery` | `dch02_s019` | 被问“不是刚分”时，回到玩家最初选择的承认方式；跨章回响。 |
| P03 | `d1_memory_shame` / `d1_memory_hard` | `memory_posture` | `dch02_s034` | 刷交友软件时，身体反应复现埋脸或硬撑；跨章回响。 |
| P04 | `d1_watch_leo` / `d1_rush_front` | `leo_response` | `dch01_s041` | 雷欧替他撑场时，苏明明确记得自己此前是听完还是先冲。 |
| P05 | `d1_calc_money` / `d1_still_angry` | `frontdesk_response` | `dch02_s003` | 超市工资与两份工的选择，照见前台那次“火气与计算器”。跨章回响。 |
| P06 | `d1_confirm_900` / `d1_whisper_less` | `budget_stance` | `dch02_s008` | 房租落地时分别体现守住九百或没说出口的还价。 |
| P07 | `d2_catch_firm` / `d2_catch_soft` | `child_response` | `dch02_s006` | 去看房路上用一个短动作体现强硬或克制，不替玩家重新选择。 |
| P08 | `d2_dismiss_robot` / `d2_curious_robot` | `robot_interest` | `dch02_s035`、`dch02_s040` | 落地页与终点分别回收嘴硬或好奇；最终都申请并到达作者终点。 |

### Visual shot list

正式背景以 16:9 plate 为主，可用安全裁切、前景遮挡和轻微 camera move 派生镜头，但不能用
错误地点冒充新镜头。固定角色脸不进入预渲染背景，以保护玩家选定角色身份。

| Plate ID | 覆盖 sequence | 必须表达的空间/镜头 |
| --- | --- | --- |
| `bg-test-booth` | SQ01–SQ03 | 隔音棉、平板评分条、耳机线；宽景与压迫近景两种安全裁切。 |
| `bg-quality-control` | SQ02、SQ04 | 虚掩门、监听工位、薯片与标签屏；雷欧推错门时可见强光反差。 |
| `bg-office-corridor` | SQ01、SQ04–SQ05 | 排号椅、等待人群、测试门与货梯；必须支持银色样机箱经过。 |
| `bg-office-frontdesk` | SQ06 | 过分干净的企业前台、协议平板与职业笑容，和玩家愤怒形成冷反差。 |
| `bg-breakup-bedroom` | SQ02–SQ03 | 不出现固定脸；用被子、反锁门、沙发与手机冷光表现亲密关系断裂。 |
| `bg-night-alley` | SQ07、SQ09 | 重庆旧巷、楼梯与潮湿夜色；可派生巷口、楼梯口、石家小楼外景。 |
| `bg-convenience-store` | SQ08 | 货架、收银台、扫描器与门口；支持孩子事故和条码连扫。 |
| `bg-budget-hotel` | SQ08 | 陌生床铺、廉价灯和账单，不做旅游酒店美化。 |
| `bg-rental-room` | SQ09–SQ13 | 掉墙皮、床板、门口与公共起居区；猫、行李和产品问卷均可入画。 |

手机产品页、问卷、NDA 与短信使用可访问的 diegetic UI overlay，不烘进背景。Boot splash 单独
接受美术总监审核，不能拿任一剧情背景裁切顶替。

### Character mood matrix

苏明沿用已存在的 8 个正式 mood，并按 sequence 分配：`base`(SQ01/SQ07)、`shame`(SQ02)、
`panic`(SQ03/SQ08)、`restless`(SQ04/SQ06)、`lonely`(SQ10/SQ12)、`tempted`(SQ11/SQ12)、
`uncanny`(SQ13)、`committed`(章节终点)。不得再让 `shame` 成为 90 个场景的默认值。

NPC 最小正式交付为 6 张 reference + 15 张透明立绘：陈佳 `neutral/alarmed/cold`；雷欧
`neutral/angry/bright`；石佩欣 `neutral/skeptical/firm`；工作人员 `neutral/amused`；小组长
`neutral/cold-smile`；老板娘 `neutral/stern`。没有列入矩阵的情绪由构图、光线和对白承担，
不无限扩张表情包。`AI` 与 `系统` 不使用人物脸。

### Prop inserts

| Asset ID | 首次落点 | 画面职责 |
| --- | --- | --- |
| `prop-protocol-terms` | `dch01_protocol_test` | 第三页小字、删除与模型训练的矛盾；可读文本替代必须完整。 |
| `prop-barcode-shift` | `dch02_barcode_sweep` | 订单/条码节奏与超市劳动，不做抽象小游戏皮肤。 |
| `prop-rental-receipt` | `dch02_s008`–`dch02_s010` | 九百房租与入住条件，回收 `budget_stance`。 |
| `prop-application-nda` | `dch02_s027`、`dch02_s037` | 五个零违约金、独立房间与高度拟人条件。 |
| `prop-approval-sms` | `dch02_s039`–`d2_chapter_end` | “初审通过”作为章节最后一个可见钩子。 |

### Audio and voice contract

- 每个 sequence 可以同时拥有一层 music 与一层 location ambience；两者不能再用
  `musicKey ?? ambientKey ?? bgmKey` 互斥选择。
- `ui-click` 只属于真实 UI 操作，不作为 95 个普通 scene 的进场音。剧情 SFX 保持稀疏：
  `door-lock`、`chip-bag`、`phone-buzz`、`freight-elevator`、`scanner`、`door-knock`、
  `cat-step`、`payment-receipt`，同一短段落最多一个主效果音。
- 正式 ambience 最小集合：`test-booth-hvac`、`office-corridor`、`night-alley`、
  `convenience-store`、`budget-hotel`、`rental-room`。音乐至少覆盖企业温柔压迫、分手裂缝、
  公开羞辱/到账、夜巷同盟、廉价安顿、机器人诱惑和章节终点七种功能；曲目可以跨 sequence
  回归，但不得整章只有一张循环床。
- 作者 Ink 永久免费。正文冻结后，作者对白优先生产为 `stableLineId + contentHash` 的预渲染、
  哈希登记、懒加载语音；正文播放顺序为 `authored clip -> subtitle`，不得因缺 clip 静默调用
  按次付费 live TTS。
- Live TTS 只用于 AI 生成/未规划句子和玩家主动试听，并继续走登录、电池、审核和取消边界。
  Settings 试听不是正式配音完成证明。
- 雷欧中英混排的作者对白制作成一个经批准的双语 clip；不在玩家播放时拼接两家 provider。
  预览可以顺序播放受控片段。`shop_owner`、`AI`、`系统` 必须各有独立批准 voice ID；禁止让
  `系统` 悄悄落到 narrator，也禁止 11 个角色共享两套临时声线后宣称 casting 完成。

### Presentation acceptance

- 13 个 sequence 的纯继续连击均不超过 5，所有 8 个回响槽有精确路径测试，其中至少 P02、
  P03、P05 三个跨章可见。
- 正式视觉 intake 与运行时反向覆盖包含以上 9 个 plate、15 张 NPC 立绘、6 张 reference、
  5 个 prop；缺一项时 production gate 必须继续阻断。
- 每个 sequence 至少有一次有意图的镜头/构图变化；Su Ming mood 分布不再由单一 `shame`
  垄断；桌面和移动横屏截图均保护文本与主体。
- music、ambience、SFX 可独立混音与失败降级；静音、跳过、设置往返不重复请求或播放语音。
- 正式内容/视听整合后，由三个不同执行者分别做叙事、视听、韧性只读 critic；P0/P1 清零前
  不邀请 owner 做最终真人测试。
