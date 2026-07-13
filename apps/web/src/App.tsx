import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "./analytics/productAnalytics";
import { gameAudio } from "./audio/gameAudio";
import { useCoPlaySession } from "./coplay/useCoPlaySession";
import type { CoPlayRole } from "./coplay/protocol";
import type { StoryCharacterBindings } from "./characters/characterPackTypes";
import { createCharacterPackClient } from "./characters/characterPackClient";
import { refreshCharacterBindingUrls } from "./characters/storyRunBindings";
import { useAuth } from "./auth/AuthContext";
import { unlockAchievement, type AchievementDef } from "./persistence/achievements";
import {
  loadDisplayNames,
  saveDisplayNames,
  type DisplayNameMap,
} from "./persistence/displayNames";
import {
  hasCustomPortraitPack,
  loadPortraitPack,
  savePortraitPack,
  type PortraitPackState,
} from "./persistence/portraitPack";
import { DRAFT_CLEAR_REWARDS, type ManualSlotId } from "./persistence/gameSave";
import { loadSettings, saveSettings, type GameSettings } from "./persistence/settings";
import { resolveStatsPick } from "./stats/choiceStatsCatalog";
import type { StoryId } from "./story/storyMapAdapter";
import { createStorySession } from "./story/session/createStorySession";
import { loadStoryRuntime, type StoryRuntime } from "./story/session/storyRuntime";
import { useStorySession } from "./story/session/useStorySession";
import { AtomicLoadingOverlay, type AtomicLoadingKind } from "./loading/AtomicLoadingOverlay";
import {
  CASTING_CRITICAL_ASSETS,
  createModulePreloader,
  preloadDecodedImage,
  preloadDecodedImages,
  TITLE_CRITICAL_ASSETS,
} from "./loading/atomicLoading";
import { BootSplash } from "./views/BootSplash";
import type { EndingPathMeta } from "./views/ChapterEndCard";
import { OrientationGate } from "./views/OrientationGate";

const loadTitleScreenModule = createModulePreloader(() => import("./views/TitleScreen"));
const TitleScreen = lazy(() =>
  loadTitleScreenModule().then(({ TitleScreen }) => ({ default: TitleScreen })),
);

const AchievementsScreen = lazy(() =>
  import("./views/AchievementsScreen").then(({ AchievementsScreen }) => ({
    default: AchievementsScreen,
  })),
);
const GalleryScreen = lazy(() =>
  import("./views/GalleryScreen").then(({ GalleryScreen }) => ({ default: GalleryScreen })),
);
const HelpScreen = lazy(() =>
  import("./views/HelpScreen").then(({ HelpScreen }) => ({ default: HelpScreen })),
);
const SettingsScreen = lazy(() =>
  import("./views/SettingsScreen").then(({ SettingsScreen }) => ({ default: SettingsScreen })),
);
const loadStoryMapPreviewModule = createModulePreloader(() => import("./views/StoryMapPreview"));
const StoryMapPreview = lazy(() =>
  loadStoryMapPreviewModule().then(({ StoryMapPreview }) => ({ default: StoryMapPreview })),
);
const loadVisualNovelModule = createModulePreloader(() => import("./views/VisualNovelPrototype"));
const VisualNovelPrototype = lazy(() =>
  loadVisualNovelModule().then(({ VisualNovelPrototype }) => ({
    default: VisualNovelPrototype,
  })),
);
const loadCharacterStudioModule = createModulePreloader(
  () => import("./views/CharacterStudioScreen"),
);
const CharacterStudioScreen = lazy(() =>
  loadCharacterStudioModule().then(({ CharacterStudioScreen }) => ({
    default: CharacterStudioScreen,
  })),
);
const AiSpendAnalysisScreen = lazy(() =>
  import("./views/AiSpendAnalysisScreen").then(({ AiSpendAnalysisScreen }) => ({
    default: AiSpendAnalysisScreen,
  })),
);

type AppScreen =
  | "title"
  | "character-studio"
  | "play"
  | "gallery"
  | "settings"
  | "help"
  | "achievements"
  | "ai-spend";

const BOOT_SEEN_KEY = "supaluv.boot.seen.v1";

async function preloadTitlePresentation(): Promise<void> {
  await Promise.all([loadTitleScreenModule(), preloadDecodedImages(TITLE_CRITICAL_ASSETS)]);
}

async function preloadStoryPresentation(
  runtime: StoryRuntime,
  nextStoryId: StoryId,
  sceneId: string | null,
): Promise<void> {
  const scene = runtime.getStoryScene(nextStoryId, sceneId);
  const artPromise = scene?.artKey
    ? preloadDecodedImage(`/assets/scenes/${scene.artKey}.jpg`)
    : Promise.resolve();
  await Promise.all([loadVisualNovelModule(), loadStoryMapPreviewModule(), artPromise]);
}

export function App() {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;

  const [bootDone, setBootDone] = useState(() => {
    try {
      return sessionStorage.getItem(BOOT_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [screen, setScreen] = useState<AppScreen>("title");
  const [titleReady, setTitleReady] = useState(false);
  const [titleLoadAttempt, setTitleLoadAttempt] = useState(0);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [displayNames, setDisplayNames] = useState<DisplayNameMap>(() => loadDisplayNames());
  const [portraitPack, setPortraitPack] = useState<PortraitPackState>(() => loadPortraitPack());
  const [isCreatorMapOpen, setCreatorMapOpen] = useState(false);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [loadingTransition, setLoadingTransition] = useState<{
    kind: AtomicLoadingKind;
    error?: string | null;
    retry?: () => void;
  } | null>(null);
  const unlockToastTimer = useRef<number | null>(null);
  const storyActionInFlight = useRef(false);
  const metaReturnScreen = useRef<AppScreen>("title");
  const [coPlayConfig, setCoPlayConfig] = useState<{
    roomCode: string;
    role: CoPlayRole;
    alias: string;
  } | null>(null);

  const coPlay = useCoPlaySession(coPlayConfig);

  const showUnlockToast = useCallback((message: string) => {
    setUnlockToast(message);
    if (unlockToastTimer.current !== null) {
      window.clearTimeout(unlockToastTimer.current);
    }
    unlockToastTimer.current = window.setTimeout(() => setUnlockToast(null), 2400);
  }, []);

  const showUnlockToastRef = useRef(showUnlockToast);
  showUnlockToastRef.current = showUnlockToast;

  const session = useMemo(
    () =>
      createStorySession({
        preloadPresentation: preloadStoryPresentation,
        refreshCharacterBindings: (bindings) =>
          refreshCharacterBindingUrls(
            bindings,
            createCharacterPackClient({
              getAccessToken: () => authRef.current.getAccessToken(),
            }).getPack,
          ),
        onUnlocksGained: (gained) => {
          showUnlockToastRef.current(`图鉴 +${gained}`);
          gameAudio.playSfx("notify-soft", 0.35);
        },
      }),
    [],
  );
  const story = useStorySession(session);
  const {
    storyId,
    runner,
    snapshot,
    unlocks,
    characterBindings,
    activeManualSlot,
    revision: storyRevision,
    continueBlockedMessage,
  } = story;

  useEffect(() => {
    gameAudio.setMuted(settings.masterMuted);
    gameAudio.setMusicVolume(settings.musicVolume);
    gameAudio.setAmbientVolume(settings.ambientVolume);
    gameAudio.setSfxVolume(settings.sfxVolume);
    gameAudio.setVoiceVolume(settings.voiceVolume);
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveDisplayNames(displayNames);
  }, [displayNames]);

  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      setLoadingTransition({
        kind: "retry",
        error: "更新后的游戏代码没有完整下载。请重试；若仍失败，刷新页面会从存档恢复。",
        retry: () => window.location.reload(),
      });
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, []);

  useEffect(() => {
    if (!bootDone) {
      void preloadTitlePresentation().catch(() => undefined);
      return;
    }

    if (!titleReady) {
      let active = true;
      void preloadTitlePresentation()
        .then(() => {
          if (active) {
            setTitleReady(true);
          }
        })
        .catch(() => {
          if (!active) {
            return;
          }
          setLoadingTransition({
            kind: "retry",
            error: "标题画面没有完整下载。请重试；若仍失败，刷新页面会重新获取资源。",
            retry: () => {
              setLoadingTransition(null);
              setTitleLoadAttempt((value) => value + 1);
            },
          });
        });
      return () => {
        active = false;
      };
    }

    const timer = window.setTimeout(() => {
      void loadCharacterStudioModule().catch(() => undefined);
      void loadStoryRuntime().catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [bootDone, titleLoadAttempt, titleReady]);

  /** Meta screens share document scroll — reset so Help/Achievements never open mid-page. */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [screen, bootDone]);

  const tryAchievement = useCallback(
    (id: Parameters<typeof unlockAchievement>[0]) => {
      const def: AchievementDef | null = unlockAchievement(id);
      if (def) {
        showUnlockToast(`成就 · ${def.title}`);
        gameAudio.playSfx("notify-soft", 0.4);
      }
    },
    [showUnlockToast],
  );

  function runStoryAction(action: () => Promise<void>, kind?: AtomicLoadingKind) {
    if (storyActionInFlight.current) {
      return;
    }
    storyActionInFlight.current = true;
    if (kind) {
      setLoadingTransition({ kind });
    }
    void action()
      .then(() => {
        if (kind) {
          setLoadingTransition(null);
        }
      })
      .catch(() => {
        const retry = () => {
          setLoadingTransition(null);
          storyActionInFlight.current = false;
          runStoryAction(action, kind);
        };
        if (kind) {
          setLoadingTransition({
            kind: "retry",
            error: "换幕没有完成，当前画面仍然保留。请检查网络后重试。",
            retry,
          });
        } else {
          showUnlockToast("故事加载失败，请检查网络后重试。");
        }
      })
      .finally(() => {
        storyActionInFlight.current = false;
      });
  }

  function enterTitle() {
    runStoryAction(async () => {
      await preloadTitlePresentation();
      try {
        sessionStorage.setItem(BOOT_SEEN_KEY, "1");
      } catch {
        // ignore
      }
      session.addUnlocks({ audio: ["title-theme"] });
      setTitleReady(true);
      setBootDone(true);
    }, "title");
  }

  function openCharacterStudio() {
    runStoryAction(async () => {
      await Promise.all([
        loadCharacterStudioModule(),
        preloadDecodedImages(CASTING_CRITICAL_ASSETS),
      ]);
      setScreen("character-studio");
    }, "casting");
  }

  useEffect(() => {
    if (
      !import.meta.env.DEV ||
      !new URLSearchParams(window.location.search).has("atomic-loading-fixture")
    ) {
      return;
    }
    const testWindow = window as Window & {
      __SUPALUV_ATOMIC_LOADING_TEST__?: { transitionToChapter2: () => void };
    };
    testWindow.__SUPALUV_ATOMIC_LOADING_TEST__ = {
      transitionToChapter2: () =>
        runStoryAction(() => session.loadChapter("draft-ch02" as StoryId), "chapter"),
    };
    return () => {
      delete testWindow.__SUPALUV_ATOMIC_LOADING_TEST__;
    };
  });

  useEffect(() => {
    savePortraitPack(portraitPack);
    if (hasCustomPortraitPack(portraitPack)) {
      tryAchievement("custom_pack_active");
    }
  }, [portraitPack, tryAchievement]);

  function openMeta(next: "gallery" | "settings" | "help" | "achievements" | "ai-spend") {
    metaReturnScreen.current = screen === "play" ? "play" : "title";
    if (next === "gallery") {
      tryAchievement("gallery_start");
      trackEvent({ name: "gallery_open" });
    }
    setScreen(next);
  }

  function backFromMeta() {
    const target = metaReturnScreen.current === "play" && runner ? "play" : "title";
    setScreen(target);
  }

  async function startNewGame(bindings: StoryCharacterBindings = {}) {
    gameAudio.unlock();
    trackEvent({ name: "title_new_game" });
    tryAchievement("first_play");
    // Solo new game drops co-play unless already host starting intentionally.
    if (coPlayConfig?.role === "guest") {
      setCoPlayConfig(null);
    }
    await session.startNew(bindings);
    setScreen("play");
  }

  async function startHostCoPlay(roomCode: string, alias: string) {
    gameAudio.unlock();
    tryAchievement("first_coplay");
    setCoPlayConfig({ roomCode, role: "host", alias });
    trackEvent({ name: "title_new_game" });
    tryAchievement("first_play");
    // Host reuses current session bindings (pre-refactor persistSave capture),
    // unlike solo casting which supplies newly selected bindings.
    await session.startNew(session.getState().characterBindings);
    setScreen("play");
  }

  async function joinGuestCoPlay(roomCode: string, alias: string) {
    gameAudio.unlock();
    tryAchievement("first_coplay");
    setCoPlayConfig({ roomCode, role: "guest", alias });
    await session.startGuestShell();
    setScreen("play");
  }

  function leaveCoPlay() {
    const role = coPlayConfig?.role;
    setCoPlayConfig(null);
    if (role === "guest") {
      setScreen("title");
      session.closeGuestShell();
    }
  }

  async function continueGame(slotId?: string) {
    gameAudio.unlock();
    trackEvent({ name: "title_continue" });
    tryAchievement("first_play");
    const result = await session.resume(slotId, portraitPack);
    if (result === "blocked") {
      const message = session.getState().continueBlockedMessage;
      if (message) {
        showUnlockToast(message);
      }
      setScreen("title");
      return;
    }
    setScreen("play");
  }

  function handleReset() {
    runStoryAction(() => session.reset());
  }

  function handleChoose(index: number) {
    if (!runner || !snapshot) {
      return;
    }
    const choice =
      snapshot.choices.find((entry) => entry.index === index) ?? snapshot.choices[index];
    const statsPick = resolveStatsPick(storyId, snapshot.sceneId, choice?.text ?? "");
    trackEvent({
      name: "choice_made",
      storyId,
      sceneId: snapshot.sceneId ?? "unknown",
      source: "authored",
      choiceId: statsPick?.option.choiceId,
    });
    const nextSnapshot = session.choose(index);
    if (nextSnapshot?.isEnded) {
      trackEvent({ name: "chapter_ended", storyId });
    }
  }

  function handleJumpTo(path: string) {
    if (!runner) {
      return;
    }
    trackEvent({
      name: "ai_branch_completed",
      storyId,
      rejoinSceneId: path,
    });
    tryAchievement("first_ai_branch");
    session.jump(path);
  }

  function handleManualSave(slotId: ManualSlotId = activeManualSlot) {
    if (!session.save(slotId)) {
      return;
    }
    tryAchievement("first_manual_save");
    trackEvent({ name: "manual_save", slotKind: "manual" });
  }

  function handleChapterClear(path: EndingPathMeta) {
    if (!snapshot) {
      return;
    }
    // Synchronous classification against the warm session runtime (exact pre-refactor).
    if (session.canAdvanceToNextChapter()) {
      runStoryAction(async () => {
        await session.advanceToNextChapter();
      }, "chapter");
      return;
    }
    gameAudio.stopAmbient();
    gameAudio.playExclusiveBed("chapter-end");
    tryAchievement("ch01_clear");
    if (snapshot.meters.impulse >= 65) {
      tryAchievement("high_impulse");
    }
    if (snapshot.meters.dignity >= 55) {
      tryAchievement("high_dignity");
    }
    if (path.usedAiBranch) {
      tryAchievement("first_ai_branch");
    }
    session.addUnlocks(DRAFT_CLEAR_REWARDS);
  }

  if (!bootDone) {
    return (
      <main className="app-shell" data-screen="boot">
        <BootSplash onEnter={enterTitle} />
        {loadingTransition ? (
          <AtomicLoadingOverlay
            kind={loadingTransition.kind}
            error={loadingTransition.error}
            onRetry={loadingTransition.retry}
          />
        ) : null}
      </main>
    );
  }

  return (
    <main className="app-shell" data-screen={screen}>
      <OrientationGate />
      {screen === "title" ? (
        titleReady ? (
          <Suspense fallback={<AtomicLoadingOverlay kind="title" />}>
            <TitleScreen
              onNewGame={openCharacterStudio}
              onContinue={(slotId) => runStoryAction(() => continueGame(slotId), "story")}
              onOpenGallery={() => openMeta("gallery")}
              onOpenSettings={() => openMeta("settings")}
              onOpenHelp={() => openMeta("help")}
              onOpenAchievements={() => openMeta("achievements")}
              onOpenAiSpend={() => openMeta("ai-spend")}
              onHostCoPlay={(roomCode, alias) =>
                runStoryAction(() => startHostCoPlay(roomCode, alias), "story")
              }
              onJoinCoPlay={(roomCode, alias) =>
                runStoryAction(() => joinGuestCoPlay(roomCode, alias), "story")
              }
              continueBlockedMessage={continueBlockedMessage}
              onDismissContinueBlocked={() => session.clearContinueBlocked()}
            />
          </Suspense>
        ) : (
          <AtomicLoadingOverlay kind="title" />
        )
      ) : null}

      <Suspense fallback={<AtomicLoadingOverlay kind="casting" />}>
        {screen === "character-studio" ? (
          <CharacterStudioScreen
            onCancel={() => setScreen("title")}
            onComplete={(bindings) => runStoryAction(() => startNewGame(bindings), "story")}
          />
        ) : null}

        {screen === "gallery" ? <GalleryScreen unlocks={unlocks} onBack={backFromMeta} /> : null}

        {screen === "settings" ? (
          <SettingsScreen
            settings={settings}
            onChange={setSettings}
            displayNames={displayNames}
            onDisplayNamesChange={setDisplayNames}
            portraitPack={portraitPack}
            onPortraitPackChange={setPortraitPack}
            onBack={backFromMeta}
          />
        ) : null}

        {screen === "help" ? <HelpScreen onBack={backFromMeta} /> : null}

        {screen === "achievements" ? <AchievementsScreen onBack={backFromMeta} /> : null}

        {screen === "ai-spend" ? <AiSpendAnalysisScreen onBack={backFromMeta} /> : null}
      </Suspense>

      <Suspense fallback={<AtomicLoadingOverlay kind="story" />}>
        {screen === "play" && runner && snapshot ? (
          <>
            <VisualNovelPrototype
              key={storyRevision}
              storyId={storyId}
              snapshot={snapshot}
              textSpeed={settings.textSpeed}
              autoPlay={settings.autoPlay}
              masterMuted={settings.masterMuted}
              musicVolume={settings.musicVolume}
              ambientVolume={settings.ambientVolume}
              sfxVolume={settings.sfxVolume}
              voiceVolume={settings.voiceVolume}
              activeSaveSlot={activeManualSlot}
              displayNames={displayNames}
              portraitPack={portraitPack}
              characterBindings={characterBindings}
              onCharacterBindingsChange={(bindings) => session.updateCharacterBindings(bindings)}
              coPlay={coPlay}
              onLeaveCoPlay={leaveCoPlay}
              onRareEcho={() => tryAchievement("rare_echo_path")}
              onReverseCurrent={() => tryAchievement("reverse_current")}
              onOracleHit={() => tryAchievement("oracle_hit")}
              onRpsResolvedAchievement={() => tryAchievement("first_rps")}
              onCustomPackCgSkipped={() => showUnlockToast("自定义立绘模式：已跳过官方正脸 CG")}
              onBedHeard={(bedId) => {
                if (unlocks.audio.includes(bedId)) {
                  return;
                }
                session.addUnlocks({ audio: [bedId] });
                showUnlockToast(`配乐已收藏：${bedId}`);
              }}
              onStoryChange={(nextStoryId) =>
                runStoryAction(() => session.loadChapter(nextStoryId), "chapter")
              }
              onChoose={handleChoose}
              onJumpTo={handleJumpTo}
              onOpenMap={() => setCreatorMapOpen(true)}
              onReset={handleReset}
              onSave={handleManualSave}
              onOpenTitle={() => {
                gameAudio.stopAmbient();
                gameAudio.playExclusiveBed("title-theme");
                setCoPlayConfig(null);
                setScreen("title");
              }}
              onOpenGallery={() => openMeta("gallery")}
              onOpenSettings={() => openMeta("settings")}
              onOpenHelp={() => openMeta("help")}
              onOpenAchievements={() => openMeta("achievements")}
              onAutoPlayChange={(next) => setSettings((prev) => ({ ...prev, autoPlay: next }))}
              onMasterMutedChange={(next) =>
                setSettings((prev) => ({ ...prev, masterMuted: next }))
              }
              onAiBranchUsed={() => tryAchievement("first_ai_branch")}
              onChapterClear={handleChapterClear}
            />
            <StoryMapPreview
              storyId={storyId}
              currentSceneId={snapshot.sceneId}
              isOpen={isCreatorMapOpen}
              onClose={() => setCreatorMapOpen(false)}
            />
          </>
        ) : null}
      </Suspense>

      {unlockToast ? (
        <div className="global-toast" data-testid="unlock-toast" role="status">
          {unlockToast}
        </div>
      ) : null}
      {loadingTransition ? (
        <AtomicLoadingOverlay
          kind={loadingTransition.kind}
          error={loadingTransition.error}
          onRetry={loadingTransition.retry}
        />
      ) : null}
    </main>
  );
}
