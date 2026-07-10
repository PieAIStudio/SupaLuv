# 苏明 · Character Lock

## Identity

| 字段     | 锁定值                                                      |
| -------- | ----------------------------------------------------------- |
| 姓名     | 苏明                                                        |
| 年龄观感 | 27–29（程序员，略显疲惫，不是少年）                         |
| 发型     | 黑色短发，略乱，有碎发                                      |
| 脸型     | 偏瘦，下颌清晰，黑眼圈                                      |
| 服装     | **灰色连帽卫衣**（全章默认，不换装）                        |
| 风格     | **电影写实半写实**（与场景照片级背景一致；禁止卡通/二次元） |
| 禁止     | 少年脸、西装、西装领带、完全不同发型、纯 2D anime           |

## Mood map → file

| mood      | file                 | 表情要点         |
| --------- | -------------------- | ---------------- |
| shame     | suming-shame.png     | 目光回避、嘴紧   |
| panic     | suming-panic.png     | 眼神飘、微张嘴   |
| lonely    | suming-lonely.png    | 放松但空         |
| restless  | suming-restless.png  | 烦躁、眉心紧     |
| tempted   | suming-tempted.png   | 盯屏幕、欲望克制 |
| uncanny   | suming-uncanny.png   | 被戳穿的僵硬     |
| committed | suming-committed.png | 下定决心的平静   |

## Source of truth

1. `refs/base.jpg` — 主参考（脸+服装）
2. `prompts.md` — 生成/改图提示词
3. 运行时路径：`apps/web/public/assets/portraits/suming-*.png`

## Process

```text
base ref
  -> image_edit 只改表情/微姿态
  -> chroma key（品红色底）
  -> 覆盖 public portraits
```

不要每次从零 `image_gen` 新脸。
