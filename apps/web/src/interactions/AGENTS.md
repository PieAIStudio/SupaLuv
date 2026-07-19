# Story interactions — AI 入口

剧情内可跳过互动（emotion calibration、protocol、barcode、housing、mobile questionnaire）。

## 机读：variant 载荷

Ink 只打类型与步号，**展示文案不在 Ink 正文**：

| Tag | 含义 |
| --- | --- |
| `# interaction:<id>` | 注册表 id，如 `mobile-questionnaire-v1` |
| `# interaction-step:N` | 1-based 步号 |
| `# interaction-variant:<name>` | **可选** per-scene 载荷名 |

解析：`resolveStoryInteraction` → `ActiveStoryInteraction.variant`（缺省为 `null`）。

### 已登记 variant

| type | variant | 用途 |
| --- | --- | --- |
| `mobile-questionnaire` | *(null / default)* | ch02 邻居容忍度申请问卷 |
| `mobile-questionnaire` | `matching` | ch03 个性化匹配问卷 |
| `barcode-sweep` | *(null / default)* | ch02 超市临期货练习 |
| `barcode-sweep` | `activation` | ch03 心动引擎开箱激活码 |

载荷表：`mobileQuestionnaire.ts` / `barcodeSweep.ts` 的 `resolve*Payload(variant)`。  
**choiceId 拓扑跨 variant 共用**（Ink 选项 id 不变）；只换 i18n 键与 product/question 展示。

未知 variant → 回落 default，ch02 行为零变化。

## 铁律

- 改互动 UI 文案走 `apps/web/src/i18n/locales/{zh-CN,en}.ts` 的 `interaction.*`，不要改 Ink 对白/选项字（语音 key 契约）。
- 新增 variant：登记本表 + payload resolver + i18n 双语 + 单测（解析 + 载荷渲染键）。
- 键盘：优先 `useInteractionKeyboard`（window 级），避免 prop cut-in 还焦后 section 失焦导致 1/2/S 失灵。

## 验证

```bash
pnpm exec vitest run tests/unit/story-interactions.test.ts
pnpm typecheck
```
