---
id: REF-CHAPTER-END-GLOBAL-CHOICE-STATS
title: Chapter-End Global Choice Stats
type: reference
status: active
canonical: true
owner: ai-assisted
created: 2026-07-10
last_reviewed: 2026-07-12
domain: architecture
tags:
  - analytics
  - posthog
  - chapter-end
  - social-proof
  - supaluv
pinned: false
related:
  - REF-CURRENT-WORK
  - POLICY-PROJECT-BEST-PRACTICE
---

# 章节结算 · 全球选项回声

Telltale-style **「有多少玩家和你选了一样」** at chapter end.

## 1. 对标

| 参考 | 玩家感知 |
| --- | --- |
| **Telltale**（《行尸走肉》等） | 章末关键抉择 + 全球 % |
| Supermassive 等叙事作 | 「我稀有 / 我主流」的回味 |

## 2. 已实现（F24–F26）

| 层 | 位置 | 行为 |
| --- | --- | --- |
| 白名单 catalog | `apps/web/src/stats/choiceStatsCatalog.ts` | 仅重大分叉；continue 不计 |
| 稳定 choiceId | 同上 + PostHog `choice_made.choiceId` | 改文案不改键 |
| 本局 picks | `VisualNovelPrototype` session list | 结算「你选了」 |
| 本机计数 | `choiceStatsLocal.ts` | localStorage |
| 演示基线 | `choiceStatsSeed.ts` | 冷启动也有 % |
| 在线池（可选） | `services/ai-branch` `GET/POST /choice-stats*` | 内存；Vite `/api/choice-stats` |
| 合并展示 | `choiceStatsMath` + `ChapterEndCard` | 条 + 多数/少数标签 |
| 分析 | `productAnalytics` | 只 ID，无对白全文 |

**AI 旁支：** 不进百分比条（自由文本不可聚合）。

**标签：** 多数派 ≥55% · 少数派 ≤32% · 否则中位。样本 &lt; 8 隐藏 %（基线通常够）。

### 数据流

```text
点选项 → resolve catalog
       → local++ + best-effort remote POST
       → PostHog choice_made { choiceId }
       → session picks

章末 → seed ⊕ local ⊕ remote → % 与标签 → ChapterEndCard「全球回声」
```

### 运维备注

- 演示基线不是「真实全球」；文案写「含演示基线 · 本机 ·（在线池）」以免撒谎。
- 生产可把 seed 权重降到 0，换成 PostHog/HogQL 夜间快照写入 CDN。
- 在线池进程重启会清空内存——本机与 seed 仍可用。

## 3. 对玩家的刺激（为什么好玩）

| 刺激 | 机制 |
| --- | --- |
| **社会比较** | 「我和大多数一样」或「我是少数派」→ 身份感 |
| **事后审判** | 故事结束才揭晓，像成绩单，不打断沉浸 |
| **二周目钩子** | 想刷另一边看会不会更「稀有」 |
| **羞耻喜剧放大** | 选了更脏的路却发现 58% 同道 → 黑色幽默 |
| **分享素材** | 摘要/分享卡可带「少数派」标签（以后） |

## 4. 引申玩法（结合现有脑洞，未实现）

与 co-play、换脸、AI 旁支、计费同一产品宇宙，**分项解耦**：

| 玩法 | 怎么刺激 | 依赖 |
| --- | --- | --- |
| **稀有路径徽章** | 全章重大抉择里 ≥3 条少数派 → 成就「逆流订单」 | 成就系统已有 |
| **全球路径海报** | 结算生成「你的分叉树 vs 社区热度」图 | 分享卡 A5 |
| **本机 vs 全球** | 双环对比：你历史 vs 社区 | pathMemory + 本统计 |
| **每周社区议题** | 运营置顶一个抉择做话题（「这周大家都在删还是截」） | 内容日历 |
| **Co-play 吵架回声** | 同局两人选项不一致时，弹出「全球更站哪边」当裁判彩蛋（可替代或补充 RPS） | D 档 co-play |
| **换脸后的匿名榜** | 自定义主角不进脸数据；只传 choiceId——恶搞朋友不泄露肖像 | E 档自定义 |
| **AI 旁支热度** | 不比文案，只比「是否点了 AI 槽」% | 已有 source |
| **付费看深度** | 免费看 2 条回声；订阅看全部分叉 + 区域榜 | B8 计费 |
| **「预言家」模式** | 选之前猜全球会怎么走，结算对错给彩蛋 | 新轻玩法 |
| **影游彩蛋** | 若社区在某点 ≥70% 同选，下一章旁白一句「大多数人也这么干了」 | 内容钩子（慎用剧透） |

**建议优先级：** 稀有徽章 → 分享卡带 % → 预言家 → co-play 裁判彩蛋。
都不要和实时房间绑死。

## 5. 不做

- 浏览器持 PostHog 查询密钥
- 按 AI 自由文本聚合
- 每个 continue 都进榜
- 把统计失败变成挡结算

## Related

- Catalog / client: `apps/web/src/stats/*`
- End UI: `apps/web/src/views/ChapterEndCard.tsx`
- Remote: `services/ai-branch/src/choiceStatsStore.ts`
- Tests: `tests/unit/choice-stats.test.ts`
