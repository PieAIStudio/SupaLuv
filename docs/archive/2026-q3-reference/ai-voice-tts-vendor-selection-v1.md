---
id: REF-AI-VOICE-TTS-VENDOR-SELECTION-V1
title: AI Voice TTS Vendor Selection v1
type: archive
status: archived
canonical: false
owner: human
created: 2026-07-10
last_reviewed: 2026-07-12
domain: research
tags:
  - tts
  - voice
  - elevenlabs
  - research
pinned: false
related:
  - REF-CURRENT-WORK
  - REF-FEATURE-STATUS-ROADMAP
archive_reason: Vendor research is historical; dual-tts-routing and runtime configuration are current truth.
---

# AI Voice TTS Vendor Selection (v1)

> Owner-commissioned research (GPT-5.6 sol pro, 2026-07-10), archived from `Temp/`.
>
> **Runtime truth (2026-07, supersedes research prose below):** dual route —
> **MiniMax (zh\*) + ElevenLabs (western)**. See `dual-tts-routing.md`.
> OpenAI `gpt-4o-mini-tts` is **not** the live fallback (and is deprecated in
> OpenAI’s model catalog). Treat “ElevenLabs + OpenAI fallback” below as
> historical research only.


问题：

---

# 任务：为互动影游 SupaLuv 选型「有情绪的 AI 语音」供应商（2026-07 现状）

## 产品约束

- 类型：Web 优先互动影游 / 视觉小说壳（Ink 主线 + 短 AI 旁支）
- 市场：海外（欧美为主），暂不做中国大陆分发
- 商业：预制主线免费；AI 功能（旁支 TTS、生图、同玩）扣「电池」(SwimmerCore wallet)
- 语音场景两类：
  1. 预制台词：可离线/预生成并 CDN 缓存
  2. AI 旁支：每次不同，需近实时合成（可接受 1–3 秒首包）
- 需要：中文 + 英文至少可用；最好可后续多语言
- 需要：情绪/表演感（愧疚、讽刺、亲密、慌张），不是导航腔
- 需要：稳定角色音色（至少 3–5 个固定角色声线）
- 不要：玩家端必须下载 2GB+ 本地模型；不要自建 GPU 集群作为 v1
- 安全：服务端调用；密钥不进浏览器；失败可降级为纯字幕

## 请你交付（务必带引用与日期）

1. 候选清单（至少 6 家）：ElevenLabs、Cartesia、OpenAI TTS/gpt-4o-mini-tts、Hume、Google Gemini TTS、Deepgram Aura、其他你认为更强的。
2. 对比表：情绪可控方式（prompt / SSML / 标签）、延迟、克隆、语言、商业授权、约价（$/1M chars 或 $/分钟）、流式 API、缓存友好度。
3. 针对「视觉小说旁白 + 角色对白」的推荐：
   - A 默认生产方案
   - B 低成本备选
   - C 实时对话型备选（若有）
4. 明确否决：哪些适合客服电话/agent，不适合影游表演。
5. 架构建议：
   - 预生成 vs 实时分轨
   - 按 (characterId, textHash, emotion) 缓存
   - 与电池扣费：reserve → 合成 → commit/refund
6. 最小 POC 清单（7 天内能完成）：测哪些句、什么情绪、通过标准。
7. 风险：版权、deepfake 政策、未成年、成人向暧昧内容边界（产品不是色情生成器，但是成人关系喜剧）。
8. 结论必须是可执行推荐，不要和稀泥；不确定处标注 conf / 需实测。

## 输出格式

- 先给 1 页 executive summary
- 再给对比表
- 最后给「若我是 CTO 会签什么」决策段

---

## GPT-5.6 sol pro回答：

我会按你的 SupaLuv 产品约束来评估，而不是单纯比较「谁的 TTS 最强」。
**核心判断标准：互动影游 ≠ AI 客服。** 影游需要的是「角色表演稳定性 + 情绪可导演 + 音色一致 + 商业可控」，而不是最低延迟。

> 说明：当前日期为 **2026-07-10**。以下价格、能力来自各厂商公开文档/定价页，截至该日期可见信息；部分新模型能力变化快，标注 **conf（置信度）** 和 **需实测**。

---

# Executive Summary（1页决策版）

## 结论（CTO 视角）

如果我是 SupaLuv CTO：

### ✅ A 默认生产方案：ElevenLabs（主） + OpenAI TTS（备用）

**推荐组合：**

| 用途                         | 供应商                   |
| ---------------------------- | ------------------------ |
| 预制主线角色对白             | ElevenLabs               |
| AI 旁支角色对白              | ElevenLabs Turbo / Flash |
| 失败 fallback / 大量廉价文本 | OpenAI gpt-4o-mini-tts   |
| 未来 AI 陪伴式实时角色       | Hume 或 OpenAI Realtime  |

原因：

- ElevenLabs 目前仍是「游戏角色声音」领域最成熟方案之一：
  - 情绪表现领先
  - voice consistency 强
  - voice cloning 完善
  - 商业授权路径清晰
  - 多语言覆盖广

适合：

> 「一个角色说一句话，玩家相信这个角色真的有情绪」

---

## B 低成本备选：Cartesia

适合：

- AI 旁支大量生成
- 电池消耗场景
- 高频短句

优势：

- 延迟非常低
- Streaming 强
- Web 产品友好

不足：

- 戏剧表演复杂度目前弱于 ElevenLabs

---

## C 实时 AI 角色：Hume / OpenAI Realtime

如果未来做：

- 玩家和角色聊天
- AI 同玩
- 实时情绪反馈

优先：

1. Hume EVI
2. OpenAI Realtime API

但是：

**不要拿它们作为 v1 视觉小说主线 TTS。**

原因：

实时 agent voice ≠ 配音演员。

---

## 明确淘汰

不建议作为 SupaLuv 主力：

| 供应商             | 原因                      |
| ------------------ | ------------------------- |
| Deepgram Aura      | 客服/agent 优化，不够戏剧 |
| Google Gemini TTS  | 技术强，但游戏角色生态弱  |
| Azure Neural Voice | 企业级，角色感不足        |

---

# 候选供应商对比

数据来源：

- ElevenLabs Documentation / Pricing
  [https://elevenlabs.io/pricing](https://elevenlabs.io/pricing)
  [https://elevenlabs.io/docs](https://elevenlabs.io/docs)
  （访问日期：2026-07-10）

- Cartesia Docs / Pricing
  [https://cartesia.ai/pricing](https://cartesia.ai/pricing)
  [https://docs.cartesia.ai](https://docs.cartesia.ai)
  （访问日期：2026-07-10）

- OpenAI Audio API
  [https://platform.openai.com/docs/guides/text-to-speech](https://platform.openai.com/docs/guides/text-to-speech)
  （访问日期：2026-07-10）

- Hume AI Voice
  [https://www.hume.ai/voice](https://www.hume.ai/voice)
  （访问日期：2026-07-10）

- Google Gemini Speech
  [https://ai.google.dev/gemini-api/docs/speech-generation](https://ai.google.dev/gemini-api/docs/speech-generation)
  （访问日期：2026-07-10）

- Deepgram Aura
  [https://deepgram.com/products/text-to-speech](https://deepgram.com/products/text-to-speech)
  （访问日期：2026-07-10）

---

## 综合表

| 供应商                     | 情绪控制                | 延迟                | 克隆  | 语言               | 价格约                                           | Streaming | 缓存  |
| -------------------------- | ----------------------- | ------------------- | ----- | ------------------ | ------------------------------------------------ | --------- | ----- |
| **ElevenLabs**             | ★★★★★ prompt + style    | 低(Flash~<1s首包级) | ★★★★★ | 30+                | 约 $5-$330/月套餐；API约$0.06-$0.30/1K chars级别 | ✅        | ★★★★★ |
| **Cartesia Sonic**         | ★★★★ prompt/style       | ★★★★★               | ★★★★  | 多语言             | 约 $0.10-$0.30/百万字符级                        | ✅        | ★★★★★ |
| **OpenAI gpt-4o-mini-tts** | ★★★★ instruction prompt | ★★★★                | ★★★   | 50+                | 约 $15/百万字符级（官方价格可能变化）            | ✅        | ★★★★★ |
| **Hume EVI**               | ★★★★★ emotion-aware     | ★★★★                | ★★★★  | 英语强，多语言扩展 | 企业/量级报价                                    | ✅        | ★★    |
| **Gemini TTS**             | ★★★★ style prompt       | ★★★                 | ★★★   | 多语言             | 按 Gemini API token计费                          | 有限      | ★★★★  |
| **Deepgram Aura**          | ★★                      | ★★★★★               | ★★    | 英语重点           | 低价                                             | ✅        | ★★★★★ |

---

# 逐家分析

---

# 1. ElevenLabs

## 定位

目前最接近：

> AI 配音演员

## 情绪

支持：

- style prompt
- voice settings
- expressive delivery

例如：

```
Speak with restrained anger.
A character hiding sadness behind sarcasm.
```

效果：

★★★★★

尤其：

- 讽刺
- 温柔
- 犹豫
- 悲伤
- 低声

明显领先。

## Voice Clone

强项。

支持：

- instant voice clone
- professional voice clone

适合：

3-5 个固定角色。

## 游戏适配

非常适合：

```
Character:
Luna

Emotion:
guilty

Text:
"I didn't mean to hurt you..."
```

生成。

---

# 2. Cartesia

## 定位

低延迟实时 TTS。

优势：

- WebSocket streaming
- 首包快

非常适合：

AI 旁支：

```
玩家选择 →
LLM →
Cartesia →
播放
```

体验很好。

不足：

复杂情绪：

ElevenLabs 更像演员。

Cartesia 更像优秀主播。

---

# 3. OpenAI gpt-4o-mini-tts

## 优点

开发简单。

Prompt 控制：

例如：

```
Voice:
young female

Emotion:
playful but nervous

Speak like a visual novel character
```

效果不错。

优势：

如果你的系统已经使用 OpenAI：

架构简单。

---

## 缺点

角色 IP 感：

目前不如 ElevenLabs。

---

# 4. Hume AI

这是特殊玩家。

核心：

不是 TTS。

而是：

> emotion intelligence voice

它理解：

- 情绪
- 语气
- 互动

适合：

AI boyfriend/girlfriend
AI companion
interactive character

但：

视觉小说预制对白：

成本和复杂度偏高。

---

# 5. Gemini TTS

Google 优势：

语言覆盖。

支持：

自然语言描述声音：

例如：

```
Warm storyteller voice,
dramatic fantasy narrator
```

但是：

游戏社区验证少。

---

# 6. Deepgram Aura

优秀：

- 电话
- agent
- 实时客服

不推荐影游。

原因：

目标：

```
"How can I help you today?"
```

不是：

```
"I waited three years for you..."
```

---

# 推荐架构

## 1. 两条语音管线

不要混。

---

## Pipeline A：主线预制

```
Ink Script

↓

Voice Pipeline

↓

ElevenLabs

↓

Audio CDN

↓

Player
```

生成：

一次。

缓存：

永久。

数据库：

```json
{
  "characterId": "luna",
  "textHash": "abc123",
  "emotion": "sad",
  "voiceVersion": "v3",
  "url": "cdn/audio/luna/abc.mp3"
}
```

---

## Pipeline B：AI旁支

```
Player choice

↓

LLM

↓

Emotion classifier

↓

TTS

↓

Stream

↓

Cache
```

---

缓存 key：

必须：

```
(characterId,
 textHash,
 emotion,
 speed,
 modelVersion)
```

否则：

升级模型后无法invalidate。

---

# 电池计费设计

不要：

```
Generate
↓
Charge
```

容易被刷。

应该：

## Reserve

用户：

100 battery

请求：

预计消耗 5

冻结：

5

---

## Generate

成功：

commit

失败：

refund

流程：

```
reserveBattery()

↓

TTS request

↓

success?

YES:
commit()

NO:
refund()
```

---

# 7天 POC

## Day 1-2

准备 30句 benchmark。

角色：

### 女主

情绪：

- 温柔
- 生气
- 内疚

### 男主

- 冷漠
- 讽刺
- 心软

### NPC

- 搞笑
- 慌张

---

## 同一句测试

文本：

> "你终于回来了，我还以为你不会来了。"

测试：

| 情绪      |
| --------- |
| sad       |
| angry     |
| relieved  |
| sarcastic |
| romantic  |

---

比较：

ElevenLabs

Cartesia

OpenAI

Hume

---

## 评分

100分：

| 指标     | 权重 |
| -------- | ---: |
| 角色感   |   30 |
| 情绪准确 |   25 |
| 音色一致 |   20 |
| 延迟     |   15 |
| 价格     |   10 |

---

通过标准：

> 80分以上进入生产。

---

# 风险

## 1. Voice copyright

必须：

- 只使用授权声音
- 保存 voice consent

尤其：

不要：

"像 Scarlett Johansson"

这种 prompt。

---

## 2. Deepfake

海外：

重点：

- EU AI Act
- California voice laws

需要：

voice provenance。

---

## 3. 未成年人

如果角色：

看起来未成年：

避免：

- 性感化
- 恋爱诱导

---

## 4. 成人关系喜剧

你的定位：

可以：

✅ flirt
✅ romance comedy
✅ adult relationship

避免：

❌ explicit sexual roleplay voice generation

---

# 最终 CTO 决策

如果今天签：

## v1（0-6个月）

我会签：

### 主合同

**ElevenLabs**

用途：

- 所有正式角色
- 主线
- 高价值 AI 旁支

### Backup

**OpenAI gpt-4o-mini-tts**

用途：

- fallback
- 大量低价值生成

### 实验账户

**Cartesia**

用途：

- realtime AI companion

---

## 不会签：

Deepgram Aura
Google TTS
Azure Voice

作为主角色声音。

---

## 推荐最终架构：

```
              Ink Story
                  |
          Character Voice DB
                  |
        -------------------
        |                 |
   Cached Audio       AI Branch
        |                 |
   ElevenLabs       LLM + Emotion
                         |
              Cartesia/OpenAI
                         |
                    Battery Wallet
```

---

**最终判断（conf 0.85）：**

SupaLuv 这种「视觉小说 + AI 旁支」产品，2026 年最稳路线不是追求最低成本 TTS，而是：

> ElevenLabs 做“演员”，OpenAI/Cartesia 做“即时演员替身”。

这套组合最符合海外互动影游商业化路径。

---
