import { draftCh02Scenes } from "../../manifests/draft-ch02-scenes";
import draftCh02Compiled from "../../compiled/draft-ch02.json";
import draftCh02CompiledEn from "../../compiled/draft-ch02.en.json";

/** Per-chapter production payload (loaded only when this chapter is selected). */
export const scenes = draftCh02Scenes;
export const compiled = draftCh02Compiled;
/** English Ink compile product; missing on chapters without a translation. */
export const compiledEn = draftCh02CompiledEn;
