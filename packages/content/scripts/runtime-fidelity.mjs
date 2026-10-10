import { createHash } from "node:crypto";

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sceneFromTags(tags) {
  const tag = (tags ?? []).find((value) => value.startsWith("scene:"));
  return tag ? tag.slice("scene:".length).trim() : null;
}

function choiceIdFromTags(tags) {
  const tag = (tags ?? []).find((value) => value.startsWith("choice:"));
  return tag ? tag.slice("choice:".length).trim() : null;
}

export function readRuntimeBoundary(story, carriedSceneId) {
  let sceneId = carriedSceneId;
  const text = [];
  const textPartsByScene = new Map();
  while (story.canContinue) {
    const line = story.Continue() ?? "";
    sceneId = sceneFromTags(story.currentTags) ?? sceneId;
    const trimmed = String(line).trim();
    if (trimmed) {
      text.push(trimmed);
      if (sceneId) {
        const sceneParts = textPartsByScene.get(sceneId) ?? [];
        sceneParts.push(trimmed);
        textPartsByScene.set(sceneId, sceneParts);
      }
    }
  }
  if (sceneId) {
    for (const choice of story.currentChoices) {
      const choiceText = String(choice.text ?? "").trim();
      if (choiceText) {
        const sceneParts = textPartsByScene.get(sceneId) ?? [];
        sceneParts.push(choiceText);
        textPartsByScene.set(sceneId, sceneParts);
      }
    }
  }
  return {
    sceneId,
    text: text.join("\n"),
    displayedTexts: [...textPartsByScene].map(([displayedSceneId, parts]) => ({
      sceneId: displayedSceneId,
      text: parts.join("\n"),
    })),
    choices: story.currentChoices.map((choice, index) => ({
      index,
      id: choiceIdFromTags(choice.tags),
      text: choice.text,
    })),
    stateJson: story.state.ToJson(),
    ended: !story.canContinue && story.currentChoices.length === 0,
  };
}

/**
 * Representative runtime exploration.
 *
 * Ink state contains counters and historical variables that make full-state
 * enumeration combinatorial. We therefore expand every distinct visible menu
 * once, while still recording the actual text emitted by every queued branch.
 * This is sound evidence that recorded text was displayed, but it is not a
 * proof that every possible variable state was enumerated.
 */
export function exploreRepresentativeChapter(Story, compiledJson, maxExploredStates = 50_000) {
  const start = readRuntimeBoundary(new Story(compiledJson), null);
  const queue = [start];
  const expandedMenus = new Set();
  const reachableScenes = new Set();
  const displayedTextsByScene = new Map();
  const errors = [];
  let terminalStates = 0;
  let exploredStates = 0;

  while (queue.length > 0 && exploredStates < maxExploredStates) {
    const current = queue.shift();
    exploredStates += 1;
    if (current.sceneId) {
      reachableScenes.add(current.sceneId);
    }
    for (const segment of current.displayedTexts) {
      reachableScenes.add(segment.sceneId);
      const displayed = displayedTextsByScene.get(segment.sceneId) ?? new Set();
      displayed.add(segment.text);
      displayedTextsByScene.set(segment.sceneId, displayed);
    }
    if (current.ended) {
      terminalStates += 1;
      continue;
    }
    if (current.choices.length === 0) {
      errors.push(`non-terminal boundary has no choices at ${current.sceneId ?? "<unknown>"}`);
      continue;
    }

    const menuKey = sha256Text(
      `${current.sceneId ?? ""}\n${current.text}\n${current.choices
        .map((choice) => `${choice.id ?? "<missing>"}:${choice.text}`)
        .join("\n")}`,
    );
    if (expandedMenus.has(menuKey)) {
      continue;
    }
    expandedMenus.add(menuKey);

    for (const choice of current.choices) {
      if (!choice.id) {
        errors.push(
          `choice is missing # choice: tag at ${current.sceneId ?? "<unknown>"}: ${choice.text}`,
        );
      }
      const branch = new Story(compiledJson);
      branch.state.LoadJson(current.stateJson);
      branch.ChooseChoiceIndex(choice.index);
      queue.push(readRuntimeBoundary(branch, current.sceneId));
    }
  }

  if (queue.length > 0) {
    errors.push(
      `representative runtime exploration exceeded ${maxExploredStates} states (possible choice-cycle explosion)`,
    );
  }
  if (terminalStates === 0) {
    errors.push("no terminating representative runtime path was found");
  }

  return {
    mode: "representative-visible-menu",
    reachableScenes,
    displayedTextsByScene,
    exploredStates,
    expandedMenus: expandedMenus.size,
    terminalStates,
    errors,
  };
}

export function hasRuntimeTextWitness(exploration, sceneId, sourceParagraph) {
  if (!sceneId || !sourceParagraph) {
    return false;
  }
  return [...(exploration.displayedTextsByScene.get(sceneId) ?? [])].some((text) =>
    text.includes(sourceParagraph),
  );
}
