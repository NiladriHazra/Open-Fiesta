'use client';
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, MoreVertical, Search, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { ChatThread, AiModel } from '@/lib/types';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import ProjectsSection from '@/components/app/ProjectsSection';
import DownloadMenu from './DownloadMenu';
import ShareButton from "@/components/chat/ShareButton";
import ThreadItem from './ThreadItem';
import { useTheme } from '@/lib/themeContext';
import { ACCENT_COLORS, BACKGROUND_STYLES } from '@/lib/themes';
import AuthButton from '@/components/auth/AuthButton';
import type { Project } from '@/lib/projects';
import { useAuth } from '@/lib/auth';

type Props = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  threads: ChatThread[];
  activeId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  mobileSidebarOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
  onDeleteThread: (id: string) => void;
  selectedModels: AiModel[];
  // Projects props
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: (project: Project) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
};

export default function ThreadSidebar({
  sidebarOpen,
  onToggleSidebar,
  threads,
  activeId,
  onSelectThread,
  onNewChat,
  mobileSidebarOpen,
  onCloseMobile,
  onDeleteThread,
  selectedModels,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: Props) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  // Tracks which thread's action menu is open
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isThreadSwitching, setIsThreadSwitching] = useState(false);
  const { theme } = useTheme();
  const accent = ACCENT_COLORS[theme.accent];
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    (user?.user_metadata?.user_name as string | undefined) ||
    user?.email ||
    'User';
  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    undefined;
  const initials = (displayName?.trim()?.charAt(0)?.toUpperCase() || 'U');

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Group threads by date
  const groupedThreads = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const filteredThreads = threads.filter(thread =>
      !searchQuery ||
      (thread.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups = {
      today: [] as ChatThread[],
      yesterday: [] as ChatThread[],
      older: [] as ChatThread[]
    };

    filteredThreads.forEach(thread => {
      const threadDate = new Date(thread.createdAt);
      const threadDay = new Date(threadDate.getFullYear(), threadDate.getMonth(), threadDate.getDate());

      if (threadDay.getTime() === today.getTime()) {
        groups.today.push(thread);
      } else if (threadDay.getTime() === yesterday.getTime()) {
        groups.yesterday.push(thread);
      } else {
        groups.older.push(thread);
      }
    });

    return groups;
  }, [threads, searchQuery]);

  // Check for unused recent threads
  const hasUnusedRecentThread = useMemo(() => {
    const recentThread = threads.find(t =>
      (!t.messages || t.messages.length === 0) &&
      (!t.title || t.title === 'New Chat')
    );
    return recentThread;
  }, [threads]);

  const handleThreadSelect = async (id: string) => {
    if (id === activeId) return;

    setIsThreadSwitching(true);

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 150));

    onSelectThread(id);
    setIsThreadSwitching(false);
  };

  const handleNewChat = () => {
    // If there's an unused recent thread, select it instead of creating new
    if (hasUnusedRecentThread) {
      handleThreadSelect(hasUnusedRecentThread.id);
    } else {
      onNewChat();
    }
  };

  // Close open menu on outside click: only if click happens outside the active row
  useEffect(() => {
    const onOutside = (ev: MouseEvent) => {
      if (!openMenuId) return;
      const target = ev.target as HTMLElement | null;
      if (!target) return setOpenMenuId(null);
      const root = document.querySelector(`[data-menu-root="${openMenuId}"]`);
      // If the click happened within the row (by DOM contains OR event path), ignore
      const path = (ev.composedPath ? ev.composedPath() : []) as EventTarget[];
      if (root && (root.contains(target) || path.includes(root))) return;
      setOpenMenuId(null);
    };
    document.addEventListener('click', onOutside);
    return () => document.removeEventListener('click', onOutside);
  }, [openMenuId]);


  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`relative hidden lg:flex shrink-0 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] rounded-xl border border-white/10 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-black/20 shadow-2xl flex-col transition-[width] duration-300 ${sidebarOpen ? 'w-72' : 'w-16'
          }`}
      >
        {/* Collapse/Expand toggle */}
        <button
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          onClick={onToggleSidebar}
          className="absolute -right-3 top-6 z-10 h-7 w-7 rounded-full bg-gradient-to-r from-white/15 to-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center hover:from-white/25 hover:to-white/15 hover:border-white/30 transition-all duration-200 shadow-lg"
        >
          {sidebarOpen ? <ChevronLeft size={16} className="text-white/90" /> : <ChevronRight size={16} className="text-white/90" />}
        </button>

        {sidebarOpen && <div
          className={`flex items-center justify-between p-4 ${sidebarOpen ? '' : 'opacity-0 pointer-events-none'
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-ping opacity-30" />
            </div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Open Fiesta</h2>
          </div>
        </div>}
        {/* Credits link under title */}
        {sidebarOpen && (
          <div className="mb-4 px-4">
            <a
              href="https://x.com/byteHumi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-lg xl:rounded-xl px-3 py-2 bg-gradient-to-r from-white/8 to-white/4 border border-white/15 shadow-sm hover:border-white/25 hover:from-white/12 hover:to-white/6 hover:shadow-md transition-all duration-200 backdrop-blur-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/image.png"
                alt="Niladri"
                className="h-5 w-5 xl:h-7 xl:w-7 rounded-full ring-2 ring-white/20 object-cover shadow-sm"
              />
              <span className="text-xs xl:text-sm text-white/90">
                <span className="font-medium">Made by</span>
                <span className="font-bold ml-1">Niladri</span>
              </span>
            </a>
          </div>
        )}

        {/* Collapsed state - show image at the top */}
        {!sidebarOpen && (
          <div className="flex flex-col items-center pt-4">
            <div className="w-8 h-8 xl:w-10 xl:h-10 rounded-xl overflow-hidden flex items-center justify-center mb-6 ring-2 ring-white/15 shadow-lg bg-gradient-to-br from-white/10 to-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/image.png" alt="Logo" className="h-full w-full object-cover" />
            </div>
          </div>
        )}

        {sidebarOpen ? (
          <>
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {/* Projects Section */}
              <div className="mb-6 px-4">
                <ProjectsSection
                  projects={projects}
                  activeProjectId={activeProjectId}
                  onSelectProject={onSelectProject}
                  onCreateProject={onCreateProject}
                  onUpdateProject={onUpdateProject}
                  onDeleteProject={onDeleteProject}
                  collapsed={false}
                />
              </div>

              {/* Search Bar */}
              <div className="mb-3 xl:mb-6 px-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white/70 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search threads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-2 xl:py-3 bg-white/8 border border-white/15 rounded-lg xl:rounded-xl text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 focus:bg-white/12 transition-all duration-200 backdrop-blur-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1 rounded-md hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* New Chat */}
              <div className="mb-4 px-4">
                <button
                  onClick={handleNewChat}
                  className="w-full text-sm font-semibold px-4 py-2 xl:py-3 rounded-lg xl:rounded-xl shadow-lg text-white bg-gradient-to-r hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${accent.primary}, ${accent.primary}dd)`,
                  }}
                >
                  <Plus className="inline-block w-4 h-4 mr-2" />
                  New Chat
                </button>
              </div>
              {/* Loading state for thread switching */}
              {isThreadSwitching && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent.primary }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent.primary, animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent.primary, animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-3 px-4 min-h-0">
                {!isHydrated ? (
                  <div className="text-xs opacity-60">Loading...</div>
                ) : threads.length === 0 ? (
                  <div className="text-xs opacity-60">No chats yet</div>
                ) : searchQuery && Object.values(groupedThreads).every(group => group.length === 0) ? (
                  <div className="text-xs opacity-60 text-center py-4">No threads found</div>
                ) : null}

                {isHydrated && (
                  <>
                    {/* Today */}
                    {groupedThreads.today.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Today</div>
                        <div className="space-y-1">
                          {groupedThreads.today.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Yesterday */}
                    {groupedThreads.yesterday.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Yesterday</div>
                        <div className="space-y-1">
                          {groupedThreads.yesterday.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Older */}
                    {groupedThreads.older.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Older</div>
                        <div className="space-y-1">
                          {groupedThreads.older.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>


            </div>
            {/* Footer: Auth / User info */}
            <div className="mt-auto pt-4 pb-4 px-4 border-t border-white/15 shrink-0">
              <AuthButton />
            </div>
          </>

        ) : (
          <div className="flex-1 overflow-y-hidden flex flex-col items-center pt-4">
            {/* Projects Section (Collapsed) */}
            <div className="mb-4 w-full">
              <ProjectsSection
                projects={projects}
                activeProjectId={activeProjectId}
                onSelectProject={onSelectProject}
                onCreateProject={onCreateProject}
                onUpdateProject={onUpdateProject}
                onDeleteProject={onDeleteProject}
                collapsed={true}
              />
            </div>

            {/* Mini New Chat */}
            <button
              title="New Chat"
              onClick={handleNewChat}
              className="w-8 h-8 xl:h-10 xl:w-10 rounded-lg xl:rounded-xl cursor-pointer flex items-center justify-center mb-6 mx-auto shrink-0 transition-all duration-200 hover:scale-110 shadow-lg border border-white/20"
              style={{
                background: `linear-gradient(135deg, ${accent.primary}, ${accent.primary}dd)`,
              }}
            >
              <Plus size={16} className="text-white" />
            </button>

            {/* Mini threads */}
            <div className="flex-1 overflow-y-hidden w-full flex flex-col items-center gap-2 pt-1 pb-2 min-h-0">
              {threads.map((t) => {
                const isActive = t.id === activeId;
                const letter = (t.title || 'Untitled').trim()[0]?.toUpperCase() || 'N';
                return (
                  <button
                    key={t.id}
                    title={t.title || 'Untitled'}
                    onClick={() => handleThreadSelect(t.id)}
                    className={`h-6 w-6 aspect-square rounded-full flex items-center justify-center transition-all duration-200 mx-auto shrink-0 hover:scale-110
                      ${isActive
                        ? 'bg-white/20 ring-1 ring-white/30 ring-offset-1 ring-offset-black'
                        : 'bg-white/5 hover:bg-white/10'
                      }`}
                  >
                    <span className="text-[10px] font-semibold leading-none">{letter}</span>
                  </button>
                );
              })}
            </div>

            {/* Footer: Auth / User info (collapsed) - Show only user avatar */}
            <div className="w-full mt-auto pt-4 pb-4 border-t border-white/15 flex justify-center shrink-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center ring-2 ring-white/10 shadow-lg">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white/90">{initials}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onCloseMobile} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] rounded-r-xl border border-white/10 p-4 backdrop-blur-xl bg-gradient-to-b from-black/40 via-black/30 to-black/20 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow-lg" />
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 animate-ping opacity-30" />
                </div>
                <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">Open Fiesta</h2>
              </div>
              <button
                aria-label="Close"
                onClick={onCloseMobile}
                className="h-7 w-7 rounded-full bg-gradient-to-r from-white/15 to-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center hover:from-white/25 hover:to-white/15 hover:border-white/30 transition-all duration-200 shadow-lg"
              >
                <X size={14} className="text-white/90" />
              </button>
            </div>

            {/* Credits link under title */}
            <div className="mb-4">
              <a
                href="https://x.com/byteHumi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 rounded-lg px-3 py-2 bg-gradient-to-r from-white/8 to-white/4 border border-white/15 shadow-sm hover:border-white/25 hover:from-white/12 hover:to-white/6 hover:shadow-md transition-all duration-200 backdrop-blur-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/image.png"
                  alt="Niladri"
                  className="h-5 w-5 xl:h-7 xl:w-7 rounded-full ring-2 ring-white/20 object-cover shadow-sm"
                />
                <span className="text-xs xl:text-sm text-white/90">
                  <span className="font-medium">Made by</span>
                  <span className="font-bold ml-1">Niladri</span>
                </span>
              </a>
            </div>
            <div className="flex-1 flex flex-col max-h-[76vh] overflow-y-auto">
              <div className="mb-4">
                <ProjectsSection
                  projects={projects}
                  activeProjectId={activeProjectId}
                  onSelectProject={(id) => {
                    if (id) {
                      onSelectProject(id);
                    }
                  }}
                  onCreateProject={onCreateProject}
                  onUpdateProject={onUpdateProject}
                  onDeleteProject={onDeleteProject}
                  collapsed={false}
                />
              </div>
              {/* Search Bar (Mobile) */}
              <div className="mb-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50 group-focus-within:text-white/70 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search threads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-2 bg-white/8 border border-white/15 rounded-md text-xs text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 focus:bg-white/12 transition-all duration-200 backdrop-blur-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors p-1 rounded-md hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mb-4">
                <button
                  onClick={() => {
                    handleNewChat();
                    onCloseMobile();
                  }}
                  className="w-full text-sm font-semibold px-4 py-2 xl:py-3 rounded-md xl:rounded-xl shadow-lg text-white bg-gradient-to-r hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-white/20"
                  style={{ backgroundImage: `linear-gradient(135deg, ${accent.primary}, ${accent.primary}dd)` }}
                >
                  <Plus className="inline-block w-4 h-4 mr-2" />
                  New Chat
                </button>
              </div>

              <div className="h-[65vh] space-y-2 pr-1">
                {threads.length === 0 ? (
                  <div className="text-xs opacity-60">No chats yet</div>
                ) : searchQuery && Object.values(groupedThreads).every(group => group.length === 0) ? (
                  <div className="text-xs opacity-60 text-center py-4">No threads found</div>
                ) : (
                  <>
                    {/* Today */}
                    {groupedThreads.today.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Today</div>
                        <div className="space-y-2">
                          {groupedThreads.today.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                                onCloseMobile();
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Yesterday */}
                    {groupedThreads.yesterday.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Yesterday</div>
                        <div className="space-y-2">
                          {groupedThreads.yesterday.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                                onCloseMobile();
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Older */}
                    {groupedThreads.older.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-white/60 mb-3 px-2">Older</div>
                        <div className="space-y-2">
                          {groupedThreads.older.map((t) => (
                            <ThreadItem
                              key={t.id}
                              thread={t}
                              isActive={t.id === activeId}
                              onSelect={() => {
                                if (t.pageType === 'compare') {
                                  window.location.href = '/compare';
                                } else {
                                  handleThreadSelect(t.id);
                                }
                                onCloseMobile();
                              }}
                              onMenuToggle={(id) => setOpenMenuId(prev => prev === id ? null : id)}
                              isMenuOpen={openMenuId === t.id}
                              onDelete={(id) => {
                                setOpenMenuId(null);
                                setConfirmDeleteId(id);
                              }}
                              projects={projects}
                              selectedModels={selectedModels}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer: Auth / User info (mobile) */}
            <div className="absolute bg-black left-0 bottom-0 w-80 max-w-[85vw] p-4 border-t border-white/10">
              <AuthButton />
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete this chat?"
        message="This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId) {
            onDeleteThread(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
      />
    </>
  );
}

// Simplified sidebar used on the Home page – extracted from app/page.tsx
// Usage: import { SimpleThreadSidebar } from '@/components/chat/ThreadSidebar'
type SimpleSidebarProps = {
  isDark: boolean;
  sidebarOpen: boolean;
  onClose: () => void;
  onNewChat?: () => void;
};

export function SimpleThreadSidebar({ isDark, sidebarOpen, onClose, onNewChat }: SimpleSidebarProps) {
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col transition-all duration-300 border-r rounded-r-2xl',
        'fixed lg:relative z-30 h-full',
        sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden',
        isDark ? 'bg-black/40 border-gray-800 backdrop-blur-sm' : 'bg-white/70 border-orange-300 backdrop-blur-sm',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-inherit rounded-tr-2xl">
        <h1 className={cn('text-xl font-semibold', isDark ? 'text-white' : 'text-gray-800')}>Open Fiesta</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className={cn('lg:hidden rounded-xl', isDark ? 'text-gray-300 hover:bg-gray-800/50' : 'text-gray-800 hover:bg-orange-100')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4">
        <Button
          onClick={() => onNewChat?.()}
          className={cn(
            'w-full justify-start gap-2 rounded-xl transition-all duration-200 hover:scale-[1.02]',
            isDark ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-600/30' : 'bg-orange-200 hover:bg-orange-300 text-orange-800 border-orange-400',
          )}
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex">
          <div
            className={cn(
              'flex items-center gap-2 rounded-2xl overflow-hidden transition-all duration-300',
              isDark ? 'bg-gray-900/70 hover:bg-gray-900/80' : 'bg-orange-50/80 hover:bg-orange-50/90',
              searchFocused || search.length > 0 ? 'w-full ring-2 ring-offset-0 ring-red-500/20 dark:ring-red-500/20' : 'w-32',
            )}
          >
            <Search className={cn('ml-3 h-4 w-4 shrink-0', isDark ? 'text-gray-400' : 'text-gray-600')} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search your threads..."
              className={cn('bg-transparent border-0 outline-none text-sm w-full py-2 pr-2 placeholder:transition-all placeholder:duration-300', isDark ? 'text-white placeholder:text-gray-500' : 'text-gray-800 placeholder:text-gray-500')}
            />
            {search.length > 0 && (
              <button
                onClick={() => setSearch('')}
                className={cn('mr-2 rounded-md p-1 transition-colors', isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-orange-100')}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Today Section */}
      <div className="px-4 pb-2">
        <h3 className={cn('text-sm font-medium mb-2', isDark ? 'text-gray-400' : 'text-gray-700')}>Today</h3>
        <div className={cn('text-sm p-3 rounded-xl cursor-pointer hover:bg-opacity-80 transition-all duration-200', isDark ? 'text-gray-300 hover:bg-gray-800/50' : 'text-gray-800 hover:bg-orange-100')}>Title for conversation</div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      <div className="p-4 border-t border-inherit">
        <AuthButton />
      </div>
    </div>
  );
}