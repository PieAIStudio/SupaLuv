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

## 术语表（canonical + 契约冻结映射）

**原则**（`docs/policy/ai-legibility.md` v2 原则 7）：同一概念全仓同名；作者内容字段优先当
canonical；行业实现层术语可保留，但必须在此登记映射。无法改的契约名 **不改**，只登记。

### Canonical 概念

| Canonical | 含义 | 合法值 / 真相源 | 禁止同义词（新代码） |
| --- | --- | --- | --- |
| `sceneId` | 场景稳定 ID；Ink knot 名 + `# scene:<id>` + manifest `id` **三者对齐** | ink/manifest；新 ID 用 `dch0N_s0XX` / 交互专用名 | 不要另起 `nodeId` 当场景作者字段；graph 的 node 见下 |
| `artKey` | 场景静帧 stem → `/assets/scenes/{artKey}.jpg` | 台账 + `apps/web/public/assets/scenes/`；`PrototypeSceneCard` | 新代码勿用 `sceneImage` / `characterArt` 指背景图 |
| `portraitKey` | 立绘 stem → `/assets/portraits/{portraitKey}.png` | `characters/registry.ts` + mood 变体 | 新代码勿用 `characterArt` 当字段名；UI 中文「立绘」OK |
| `mood` | 表现层情绪标签（shame / restless / uncanny…） | manifest 字段；常与 portrait stem 后缀一致，**不是** Ink 变量 | — |
| **bed** | 可循环舞台配乐层（music 或 ambient） | `apps/web/src/audio/audioCatalog.ts`；HUD 文案 `bedCatalog.ts` | 新内部 API 勿再引入 `Bgm`/`playBgm`；玩家文案中/英可用「配乐」/ bed |
| `musicKey` | 显式 melodic bed（可选） | bed catalog 中 `kind: "music"` | — |
| `ambientKey` | 显式 environment bed（可选） | bed catalog 中 `kind: "ambient"` | — |
| `sfxKey` | 场景进入 one-shot | `/assets/audio/sfx/{sfxKey}.mp3` | — |
| `videoKey` | 全屏事件 CG / cutscene | `/assets/video/{videoKey}.mp4` | — |
| `chapterId` | catalog 章节 id（如 `draft-ch01`） | `catalog/story-catalog.json` | 勿用 `episode` |
| `packageId` | 故事包 id | `story-catalog.json` | — |
| `aiBranch` | 受限 AI 支线（短拍后必须 rejoin Ink） | manifest `aiBranch`；服务 `@supaluv/ai-branch` | 注释可写 AI side branch，字段名固定 `aiBranch` |
| `aiEnding` | AI **最终章**（≤8 段终端合同，不强制 rejoin） | ADR-0005；`aiEnding` / endings sessions | 与 `aiBranch` 不是同一概念 |
| 稳定 ID | scene / choice / asset 全仓同一字符串 | Ink tag、manifest、ledger、story-catalog | 不另起别名 |
| dialogue voice | 玩家对白配音产品路径（预生成优先，再实时 TTS） | `useDialogueVoice` / `dialogueVoice*` | 见下方分层；勿把 TTS 当产品层唯一名 |

### 实现层分层（故意不同名，勿合并）

| 层 | 用词 | 边界 |
| --- | --- | --- |
| 产品 UX | dialogue voice / 对白配音 | 按钮、门控、session、playback guard |
| 传输/服务 | TTS（`/tts/*`、`ttsClient`、`ttsRoute`） | 合成与 preview 白名单 |
| 静态库 | pregen / pregenVoiceKey | 离线 mp3 库；key 契约 **冻结**（见下） |
| 叙事图 | node / edge（NarrativeGraph） | node ≈ scene 级；**不是** 新的 sceneId 同义词，是图抽象 |
| AI 支线节拍 | beat（`maxAiBeats`、AI beat 行） | AI 生成短单位；**不是** 作者 scene |
| 运行时 session 字段 | `storyId` | 当前加载的 **chapter** id（历史命名）；catalog 真名是 `chapterId` |

### B 级契约冻结（不改名）

| 契约名 | Canonical 概念 | 冻结原因 |
| --- | --- | --- |
| manifest `bgmKey` | bed（legacy 单 bed 字段） | 内容契约；历史全章 manifest；无 `musicKey`/`ambientKey` 时 runtime 当 exclusive bed |
| asset 路径 `/assets/audio/bgm/` | bed 文件目录 | 公开静态 URL；ledger / 部署指纹 |
| provenance `kind: audio_bgm` | bed 溯源类型 | 既有 provenance 文件 frontmatter |
| settings 迁移键 `bgmVolume` | music+ambient 音量（读旧档） | **存档/设置兼容**；只读迁移，新写入用 music/ambient |
| `backgroundKey` | 逻辑场景地点 token（如 `office-night`） | 与 `artKey`（`bg-office-night`）并存的旧字段；AI ending 也用 `backgroundKey` |
| `artKey` 值前缀 `bg-*` | 场景静帧稳定 ID 惯例 | 资产稳定 ID，不是第二个概念名 |
| `portraitKey` 文件 stem | 立绘稳定 ID | 资产稳定 ID |
| `pregenVoiceKey` / `normalizeVoiceText` / fnv1a64 | 预生成语音文件名契约 | **语音 key 契约绝对不动**；工具与客户端必须同语义 |
| `storyId`（session / analytics / AI API body） | 当前 chapter 运行时句柄 | 存档、分析事件、OpenAPI 请求体字段；与 catalog `chapterId` 同值不同角色名 |
| `chapter_ended` 等 analytics 事件名 | 章节结束事件 | 已发出的事件名 |
| OpenAPI paths（`/ai/branch`、`/tts/*`、`/ai/endings/*`…） | AI 支线 / TTS / 最终章 HTTP | schemaVersion 2 已发布；**路径不改** |
| wallet reason `ai_branch` / `ai_ending_*` | 计费原因码 | 持久化 spend 记录 |
| 存档键 / localStorage 键 | 各类持久化 | **一律不改** |
| 编译产物 JSON 字段 | Ink 编译输出 | 派生产物契约 |
| package / service 名 `ai-branch` | 服务边界目录名 | 部署与 filter 名 |

**不要**为了「统一术语」去改上表契约名；只在此登记映射。新代码：内部标识符用 Canonical 列；引用契约时用契约名并在注释点回本表。

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
