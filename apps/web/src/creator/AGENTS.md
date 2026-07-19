# Creator Studio — AI 入口

本地 **dev-only** 创作表面：改场景 manifest、改白名单 Ink 对白、跑编译校验任务。

## 唯一真相源

- **Ink** = 剧情拓扑真相（节点 / choice / divert）
- **scene manifest**（`packages/content/manifests/*`）= 场景表现真相（speaker / artKey / …）
- NarrativeGraph / compiled JSON 是派生产物，不要当可手改 SSOT

## 怎么启动

仓库根目录：

```bash
pnpm --filter @supaluv/web dev
```

默认 `http://127.0.0.1:5173`。仅 `vite serve` 且非 production 时挂载写接口；`pnpm build` 产物不含本 API。

## 机读说明书（必读）

```http
GET /__creator-studio/describe
```

返回完整 endpoints / workflows / invariants / 错误码。**细节只信 describe，不要复制到别处。**

冷启动代表任务：按 describe 里 `workflows` 的 `edit-scene-speaker`，用 curl 改某个场景的 speaker 并保存成功。

## 铁律（摘要）

- 场景保存过 typecheck 闸门，失败自动回滚
- Ink 保存禁止改拓扑；hash / revision 冲突返回 409，不覆盖
- pipeline 与 task 排他锁；并发 → `TASK_BUSY`
- 只动 catalog 白名单内的 production 内容

## 验证

```bash
pnpm typecheck
pnpm test
pnpm build
```

场景/保存相关单测：`tests/unit/creator-studio-*.test.ts`。
