# @supaluv/content — AI 入口

内容真相中心：Ink 剧情、scene manifest、编译产物、角色台账、资产台账与溯源。

## 真相流水线（一句话图）

```text
ink/*.ink  →（compile-ink）→  compiled/*.json  →  manifests/*-scenes.ts（表现层）
  →  src/chapters/*.ts 注册  →  catalog/story-catalog.json  →  运行时 loadStoryChapter
```

| 层 | 路径 | 角色 |
| --- | --- | --- |
| 剧情拓扑 SSOT | `ink/draft-ch0N.ink`（+ 可选 `.en.ink`） | 节点 / choice / divert；`# scene:<id>` / `# choice:<id>` |
| 编译产物 | `compiled/draft-ch0N.json` | 派生产物，**勿手改** |
| 表现层 | `manifests/draft-ch0N-scenes.ts` | speaker / artKey / portraitKey / bgmKey / mood…；**禁止**写 choices/autoNext |
| 章节注册 | `src/chapters/draft-ch0N.ts` + `src/index.ts` | 绑定 compiled + scenes；catalog 元数据 |
| 章节链 SSOT | `catalog/story-catalog.json` | 包 / 章 / checkpoint / 文件名 |
| 角色台账 | `characters/registry.ts` | 中文 speaker → id / 默认立绘 |
| 资产三账 | `assets/RUNTIME-ASSET-LEDGER.csv`、`VISUAL-ASSET-INTAKE.json`、`ATTRIBUTION.md` | 运行时指纹 / 视觉 intake / 人类可读出处 |
| 溯源 | `assets/provenance/<asset-id>.md` | AI 生成提示词与模型记录（政策：`docs/policy/ai-asset-provenance.md`） |

NarrativeGraph（`generated/`）也是派生产物，勿手改。更长管线见同目录 `README.md`。

## 术语与已知双轨（不改名，只映射）

| 术语 | 含义 | 合法值从哪来 |
| --- | --- | --- |
| `sceneId` | 场景稳定 ID；Ink knot 名 + `# scene:<id>` + manifest `id` **三者对齐** | 现有 ink/manifest；新 ID 用 `dch0N_s0XX` / 交互专用名 |
| `artKey` | 背景图 stem → `/assets/scenes/{artKey}.jpg` | 台账 + `apps/web/public/assets/scenes/`；类型见 `@supaluv/shared` `PrototypeSceneCard` |
| `portraitKey` | 立绘 stem → `/assets/portraits/{portraitKey}.png` | `characters/registry.ts` 默认 + mood 变体（如 `suming-shame`） |
| `mood` | 表现层情绪标签（如 shame / restless / uncanny） | manifest 字段；常与 portrait stem 后缀一致，**不是** Ink 变量 |
| 稳定 ID | scene / choice / asset 全仓库引用用同一字符串 | Ink tag、manifest、ledger、`story-catalog` 不另起别名 |
| **`bgmKey` ↔ bed** | manifest 字段仍叫 **`bgmKey`**（历史名）；运行时音频层叫 **bed** | 合法 bed id：`apps/web/src/audio/audioCatalog.ts` / HUD 文案 `apps/web/src/audio/bedCatalog.ts`。无 `musicKey`/`ambientKey` 时，runtime 把 `bgmKey` 当 legacy 单 bed（`apps/web/src/audio/internal/beds.ts` 的 `playStageBeds`） |

**不要**为了「统一术语」去改 `bgmKey` 字段名；写清映射即可。

## 代表任务：定位一条对白并安全改 Ink

冷启动任务（policy）：**定位对白在 Ink 源文件中的位置并安全修改**。

1. **定位**：在 `packages/content/ink/` 搜台词原文或关键词（第二章 = `draft-ch02.ink`；英文轨 = `draft-ch02.en.ink`）。
   ```bash
   rg -n "扫码|条码|扫过" packages/content/ink/draft-ch02.ink
   ```
2. **改**：只改对白/标签允许的文本；**不要**擅自改 knot 名、`# scene:` / `# choice:` 稳定 ID、choice 拓扑（除非任务明确要求且同步 manifest/catalog）。
3. **若改了 scene 表现**（speaker / art / bed）：改对应 `manifests/draft-ch0N-scenes.ts`，勿在 manifest 里加 choices。
4. **验证**（仓库根）：
   ```bash
   pnpm --filter @supaluv/content compile-ink
   pnpm --filter @supaluv/content typecheck
   pnpm exec vitest run tests/unit/draft-content-foundation.test.ts tests/unit/content-manifest.test.ts tests/unit/ink-prose-integrity.test.ts
   # 触碰拓扑/覆盖时再加：
   pnpm --filter @supaluv/content generate-coverage
   pnpm --filter @supaluv/content generate-narrative-graph
   pnpm test
   ```

## 验证命令（常用）

```bash
pnpm --filter @supaluv/content compile-ink
pnpm --filter @supaluv/content generate-coverage
pnpm --filter @supaluv/content generate-narrative-graph
pnpm --filter @supaluv/content typecheck
pnpm assets:check          # 运行时 ledger + intake
pnpm test
```

资产细节见 `assets/README.md`。生产发行门（会失败到材料齐）：`pnpm assets:production`。
