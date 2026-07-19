/**
 * Trusted TTS preview catalog. The two stable IDs form one reproducible Leo
 * bilingual audition: each sentence is monolingual and therefore reaches the
 * intended provider lane without hiding code-switching behind an accent.
 */

export type TtsPreviewId = "zh_preview" | "en_preview";
export type TtsPreviewSequenceId = "leo_bilingual";

export interface TtsPreviewPhrase {
  readonly id: TtsPreviewId;
  readonly sequenceId: TtsPreviewSequenceId;
  readonly sequenceIndex: number;
  readonly language: "zh-CN" | "en";
  readonly text: string;
  readonly characterId: "leo";
}

const PREVIEWS: Readonly<Record<TtsPreviewId, TtsPreviewPhrase>> = {
  zh_preview: {
    id: "zh_preview",
    sequenceId: "leo_bilingual",
    sequenceIndex: 0,
    language: "zh-CN",
    text: "雷欧压低声音说：他们在实时偷听，我听见他们笑了。",
    characterId: "leo",
  },
  en_preview: {
    id: "en_preview",
    sequenceId: "leo_bilingual",
    sequenceIndex: 1,
    language: "en",
    text: "Leo lowered his voice. They were listening live, and I heard them laugh.",
    characterId: "leo",
  },
};

export function resolvePreviewPhrase(previewId: string | undefined): TtsPreviewPhrase | null {
  if (!previewId || !(previewId in PREVIEWS)) {
    return null;
  }
  return PREVIEWS[previewId as TtsPreviewId];
}

export function listPreviewIds(): readonly TtsPreviewId[] {
  return ["zh_preview", "en_preview"];
}

export function listPreviewSequence(sequenceId: TtsPreviewSequenceId): readonly TtsPreviewPhrase[] {
  return listPreviewIds()
    .map((id) => PREVIEWS[id])
    .filter((entry) => entry.sequenceId === sequenceId)
    .sort((left, right) => left.sequenceIndex - right.sequenceIndex);
}
