/**
 * Public entry for tests and programmatic use.
 */
export {
  DEFAULT_CHAPTERS,
  MAX_STEPS,
  PERSONA_IDS,
  PERSONAS,
  REPO_ROOT,
  compiledChapterPath,
  diffVariables,
  exportVariables,
  formatTranscript,
  getPersona,
  inheritVariableNamesFor,
  knotIdFromPath,
  lineDiffCount,
  loadCompiledChapterJson,
  loadStoryCatalog,
  runAll,
  runChapter,
  snapshotVariables,
} from "./engine.mjs";

export {
  AI_SCORE_KEYWORDS,
  MIANZI_KEYWORDS,
  SKIP_KEYWORDS,
  pickAiScorePersona,
  pickHighestScoreFirst,
  pickHighestScoreLast,
  pickSkipper,
  scoreKeywords,
} from "./personas.mjs";
