import {
  createDualTtsFromEnv,
  describeTtsEnv,
  type TtsSynthesizeResult,
} from "@pieai/swimmer-ai-kit/tts";

const router = createDualTtsFromEnv({
  westernVoiceMap: {
    // ElevenLabs premade Roger (free-tier API OK in 2026-07 smoke)
    suming: "CwhRBWXzGAHq8TQ4Fs17",
    苏明: "CwhRBWXzGAHq8TQ4Fs17",
    narrator: "CwhRBWXzGAHq8TQ4Fs17",
    旁白: "CwhRBWXzGAHq8TQ4Fs17",
    lin_xiaotang: "EXAVITQu4vr4xnSDxMaL",
    林晓棠: "EXAVITQu4vr4xnSDxMaL",
  },
  chineseVoiceMap: {
    // CN platform system voices (api.minimaxi.com)
    suming: "male-qn-qingse",
    苏明: "male-qn-qingse",
    lin_xiaotang: "female-shaonv",
    林晓棠: "female-shaonv",
    narrator: "male-qn-qingse",
    旁白: "male-qn-qingse",
  },
});

export function ttsHealthSnapshot() {
  return {
    ...describeTtsEnv(),
    defaultLang: process.env.SUPALUV_TTS_DEFAULT_LANG?.trim() || "zh-CN",
  };
}

export async function synthesizeDialogue(input: {
  text: string;
  language?: string;
  characterId?: string;
  emotion?: string;
  signal?: AbortSignal;
}): Promise<TtsSynthesizeResult> {
  const language =
    input.language?.trim() ||
    process.env.SUPALUV_TTS_DEFAULT_LANG?.trim() ||
    "zh-CN";
  return router.synthesize({
    text: input.text,
    language,
    characterId: input.characterId?.trim() || "narrator",
    emotion: input.emotion,
    signal: input.signal,
  });
}
