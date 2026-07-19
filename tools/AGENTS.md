# tools/ — AI 入口

仓库根下的可执行工具。改工具前先读本文件 + 目标脚本头注释/`--help`。

## 声明规则

- 每个 CLI 的 **`--help` 与文件头注释必须与真实行为一致**。
- 发现不一致：**只修帮助文本 / usage 输出 / 头注释**，不许顺手改工具行为。

## 工具一览

### asset-audit

校验视觉 intake + 运行时资产 ledger（结构、覆盖、质量门；`production` 模式额外 release blocker）。

```bash
pnpm assets:intake                 # node tools/asset-audit.mjs --mode=intake
pnpm assets:production            # --mode=production（发行门，材料未齐会失败）
pnpm assets:check                 # ledger 哈希 + 去重 + intake
node tools/asset-audit.mjs --help
node tools/asset-audit.mjs --mode=intake --json --report .scratch/asset-audit-intake.json
```

### auto-player

用内置 persona 确定性走完 draft-ch01/02/03，写出 transcript + `summary.json`。

```bash
pnpm auto-player --help
pnpm auto-player --persona all --out .scratch/auto-player-run
pnpm auto-player --persona mianzi --out /tmp/ap --chapter draft-ch01
```

### voice-pregen

离线遍历编译后 Ink，按运行时分句规则生成对白语音库到 `apps/web/public/assets/voice/`（需 server env 中的 TTS 密钥）。

```bash
npx tsx tools/voice-pregen/generate.ts --dry-run
npx tsx tools/voice-pregen/generate.ts --chapter=draft-ch01
npx tsx tools/voice-pregen/generate.ts
```

中文选角读 `services/ai-branch/src/tts/ttsRoute.ts` 的 `CHINESE_VOICE_MAP`。

### portrait-matte

绿幕立绘去底（allowlist 输入 → runtime PNG）。说明见 `tools/portrait-matte/README.md`。

```bash
node tools/portrait-matte/process.mjs --write-runtime
node tools/portrait-matte/process.mjs --out-dir .devspace-visual/portrait-matte/candidate
node tools/portrait-matte/calibrate.mjs --report .devspace-visual/portrait-matte/calibration.json
node tools/portrait-matte/gate.mjs
node tools/portrait-matte/verify.mjs
```

### storygraph

Ink + scene 对齐后生成 Obsidian canvas JSON（当前主路径：chapter-01-trial）。

```bash
node --input-type=module -e "await import('./tools/storygraph/ink-to-canvas.ts')"
# 单测入口：tests/unit/chapter-01-trial-pipeline.test.ts
```

### measure-web-bundle

先 `pnpm --filter @supaluv/web build`，再量 dist 初始/总 JS 体积，stdout 打 JSON。

```bash
pnpm measure:bundle
# 或 node tools/measure-web-bundle.mjs
```

### check-file-budgets

God-file 行数预算闸门（超限非 0）。

```bash
pnpm check:budgets
# 或 node tools/check-file-budgets.mjs
```

### verify-vercel-output

在已有 `.vercel/output/` 上断言 web + ai-branch 服务与路由契约（需先 `pnpm build:vercel`）。

```bash
pnpm build:vercel
pnpm verify:vercel-output
# 或 node tools/verify-vercel-output.mjs
```

## 其它

- `install-git-hooks.mjs`：`pnpm prepare` 安装 lefthook，日常不必手跑。
