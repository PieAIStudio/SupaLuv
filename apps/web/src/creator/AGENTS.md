# Creator Studio — AI 入口

本地 **dev-only** 创作表面：改场景 manifest、改白名单 Ink 对白、跑编译校验任务。

## 唯一真相源

- **Ink** = 剧情拓扑真相（节点 / choice / divert）
- **scene manifest**（`packages/content/manifests/*`）= 场景表现真相（speaker / artKey / …）
- NarrativeGraph / compiled JSON 是派生产物，不要当可手改 SSOT
- **HTTP 契约** = `CREATOR_STUDIO_ROUTE_REGISTRY` / `CREATOR_STUDIO_ENDPOINT_SPECS`（同一注册表生成 OpenAPI，禁止手写平行文档）

## 怎么启动

仓库根目录：

```bash
pnpm --filter @supaluv/web dev
```

默认 `http://127.0.0.1:5173`（**仅绑定 localhost**）。仅 `vite serve` 且非 production 时挂载写接口；`pnpm build` 产物不含本 API。

## 机读说明书（必读）

主入口（OpenAPI 3.1）：

```http
GET /__creator-studio/openapi.json
```

- `paths` + operation（requestBody / response JSON Schema）
- `x-destructive` / `x-idempotent`
- 错误码（`HASH_CONFLICT`、`TASK_BUSY`、`SCENE_NOT_FOUND` 等）在各 operation 的 `responses`
- 工作流与铁律：顶层 `x-supaluv-workflows` / `x-supaluv-invariants`

薄壳（兼容入口，旧字段已 deprecated）：

```http
GET /__creator-studio/describe
```

返回 product 一句话 + `howToStart` + `openapiUrl`；完整契约请只信 **openapi.json**。

冷启动代表任务（五类）：按 `x-supaluv-workflows` 的 `edit-scene-speaker`——读取 → 改 speaker 落盘 → 过期 hash 冲突 → 非法输入 4xx → 回滚还原。

## 铁律（摘要）

- 场景保存过 typecheck 闸门，失败自动回滚
- Ink 保存禁止改拓扑；hash / revision 冲突返回 409，不覆盖
- pipeline 与 task 排他锁；并发 → `TASK_BUSY`
- 只动 catalog 白名单内的 production 内容
- 写接口输入校验：缺字段 / 错类型 / 超长 → 4xx + 机器可读 `error.code`（不 500、不静默成功）
- save-scene 写盘成功后服务端输出一行结构化 audit log

## 验证

```bash
pnpm typecheck
pnpm test
pnpm build
```

场景/OpenAPI/保存相关单测：`tests/unit/creator-studio-*.test.ts`（含 OpenAPI 3.1 合法性校验）。
