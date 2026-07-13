import { describe, expect, it } from "vitest";
import {
  CHARACTER_FILE_ACCEPT,
  getCharacterFileControlPresentation,
  isAcceptedCharacterReference,
  MAX_CHARACTER_REFERENCE_FILES,
  normalizeCharacterReferenceFiles,
} from "../../apps/web/src/views/CharacterStudioScreen";

function image(name: string, type = "image/png"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe("casting upload control", () => {
  it("keeps the real browser file contract", () => {
    expect(CHARACTER_FILE_ACCEPT).toBe("image/jpeg,image/png,image/webp,image/avif");
    expect(MAX_CHARACTER_REFERENCE_FILES).toBe(3);
  });

  it("describes the empty human and robot states", () => {
    const empty = normalizeCharacterReferenceFiles([]);

    expect(empty).toMatchObject({
      files: [],
      invalidCount: 0,
      trimmedCount: 0,
      status: "empty",
    });
    expect(getCharacterFileControlPresentation(empty, false, "human")).toEqual({
      disabled: false,
      triggerLabel: "选择参考照片",
      statusText: "尚未选择照片；真人角色需要 1–3 张参考照片。",
    });
    expect(getCharacterFileControlPresentation(empty, false, "robot").statusText).toContain(
      "也可以只填写形象说明",
    );
  });

  it("accepts one to three supported images and offers re-selection", () => {
    const selected = normalizeCharacterReferenceFiles([
      image("one.jpg", "image/jpeg"),
      image("two.webp", "image/webp"),
      image("three.avif", "image/avif"),
    ]);

    expect(selected).toMatchObject({
      invalidCount: 0,
      trimmedCount: 0,
      status: "ready",
    });
    expect(selected.files).toHaveLength(3);
    expect(selected.message).toBe("已选择 3 张，可以生成。");
    expect(getCharacterFileControlPresentation(selected, false, "human").triggerLabel).toBe(
      "重新选择照片",
    );
  });

  it("trims supported images above the three-file limit", () => {
    const selected = normalizeCharacterReferenceFiles([
      image("one.png"),
      image("two.png"),
      image("three.png"),
      image("four.png"),
    ]);

    expect(selected.files).toHaveLength(3);
    expect(selected.trimmedCount).toBe(1);
    expect(selected.status).toBe("warning");
    expect(selected.message).toContain("1 个超出上限");
  });

  it("rejects unsupported types without exposing filenames", () => {
    const selected = normalizeCharacterReferenceFiles([
      new File(["not an image"], "private-name.txt", { type: "text/plain" }),
    ]);

    expect(selected.files).toHaveLength(0);
    expect(selected.invalidCount).toBe(1);
    expect(selected.status).toBe("error");
    expect(selected.message).toContain("文件类型不支持");
    expect(selected.message).not.toContain("private-name.txt");
  });

  it("uses a supported extension only when the browser omits a MIME type", () => {
    expect(isAcceptedCharacterReference(image("camera-export.JPEG", ""))).toBe(true);
    expect(isAcceptedCharacterReference(image("camera-export.svg", ""))).toBe(false);
  });

  it("disables re-selection and announces the busy state", () => {
    const selected = normalizeCharacterReferenceFiles([image("one.png")]);
    expect(getCharacterFileControlPresentation(selected, true, "human")).toEqual({
      disabled: true,
      triggerLabel: "重新选择照片",
      statusText: "正在处理，暂时无法更改参考照片。",
    });
  });

  it("reports both invalid and over-limit files while retaining three valid images", () => {
    const selected = normalizeCharacterReferenceFiles([
      image("one.png"),
      image("two.png"),
      image("three.png"),
      image("four.png"),
      new File(["bad"], "bad.txt", { type: "text/plain" }),
    ]);

    expect(selected.files).toHaveLength(3);
    expect(selected.invalidCount).toBe(1);
    expect(selected.trimmedCount).toBe(1);
    expect(selected.status).toBe("error");
    expect(selected.message).toContain("1 个类型不支持");
    expect(selected.message).toContain("1 个超出上限");
  });
});
