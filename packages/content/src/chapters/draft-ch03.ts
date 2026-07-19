import { draftCh03Scenes } from "../../manifests/draft-ch03-scenes";
import draftCh03Compiled from "../../compiled/draft-ch03.json";
import draftCh03CompiledEn from "../../compiled/draft-ch03.en.json";

/** Per-chapter production payload (loaded only when this chapter is selected). */
export const scenes = draftCh03Scenes;
export const compiled = draftCh03Compiled;
/** English Ink compile product; missing on chapters without a translation. */
export const compiledEn = draftCh03CompiledEn;
