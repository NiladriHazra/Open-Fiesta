'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

import HeaderBar from '@/components/app/HeaderBar';
import VoiceSelector from '@/components/modals/VoiceSelector';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { mergeModels, useCustomModels } from '@/lib/customModels';
import { ChatMessage, ApiKeys, ChatThread, AiModel } from '@/lib/types';
import { createChatActions } from '@/lib/chatActions';
import { useProjects } from '@/lib/useProjects';
import ModelsModal from '@/components/modals/ModelsModal';
import FirstVisitNote from '@/components/app/FirstVisitNote';
import HomeAiInput from '@/components/home/HomeAiInput';
import ThreadSidebar from '@/components/chat/ThreadSidebar';
import ChatGrid from '@/components/chat/ChatGrid';
import { useTheme } from '@/lib/themeContext';
import { BACKGROUND_STYLES } from '@/lib/themes';
import { safeUUID } from '@/lib/uuid';
import LaunchScreen from '@/components/ui/LaunchScreen';
import { useAuth } from '@/lib/auth';
import { fetchThreads, createThread as createThreadDb, deleteThread as deleteThreadDb } from '@/lib/db'
import { useRouter } from 'next/navigation';
import GithubStar from '@/components/app/GithubStar';
import ThemeToggle from '@/components/ThemeToggle';
import CustomModels from '@/components/modals/CustomModels';
import Settings from '@/components/app/Settings';
import { Layers, Home as HomeIcon } from 'lucide-react';
import SupportDropdown from '@/components/support-dropdown';
import Link from 'next/link';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProjectModal from '@/components/modals/ProjectModal';
import { Project } from '@/lib/projects';
import { cn } from '@/lib/utils';
import './globals.css';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [isHydrated, setIsHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const backgroundClass = BACKGROUND_STYLES[theme.background].className;

  // Redirect to signin if not authenticated (wait for auth to finish loading)
  useEffect(() => {
    if (isHydrated && !loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, isHydrated, router]);

  const [selectedIds, setSelectedIds] = useLocalStorage<string[]>('ai-fiesta:selected-models', [
    'open-gpt-5-nano', // GPT-5 Nano
    'open-midijourney', // Midjourney
    'open-evil',
    'open-mistral', // Mistral Small 3.1
    'open-llamascout', // Llama Scout
  ]);
  const [keys] = useLocalStorage<ApiKeys>('ai-fiesta:keys', {});
  const [threads, setThreads] = useLocalStorage<ChatThread[]>('ai-fiesta:threads', []);
  const [activeId, setActiveId] = useLocalStorage<string | null>('ai-fiesta:active-thread', null);
  const [sidebarOpen, setSidebarOpen] = useLocalStorage<boolean>('ai-fiesta:sidebar-open', true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [modelsModalOpen, setModelsModalOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useLocalStorage<string>(
    'ai-fiesta:selected-voice',
    'alloy',
  );

  const [customModels] = useCustomModels();
  const allModels = useMemo(() => mergeModels(customModels), [customModels]);

  // Projects hook from main
  const {
    projects,
    activeProjectId,
    activeProject,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  } = useProjects();

  // Project modal handlers
  const handleCreateProject = () => {
    setEditingProject(null);
    setProjectModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectModalOpen(true);
  };

  const handleSaveProject = (project: Project) => {
    if (editingProject) {
      updateProject(project);
    } else {
      createProject(project);
    }
    setEditingProject(null);
    setProjectModalOpen(false);
  };

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId],
  );
  // Only show chats for the active project (or all if none selected)
  const visibleThreads = useMemo(() => {
    const scope = threads.filter((t) => t.pageType === 'compare');
    return activeProjectId ? scope.filter((t) => t.projectId === activeProjectId) : scope;
  }, [threads, activeProjectId]);
  const messages = useMemo(() => activeThread?.messages ?? [], [activeThread]);

  const [loadingIds, setLoadingIds] = useState<string[]>([]);
  // Allow collapsing a model column without unselecting it
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);
  const selectedModels = useMemo(
    () => selectedIds.map((id) => allModels.find((m) => m.id === id)).filter(Boolean) as AiModel[],
    [selectedIds, allModels],
  );
  // Build grid template: collapsed => fixed narrow, expanded => normal
  const headerTemplate = useMemo(() => {
    if (selectedModels.length === 0) return '';
    const isCompact = selectedModels.length < 5;
    const parts = selectedModels.map((m) => {
      const collapsed = collapsedIds.includes(m.id);
      if (collapsed) return '90px';
      // If fewer than 5 models, allow columns to flex and fill available width.
      // Otherwise keep fixed width for consistent 5-column comparison.
      return isCompact ? 'minmax(240px, 1fr)' : '320px';
    });
    return parts.join(' ');
  }, [selectedModels, collapsedIds]);

  const anyLoading = loadingIds.length > 0;

  const [firstNoteDismissed, setFirstNoteDismissed] = useLocalStorage<boolean>(
    'ai-fiesta:first-visit-note-dismissed',
    false,
  );
  const showFirstVisitNote =
    isHydrated && !firstNoteDismissed && (!keys?.openrouter || !keys?.gemini);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const valid = new Set(allModels.map((m) => m.id));
      const currentValidCount = prev.filter((x) => valid.has(x)).length;
      if (currentValidCount >= 5) return prev;
      return [...prev, id];
    });
  };

  // Chat actions (send and onEditUser) moved to lib/chatActions.ts to avoid state races
  const { send, onEditUser } = useMemo(
    () =>
      createChatActions({
        selectedModels,
        keys,
        threads,
        activeThread,
        setThreads,
        setActiveId,
        setLoadingIds: (updater) => setLoadingIds(updater),
        setLoadingIdsInit: (ids) => setLoadingIds(ids),
        activeProject, // include project system prompt/context
        selectedVoice, // pass voice selection for audio models
        userId: user?.id,
        pageType: 'compare',
      }),
    [
      selectedModels,
      keys,
      threads,
      activeThread,
      setThreads,
      setActiveId,
      activeProject,
      selectedVoice,
      user?.id,
    ],
  );

  // Load threads from Supabase for this user and keep only compare page threads in view
  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setThreads([]);
        setActiveId(null);
        return;
      }
      try {
        const dbThreads = await fetchThreads(user.id);
        setThreads(dbThreads);
        if (dbThreads.length > 0) {
          const compareThreads = dbThreads.filter((t) => t.pageType === 'compare');
          const preferredThread = activeProjectId
            ? compareThreads.find((t) => t.projectId === activeProjectId)
            : compareThreads[0];
          setActiveId((prev) => {
            if (prev && dbThreads.some((t) => t.id === prev && t.pageType === 'compare')) {
              return prev;
            }
            return preferredThread?.id || null;
          });
        } else {
          setActiveId(null);
        }
      } catch (e) {
        console.warn('Failed to load compare threads from Supabase:', e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProjectId]);

  // group assistant messages by turn for simple compare view
  const pairs = useMemo(() => {
    const rows: { user: ChatMessage; answers: ChatMessage[] }[] = [];
    let currentUser: ChatMessage | null = null;
    for (const m of messages) {
      if (m.role === 'user') {
        currentUser = m;
        rows.push({ user: m, answers: [] });
      } else if (m.role === 'assistant' && currentUser) {
        rows[rows.length - 1]?.answers.push(m);
      }
    }
    return rows;
  }, [messages]);

  // For compare page only: while waiting for model responses, inject a placeholder
  // "Thinking…" message for each loading model on the latest turn so the UI
  // shows a loading indicator instead of "No response".
  const pairsWithPlaceholders = useMemo(() => {
    const cloned = pairs.map((r) => ({ user: r.user, answers: [...r.answers] }));
    if (cloned.length === 0) return cloned;
    const last = cloned[cloned.length - 1];
    const answeredIds = new Set(last.answers.map((a) => a.modelId).filter(Boolean) as string[]);
    // Show placeholders for any selected model that hasn't answered yet
    selectedModels.forEach((m) => {
      if (!answeredIds.has(m.id)) {
        last.answers.push({
          id: `thinking-${m.id}-${safeUUID()}`,
          role: 'assistant',
          content: 'Thinking…',
          modelId: m.id,
          createdAt: new Date().toISOString(),
        } as ChatMessage);
      }
    });
    return cloned;
  }, [pairs, loadingIds, selectedModels]);

  // Delete a full user turn (user + all its answers)
  const onDeleteUser = (turnIndex: number) => {
    if (!activeThread) return;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThread.id) return t;
        const msgs = t.messages;
        const userStarts: number[] = [];
        for (let i = 0; i < msgs.length; i++) if (msgs[i].role === 'user') userStarts.push(i);
        const start = userStarts[turnIndex];
        if (start === undefined) return t;
        const end = userStarts[turnIndex + 1] ?? msgs.length; // exclusive
        const nextMsgs = msgs.filter((_, idx) => idx < start || idx >= end);
        return { ...t, messages: nextMsgs };
      }),
    );
  };

  // Delete a specific model's answer within a turn
  const onDeleteAnswer = (turnIndex: number, modelId: string) => {
    if (!activeThread) return;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThread.id) return t;
        const msgs = t.messages;
        const userStarts: number[] = [];
        for (let i = 0; i < msgs.length; i++) if (msgs[i].role === 'user') userStarts.push(i);
        const start = userStarts[turnIndex];
        if (start === undefined) return t;
        const end = userStarts[turnIndex + 1] ?? msgs.length; // exclusive
        let removed = false;
        const nextMsgs = msgs.filter((m, idx) => {
          if (idx <= start || idx >= end) return true;
          if (!removed && m.role === 'assistant' && m.modelId === modelId) {
            removed = true;
            return false;
          }
          return true;
        });
        return { ...t, messages: nextMsgs };
      }),
    );
  };

  useEffect(() => {
    setIsHydrated(true);
    const t = setTimeout(() => setShowSplash(false), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={cn("compare-page min-h-screen w-full relative", isDark ? "dark" : "")}>
      {/* Background */}
      {isDark ? (
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), radial-gradient(68% 58% at 50% 50%, #c81e3a 0%, #a51d35 16%, #7d1a2f 32%, #591828 46%, #3c1722 60%, #2a151d 72%, #1f1317 84%, #141013 94%, #0a0a0a 100%), radial-gradient(90% 75% at 50% 50%, rgba(228,42,66,0.06) 0%, rgba(228,42,66,0) 55%), radial-gradient(150% 120% at 8% 8%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(150% 120% at 92% 92%, rgba(0,0,0,0) 42%, #0b0a0a 82%, #070707 100%), radial-gradient(60% 50% at 50% 60%, rgba(240,60,80,0.06), rgba(0,0,0,0) 60%), #050505",
          }}
        />
      ) : (
        /* Aurora Dream Corner Whispers */
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `
              radial-gradient(ellipse 85% 65% at 8% 8%, rgba(175, 109, 255, 0.42), transparent 60%),
              radial-gradient(ellipse 75% 60% at 75% 35%, rgba(255, 235, 170, 0.55), transparent 62%),
              radial-gradient(ellipse 70% 60% at 15% 80%, rgba(255, 100, 180, 0.40), transparent 62%),
              radial-gradient(ellipse 70% 60% at 92% 92%, rgba(120, 190, 255, 0.45), transparent 62%),
              linear-gradient(180deg, #f7eaff 0%, #fde2ea 100%)
            `,
          }}
        />
      )}

      {/* Soft vignette for dark mode */}
      {isDark && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #2b0707 100%)",
            opacity: 0.95,
          }}
        />
      )}

      {showSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LaunchScreen
            backgroundClass={BACKGROUND_STYLES[theme.background].className}
            dismissed={isHydrated}
          />
        </div>
      )}

      <div className="relative z-10 px-1 py-4 lg:py-6">
        <div className="flex gap-0 lg:gap-0">
          {/* Sidebar */}
          <ThreadSidebar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            threads={visibleThreads}
            activeId={activeId}
            onSelectThread={(id) => setActiveId(id)}
            onNewChat={async () => {
              if (!user?.id) return;
              try {
                const created = await createThreadDb({
                  userId: user.id,
                  title: "New Chat",
                  projectId: activeProjectId || null,
                  pageType: "compare",
                  initialMessage: null,
                });
                setThreads((prev) => [created, ...prev]);
                setActiveId(created.id);
              } catch (e) {
                console.warn("Failed to create compare thread:", e);
              }
            }}
            mobileSidebarOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
            onOpenMobile={() => setMobileSidebarOpen(true)}
            onDeleteThread={async (id) => {
              if (!user?.id) return;
              try {
                await deleteThreadDb(user.id, id);
              } catch (e) {
                console.warn("Failed to delete compare thread in DB, removing locally:", e);
              }
              setThreads((prev) => {
                const next = prev.filter((t) => t.id !== id);
                if (activeId === id) {
                  const inScope = next.filter((t) => t.pageType === "compare");
                  const nextInScope =
                    (activeProjectId
                      ? inScope.find((t) => t.projectId === activeProjectId)
                      : inScope[0]
                    )?.id ?? null;
                  setActiveId(nextInScope);
                }
                return next;
              });
            }}
            selectedModels={selectedModels}
            // Projects (from main)
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={selectProject}
            onCreateProject={handleCreateProject}
            onUpdateProject={handleEditProject}
            onDeleteProject={deleteProject}
          />

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] overflow-hidden ">
            {/* Mobile Header with Hamburger */}
            <div
              className={cn(
                "lg:hidden flex items-center justify-between p-4 border-b",
                isDark ? "border-white/10" : "border-rose-200/40",
              )}
            >
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className={cn(
                  "inline-flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95",
                  isDark
                    ? "bg-gradient-to-r from-white/12 to-white/8 border border-white/15 text-white hover:from-white/18 hover:to-white/12 hover:border-white/25 backdrop-blur-sm shadow-lg"
                    : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm",
                )}
                aria-label="Open menu"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              {/* Right: Actions trigger (mobile) */}
              <div className="relative flex items-center gap-2">
                {/* Inline Support button on mobile header */}
                <div>
                  <SupportDropdown inline theme={theme.mode === "dark" ? "dark" : "light"} />
                </div>
                <button
                  onClick={() => setMobileActionsOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center justify-center h-9 w-9 rounded-md border shadow",
                    isDark
                      ? "border-white/15 bg-white/5 hover:bg-white/10"
                      : "border-rose-200/60 bg-rose-50/60 hover:bg-rose-100/80",
                  )}
                  aria-label="Open quick actions"
                  title="Actions"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <circle cx="7" cy="7" r="2" />
                    <circle cx="17" cy="7" r="2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </button>

                {mobileActionsOpen && (
                  <div
                    className={cn(
                      "absolute right-0 top-11 z-50 rounded-xl border shadow-xl p-2 flex items-center gap-2 backdrop-blur-md",
                      isDark ? "border-white/15 bg-black/60" : "border-rose-200/50 bg-white/95",
                    )}
                  >
                    <Link
                      href="/chat"
                      className={cn(
                        "inline-flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95",
                        isDark
                          ? "bg-gradient-to-r from-white/12 to-white/8 border border-white/15 text-white hover:from-white/18 hover:to-white/12 hover:border-white/25 backdrop-blur-sm shadow-lg"
                          : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm",
                      )}
                      aria-label="Go to home"
                      title="Home"
                    >
                      <HomeIcon size={18} />
                    </Link>
                    <button
                      onClick={() => {
                        setModelsModalOpen(true);
                        setMobileActionsOpen(false);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs h-9 w-9 justify-center rounded-md border shadow",
                        isDark
                          ? "border-white/15 bg-white/5 hover:bg-white/10"
                          : "border-rose-200/60 bg-rose-50/60 hover:bg-rose-100/80",
                      )}
                      title="Change models"
                      aria-label="Change models"
                    >
                      <Layers size={14} />
                    </button>
                    <CustomModels compact />
                    <ThemeToggle compact />
                    <Settings compact />
                    <GithubStar owner="NiladriHazra" repo="Open-Fiesta" />
                  </div>
                )}
              </div>
            </div>
            {/* Top bar - Desktop only */}
            <div className="hidden lg:block">
              <HeaderBar
                onOpenMenu={() => setMobileSidebarOpen(true)}
                title="Open Fiesta"
                githubOwner="NiladriHazra"
                githubRepo="Open-Fiesta"
                onOpenModelsModal={() => setModelsModalOpen(true)}
                className="-mr-3 sm:mr-0"
              />
            </div>

            {/* Voice selector for audio models */}
            {isHydrated && selectedModels.some((m) => m.category === "audio") && (
              <div className="mb-3 px-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">Voice:</span>
                  <VoiceSelector selectedVoice={selectedVoice} onVoiceChange={setSelectedVoice} />
                </div>
              </div>
            )}

            <ModelsModal
              open={modelsModalOpen}
              onClose={() => setModelsModalOpen(false)}
              selectedIds={selectedIds}
              selectedModels={selectedModels}
              customModels={customModels}
              onToggle={toggle}
            />

            {isHydrated && (
              <FirstVisitNote
                open={showFirstVisitNote}
                onClose={() => setFirstNoteDismissed(true)}
              />
            )}

            {isHydrated && (
              <ChatGrid
                selectedModels={selectedModels}
                headerTemplate={headerTemplate}
                collapsedIds={collapsedIds}
                setCollapsedIds={setCollapsedIds}
                loadingIds={loadingIds}
                pairs={pairsWithPlaceholders}
                onEditUser={onEditUser}
                onDeleteUser={onDeleteUser}
                onToggle={toggle}
              />
            )}

            {isHydrated && (
              <div className="relative w-[100%] h-[1px] mb-[-1px]">
                <HomeAiInput
                  isDark={isDark}
                  onSubmit={(text) => {
                    try {
                      console.log("[Compare] HomeAiInput onSubmit:", text);
                    } catch {}
                    send(text);
                  }}
                />
                <div className="sr-only" aria-hidden>
                  {/* Debug counter for messages to ensure state updates */}
                  activeId: {String(activeId || "")} • messages: {String(messages.length)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toasts for share notifications */}
      <ProjectModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
        project={editingProject}
      />

      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </div>
  );
}
