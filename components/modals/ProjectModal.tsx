'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  Project,
  createProject,
  updateProject,
  validateProjectName,
  validateSystemPrompt,
} from '@/lib/projects';

interface ProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  project?: Project | null; // null for create, Project for edit
}

export default function ProjectModal({ open, onClose, onSave, project = null }: ProjectModalProps) {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);

  const isEditing = project !== null;
  const title = isEditing ? 'Edit project' : 'Create new project';
  const buttonText = isEditing ? 'Save changes' : 'Create project';

  // Reset form when modal opens/closes or project changes
  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name);
        setSystemPrompt(project.systemPrompt);
      } else {
        setName('');
        setSystemPrompt('');
      }
      setNameError(null);
      setPromptError(null);
    }
  }, [open, project]);

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError(null);
  };

  const handlePromptChange = (value: string) => {
    setSystemPrompt(value);
    setPromptError(null);
  };

  const handleSubmit = () => {
    // Validate inputs
    const nameValidation = validateProjectName(name);
    const promptValidation = validateSystemPrompt(systemPrompt);

    setNameError(nameValidation);
    setPromptError(promptValidation);

    if (nameValidation || promptValidation) {
      return;
    }

    // Create or update project
    let savedProject: Project;
    if (isEditing && project) {
      savedProject = updateProject(project, { name, systemPrompt });
    } else {
      savedProject = createProject(name, systemPrompt);
    }

    onSave(savedProject);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-zinc-900/95 border border-white/20 rounded-lg shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 lg:py-2 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-white/70">
            Fill in the details below to {isEditing ? 'update' : 'create'}{' '}
            {isEditing ? 'this' : 'a new'} project.
          </p>

          {/* Project Name */}
          <div>
            <label htmlFor="project-name" className="block text-sm font-medium text-white/80 mb-2">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter a name for your project (max 50 characters)"
              className={`w-full px-3 py-2 text-sm bg-white/5 border rounded-md text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-colors ${
                nameError
                  ? 'border-red-400 focus:ring-red-400/50'
                  : 'border-white/20 focus:border-white/30 focus:ring-[var(--accent-interactive-primary)]/50'
              }`}
              maxLength={50}
              autoFocus
            />
            {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
            <p className="mt-1 text-xs text-white/50">{name.length}/50 characters</p>
          </div>

          {/* System Prompt */}
          <div>
            <label htmlFor="system-prompt" className="block text-sm font-medium text-white/80 mb-2">
              System prompt
            </label>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Enter a system prompt for chats in this project (max 1000 characters)"
              rows={6}
              className={`w-full px-3 py-2 bg-white/5 text-sm border rounded-md text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 transition-colors ${
                promptError
                  ? 'border-red-400 focus:ring-red-400/50'
                  : 'border-white/20 focus:border-white/30 focus:ring-[var(--accent-interactive-primary)]/50'
              }`}
              maxLength={1000}
            />
            {promptError && <p className="mt-1 text-xs text-red-400">{promptError}</p>}
            <div className="mt-1 flex justify-between text-xs text-white/50">
              <span>
                All chats in this project will use this as the system prompt sent to the AI model.
              </span>
              <span>{systemPrompt.length}/1000</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-white/20 bg-white/5 hover:bg-white/10 text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm rounded-md text-white shadow transition-colors accent-action-fill accent-focus"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}
