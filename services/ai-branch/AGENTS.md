# @supaluv/ai-branch — AI 入口

服务端边缘：受限 AI 支线、TTS、钱包计量、角色包/参考图、AI 结局会话。浏览器 UI 与 Ink 拓扑不在此包。

## 边界铁律

- **浏览器不得持有**模型 / 审核 / 钱包 **密钥**。密钥只进本服务进程；`VITE_*` 只在 public env，server env 禁止 `VITE_*`（见 `src/localServerEnv.ts`）。
- **计费**：`reserveBatteries` → 成功路径 `settle`/`commit`，失败 `refund`（`src/wallet/walletMeter.ts` + `src/routeTable.ts`）。本地可无密钥：`SUPALUV_WALLET_OPTIONAL=1` 时允许未计量；否则缺密钥则拒绝消费。
- 支线生成经 `safetyGate`；TTS free-form 默认关（`SUPALUV_TTS_ALLOW_FREEFORM` 仅 `"1"` 开启）。
- **locale**：`POST /ai/branch` body 可选 `locale`（如 `en` / `zh-CN`）。生成提示按 locale 输出对应语言的 `choiceLabel` 与 beat 文本；缺省/非 `en*` 保持中文。**不改** moderation、maxAiBeats≤4（产品旁支）与 ADR-0005 最终章 8 段上限。

## 本地怎么起

仓库根：

```bash
pnpm dev:ai
# 或 pnpm --filter @supaluv/ai-branch dev
# 单次：pnpm --filter @supaluv/ai-branch start
```

默认 `http://127.0.0.1:8787`。常与 `pnpm dev:web` / `pnpm dev:full` 联调。

**Env 路径（只写路径，不写密钥值）**：

- 默认 server：`~/PieAI/.secrets/supaluv/local.server.env`
- 默认 public（给服务读的 `VITE_*` 边界校验用）：`~/PieAI/.secrets/supaluv/local.public.env`
- 覆盖：`SUPALUV_SERVER_ENV_FILE` / `SUPALUV_PUBLIC_ENV_FILE`
- 加载入口：`src/server.ts` → `loadSecrets()`

开关表见同目录 `README.md`，以源码为准。

## 主要路由 / 模块（指路）

| 文件                                                                                 | 职责                                                    |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `src/server.ts`                                                                      | 读 env、listen；无产品逻辑                              |
| `src/routeTable.ts`                                                                  | 全部 HTTP 路由分发                                      |
| `src/handler.ts` / `src/branch/mastraBranch.ts`                                      | AI 支线生成                                             |
| `src/branch/prompts.ts`                                                              | 支线 system/user 提示；`locale`（`en*`→英文，否则中文） |
| `src/safetyGate.ts`                                                                  | 支线入出审核                                            |
| `src/wallet/walletMeter.ts`                                                          | 钱包 reserve/settle/refund                              |
| `src/tts/ttsRoute.ts` / `src/tts/ttsCatalog.ts`                                      | TTS 合成与预览 catalog                                  |
| `src/authGate.ts`                                                                    | Bearer JWT                                              |
| `src/commercialRouteRuntime.ts` + `character/` / `ending/` / `wallet/spendRoutes.ts` | 商业角色 / 结局 / spend                                 |
| `src/persistence/`                                                                   | 持久化实现（见该目录 README）                           |
| `src/{character,ending,branch,tts,wallet}/`                                          | 领域子目录（各有短 `AGENTS.md`）                        |

HTTP 路径一览以 `routeTable.ts` 与 README 表为准，不在此复述实现。

## 语音选角真相

- **中文**：`CHINESE_VOICE_MAP`（`src/tts/ttsRoute.ts`）是中文选角 **单一真相**；`tools/voice-pregen` 与 Creator 选角台也读它。
- **英文**：**EN 选角在途**（尚无合并的 `ENGLISH_VOICE_MAP` SSOT）。`ttsRoute` 内 `westernVoiceMap` 为临时占位，勿当最终 casting 台账去改产品文案。

## 验证

```bash
pnpm --filter @supaluv/ai-branch typecheck
pnpm exec vitest run tests/unit/commercial-persistence.test.ts \
  tests/unit/character-generation.test.ts \
  tests/unit/ai-ending-service.test.ts
pnpm typecheck
```
