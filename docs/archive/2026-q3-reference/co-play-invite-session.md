---
id: REF-CO-PLAY-INVITE-SESSION
title: Co-Play Invite Session (Discussion)
type: archive
status: archived
canonical: false
owner: human
created: 2026-07-10
last_reviewed: 2026-07-12
domain: architecture
tags:
  - multiplayer
  - co-play
  - supabase-realtime
  - colyseus
  - vercel
  - cursor-sync
  - monetization
  - supaluv
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
  - REF-AI-CONSTRAINED-BRANCH
  - REF-PLAYER-PROTAGONIST-CUSTOMIZATION
  - POLICY-PROJECT-BEST-PRACTICE
archive_reason: The discussion is no longer current work; shipped co-play behavior lives in code and future scope in current-work.
---

# Co-Play Invite Session（讨论稿，今日不实现）

This is a **product + placement discussion**, not an implementation plan and not an accepted ADR.
Do not start coding from this file until the owner promotes it to a plan/spec.

## 1. Product idea（有没有意思？）

**有意思，而且和单机影游互补。**

核心玩法不是传统竞技对战，而是：

> 游戏拥有者打开一局 → 邀请有限名额的朋友同屏看故事 → 分歧时用轻量对决定选项 → 语音他们自己解决。

| 体验点 | 说明 |
| --- | --- |
| 跨端同局 | 拥有者在家用网页，客人在地铁用手机 App，画面与进度大致一致 |
| 光标可见 | 类似协作白板：双方能看到对方指针/焦点，增加「在一起」的存在感 |
| 选项冲突 | A 选 A、B 选 B → 弹出小对决（石头剪刀布 / 短小游戏）→ 赢者的选项生效 |
| 拥有者在线才可进 | 拥有者没开游戏 → 别人进不来（房间由 host 持有） |
| 名额商品化 | 买游戏送 1 或 3 个访客位；超额需加购席位 / 点卡 |
| 语音不做 | 玩家用手机/微信语音即可；产品只做画面与选择同步 |

**为什么值得做（商业）：**

- 单人买票 → 变成「带朋友一起笑/吵」的传播钩子。
- 席位加购是清晰、可计量的 SKU（比模糊订阅好解释）。
- 不碰色情生成器红线；娱乐性来自**社交摩擦 + 故事**，不是开放 AI 写黄文。

**为什么要克制（风险）：**

- 实时房间 + 跨端 + 存档权威是**中等以上工程**，会拖慢 Ch1 商业 demo 闭环。
- 不能做成 Supa 卡牌对战 / Boss Race；这是 **invite co-play**，不是匹配大厅。
- 必须与「单机可玩」解耦：服务器挂了，单人仍能完整通关。

**结论：** 产品方向值得写进路线图的 **D 档（研究/中后期）**；先验证单机 + AI 旁支拉动力，再开 co-play spike。

## 2. 不是什么

| 不是 | 原因 |
| --- | --- |
| Supa 卡牌多人 / Boss Race | 产品边界禁止串味 |
| 全服匹配、排行榜 PvP | 过重；本模式是「邀请熟人」 |
| 内置语音房 | 范围膨胀；手机已有语音 |
| 全员各自跑完整 Ink 再合并 | 状态分叉地狱；应 host 权威 |
| 把 AI 长生成塞进房间 tick | 超时与费用难控；AI 仍走短请求边沿 |

## 3. 推荐技术分层（关键回答：放哪？）

Pie 技术站已有：

- **SwimmerCore（Supabase）** — 账号 / 钱包 / 产品数据 / **Realtime**
- **SwimmerGameServerKit（Colyseus）** — 需要**强权威**多人房间时才用（如 Non-Heroes 对战）
- **Vercel 静态 + 可选 Functions** — Web 壳、短 HTTP（AI）
- **SwimmerAIKit + 产品 Mastra** — AI 生成（已有 `services/ai-branch`）

### 一句话（2026-07 按 TuringPact 实查后修订）

| 能力 | **首选** | 备选 / 何时升级 |
| --- | --- | --- |
| **光标 / 谁在线（presence）** | **SwimmerCore Supabase Realtime Presence**（TuringPact 同款） | Colyseus（若 Realtime 带宽/延迟不够） |
| **房间行、席位、邀请、投票结果** | **SwimmerCore 表 + Realtime `postgres_changes`** | 同上 |
| **瞬时事件**（打字中、RPS 出拳动画） | Realtime **broadcast**（TuringPact typing 同款） | Colyseus messages |
| **故事进度权威** | **Host 客户端跑 Ink** + 写快照到 room 行 / RPC | 仅当出现严重作弊/分叉再上 Colyseus 权威 |
| **AI 旁支** | 短 HTTP（可 Vercel） | 勿塞进 presence 每帧 |
| **Web 壳** | **Vercel 静态** | — |
| **语音** | **不做** | 玩家自理 |

**Vercel 在这里的角色（TuringPact 真相）：** 托管前端（+ 可选 Mastra Function），**不是**游戏房间进程。
**「简便」来自：不另起 Colyseus Cloud，实时走已有 SwimmerCore Realtime。**

### 为什么 **不要** 把「同玩实时层」塞进 Vercel Edge Function？

Edge Function 适合短生命周期 HTTP（鉴权、AI 一次生成）。
**不适合**当房间权威：无长连接 presence、光标会变成狂打 POST、host 挂线模型别扭。

**可以**继续用 Vercel：静态壳、邀请页、AI 边沿、部署日志。

### 3.1 正确对照：TuringPact（你说的那个「更简便」项目）

仓库：`/Users/yuanfei/PieAI/TuringPact`（2026-07 实查；此前误看 Non-Heroes，见 §3.4）。

TuringPact 是**社交推理房**，不是卡牌权威对战。它的「像用了 Vercel」真实分层是：

| 层 | TuringPact 实际 | 证据 |
| --- | --- | --- |
| 公共 Web | **Vercel 静态 Vite SPA** | 根 `vercel.json`：`framework: vite`，`outputDirectory: dist`，SPA rewrite；**无游戏 WS 服** |
| AI | **独立 Vercel 项目** `turing-pact-mastra` | `src/services/aiGateway.ts`、architecture 文档 |
| 账号 / 房间 / 消息 / 投票真相 | **SwimmerCore Supabase**（`turing_pact` schema） | `system-architecture.md`、migration 叙事 |
| 实时同步 | **Supabase Realtime WebSocket**（同一 Core 项目） | `src/services/realtime.ts`；文档 §9 Realtime |
| 3D 大厅多人「在场」 | **Realtime Presence** | `src/features/world-presence/**` |

```text
Browser (Vercel 静态)
   │
   ├─ Data API / Auth ──────────► SwimmerCore Supabase
   ├─ Realtime channel ─────────► 同一 Supabase（WS）
   │     • postgres_changes：rooms / room_players / messages
   │     • broadcast：typing 等瞬时态
   │     • presence：世界坐标 / 朝向 / emote（展示用）
   └─ HTTP ─────────────────────► Vercel Mastra（AI，短请求）
```

**房间频道结构（可抄）：** 一房一 channel，如 `room:{id}`，表订阅多路复用，控制手机弱网连接数
（见 TuringPact `system-architecture.md` §9）。

**Presence 传输（可抄，与鼠标同步高度同构）：**

| 文件 | 职责 |
| --- | --- |
| `world-presence/transport/worldPresenceTransport.ts` | `supabase.channel(topic, { presence: { key } })` → `track` / `sync` / `join` / `leave` |
| `world-presence/domain/presencePayload.ts` | 版本化 payload、`shouldPublishPresence` 节流（默认 ~160ms / 位移阈值）、远端插值、stale 清理 |

这不是「Vercel 魔法」，是 **浏览器直连 Supabase Realtime**；Vercel 只负责把 JS 发到用户手里。

### 3.2 鼠标 / 光标同步：合不合适？（按 TuringPact 答）

**合适，而且比上 Colyseus 更贴 TuringPact 路径。**

白板光标 = presence 的 2D 简化版：

```text
pointermove（节流，对齐 shouldPublishPresence 思路）
  → channel.track({ version:1, playerId, xNorm, yNorm, surface, updatedAtMs })
  → 他端 presence sync → 画半透明指针
```

| 细节 | 建议（对齐 TuringPact 经验） |
| --- | --- |
| 坐标系 | 相对 **16:9 stage** 的 0–1，跨手机/桌面 |
| 频率 | 最小间隔 ~100–160ms + 位移阈值；停住少发 |
| 权威 | **展示用，无权威**；勿用光标驱动剧情（TuringPact presence 也是 presentation-only） |
| host 在线 | host 的 presence key 必须在；host leave → 客人只读结束/踢出 |
| 弱网 | Realtime 自带重连；回房后 **再 fetch 房间快照**（TuringPact 重连策略） |
| 踩过的坑 | 同 topic 快速 untrack/resubscribe 的 cleanup 竞态（TuringPact 已有 pending cleanup Map）——实现时直接借鉴 |

| 方案 | 光标 | 完整 co-play（host + 进度 + 投票/RPS） | 给 SupaLuv |
| --- | --- | --- | --- |
| **SwimmerCore Realtime（TuringPact）** | **最合适** | **合适（首选）** | **v1 主路径** |
| Colyseus / GameServerKit（Non-Heroes） | 合适 | 更强权威 | 仅当 Realtime 不够（作弊/复杂权威/更高频） |
| 纯 Vercel Edge Function | 不合适 | 不合适 | 否决作房间 |
| Liveblocks 等第三方白板 | 光标好 | 半套 | 与 Pie Core 重复，不优先 |

### 3.3 SupaLuv 推荐形态（对齐 TuringPact，比 Non-Heroes 轻）

```text
[Web / 以后 App]  ──静态──►  Vercel
        │
        ├─ Auth / 席位 / 邀请码 / room 行 ──►  SwimmerCore
        │
        ├─ Realtime presence ──────────────►  光标 + host 在线
        ├─ Realtime postgres_changes ──────►  呈现快照、选项票、RPS 结果
        ├─ Realtime broadcast（可选）──────►  瞬时 UX
        │
        └─ HTTP AI ────────────────────────►  现有 ai-branch / 以后 Vercel Function
```

**产品语义仍由 SupaLuv 定义：** host 跑 Ink；客人 spectator + 投票；席位商品化；语音不做。
**基础设施抄 TuringPact，不抄 Non-Heroes 的 Colyseus 对战服**（除非以后证明需要）。

### 3.4 误对照：Non-Heroes（战斗服，不是你要的「简便」）

仓库：`/Users/yuanfei/PieAI/Non-Heroes`。
它是 **Vercel 静态 + Colyseus Cloud 权威对战 + SwimmerCore**。适合 Boss Race 类 tick 权威，**比 TuringPact 重一档**。
SupaLuv 邀请同玩更接近 **TuringPact 社交房 + presence**，不是卡牌权威。

Pie 政策仍成立：

> Colyseus **不是**所有产品默认依赖；只有需要服务端权威多人房间时才用。

SupaLuv co-play v1 **尚未**证明需要 Colyseus；TuringPact 路径更省运维（无第二套游戏云）。

## 4. 建议的会话模型（概念）

```text
[拥有者 Host] 打开游戏 → 创建/打开 co-play room 行（SwimmerCore）
       │                  + presence track（host 在线）
       │
       ├─ 校验 owner + 剩余席位（Core / RLS / RPC）
       │
       └─ 邀请码/链 → 客人 join
              │
              ├─ 客人订阅 room 行 + presence
              │     （场景/对白快照、光标）
              │
              ├─ 选择点：各写一票（表或 RPC）
              │     一致 → host 推进
              │     冲突 → RPS 状态写回 room → 赢者选项
              │
              └─ Host presence leave / 关页 → 房间结束
```

### 权威原则（解耦关键）

| 状态 | 权威 |
| --- | --- |
| 故事进度、当前 Ink 位置、最终选项 | **Host 客户端** + Core 上的快照/结果行（防双端 Ink） |
| 光标坐标 | 各端 **presence track**（展示用） |
| 席位与是否允许加入 | **SwimmerCore**（RLS/RPC） |
| AI 旁支文本 | **AI 边沿服务**；结果写入 room 再 Realtime 推 |
| 单机存档 | 仍 local；**与 co-play 会话分离** |

第一版实现建议（将来）：

1. **Host 跑 Ink**；只同步呈现快照 + 选择结果，不在服务端重跑 Ink。
2. 客人是 **spectator + 投票者**。
3. 运输层可抽 `CoPlaySession`（Realtime adapter），**不要**把 Supabase 塞进 `DialoguePanel`。
4. 协议与 payload 版本化（学 TuringPact `version: 1`），方便以后若升级 Colyseus 也不炸客户端。

## 5. 商业 / 名额（草图）

| SKU 想法 | 效果 |
| --- | --- |
| 买断 / 基础包 | 1 个同时访客席（或 0，仅单机） |
| 买断 + 派对包 | 同时 3 访客 |
| 加购席位 | +1 同时在线访客（可叠到上限） |
| 点卡 | 可映射为临时席位日 / 周，或 AI 次数（与 B8 计费分开记账） |

规则建议：

- **同时在线** 计席，不是历史累计邀请人数。
- 拥有者自己不占访客席。
- 超额 join 被 Core 拒绝，房间层不再次发明配额。

## 6. 与现有系统的边界

| 现有 | 关系 |
| --- | --- |
| 单机本地存档 | 保持可玩；co-play 是可选模式 |
| AI constrained branch | 同玩时仅 host 触发生成；结果共享；规则仍 rejoin |
| 成就 / 路径记忆 | 第一版可只记 host；客人成就另议 |
| PostHog | 事件：`coplay_room_created` / `invite_joined` / `choice_duel_resolved` |
| 非协商事项 | 不做色情生成器；不做卡牌匹配 |

## 7. 研究清单（实现前要搞清）

1. SupaLuv product schema 放 SwimmerCore 的哪张表 / 是否独立 schema（学 `turing_pact`）。
2. Realtime presence 载荷大小与 2–4 人光标频率上限（对齐 ~160ms 节流）。
3. 弱网（地铁）：presence 丢包 + 重连后 fetch 房间快照。
4. Host 中途掉线：presence leave 后立刻散房 vs 短暂宽限。
5. 选择冲突 UX：RPS；是否叠「全球回声」彩蛋。
6. 合规：邀请是否需登录；未成年人与同玩。
7. 与 B8 计费、C11 包装顺序。
8. ~~纯 Vercel 当游戏服~~ → **否决**（壳可以，房不行）。
9. ~~默认上 Colyseus~~ → **v1 不默认**；仅 Realtime 不够再升（见 §3.3–3.4）。
10. 可复用 TuringPact presence 的哪些纯函数（节流/插值/cleanup）而不拷贝 3D 大厅。

## 8. 已落地：本机同玩 demo（2026-07）

| 能力 | 状态 | 代码 |
| --- | --- | --- |
| 房间码 create/join | done | `TitleScreen` + `protocol.makeRoomCode` |
| 运输层 | **BroadcastChannel** 默认；可选 **Supabase Realtime broadcast** | `createCoPlayTransport` / `realtimeTransport.ts` |
| 光标 presence 节流 | done（TuringPact 思路 2D 化） | `cursorPresence.ts` |
| Host 故事快照 | done | `useCoPlaySession.publishStory` |
| Guest 围观 + 投票 | done（无 RPS） | `VisualNovelPrototype` guest path |
| SwimmerCore Realtime | **未接** | 下一步把 transport 换掉即可 |
| 席位 SKU / RPS | **未做** | 商业与对决仍研究 |

单机路径完全解耦：不进同玩 = 原样 solo。

## 9. 明确仍不做（直到 Core 接线）

- 不接 SwimmerCore / 不写 co-play 表
- 不写 Colyseus room
- 不改 `services/ai-branch` 成房间服
- 不在 Vercel Edge 上硬做 WebSocket 房间权威

## 10. 推荐落地顺序（剩余）

1. **ADR**：接受「v1 实时 = SwimmerCore Realtime（TuringPact 模式）；权益 = Core；AI = 边沿；Colyseus 仅升级阀」。
2. ~~Presence spike~~ → **本机已通**；下一步 Realtime adapter。
3. **Room 行 + 假进度快照**（postgres_changes）。
4. ~~挂上 play 呈现~~ → 已有 mirror。
5. **RPS 对决**（投票冲突时）。
6. **席位 / 邀请码**（Core）。
7. **再谈 App 与加购**；若卡权威再评估 GameServerKit。

## Related

- Pie stack: `docs/policy/shared-rules/pie-product-technology-stack.md`（Core / Colyseus 分工）
- **TuringPact 实装参考**（外仓）：`src/services/realtime.ts`、`src/features/world-presence/**`、`docs/reference/architecture/system-architecture.md` §9
- Roadmap D 档: `docs/reference/execution/feature-status-and-roadmap.md`
- AI 合同: `docs/reference/architecture/ai-constrained-branch.md`
