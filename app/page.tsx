"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocalStorage } from '@/lib/useLocalStorage';
import { mergeModels, useCustomModels } from '@/lib/customModels';
import { ChatMessage, ApiKeys, ChatThread, AiModel } from '@/lib/types';
import { useProjects } from '@/lib/useProjects';
import ModelsModal from '@/components/modals/ModelsModal';
import { ChatInterface, ChatInterfaceRef } from '@/components/chat-interface';
import { useAuth } from '@/lib/auth';
import AuthModal from '@/components/modals/AuthModal';
import { cn } from '@/lib/utils'
import ThreadSidebar from '@/components/chat/ThreadSidebar'
import HomeAiInput from '@/components/home/HomeAiInput'
import { fetchThreads, createThread as createThreadDb, addMessage as addMessageDb, deleteThread as deleteThreadDb } from '@/lib/db'
import { createChatActions } from '@/lib/chatActions'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Menu, Layers } from 'lucide-react'
import Link from 'next/link'
import GithubStar from '@/components/app/GithubStar'
import ThemeToggle from '@/components/ThemeToggle'
import CustomModels from '@/components/modals/CustomModels'
import Settings from '@/components/app/Settings'
import HeaderBar from '@/components/app/HeaderBar'
import FirstVisitNote from '@/components/app/FirstVisitNote'
import LaunchScreen from '@/components/ui/LaunchScreen'
import { useTheme } from '@/lib/themeContext'
import { BACKGROUND_STYLES } from '@/lib/themes'
import SupportDropdown from '@/components/support-dropdown'

export default function OpenFiestaChat() {
  const { user } = useAuth()
  const [isDark, setIsDark] = useState(true)
  // Hydration + splash to match compare page
  const { theme } = useTheme()
  const [isHydrated, setIsHydrated] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const [modelModalOpen, setModelModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [threads, setThreads] = useLocalStorage<ChatThread[]>('ai-fiesta:threads', [])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [editingMessage, setEditingMessage] = useState<string>('')
  const [apiKeys] = useLocalStorage<ApiKeys>('ai-fiesta:api-keys', {})
  const [customModels] = useCustomModels()
  const [selectedHomeModelId, setSelectedHomeModelId] = useLocalStorage<string>('ai-fiesta:selected-home-model', 'open-evil')
  // First-visit modal
  const [firstVisitSeen, setFirstVisitSeen] = useLocalStorage<boolean>('ai-fiesta:first-visit-seen', false)
  const [showFirstVisit, setShowFirstVisit] = useState<boolean>(() => !firstVisitSeen)
  
  const {
    projects,
    activeProjectId,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
  } = useProjects()
  
  // Get active thread (only home threads)
  const homeThreads = useMemo(() => 
    threads.filter(t => t.pageType === 'home'),
    [threads]
  )
  
  const visibleHomeThreads = useMemo(() => threads.filter(t => t.pageType === 'home' && (!activeProjectId || t.projectId === activeProjectId)), [threads, activeProjectId])

  const activeThread = useMemo(() => threads.find((t) => t.id === activeThreadId), [threads, activeThreadId])
  const allModels = useMemo(() => mergeModels(customModels), [customModels])
  const selectedHomeModel: AiModel | undefined = useMemo(
    () => allModels.find((m) => m.id === selectedHomeModelId) || allModels[0],
    [allModels, selectedHomeModelId]
  )
  
  // Auto-select first model if none selected
  useEffect(() => {
    if (!selectedHomeModelId && allModels.length > 0) {
      setSelectedHomeModelId(allModels[0].id);
    }
  }, [selectedHomeModelId, allModels, setSelectedHomeModelId])

  // Splash timing like compare
  useEffect(() => {
    setIsHydrated(true)
    const t = setTimeout(() => setShowSplash(false), 350)
    return () => clearTimeout(t)
  }, [])

  // Keep showFirstVisit in sync with storage
  useEffect(() => {
    setShowFirstVisit(!firstVisitSeen)
  }, [firstVisitSeen])

  const chatRef = useRef<ChatInterfaceRef | null>(null)

  // State for chat actions - disabled to prevent duplicate loading animations
  const [loadingIds, setLoadingIds] = useState<string[]>([])
  const [loadingIdsInit, setLoadingIdsInit] = useState<string[]>([])

  // Create chat actions for handling AI responses
  const chatActions = useMemo(() => {
    if (!activeThread) {
      return null;
    }
    return createChatActions({
      threads,
      setThreads,
      activeThread,
      setActiveId: setActiveThreadId,
      setLoadingIds: () => {}, // Disabled - using ChatInterface loading instead
      setLoadingIdsInit: () => {}, // Disabled - using ChatInterface loading instead
      selectedModels: selectedHomeModel ? [selectedHomeModel] : [],
      keys: apiKeys,
      userId: user?.id || undefined,
    })
  }, [activeThread, selectedHomeModel, apiKeys, user?.id, threads])

  // Load threads from Supabase when user is authenticated
  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setThreads([])
        setActiveThreadId(null)
        return
      }
      try {
        const dbThreads = await fetchThreads(user.id)
        setThreads(dbThreads)
        // Keep current active if still present, else pick most recent home thread
        if (dbThreads.length > 0) {
          const homeThreads = dbThreads.filter(t => t.pageType === 'home')
          const preferredThread = activeProjectId 
            ? homeThreads.find(t => t.projectId === activeProjectId)
            : homeThreads[0]
          setActiveThreadId((prev) => {
            if (prev && dbThreads.some(t => t.id === prev && t.pageType === 'home')) {
              return prev
            }
            return preferredThread?.id || null
          })
        } else {
          setActiveThreadId(null)
        }
      } catch (e) {
        console.warn('Failed to load threads from Supabase:', e)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeProjectId])

  // Header shows no brand logo; the chat avatar displays model logo instead

  // Handle edit message functionality
  const handleEditMessage = (messageId: string, content: string) => {
    setEditingMessage(content)
  }

  // Handle share message functionality  
  const handleShareMessage = (message: ChatMessage) => {
    if (!activeThread) return;
    
    // Create a temporary thread with just this message for sharing
    const messageThread: ChatThread = {
      ...activeThread,
      messages: [message],
      title: `Shared Message: ${message.content.slice(0, 50)}...`
    };
    
    // Use the ShareButton logic directly
    import('@/lib/sharing/shareService').then(({ ShareService }) => {
      const shareService = new ShareService();
      shareService.generateShareableUrl(messageThread).then(result => {
        if (result.success && result.url) {
          shareService.copyToClipboard(result.url).then(copySuccess => {
            if (copySuccess) {
              const { toast } = require('react-toastify');
              toast.success("Message link copied to clipboard!");
            } else {
              const { toast } = require('react-toastify');
              toast.info("Clipboard access failed. Link: " + result.url);
            }
          });
        } else {
          const { toast } = require('react-toastify');
          toast.error(result.error || "Failed to create share link");
        }
      });
    });
  }

  // When user submits text, also record it into a thread shown in the sidebar
  const handleSubmit = async (text: string) => {
    const content = text.trim()
    if (!content) {
      // Ensure loader is off for empty submissions
      chatRef.current?.setLoading(false)
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      setAuthModalOpen(true)
      // Ensure loader is off if auth required
      chatRef.current?.setLoading(false)
      return
    }
    
    // Clear editing state when submitting
    setEditingMessage('')
    
    // Create thread if none exists
    if (!activeThreadId) {
      try {
        const newTitle = content.length > 60 ? content.slice(0, 57) + '…' : content
        const created = await createThreadDb({
          userId: user.id,
          title: newTitle,
          projectId: activeProjectId || null,
          pageType: 'home',
          initialMessage: null,
        })
        setThreads((prev) => [created, ...prev])
        setActiveThreadId(created.id)
      } catch (e) {
        console.error('❌ Failed to create thread:', e)
        return;
      }
    }
    
    // Show loading dots immediately with model type detection
    const modelType = selectedHomeModel?.category || 'text'
    chatRef.current?.setLoading(true, { 
      modelLabel: selectedHomeModel?.label,
      modelType: modelType as 'text' | 'image' | 'audio'
    })

    // Get current thread immediately - no timeout needed
    const currentThread = threads.find(t => t.id === activeThreadId) || threads.find(t => t.id === threads[0]?.id);
    if (currentThread && selectedHomeModel) {
      const currentChatActions = createChatActions({
        threads,
        setThreads,
        activeThread: currentThread,
        setActiveId: setActiveThreadId,
        setLoadingIds: () => {}, // Disabled - using ChatInterface loading instead
        setLoadingIdsInit: () => {}, // Disabled - using ChatInterface loading instead
        selectedModels: [selectedHomeModel],
        keys: apiKeys,
        userId: user?.id || undefined,
      });
      
      try {
        await currentChatActions.send(content)
        
        // Save user message to database
        if (user?.id && currentThread?.id) {
          const userMsg: ChatMessage = { 
            role: 'user', 
            content: content, 
            ts: Date.now() 
          };
          try {
            await addMessageDb({
              userId: user.id,
              chatId: currentThread.id,
              message: userMsg,
            });
          } catch (e) {
            console.error('Failed to save user message to DB:', e);
          }
        }
        
        // Clear loading immediately after send completes
        chatRef.current?.setLoading(false)
      } catch (e) {
        console.error('❌ Failed to send message via chat actions:', e)
        chatRef.current?.setLoading(false)
      }
    } else {
      console.warn('⚠️ Cannot send message - no thread or model:', { 
        hasCurrentThread: !!currentThread, 
        hasSelectedModel: !!selectedHomeModel 
      });
      chatRef.current?.setLoading(false)
    }
  }

  // Expose handlers to window for ChatInterface to access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleEditMessage = handleEditMessage;
      (window as any).handleShareMessage = handleShareMessage;
      (window as any).handleSubmit = handleSubmit;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).handleEditMessage;
        delete (window as any).handleShareMessage;
        delete (window as any).handleSubmit;
      }
    }
  }, [handleSubmit]);

  // Load messages into ChatInterface when active thread changes
  useEffect(() => {
    if (chatRef.current && activeThread) {
      // Always load messages, even if empty array
      const convertedMessages = (activeThread.messages || []).map((msg, index) => {
        const base = {
          id: `${activeThread.id}-${msg.ts || Date.now()}-${index}`,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(msg.ts || Date.now()),
        } as any
        if (msg.role === 'assistant') {
          const id = (msg.modelId || '').toLowerCase()
          const prov = (msg.provider || '').toLowerCase()
          const txt = `${id} ${prov}`
          let avatarUrl = '/brand.png'
          let avatarAlt = 'AI Assistant'
          if (/openai|\bgpt\b|^gpt-|\bo3\b|\bo4\b/.test(txt)) {
            avatarUrl = 'https://cdn.simpleicons.org/openai/ffffff'
            avatarAlt = 'OpenAI / ChatGPT'
          } else if (/anthropic|claude/.test(txt)) {
            avatarUrl = 'https://cdn.simpleicons.org/anthropic/ffffff'
            avatarAlt = 'Anthropic / Claude'
          } else if (/grok|xai/.test(txt)) {
            // Placeholder using X icon for Grok/xAI
            avatarUrl = 'https://cdn.simpleicons.org/x/ffffff'
            avatarAlt = 'Grok / xAI'
          }
          return { ...base, avatarUrl, avatarAlt }
        }
        return base
      });
      chatRef.current.loadMessages(convertedMessages);
    }
  }, [activeThread?.id, activeThread?.messages]);

  return (
    <div className={cn("min-h-screen w-full relative", isDark ? "dark" : "")}> 
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
        <div className="min-h-screen w-full bg-[#fff9f5] relative">
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 80%, rgba(255, 220, 190, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 245, 238, 0.35) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(255, 210, 180, 0.15) 0%, transparent 50%)`,
            }}
          />
        </div>
      )}

      {/* Soft vignette for dark mode */}
      {isDark && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)",
            opacity: 0.95,
          }}
        />
      )}

      {/* LaunchScreen splash overlay (same as compare page) */}
      {showSplash && (
        <div className="fixed inset-0 z-[9999]">
          <LaunchScreen backgroundClass={BACKGROUND_STYLES[theme.background].className} dismissed={isHydrated} />
        </div>
      )}


      <div className="relative z-10 px-3 lg:px-4 py-4 lg:py-6">
        <div className="flex gap-3 lg:gap-4">
          {/* Sidebar */}
          <ThreadSidebar
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            threads={visibleHomeThreads}
            activeId={activeThreadId}
            onSelectThread={(id) => setActiveThreadId(id)}
            onNewChat={async () => {
              if (!user) {
                setAuthModalOpen(true)
                return
              }
              try {
                const created = await createThreadDb({
                  userId: user.id,
                  title: 'New Chat',
                  projectId: activeProjectId || null,
                  pageType: 'home',
                  initialMessage: null,
                })
                setThreads(prev => [created, ...prev])
                setActiveThreadId(created.id)
              } catch (e) {
                console.error('Failed to create new chat:', e)
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
                console.warn('Failed to delete home thread in DB, removing locally:', e);
              }
              setThreads((prev) => {
                const next = prev.filter((t) => t.id !== id);
                if (activeThreadId === id) {
                  const inScope = next.filter((t) => t.pageType === 'home');
                  const nextInScope =
                    (activeProjectId ? inScope.find((t) => t.projectId === activeProjectId) : inScope[0])
                      ?.id ?? null;
                  setActiveThreadId(nextInScope);
                }
                return next;
              });
            }}
            selectedModels={selectedHomeModel ? [selectedHomeModel] : []}
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={selectProject}
            onCreateProject={createProject}
            onUpdateProject={updateProject}
            onDeleteProject={deleteProject}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] overflow-hidden relative">
            {/* Mobile Header with Hamburger */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-r from-white/12 to-white/8 border border-white/15 text-white hover:from-white/18 hover:to-white/12 hover:border-white/25 backdrop-blur-sm shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Open menu"
                title="Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Right: Compare (small) + Actions trigger (mobile) */}
              <div className="relative flex items-center gap-2">
                <Link
                  href="/compare"
                  className="inline-block bg-red-950 text-red-400 border border-red-400 border-b-2 font-medium overflow-hidden relative px-2 py-1 rounded-md hover:brightness-150 hover:border-t-2 hover:border-b active:opacity-75 outline-none duration-300 group text-[10px]"
                >
                  <span className="bg-red-400 shadow-red-400 absolute -top-[150%] left-0 inline-flex w-40 h-[3px] rounded-md opacity-50 group-hover:top-[150%] duration-500 shadow-[0_0_10px_10px_rgba(0,0,0,0.3)]"></span>
                  Compare Models
                </Link>
                <button
                  onClick={() => setMobileActionsOpen((v) => !v)}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 shadow"
                  aria-label="Open quick actions"
                  title="Actions"
                >
                  {/* simple 2x2 dots icon */}
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <circle cx="7" cy="7" r="2" />
                    <circle cx="17" cy="7" r="2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </button>

                {/* Inline Support button on mobile header */}
                <div>
                  <SupportDropdown theme={theme.mode === 'dark' ? 'dark' : 'light'} inline />
                </div>

                {mobileActionsOpen && (
                  <div className="absolute right-0 top-11 z-50 rounded-xl border border-white/15 bg-black/60 backdrop-blur-md shadow-xl p-2 flex items-center gap-2">
                    <button
                      onClick={() => { setModelModalOpen(true); setMobileActionsOpen(false); }}
                      className="inline-flex items-center gap-1.5 text-xs h-9 w-9 justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/10 shadow"
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
                onOpenModelsModal={() => setModelModalOpen(true)}
                showCompareButton
                className="-mr-3 sm:mr-0"
                hideHomeButton={true}
              />
            </div>
            {/* Use ChatInterface but hide its input; we provide HomeAiInput with model selector */}
            <ChatInterface ref={chatRef} hideInput />
            <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 bg-gradient-to-t from-black/20 to-transparent">
              <HomeAiInput
                isDark={isDark}
                modelSelectorLabel={selectedHomeModel ? selectedHomeModel.label : "Choose model"}
                onOpenModelSelector={() => setModelModalOpen(true)}
                onSubmit={handleSubmit}
                initialValue={editingMessage}
                onClear={() => setEditingMessage('')}
              />
            </div>
            <ModelsModal
              open={modelModalOpen}
              onClose={() => setModelModalOpen(false)}
              selectedIds={selectedHomeModel ? [selectedHomeModel.id] : []}
              selectedModels={selectedHomeModel ? [selectedHomeModel] : []}
              customModels={customModels}
              onToggle={(id) => {
                setSelectedHomeModelId((prev) => (prev === id ? "" : id))
                // Close after picking to mimic single-select UX
                setModelModalOpen(false)
              }}
            />
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />

      {/* First-visit note modal */}
      <FirstVisitNote
        open={showFirstVisit}
        onClose={() => {
          setFirstVisitSeen(true)
          setShowFirstVisit(false)
        }}
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
  )
}