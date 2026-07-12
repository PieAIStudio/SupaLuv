---
id: SPEC-0003
title: Draft chapters, shared story graph, and game-feel baseline
type: spec
status: active
canonical: true
owner: human
created: 2026-07-12
last_reviewed: 2026-07-12
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
