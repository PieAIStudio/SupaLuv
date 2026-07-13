import { loadStoryChapter, type StoryCatalogId, type StoryCatalogMeta } from "@supaluv/content";
import { Story } from "inkjs";

export interface InkStoryChoice {
  readonly index: number;
  readonly text: string;
  /** Stable choice id from Ink `# choice:<id>` tag; independent of display punctuation. */
  readonly choiceId?: string | null;
}

export interface ComedyMeters {
  readonly dignity: number;
  readonly impulse: number;
}

export interface InkStorySnapshot {
  readonly sceneId: string | null;
  /** Stable authored line tags captured at the current choice boundary. */
  readonly tags: readonly string[];
  readonly text: string;
  readonly choices: readonly InkStoryChoice[];
  readonly isEnded: boolean;
  readonly meters: ComedyMeters;
}

function getSceneIdFromTags(tags: readonly string[]): string | null {
  const sceneTag = tags.find((tag) => tag.startsWith("scene:"));
  return sceneTag ? sceneTag.slice("scene:".length) : null;
}

function getChoiceIdFromTags(tags: readonly string[] | undefined): string | null {
  if (!tags?.length) {
    return null;
  }
  const choiceTag = tags.find((tag) => tag.startsWith("choice:"));
  return choiceTag ? choiceTag.slice("choice:".length) : null;
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
  const tags = new Set<string>();
  let sceneId: string | null = null;

  while (story.canContinue) {
    const line = story.Continue() ?? "";
    const currentTags = story.currentTags ?? [];
    for (const tag of currentTags) {
      tags.add(tag);
    }
    const taggedSceneId = getSceneIdFromTags(currentTags);
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
    tags: [...tags],
    text: textParts.join("\n\n"),
    choices: story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
      choiceId: getChoiceIdFromTags(choice.tags as string[] | undefined),
    })),
    isEnded: !story.canContinue && story.currentChoices.length === 0,
    meters: readMeters(story),
  };
}

export class InkStoryRunner {
  private readonly story: Story;
  private snapshot: InkStorySnapshot;

  private constructor(story: Story) {
    this.story = story;
    this.snapshot = readSnapshot(this.story);
  }

  static fromCompiledJson(compiledJson: string, savedStateJson?: string): InkStoryRunner {
    const story = new Story(compiledJson);
    if (savedStateJson) {
      story.state.LoadJson(savedStateJson);
    }
    return new InkStoryRunner(story);
  }

  static fromStoryInstance(story: Story): InkStoryRunner {
    return new InkStoryRunner(story);
  }

  getSnapshot(): InkStorySnapshot {
    return this.snapshot;
  }

  /** Ink runtime state for save/load (choices, variables, path). */
  exportStateJson(): string {
    return this.story.state.ToJson();
  }

  /** Read a variable for chapter inheritance. */
  getVariable(name: string): unknown {
    return this.story.variablesState[name];
  }

  /** Apply inherited variables after loading a new chapter. */
  applyVariables(values: Readonly<Record<string, unknown>>): void {
    for (const [name, value] of Object.entries(values)) {
      try {
        this.story.variablesState[name] = value as never;
      } catch {
        // Variable may not exist in target chapter; ignore.
      }
    }
    this.snapshot = {
      ...this.snapshot,
      meters: readMeters(this.story),
    };
  }

  exportVariables(names: readonly string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const name of names) {
      out[name] = this.story.variablesState[name];
    }
    return out;
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

/**
 * Create runner from catalog id using precompiled chapter JSON only.
 * Loads chapter presentation into the content cache; never loads the Ink compiler package.
 */
export async function createInkStoryRunnerForId(
  storyId: StoryCatalogId,
  savedStateJson?: string,
  inheritedVariables?: Readonly<Record<string, unknown>>,
): Promise<InkStoryRunner> {
  const chapter = await loadStoryChapter(storyId);
  const runner = InkStoryRunner.fromCompiledJson(chapter.compiledStoryJson, savedStateJson);
  if (inheritedVariables && !savedStateJson) {
    runner.applyVariables(inheritedVariables);
  }
  return runner;
}

/** Sync helper for unit tests that already have compiled JSON. */
export function createInkStoryRunnerFromCompiled(
  compiledJson: string,
  savedStateJson?: string,
): InkStoryRunner {
  return InkStoryRunner.fromCompiledJson(compiledJson, savedStateJson);
}

export async function createPrototypeInkStoryRunner(): Promise<InkStoryRunner> {
  return createInkStoryRunnerForId("prototype-act1");
}

export async function createDraftCh01InkStoryRunner(
  inheritedVariables?: Readonly<Record<string, unknown>>,
): Promise<InkStoryRunner> {
  return createInkStoryRunnerForId("draft-ch01", undefined, inheritedVariables);
}

export async function createDraftCh02InkStoryRunner(
  inheritedVariables?: Readonly<Record<string, unknown>>,
): Promise<InkStoryRunner> {
  return createInkStoryRunnerForId("draft-ch02", undefined, inheritedVariables);
}

export type { StoryCatalogMeta };
