/**
 * Trusted TTS phrases — settings preview never accepts free-form client text.
 * Authored dialogue line VO can be added later via lineId map.
 */

export type TtsPreviewId = "zh_preview" | "en_preview";

const PREVIEWS: Record<
  TtsPreviewId,
  { language: string; text: string; characterId: string }
> = {
  zh_preview: {
    language: "zh-CN",
    text: "测试语音：你好，我是超级爱人双路配音试听。",
    characterId: "苏明",
  },
  en_preview: {
    language: "en",
    text: "TTS test: Hello from SupaLuv dual-route voice preview.",
    characterId: "苏明",
  },
};

export function resolvePreviewPhrase(previewId: string | undefined): {
  language: string;
  text: string;
  characterId: string;
} | null {
  if (!previewId || !(previewId in PREVIEWS)) {
    return null;
  }
  return PREVIEWS[previewId as TtsPreviewId];
}

export function listPreviewIds(): readonly TtsPreviewId[] {
  return Object.keys(PREVIEWS) as TtsPreviewId[];
}
