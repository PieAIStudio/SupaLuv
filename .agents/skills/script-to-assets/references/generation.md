# 生成渠道与命令

优先顺序（按额度与速度）：

## 1. SuperGrok CLI（首选，额度充足）

先核对当前 flags（版本会变）：`grok --help`。图像生成用 headless 单轮：

```bash
grok -p "<图像生成指令，含风格 ADR 块 + 场景描述 + 构图/光位 + 负面词>" \
  -m <当前图像模型id> --always-approve --cwd <输出目录>
```

注意：grok 的图像能力与模型 id 以 `--help` 和实际试跑为准；产物统一收到
`packages/content/assets/candidates/<batch>/`，文件名 `<assetKey>__<variant>.png`。

## 2. Gemini（图片+视频，多账号）
## 3. GPT Image（多账号 ChatGPT Plus）

这两个走浏览器/网页流程时，逐张下载后同样进 candidates 目录并登记 intake。

## Prompt 模板（风格 ADR 冻结后）

```
[风格块：引用 ADR-XXXX 冻结的关键词/参考]
[主体：场景或角色+情绪，中文剧情语境翻译成视觉描述]
[构图：16:9 舞台 / 立绘竖构图 3:4，人物腰上，视线方向]
[光位：与剧情时段一致（夜班冷白荧光 / 出租屋暖黄台灯…）]
[负面：文字乱码、多手指、儿童面孔、真实名人、水印]
```

## 一致性锁脸

同角色批次：首张定妆 → 后续变体全部挂同一参考图（渠道支持 image-ref 就用；
不支持则同 seed + 逐张目检淘汰离型脸）。定妆图入 intake 记为该角色的 face-anchor。
