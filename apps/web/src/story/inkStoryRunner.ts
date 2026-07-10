import { ch01InkSource, prototypeAct1InkSource } from "@supaluv/content";
import { Compiler, Story } from "inkjs/full";

export interface InkStoryChoice {
  readonly index: number;
  readonly text: string;
}

export interface ComedyMeters {
  readonly dignity: number;
  readonly impulse: number;
}

export interface InkStorySnapshot {
  readonly sceneId: string | null;
  readonly text: string;
  readonly choices: readonly InkStoryChoice[];
  readonly isEnded: boolean;
  readonly meters: ComedyMeters;
}

function getSceneIdFromTags(tags: readonly string[]): string | null {
  const sceneTag = tags.find((tag) => tag.startsWith("scene:"));

  return sceneTag ? sceneTag.slice("scene:".length) : null;
}

function readMeters(story: Story): ComedyMeters {
  const variables = story.variablesState;

  return {
    dignity: Number(variables.dignity ?? 50),
    impulse: Number(variables.impulse ?? 50),
  };
}

function readSnapshot(story: Story): InkStorySnapshot {
  const textParts: string[] = [];
  let sceneId: string | null = null;

  while (story.canContinue) {
    const line = story.Continue() ?? "";
    const taggedSceneId = getSceneIdFromTags(story.currentTags ?? []);

    if (taggedSceneId) {
      sceneId = taggedSceneId;
    }

    const trimmedLine = line.trim();

    if (trimmedLine.length > 0) {
      textParts.push(trimmedLine);
    }
  }

  return {
    sceneId,
    text: textParts.join("\n\n"),
    choices: story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
    })),
    isEnded: !story.canContinue && story.currentChoices.length === 0,
    meters: readMeters(story),
  };
}

export class InkStoryRunner {
  private readonly story: Story;

  private snapshot: InkStorySnapshot;

  constructor(source: string, savedStateJson?: string) {
    this.story = new Compiler(source).Compile();
    if (savedStateJson) {
      this.story.state.LoadJson(savedStateJson);
    }
    this.snapshot = readSnapshot(this.story);
  }

  getSnapshot(): InkStorySnapshot {
    return this.snapshot;
  }

  /** Ink runtime state for save/load (choices, variables, path). */
  exportStateJson(): string {
    return this.story.state.ToJson();
  }

  choose(index: number): InkStorySnapshot {
    const choice = this.story.currentChoices[index];

    if (!choice) {
      throw new RangeError(`Choice index ${index} is out of range.`);
    }

    this.story.ChooseChoiceIndex(index);
    this.snapshot = readSnapshot(this.story);

    return this.snapshot;
  }

  /**
   * Force-jump into an authored Ink path (knot / gather).
   * Used after a constrained AI side branch rejoins the spine.
   */
  jumpTo(path: string): InkStorySnapshot {
    this.story.ChoosePathString(path);
    this.snapshot = readSnapshot(this.story);
    return this.snapshot;
  }
}

export function createInkStoryRunner(source: string, savedStateJson?: string): InkStoryRunner {
  return new InkStoryRunner(source, savedStateJson);
}

export function createPrototypeInkStoryRunner(): InkStoryRunner {
  return createInkStoryRunner(prototypeAct1InkSource);
}

export function createCh01InkStoryRunner(): InkStoryRunner {
  return createInkStoryRunner(ch01InkSource);
}
