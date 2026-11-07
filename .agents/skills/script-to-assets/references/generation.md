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

## 冻结风格块（owner 2026-07-17 目选；prompt 里逐字引用对应块）

人物（立绘/角色出场）：

```
Style: semi-realistic stylized 3D animated CG style. Matte simplified skin,
grounded adult proportions, clean studio lighting, not photorealistic
photography, not anime, not oil painting, not fashion editorial.
Do not add readable logos, captions, watermarks, or unrelated props.
Do not increase saturation.
```

环境（背景板，画面中无人或人物极小时）：

```
Style: photorealistic environment, cinematic still, physically plausible
materials and lighting, muted color grade, no people in frame,
no readable brand logos, no watermark.
```

人物在环境中（合成镜头）：人物块 + 环境块同时引用，外加合成律：

```
The character keeps the semi-realistic stylized 3D CG look (clearly not a
real human); the environment stays photorealistic. Blend them with a single
consistent light source, matched color temperature and contact shadows,
like a high-end animated character composited into live-action plates.
```

通用负面：文字乱码、多手指、儿童面孔、真实名人、水印。

## Prompt 模板

```
[风格块：逐字引用上面对应块]
[主体：场景或角色+情绪，中文剧情语境翻译成视觉描述]
[构图：16:9 舞台 / 立绘竖构图 3:4，人物腰上，视线方向]
[光位：与剧情时段一致（夜班冷白荧光 / 出租屋暖黄台灯…）]
[负面：通用负面清单]
```

## 一致性锁脸（照抄 Temp/基准美学 的身份套件模式）

每个主要角色建立身份套件：character token（如 CHAR_SU_MING）+ 定妆正面特写
（accepted identity source，用户目选通过后锁定，不许重绘）+ prompts/ 目录存每张的
完整 prompt。变体生成时：定妆图为第一参考图 + "Preserve the same person identity:
face shape, eye shape, nose, mouth, jawline, hair silhouette, skin tone, age" +
"Only change the requested dimension"。渠道不支持 image-ref 则同 seed + 逐张目检
淘汰离型脸。定妆图入 intake 记为该角色的 face-anchor。
