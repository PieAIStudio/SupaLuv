import { lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { runTrackedChapterStart, trackEvent } from "./analytics/productAnalytics";
import { bedLabel } from "./audio/bedCatalog";
import { DialogueVoicePlaybackGuard } from "./audio/dialogueVoicePlaybackGuard";
import { gameAudio } from "./audio/gameAudio";
import { useCoPlaySession } from "./coplay/useCoPlaySession";
import type { CoPlayRole } from "./coplay/protocol";
import type { StoryCharacterBindings } from "./characters/characterPackTypes";
import { createCharacterPackClient } from "./characters/characterPackClient";
import { refreshCharacterBindingUrls } from "./characters/storyRunBindings";
import { useAuth } from "./auth/AuthContext";
import { useLocale } from "./i18n";
import { loadDisplayNames, type DisplayNameMap } from "./persistence/displayNames";
import { loadPortraitPack, type PortraitPackState } from "./persistence/portraitPack";
import { DRAFT_CLEAR_REWARDS, type ManualSlotId } from "./persistence/gameSave";
import { loadSettings, type GameSettings } from "./persistence/settings";
import { resolveStatsPick } from "./stats/choiceStatsCatalog";
import type { StoryId } from "./story/storyMapAdapter";
import { createStorySession } from "./story/session/createStorySession";
import { loadStoryRuntime } from "./story/session/storyRuntime";
import { useStorySession } from "./story/session/useStorySession";
import { AtomicLoadingOverlay } from "./loading/AtomicLoadingOverlay";
import { LoadingDwellCurtain } from "./loading/LoadingDwellCurtain";
import {
  CASTING_CRITICAL_ASSETS,
  preloadDecodedImages,
  waitForDocumentFonts,
} from "./loading/atomicLoading";
import {
  loadCharacterStudioModule,
  loadPlayerPathPanelModule,
  loadStoryMapPreviewModule,
  loadTitleScreenModule,
  loadVisualNovelModule,
  preloadStoryPresentation,
  preloadTitlePresentation,
} from "./app/preloadPresentation";
import {
  captureMetaReturnScreen,
  resolveBackFromMeta,
  type AppScreen,
  type MetaScreen,
} from "./app/screenRouting";
import { useAtomicStoryAction } from "./app/useAtomicStoryAction";
import { useShellPersistence } from "./app/useShellPersistence";
import { useUnlockFeedback } from "./app/useUnlockFeedback";
import { BootSplash } from "./views/BootSplash";
import type { EndingPathMeta } from "./views/ChapterEndCard";
import { OrientationGate } from "./views/OrientationGate";

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
const StoryMapPreview = lazy(() =>
  loadStoryMapPreviewModule().then(({ StoryMapPreview }) => ({ default: StoryMapPreview })),
);
const PlayerPathPanel = lazy(() =>
  loadPlayerPathPanelModule().then(({ PlayerPathPanel }) => ({ default: PlayerPathPanel })),
);
const VisualNovelPrototype = lazy(() =>
  loadVisualNovelModule().then(({ VisualNovelPrototype }) => ({
    default: VisualNovelPrototype,
  })),
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

const BOOT_SEEN_KEY = "supaluv.boot.seen.v1";

export function App() {
  const auth = useAuth();
  const { locale, t } = useLocale();
  const authRef = useRef(auth);
  authRef.current = auth;
  const translateRef = useRef(t);
  translateRef.current = t;

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
  const [isPlayerPathOpen, setPlayerPathOpen] = useState(false);
  const metaReturnScreen = useRef<AppScreen>("title");
  const [coPlayConfig, setCoPlayConfig] = useState<{
    roomCode: string;
    role: CoPlayRole;
    alias: string;
  } | null>(null);

  const coPlay = useCoPlaySession(coPlayConfig);
  const { unlockToast, showUnlockToast, tryAchievement } = useUnlockFeedback();
  const { loadingTransition, setLoadingTransition, runStoryAction } = useAtomicStoryAction({
    showUnlockToast,
  });

  const showUnlockToastRef = useRef(showUnlockToast);
  showUnlockToastRef.current = showUnlockToast;
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const session = useMemo(
    () =>
      createStorySession({
        preloadPresentation: preloadStoryPresentation,
        getContentLocale: () => localeRef.current,
        refreshCharacterBindings: (bindings) =>
          refreshCharacterBindingUrls(
            bindings,
            createCharacterPackClient({
              getAccessToken: () => authRef.current.getAccessToken(),
            }).getPack,
          ),
        onUnlocksGained: (gained) => {
          showUnlockToastRef.current(`${translateRef.current("common.galleryUnlock")} +${gained}`);
          gameAudio.playSfx("notify-soft", 0.35);
        },
      }),
    [],
  );

  // ADR-0008: hot-swap compiled Ink language when UI locale changes mid-run.
  useEffect(() => {
    void session.reloadForContentLocale(locale).catch(() => {
      // Fail soft — keep prior runner; next start/resume picks the new locale.
    });
  }, [locale, session]);
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

  const dialogueVoiceGuardRef = useRef<DialogueVoicePlaybackGuard | null>(null);
  dialogueVoiceGuardRef.current ??= new DialogueVoicePlaybackGuard();
  const dialogueVoiceGuard = dialogueVoiceGuardRef.current;
  const dialogueVoiceRunKey = `${storyRevision}:${storyId}`;

  useShellPersistence({
    settings,
    displayNames,
    portraitPack,
    dialogueVoiceGuard,
    dialogueVoiceRunKey,
    tryAchievement,
  });

  useEffect(() => {
    const onPreloadError = (event: Event) => {
      event.preventDefault();
      setLoadingTransition({
        kind: "retry",
        error: t("common.codeUpdateError"),
        refresh: () => window.location.reload(),
      });
    };
    window.addEventListener("vite:preloadError", onPreloadError);
    return () => window.removeEventListener("vite:preloadError", onPreloadError);
  }, [t, setLoadingTransition]);

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
            error: t("common.titleLoadError"),
            retry: () => {
              setLoadingTransition(null);
              setTitleLoadAttempt((value) => value + 1);
            },
            refresh: () => window.location.reload(),
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
  }, [bootDone, t, titleLoadAttempt, titleReady, setLoadingTransition]);

  /** Meta screens share document scroll — reset so Help/Achievements never open mid-page. */
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [screen, bootDone]);

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
        waitForDocumentFonts(),
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
      __SUPALUV_ATOMIC_LOADING_TEST__?: {
        transitionToChapter1: () => void;
        transitionToChapter2: () => void;
        transitionToChapter3: () => void;
      };
    };
    testWindow.__SUPALUV_ATOMIC_LOADING_TEST__ = {
      transitionToChapter1: () =>
        runStoryAction(() => session.loadChapter("draft-ch01" as StoryId), "chapter"),
      transitionToChapter2: () =>
        runStoryAction(() => session.loadChapter("draft-ch02" as StoryId), "chapter"),
      transitionToChapter3: () =>
        runStoryAction(() => session.loadChapter("draft-ch03" as StoryId), "chapter"),
    };
    return () => {
      delete testWindow.__SUPALUV_ATOMIC_LOADING_TEST__;
    };
  });

  function openMeta(next: MetaScreen) {
    metaReturnScreen.current = captureMetaReturnScreen(screen);
    if (next === "gallery") {
      tryAchievement("gallery_start");
      trackEvent({ name: "gallery_open" });
    }
    startTransition(() => setScreen(next));
  }

  function backFromMeta() {
    const target = resolveBackFromMeta(metaReturnScreen.current, Boolean(runner));
    startTransition(() => setScreen(target));
  }

  async function startNewGame(bindings: StoryCharacterBindings = {}) {
    gameAudio.unlock();
    trackEvent({ name: "title_new_game" });
    tryAchievement("first_play");
    // Solo new game drops co-play unless already host starting intentionally.
    if (coPlayConfig?.role === "guest") {
      setCoPlayConfig(null);
    }
    await runTrackedChapterStart(
      () => session.startNew(bindings),
      () => session.getState().storyId,
    );
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
    await runTrackedChapterStart(
      () => session.startNew(session.getState().characterBindings),
      () => session.getState().storyId,
    );
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
    const result = await runTrackedChapterStart(
      () => session.resume(slotId, portraitPack),
      () => session.getState().storyId,
      (resumeResult) => resumeResult === "ready",
    );
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
        await runTrackedChapterStart(
          () => session.advanceToNextChapter(),
          () => session.getState().storyId,
          (didAdvance) => didAdvance,
        );
      }, "chapter");
      return;
    }
    gameAudio.stopAmbient();
    gameAudio.playExclusiveBed("chapter-end");
    tryAchievement("ch01_clear");
    if (snapshot.meters.ai_score >= 65) {
      tryAchievement("high_ai_score");
    }
    if (snapshot.meters.mianzi >= 55) {
      tryAchievement("high_mianzi");
    }
    if (path.usedAiBranch) {
      tryAchievement("first_ai_branch");
    }
    session.addUnlocks(DRAFT_CLEAR_REWARDS);
  }

  if (!bootDone || !titleReady) {
    return (
      <main className="app-shell" data-screen="boot">
        <BootSplash
          onEnter={bootDone ? undefined : enterTitle}
          busy={bootDone || Boolean(loadingTransition)}
        />
        {loadingTransition ? (
          <AtomicLoadingOverlay
            kind={loadingTransition.kind}
            error={loadingTransition.error}
            onRetry={loadingTransition.retry}
            onRefresh={loadingTransition.refresh}
            archiveIds={unlocks.archive}
          />
        ) : bootDone ? (
          <AtomicLoadingOverlay kind="title" archiveIds={unlocks.archive} />
        ) : null}
        <LoadingDwellCurtain />
      </main>
    );
  }

  return (
    <main className="app-shell" data-screen={screen} data-coplay={coPlayConfig?.role ?? "off"}>
      {!isPlayerPathOpen ? <OrientationGate /> : null}
      {screen === "title" ? (
        titleReady ? (
          <Suspense fallback={<AtomicLoadingOverlay kind="title" archiveIds={unlocks.archive} />}>
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
          <AtomicLoadingOverlay kind="title" archiveIds={unlocks.archive} />
        )
      ) : null}

      <Suspense fallback={<AtomicLoadingOverlay kind="casting" archiveIds={unlocks.archive} />}>
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

      <Suspense fallback={<AtomicLoadingOverlay kind="story" archiveIds={unlocks.archive} />}>
        {screen === "play" && runner && snapshot ? (
          <>
            <VisualNovelPrototype
              key={storyRevision}
              storyId={storyId}
              snapshot={snapshot}
              textSpeed={settings.textSpeed}
              autoPlay={settings.autoPlay}
              masterMuted={settings.masterMuted}
              voiceVolume={settings.voiceVolume}
              dialogueVoiceGuard={dialogueVoiceGuard}
              dialogueVoiceRunKey={dialogueVoiceRunKey}
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
              onCustomPackCgSkipped={() => showUnlockToast(t("common.customPortraitCgSkipped"))}
              onBedHeard={(bedId) => {
                if (unlocks.audio.includes(bedId)) {
                  return;
                }
                session.addUnlocks({ audio: [bedId] });
                showUnlockToast(`${t("common.musicUnlocked")}: ${bedLabel(bedId, locale)}`);
              }}
              onStoryChange={(nextStoryId) =>
                runStoryAction(async () => {
                  await runTrackedChapterStart(
                    () => session.loadChapter(nextStoryId),
                    () => session.getState().storyId,
                  );
                }, "chapter")
              }
              onChoose={handleChoose}
              onJumpTo={handleJumpTo}
              onOpenPlayerPath={() => setPlayerPathOpen(true)}
              onOpenCreatorMap={() => setCreatorMapOpen(true)}
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
            <PlayerPathPanel isOpen={isPlayerPathOpen} onClose={() => setPlayerPathOpen(false)} />
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
          onRefresh={loadingTransition.refresh}
          archiveIds={unlocks.archive}
        />
      ) : null}
      <LoadingDwellCurtain />
    </main>
  );
}
