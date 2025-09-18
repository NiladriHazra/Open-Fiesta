'use client';
import { useState } from 'react';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { Project } from '@/lib/projects';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';

interface ProjectsSectionProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  collapsed: boolean;
}

export default function ProjectsSection({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  collapsed,
}: ProjectsSectionProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreateNew = () => {
    onCreateProject();
  };

  const handleEdit = (project: Project) => {
    onUpdateProject(project);
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      onDeleteProject(confirmDeleteId);
      // If we're deleting the active project, deselect it
      if (confirmDeleteId === activeProjectId) {
        onSelectProject(null);
      }
    }
    setConfirmDeleteId(null);
  };

  if (collapsed) {
    return (
      <>
        {/* Collapsed view */}
        <div className="flex flex-col items-center gap-2 pt-2">
          {/* New project button hidden in collapsed view to avoid duplicate plus with New Chat */}

          {/* Project indicators */}
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            const initial = project.name.trim()[0]?.toUpperCase() || 'P';
            return (
              <button
                key={project.id}
                title={project.name}
                onClick={() => onSelectProject(project.id)}
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none 
                  ${
                    isActive
                      ? 'bg-[var(--accent-interactive-primary)] ring-1 ring-[var(--accent-interactive-hover)] ring-offset-1 ring-offset-black text-white'
                      : 'bg-white/90 border border-gray-200/60 hover:bg-blue-50/80 text-gray-700 hover:text-gray-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/70 dark:hover:text-white dark:border-white/10'
                  }`}
              >
                <span className="text-[10px] font-semibold leading-none">{initial}</span>
              </button>
            );
          })}
        </div>


        <ConfirmDialog
          open={!!confirmDeleteId}
          title="Delete project?"
          message="This will permanently delete the project and cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={confirmDelete}
        />
      </>
    );
  }

  return (
    <>
      {/* Expanded view */}
      <div className="space-y-2">
        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <div className={cn(
            "text-xs uppercase tracking-wide opacity-60",
            isDark ? "text-white" : "text-gray-700"
          )}>Projects</div>
          <button
            title="New Project"
            onClick={handleCreateNew}
            className="h-7 w-7 rounded-full flex items-center justify-center accent-action-fill accent-focus shadow-sm"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* No projects message */}
        {projects.length === 0 && <div className={cn(
          "text-xs opacity-60 py-2",
          isDark ? "text-white" : "text-gray-600"
        )}>No projects yet</div>}

        {/* None/Default option */}
        <div
          className={cn(
            "w-full px-2 py-2 rounded-md text-sm border flex items-center justify-between gap-2 group cursor-pointer",
            activeProjectId === null
              ? isDark
                ? 'bg-white/15 border-white/20'
                : 'bg-blue-50/80 border-blue-200/60 ring-1 ring-blue-200/30'
              : isDark
                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                : 'bg-white/60 border-gray-200/60 hover:bg-blue-50/60 hover:border-blue-200/50'
          )}
          onClick={() => onSelectProject(null)}
        >
          <div className="min-w-0 text-left flex-1">
            <div className={cn(
              "truncate font-medium",
              isDark ? "text-white" : "text-gray-800"
            )}>No Project</div>
            <div className={cn(
              "text-xs opacity-60 truncate",
              isDark ? "text-white" : "text-gray-600"
            )}>Default system behavior</div>
          </div>
        </div>

        {/* Project list */}
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          return (
            <div
              key={project.id}
              className={cn(
                "w-full px-2 py-2 rounded-md text-sm border flex items-center justify-between gap-2 group",
                isActive
                  ? isDark
                    ? 'bg-white/15 border-white/20'
                    : 'bg-blue-50/80 border-blue-200/60 ring-1 ring-blue-200/30'
                  : isDark
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white/60 border-gray-200/60 hover:bg-blue-50/60 hover:border-blue-200/50'
              )}
            >
              <button
                onClick={() => onSelectProject(project.id)}
                className="min-w-0 text-left flex-1"
                title={`${project.name}${project.systemPrompt ? `\n\nSystem prompt: ${project.systemPrompt}` : ''}`}
              >
                <div className={cn(
                  "truncate font-medium",
                  isDark ? "text-white" : "text-gray-800"
                )}>{project.name}</div>
                {project.systemPrompt && (
                  <div className={cn(
                    "text-xs opacity-60 truncate",
                    isDark ? "text-white" : "text-gray-600"
                  )}>{project.systemPrompt}</div>
                )}
              </button>

              {/* Action buttons */}
              <div className="flex gap-1 shrink-0">
                <button
                  aria-label="Edit project"
                  title="Edit project"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(project);
                  }}
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md border opacity-0 group-hover:opacity-100 transition-opacity",
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-blue-500/20 hover:border-blue-300/30 text-zinc-300 hover:text-blue-100"
                      : "border-gray-300/60 bg-white/80 hover:bg-blue-100/80 hover:border-blue-300/60 text-gray-600 hover:text-blue-700 shadow-sm"
                  )}
                >
                  <Settings size={12} />
                </button>
                <button
                  aria-label="Delete project"
                  title="Delete project"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className={cn(
                    "h-7 w-7 inline-flex items-center justify-center rounded-md border opacity-0 group-hover:opacity-100 transition-opacity",
                    isDark
                      ? "border-white/10 bg-white/5 hover:bg-rose-500/20 hover:border-rose-300/30 text-zinc-300 hover:text-rose-100"
                      : "border-gray-300/60 bg-white/80 hover:bg-red-100/80 hover:border-red-300/60 text-gray-600 hover:text-red-700 shadow-sm"
                  )}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>


      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete project?"
        message="This will permanently delete the project and cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
