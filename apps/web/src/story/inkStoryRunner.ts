import { prototypeAct1InkSource } from "@supaluv/content";
import { Compiler, Story } from "inkjs/full";

export interface InkStoryChoice {
  readonly index: number;
  readonly text: string;
}

export interface InkStorySnapshot {
  readonly sceneId: string | null;
  readonly text: string;
  readonly choices: readonly InkStoryChoice[];
  readonly isEnded: boolean;
}

function getSceneIdFromTags(tags: readonly string[]): string | null {
  const sceneTag = tags.find((tag) => tag.startsWith("scene:"));

  return sceneTag ? sceneTag.slice("scene:".length) : null;
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
  };
}

export class InkStoryRunner {
  private readonly story: Story;

  private snapshot: InkStorySnapshot;

  constructor(source: string) {
    this.story = new Compiler(source).Compile();
    this.snapshot = readSnapshot(this.story);
  }

  getSnapshot(): InkStorySnapshot {
    return this.snapshot;
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
}

export function createInkStoryRunner(source: string): InkStoryRunner {
  return new InkStoryRunner(source);
}

export function createPrototypeInkStoryRunner(): InkStoryRunner {
  return createInkStoryRunner(prototypeAct1InkSource);
}
