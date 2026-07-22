export interface VoiceCastContract {
  readonly voiceId: string;
  readonly speed: number;
  readonly pitch: number;
  readonly languageBoost: "Chinese" | "English";
}

const audioOutput = Object.freeze({
  sampleRate: 32_000,
  bitrate: 64_000,
  format: "mp3" as const,
  channels: 1,
});

/**
 * One immutable synthesis contract feeds both the reviewed plan digest and the
 * MiniMax request. Keeping request literals here prevents an approved digest
 * from authorizing different audio settings at execution time.
 */
export const VOICE_SYNTHESIS_SPEC = Object.freeze({
  provider: "MiniMax" as const,
  model: "speech-02-turbo" as const,
  outputFormat: "hex" as const,
  stream: false,
  volume: 1,
  audio: audioOutput,
});

export function createMiniMaxSynthesisBody(input: {
  readonly text: string;
  readonly cast: VoiceCastContract;
}) {
  const { cast } = input;
  return {
    model: VOICE_SYNTHESIS_SPEC.model,
    text: input.text,
    stream: VOICE_SYNTHESIS_SPEC.stream,
    language_boost: cast.languageBoost,
    output_format: VOICE_SYNTHESIS_SPEC.outputFormat,
    voice_setting: {
      voice_id: cast.voiceId,
      speed: cast.speed,
      vol: VOICE_SYNTHESIS_SPEC.volume,
      pitch: cast.pitch,
    },
    audio_setting: {
      sample_rate: VOICE_SYNTHESIS_SPEC.audio.sampleRate,
      bitrate: VOICE_SYNTHESIS_SPEC.audio.bitrate,
      format: VOICE_SYNTHESIS_SPEC.audio.format,
      channel: VOICE_SYNTHESIS_SPEC.audio.channels,
    },
  } as const;
}
