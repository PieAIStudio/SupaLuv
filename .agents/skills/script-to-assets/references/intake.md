# 三账与门禁（真实路径）

三账都在 `packages/content/assets/`：

1. **RUNTIME-ASSET-LEDGER.csv** — 运行时资产总账：路径、SHA-256、来源批次。
   `pnpm assets:check` 会逐行 shasum 校验——改一个字节都会红。
2. **VISUAL-ASSET-INTAKE.json** — 生成记录：assetKey、渠道、prompt 摘要、日期、
   `prototype_only`、`humanArtReview`、rights 状态。
3. **candidates/<batch>/ 内的 candidate-manifest** — 批次内清单，晋升前的暂存账。

另有 `ATTRIBUTION.md` 记第三方素材署名（生成资产一般不涉及，引用参考图时要记）。

## 命令

```bash
pnpm assets:check        # CSV shasum 校验 + 去重 + intake 一致性
pnpm assets:production   # tools/asset-audit.mjs --mode=production；列 blocker
pnpm assets:duplicates   # 重复内容检测（含在 assets:check 内）
pnpm assets:intake       # intake 一致性（含在 assets:check 内）
```

## 晋升流程

candidates → 人工目检/评审通过 → 复制到运行时目录（`apps/web/public/assets/...`）→
CSV 加行（路径+SHA）→ intake 更新状态 → `pnpm assets:check` 全绿 → 运行时代码才能引用键。

## 红线

- 不许为了过门禁改字段（humanArtReview 没做就是 false）。
- `assets:production` 有 blocker 是研发期常态；它挡的是"上生产"，不挡本地开发——
  绕过它（改 audit 脚本/白名单塞私货）等于伪造证据。
