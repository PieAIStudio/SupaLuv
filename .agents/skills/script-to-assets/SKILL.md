---
name: script-to-assets
description: 'Generate and intake game visual assets (backgrounds, character portraits with mood variants, prop cut-in stills) for SupaLuv chapters from the scene manifest. Use whenever the user asks to 生成剧情资产 / 给新章节配图 / generate backgrounds or portraits / 补立绘, or after novel-to-ink-script lands a new chapter whose manifest references missing asset keys. Covers the style-tile (风格试板) selection workflow and the three-ledger asset gate. Not for audio/BGM and not for marketing art.'
metadata:
  short-description: Scene manifest → generated visual assets with gates
  version: "1.0.0"
---

# script-to-assets

从章节的场景 manifest 出发，盘点缺失的视觉资产键，用生成式渠道补齐，并走完项目的
资产三账与审核门。**资产不入正账不算存在**；prototype_only 资产照常打标，不骗门禁。

## 前置

1. 盘点缺口：grep 该章 manifest 的 backgroundKey/artKey/portraitKey/companionPortraitKey 与
   `packages/content/src/propCatalog.ts` 落点，对照 `apps/web/public/assets/` 现有文件列缺失清单。
2. 读 `references/generation.md`（渠道与命令）与 `references/intake.md`（三账与门禁）。
3. 风格基线：**绘画感写实**（painterly realism，介于写实与风格化之间，参照 Arcane 质感）。
   若风格 ADR 尚未冻结，先走"风格试板"流程（见下），不许直接批量生成。

## 风格试板（style tiles，仅风格未冻结时）

1. 取同一个代表场景（建议：夜班超市收银台 + 苏明侧脸），用 SuperGrok 生成 4-6 块风格微调试板：
   写实摄影感 / 绘画感写实(Arcane系) / 厚涂插画 / 轻水彩 / 2.5D 渲染感，每块同构图同光位。
2. 试板落 `Temp/style-tiles-<date>/`，写一页对照说明（每块的 prompt 与差异点）。
3. **停下来等用户目选**；选定后把风格关键词、负面词、参考图冻结进 ADR（docs/adr/），
   此后所有生成 prompt 必须引用该 ADR 的风格块。

## 生成规则

- 人物立绘：每个说话角色 × 情绪变体（苏明 8 情绪是基线：base/committed/lonely/panic/restless/shame/tempted/uncanny；
  次要角色至少 neutral + 1 变体）。同角色跨情绪必须锁脸（同 seed/参考图链）。
  真人风险红线：不得生成未成年人形象；不得复刻真实名人脸。
- 背景：16:9 舞台位（1920×1080 起），键名 `bg-<场景>-<时段>`；同场景日/夜是两个键。
- 道具静物：cut-in 用文件/收据/短信截图类静物，正文文字必须与剧情一致可读（生成后逐字校对，
  错字就重生成或后期修字）。
- 全部产物先进 `packages/content/assets/candidates/<batch>/`，人工/评审通过才晋升正式目录。

## 门禁（一步不许跳）

```bash
pnpm assets:check        # intake / candidate-manifest / rights 三账一致
pnpm assets:production   # 生产门（有 blocker 是常态，不许绕过或伪造字段）
```

字段如实：`prototype_only`、`humanArtReview: false`、rights 待定就写待定。
运行时引用只指向通过 assets:check 的文件；游戏内出现的资产必须能在三账追溯到生成记录。

## 交付自检

- [ ] 该章 manifest 引用的每个资产键都有文件或明确的占位决定
- [ ] 立绘：同角色全情绪脸一致（并排九宫格目检）
- [ ] 道具：文字与剧情逐字一致
- [ ] 三账一致、批次可追溯（prompt、渠道、日期入 intake 记录）
- [ ] 浏览器里跑一遍该章截图，确认无穿帮（时钟/文字/朝向）
