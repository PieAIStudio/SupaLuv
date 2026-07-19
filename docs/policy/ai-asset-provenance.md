---
id: POLICY-AI-ASSET-PROVENANCE
title: AI-Generated Asset Provenance
type: policy
status: active
canonical: true
owner: project
created: 2026-07-19
last_reviewed: 2026-07-19
domain: project-policy
tags:
  - project-policy
  - ai-generation
  - assets
  - provenance
pinned: false
related:
  - POLICY-PROJECT-BEST-PRACTICE
  - POLICY-AI-LEGIBILITY
supersedes: []
superseded_by: null
---

# AI-Generated Asset Provenance

AI 时代做游戏与传统外包的根本区别：资产不是"别人交付的成品"，而是"提示词 +
模型 + 时机"的可再现输出。丢了提示词就丢了再生成、改版、追责和授权证明的能力。
本政策规定：**每一个进入运行时的 AI 生成资产，必须有一份溯源记录。**

## 存放位置（单一真相）

```text
packages/content/assets/provenance/<asset-id>.md
```

- 与 `RUNTIME-ASSET-LEDGER.csv` / `VISUAL-ASSET-INTAKE.json` 同住真相中心，
  用资产稳定 ID 一一对应。
- **禁止**把提示词放进 `apps/web/public/**`：该目录整体部署到生产 CDN，
  等于把创作资料公开给玩家下载。
- **禁止**把多行提示词塞进台账 CSV/JSON 单元格。

## 记录格式

YAML frontmatter + 逐字提示词正文：

```markdown
---
assetId: empty-floor
kind: audio_bgm
tool: gemini-app
model: lyria-3
generatedAt: 2026-07-19
sourceUrl: https://gemini.google.com/app/xxxx
operator: owner
outputSpec: mp3 192kbps 44.1kHz
---

# Prompt (verbatim)

<提示词逐字粘贴，不许润色>

# Notes

<可选：候选轮次、废弃原因、裁剪说明>
```

## 版本管理

- git 历史就是版本历史：重新生成同一资产 = 更新同一条记录 + 替换资产文件，
  一次提交同时改两者，diff 即完整变更记录。
- 不建 v1/v2 文件副本，不建单独的版本目录。

## 入库 SOP（Temp 投递 → 上场）

1. Owner 把生成物 + 提示词 txt（含生成链接）丢进 `Temp/` 任意子目录。
2. 整理者（通常派 grok）：
   a. 定稳定 ID（kebab-case，贴现有同类命名风格）；
   b. 资产移入运行时目录（如 `apps/web/public/assets/audio/bgm/`）；
   c. 台账登记（LEDGER 行 + INTAKE 条目，source 注明工具链，如 `owner_generated_gemini_lyria3`）;
   d. 建溯源记录（本政策格式，提示词逐字）；
   e. 更新资产清点测试计数；跑 `pnpm test` 与相关审计工具；
   f. 清空 Temp 中已处理文件。
3. 验收者核对：台账 ↔ 文件 ↔ 溯源 三方一致。

## 强制检查

资产清点单测（`tests/unit/content-assets.test.ts`）必须包含：凡台账 source 标注
AI 生成（`*_generated_*` / `ai_*`）的资产，`provenance/<asset-id>.md` 必须存在，
否则测试红。人拍脑袋会忘，测试不会。

## 适用范围

图像、音频、视频、以及未来任何进运行时的生成物。运行时动态生成的内容
（AI 支线文本、玩家定制立绘）不适用本政策——那些由运行时服务与用户数据
策略管辖。
