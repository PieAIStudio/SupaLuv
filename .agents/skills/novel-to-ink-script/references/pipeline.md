# 内容包工件清单与注册点（以 draft-ch02 为准的真实管线）

一章 = 以下工件的完整集合。漏任何一项都会在验证阶梯或运行时暴露。

## 1. Ink 剧本 — `packages/content/ink/<story-id>.ink`

- story-id 形如 `draft-ch03`；文件头注释写明来源版本（如 `densified from supa-luv-v2 ch03`）与
  `Noncanonical draft.` 声明。
- 顶部集中声明全部 VAR：态度计（dignity/impulse，起始 50）、事实旗标（bool）、
  选择记录（string "unanswered" 起始）、互动 VAR 组（每互动 3 题 + skipped + completed_at_version）、
  线索旗标（clue_*，供道具/结局结算用）。
- knot 命名 = beat id（`=== dch03_s001 ===`）；每个 beat 末尾 `-> next`；选择用 `* [标签] 效果 -> target`。
- 章末 divert 到结算 knot（参照 draft-ch02 的 ending/global-echo 形状）。

## 2. 场景 manifest — `packages/content/manifests/<story-id>-scenes.ts`

导出 `PrototypeSceneCard[]`（类型来自 `@supaluv/shared/story-map`）。每个 beat 一张卡：

| 字段 | 说明 |
| --- | --- |
| id | 与 Ink knot 同名 |
| title / purpose / visualPlaceholder | 呈现文案 |
| backgroundKey / artKey | 背景资产键（先复用现有键；新键走 script-to-assets） |
| stageMotion | slow_push / drift / flash / none |
| companionPortraitKey / companionSpeaker | 非说话者立绘 |
| speaker / mood | 说话者与情绪（决定立绘变体，苏明有 8 情绪变体可用——别全用 shame） |
| bgmKey / sfxKey / ambientKey | 双音轨：music 与 ambient 可独立（gameAudio playStageBeds） |
| noncanonical / source | 如实标注（如 `draft-2026-07` / `supa-luv-v2-2026-08`） |

互动 beat 的卡：id 用 `dchNN_<interaction>`（如 `dch03_emotion_calibration`），前端按 id 前缀映射组件。

## 3. 章节模块 — `packages/content/src/chapters/<story-id>.ts`

```ts
import { draftChNNScenes } from "../../manifests/<story-id>-scenes";
import compiled from "../../compiled/<story-id>.json";
export const scenes = draftChNNScenes;
export const compiled = compiled;
```

`compiled/*.json` 由 `pnpm --filter @supaluv/content compile-ink` 生成，不手写。

## 4. 目录注册 — `packages/content/src/index.ts`

- `StoryCatalogId` union 加新 id。
- 懒加载表加 `"<story-id>": () => import("./chapters/<story-id>")`。
- 所属 StoryPackageMeta（如 draft2026Package）的章节列表与顺序更新。
- `catalog/` 下的 story-catalog json 若含章节序列，也同步。

## 5. 道具落点 — `packages/content/src/propCatalog.ts`

`sceneId → propId` 精确映射；道具资产需先过 `pnpm assets:check`（intake/manifest/rights 三账一致）。
无图先不登记；道具 cut-in 合同：先于互动弹出、可关闭重开、换场景消失。

## 6. 角色注册 — `packages/content/characters/registry.ts`

`CHARACTER_BY_NAME` 加新说话者：id（snake_case 拼音）、name（中文规范名）、side、defaultPortrait。
占位一律 `demo-ui`；女主专属脸键当前为 `zhou-neutral`（与选角工房官方形象一致）。
选角槽位绑定按**规范名**匹配（apps/web/src/views/play/lib/stagePresentation.ts），新增可绑定角色要更新该 allowlist。

## 7. 语音映射（两处都要）

- `apps/web/src/audio/ttsClient.ts`：中文名/拼音 → voice id。
- `services/ai-branch/src/ttsRoute.ts`：CoreTtsCharacterId union + aliases + 两个 voiceMap（西文/中文 lane）。

## 8. 互动组件映射（仅当新增互动类型）

现有五类互动组件在 `apps/web/src/interactions/`；新互动类型才需要新组件 + e2e。
复用现有类型时只需 Ink VAR 组 + manifest 卡 id 前缀正确。

## 9. 测试触点

- 单测样板：`tests/unit/ch01-narrative.test.ts`、`narrative-playback.test.ts`（新章补对应断言：
  beat 数、选择点数、VAR 初始值、章末 divert 可达）。
- e2e：`tests/e2e/story-interactions.spec.ts` 的通用遍历会自动覆盖新章（确认 dismissPropCutIn 助手兼容）。
- 全局剧情地图：narrative-graph 由 build 自动生成，Creator Studio 打开确认新章节点无 orphan。
