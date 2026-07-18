/**
 * Offline dialogue voice bank generator.
 *
 * Exhaustively walks each chapter's compiled Ink (BFS over choice branches),
 * reproduces the runtime's exact text chunking (see apps/web/src/story/
 * inkStoryRunner.ts readSnapshot), and synthesizes every authored line once
 * via MiniMax using the same casting map the live TTS service uses. Clips
 * land in apps/web/public/assets/voice/<key>.mp3 plus catalog.json; the
 * browser (apps/web/src/audio/pregenVoice.ts) computes the same key and
 * plays the static clip before ever considering runtime TTS.
 *
 * Run:  npx tsx tools/voice-pregen/generate.ts [--dry-run] [--chapter=draft-ch01]
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  hasMixedTtsRoutes,
  planBrowserTtsSegments,
} from "../../apps/web/src/audio/ttsSegmentation";
import { speakerToCharacterId } from "../../apps/web/src/audio/ttsClient";
import { normalizeVoiceText, pregenVoiceKey } from "../../apps/web/src/audio/pregenVoice";
import { CHINESE_VOICE_MAP } from "../../services/ai-branch/src/ttsRoute";
import { draftCh01Scenes } from "../../packages/content/manifests/draft-ch01-scenes";
import { draftCh02Scenes } from "../../packages/content/manifests/draft-ch02-scenes";
import { draftCh03Scenes } from "../../packages/content/manifests/draft-ch03-scenes";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const OUT_DIR = join(REPO_ROOT, "apps/web/public/assets/voice");
const LANGUAGE = "zh-CN";
const MAX_STATES_PER_CHAPTER = 3000;

const require = createRequire(resolve(REPO_ROOT, "apps/web/package.json"));
const { Story } = require("inkjs");

interface SceneLike {
  readonly id: string;
  readonly speaker?: string;
}

const CHAPTERS: Record<string, readonly SceneLike[]> = {
  "draft-ch01": draftCh01Scenes as readonly SceneLike[],
  "draft-ch02": draftCh02Scenes as readonly SceneLike[],
  "draft-ch03": draftCh03Scenes as readonly SceneLike[],
};

function loadEnv(): Record<string, string> {
  const envPath = join(homedir(), "PieAI", ".secrets", "supaluv", "local.server.env");
  const text = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    text
      .split("\n")
      .filter((line) => line.includes("=") && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      }),
  );
}

/** Byte-for-byte replica of the runtime chunker in inkStoryRunner.readSnapshot. */
function readChunk(story: InstanceType<typeof Story>): {
  text: string;
  sceneId: string | null;
  choiceCount: number;
} {
  const textParts: string[] = [];
  let sceneId: string | null = null;
  while (story.canContinue) {
    const line = story.Continue() ?? "";
    const currentTags: string[] = story.currentTags ?? [];
    const sceneTag = currentTags.find((tag) => tag.startsWith("scene:"));
    if (sceneTag) {
      sceneId = sceneTag.slice("scene:".length).trim();
    }
    const trimmed = String(line).trim();
    if (trimmed.length > 0) {
      textParts.push(trimmed);
    }
  }
  return {
    text: textParts.join("\n\n"),
    sceneId,
    choiceCount: story.currentChoices.length,
  };
}

interface CollectedLine {
  readonly key: string;
  readonly characterId: string;
  readonly text: string;
  readonly chapterId: string;
  readonly sceneId: string | null;
}

function collectChapterLines(chapterId: string): CollectedLine[] {
  const compiled = readFileSync(join(REPO_ROOT, "packages/content/compiled", `${chapterId}.json`), "utf8");
  const scenes = CHAPTERS[chapterId] ?? [];
  const speakerByScene = new Map(scenes.map((scene) => [scene.id, scene.speaker ?? "旁白"]));

  const lines = new Map<string, CollectedLine>();
  // Meter variables make raw ink states near-unique, so a state-keyed visited
  // set explodes breadth-first and caps out before deep scenes. Dedupe on the
  // OBSERVED chunk instead: once a (text, choices, scene) situation has been
  // expanded, later meter-variant copies of it are recorded but not re-expanded.
  const expandedChunks = new Set<string>();
  // Queue entries: saved ink state + the sceneId carried from previous chunks.
  const queue: Array<{ state: string | null; sceneId: string | null }> = [
    { state: null, sceneId: null },
  ];
  let states = 0;

  while (queue.length > 0 && states < MAX_STATES_PER_CHAPTER) {
    const entry = queue.shift()!;
    const story = new Story(compiled);
    if (entry.state) {
      story.state.LoadJson(entry.state);
    }
    const chunk = readChunk(story);
    states += 1;
    const carriedSceneId = chunk.sceneId ?? entry.sceneId;
    const chunkKey = `${chunk.text}|#${chunk.choiceCount}|${carriedSceneId ?? ""}`;
    const shouldExpand = !expandedChunks.has(chunkKey);
    expandedChunks.add(chunkKey);

    if (chunk.text.length > 0) {
      const speaker = (carriedSceneId ? speakerByScene.get(carriedSceneId) : undefined) ?? "旁白";
      const characterId = speakerToCharacterId(speaker);
      const segments = planBrowserTtsSegments(chunk.text, LANGUAGE);
      if (segments.length > 0 && !hasMixedTtsRoutes(segments)) {
        const routedText = segments
          .map((segment) => segment.text)
          .join(" ")
          .slice(0, 480);
        const key = pregenVoiceKey(characterId, LANGUAGE, routedText);
        if (!lines.has(key)) {
          lines.set(key, {
            key,
            characterId,
            text: normalizeVoiceText(routedText),
            chapterId,
            sceneId: carriedSceneId,
          });
        }
      }
    }

    if (!shouldExpand) {
      continue;
    }
    for (let index = 0; index < chunk.choiceCount; index += 1) {
      const branch = new Story(compiled);
      if (entry.state) {
        branch.state.LoadJson(entry.state);
      }
      // Re-consume the chunk so the branch sits at the same choice point.
      while (branch.canContinue) {
        branch.Continue();
      }
      if (branch.currentChoices.length <= index) {
        continue;
      }
      branch.ChooseChoiceIndex(index);
      queue.push({ state: branch.state.ToJson(), sceneId: carriedSceneId });
    }
  }

  if (states >= MAX_STATES_PER_CHAPTER) {
    console.warn(`[${chapterId}] state cap hit (${states}); coverage may be partial`);
  }
  return [...lines.values()];
}

async function synthesize(
  env: Record<string, string>,
  voiceId: string,
  text: string,
): Promise<Buffer> {
  const baseUrl = (env.MINIMAX_BASE_URL ?? "https://api.minimaxi.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: "speech-02-turbo",
      text,
      stream: false,
      language_boost: "Chinese",
      output_format: "hex",
      voice_setting: { voice_id: voiceId, speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 64000, format: "mp3", channel: 1 },
    }),
  });
  const body = (await response.json()) as {
    base_resp?: { status_code?: number; status_msg?: string };
    data?: { audio?: string };
  };
  if (!response.ok || body?.base_resp?.status_code !== 0 || !body?.data?.audio) {
    throw new Error(
      `minimax ${response.status} code=${body?.base_resp?.status_code} ${body?.base_resp?.status_msg ?? ""}`,
    );
  }
  return Buffer.from(body.data.audio, "hex");
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyChapter = process.argv.find((arg) => arg.startsWith("--chapter="))?.split("=")[1];
  const chapterIds = onlyChapter ? [onlyChapter] : Object.keys(CHAPTERS);

  const all: CollectedLine[] = [];
  for (const chapterId of chapterIds) {
    const lines = collectChapterLines(chapterId);
    console.log(`[${chapterId}] unique voiced chunks: ${lines.length}`);
    all.push(...lines);
  }
  const unique = new Map(all.map((line) => [line.key, line]));
  const totalChars = [...unique.values()].reduce((sum, line) => sum + line.text.length, 0);
  console.log(`total unique lines: ${unique.size}, chars: ${totalChars}`);

  if (process.argv.includes("--dump")) {
    console.log(JSON.stringify([...unique.values()], null, 1));
    return;
  }

  if (dryRun) {
    for (const line of [...unique.values()].slice(0, 5)) {
      console.log(`  sample [${line.characterId}] ${line.text.slice(0, 60)}…`);
    }
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const env = loadEnv();
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const line of unique.values()) {
    const outPath = join(OUT_DIR, `${line.key}.mp3`);
    if (existsSync(outPath)) {
      skipped += 1;
      continue;
    }
    const voiceId = CHINESE_VOICE_MAP[line.characterId] ?? "male-qn-qingse";
    let done = false;
    for (let attempt = 0; attempt < 4 && !done; attempt += 1) {
      try {
        const audio = await synthesize(env, voiceId, line.text);
        writeFileSync(outPath, audio);
        generated += 1;
        done = true;
        if (generated % 25 === 0) {
          console.log(`  …${generated} generated`);
        }
      } catch (error) {
        if (String(error).includes("1002")) {
          // RPM limit: back off and retry the same line.
          await new Promise((r) => setTimeout(r, 15000));
          continue;
        }
        failed += 1;
        console.error(`  FAIL [${line.characterId}] ${line.text.slice(0, 40)}: ${String(error)}`);
        break;
      }
    }
    if (!done) {
      // exhausted retries on rate limit
      failed += 1;
    }
    // Stay under the provider RPM ceiling.
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Catalog is derived from the directory so it always matches shipped files.
  const keys = readdirSync(OUT_DIR)
    .filter((file) => file.endsWith(".mp3"))
    .map((file) => file.replace(/\.mp3$/, ""))
    .sort();
  writeFileSync(join(OUT_DIR, "catalog.json"), JSON.stringify({ version: 1, keys }, null, 0) + "\n");
  console.log(`generated=${generated} skipped=${skipped} failed=${failed} catalog=${keys.length}`);
}

await main();
