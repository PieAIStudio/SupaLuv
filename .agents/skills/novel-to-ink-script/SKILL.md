---
name: novel-to-ink-script
description: 'Convert SupaLuv novel chapter drafts (超级爱人 小说章节) into the project runtime content package: Ink script + scene manifest + chapter module + catalog registration + character/prop/TTS wiring. Use whenever the user asks to 把小说转成剧情 / convert chapters to Ink / 新章节进游戏 / adapt novel drafts, or hands over new chapter markdown from AnvilLocal/books/supa-luv-v2. Also use when re-converting after the novel is rewritten. Not for writing new fiction or editing the novel itself.'
metadata:
  short-description: Novel chapters → Ink runtime content package
  version: "1.0.0"
---

# novel-to-ink-script

把《超级爱人》小说章节草稿转换成本项目可运行的内容包。**Ink 是剧情拓扑的唯一 SSOT**；
manifest 只做呈现映射。转换是"改编"不是"搬运"：小说散文 → 舞台化 beat + 玩家选择 + 互动 + 道具落点。

## 输入与前置

1. 小说源：用户指定的章节 markdown（通常 `/Users/yuanfei/PieAI/AnvilLocal/books/supa-luv-v2/chapters/ch*/draft.md`）。
   先快照到 `Temp/novel-<版本标记>/` 并记 SHA，防源漂移。
2. 读一个现有样板对照：`packages/content/ink/draft-ch02.ink` + `packages/content/manifests/draft-ch02-scenes.ts`。
3. 读 `references/pipeline.md`（本技能）拿完整工件清单与注册点。
4. 语气红线（不可违反）：成人黑色幽默/性喜剧+机器人+AI 结局；**不是甜宠爱情**；无色情细节；
   AI 支线短且回归主线。改编时保留小说的毒舌、尴尬欲望与交易感。

## 转换流程

### 1. 场景切分（散文 → beat 序列）
- 一个 beat = 一次镜头/一段完整对话回合，正文 80-200 字为宜；beat id 用 `dchNN_sNNN` 递增。
- **正文不得含章节标题行**（面板已有章节 chip，重复出现是已知缺陷 SW-007）。
- 每章 25-45 个 beat；跳过纯内心独白的水段，浓缩进相邻 beat 的旁白。

### 2. 选择点设计（玩家代入感的来源）
- 每章 6-9 个选择点。两难选择优先："态度差异"（平静 vs 嘴硬）多于"路线差异"。
- 每个选择写回 VAR（态度计 dignity/impulse ±，事实旗标 told_*/asked_*），后文用 VAR 做条件文案回响。
- 章内至少 2 处"前面选择改变后面台词"的回响，否则选择是假的。

### 3. 互动与道具落点
- 每章 1-2 个诊断式互动（样板：情绪校准/协议校对/条码扫描/房源热点/手机问卷）——
  声明 VAR 组 + skip 旗标，运行时组件由前端映射（见 pipeline.md §互动）。
- 每章 2-3 个道具 cut-in 落点（文件/收据/短信等"可出示的物证"）：在 `packages/content/src/propCatalog.ts`
  登记 sceneId → propId；道具图片资产走 script-to-assets 流程，没有图时先不登记落点。

### 4. 角色与语音
- 新说话角色必须在 `packages/content/characters/registry.ts` 登记；没有立绘就用 `demo-ui` 占位，
  **严禁复用别的角色的脸**（真人上传身份泄漏风险，2026-07-16 已出过 P1）。
- 主角命名走 displayNames 规范名（当前男主 苏明 / 女主 石佩欣）；改名系统依赖正文用规范名。
- 新角色补 `apps/web/src/audio/ttsClient.ts` 与 `services/ai-branch/src/ttsRoute.ts` 的别名映射。

### 5. 工件落地与注册
按 `references/pipeline.md` 的清单逐项落地：ink → manifest → chapter module → index.ts 注册 →
propCatalog → registry。然后 `pnpm --filter @supaluv/content build`（compile-ink + coverage + narrative-graph + tsc）。

### 6. 验证阶梯
```bash
pnpm --filter @supaluv/content build
pnpm typecheck && pnpm vitest run
pnpm playwright test tests/e2e/story-interactions.spec.ts tests/e2e/web-smoke.spec.ts
```
最后人工复核：用 Inky（inkle 官方 IDE）打开 `packages/content/ink/` 直接试玩新章节文本——
实时报错 + 选择快进，是查支线死路最快的方式。再跑一次浏览器全章通关截图（playtest 脚本样板在
`.scratch/director/playtest/`）。

## 质量自检清单

- [ ] 每个 choice 的两个选项都有独立后果（VAR 或文案回响），没有"装饰性选择"
- [ ] 全部 divert 可达、无死路（Inky/compile-ink 会报 orphan）
- [ ] 正文无章节标题重复、无小说页码残留
- [ ] 语气抽查 5 段：黑色幽默在场，没有滑向甜宠或说明文
- [ ] 新角色 0 共享脸、TTS 别名齐全
- [ ] noncanonical/source 字段如实标注小说版本
