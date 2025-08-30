'use client';
import { MoreVertical, Trash2 } from 'lucide-react';
import type { ChatThread, AiModel } from '@/lib/types';
import type { Project } from '@/lib/projects';
import ShareButton from './ShareButton';
import DownloadMenu from './DownloadMenu';

type ThreadItemProps = {
  thread: ChatThread;
  isActive: boolean;
  onSelect: () => void;
  onMenuToggle: (id: string) => void;
  isMenuOpen: boolean;
  onDelete: (id: string) => void;
  projects: Project[];
  selectedModels: AiModel[];
};

export default function ThreadItem({
  thread,
  isActive,
  onSelect,
  onMenuToggle,
  isMenuOpen,
  onDelete,
  projects,
  selectedModels,
}: ThreadItemProps) {
  return (
    <div
      data-menu-root={thread.id}
      className={`w-full px-3 py-1.5 xl:py-2.5 rounded-lg text-sm border flex items-center justify-between gap-2 group relative transition-all duration-200 ${
        isActive
          ? 'bg-white/15 border-white/25 ring-1 ring-white/30 shadow-sm'
          : thread.pageType === 'home'
            ? 'bg-orange-500/10 border-orange-300/20 hover:bg-orange-500/15'
            : 'bg-white/5 border-white/10 hover:bg-white/10'
      }`}
    >
      <button
        onClick={onSelect}
        className="min-w-0 text-left flex-1 truncate"
        title={thread.title || 'Untitled'}
      >
        {thread.title || 'Untitled'}
      </button>
      
      <div className="flex items-center gap-1">
        {/* Kebab menu trigger */}
        <button
          aria-label="Thread actions"
          title="More"
          onClick={(e) => {
            e.stopPropagation();
            onMenuToggle(thread.id);
          }}
          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
        >
          <MoreVertical size={14} />
        </button>

        {/* Popover actions */}
        {isMenuOpen && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/90 px-1.5 py-1 shadow-xl">
            <span onClick={(e) => e.stopPropagation()}>
              <ShareButton
                thread={thread}
                projectName={projects.find(p => p.id === thread.projectId)?.name}
              />
            </span>
            <span onClick={(e) => e.stopPropagation()}>
              <DownloadMenu thread={thread} selectedModels={selectedModels} />
            </span>
            <button
              aria-label="Delete chat"
              title="Delete chat"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread.id);
              }}
              className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-300/30 text-zinc-300 hover:text-rose-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
