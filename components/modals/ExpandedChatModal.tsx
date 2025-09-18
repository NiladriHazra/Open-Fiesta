'use client';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/themeContext';
import MarkdownLite from '../chat/MarkdownLite';
import { sanitizeContent } from '@/lib/utils';
import type { ChatMessage, AiModel } from '@/lib/types';

interface ExpandedChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: AiModel;
  response: ChatMessage;
  userMessage: string;
}

export default function ExpandedChatModal({
  isOpen,
  onClose,
  model,
  response,
  userMessage,
}: ExpandedChatModalProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-sm",
          isDark ? "bg-black/80" : "bg-white/80"
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-[95vw] h-[90vh] max-w-6xl rounded-lg shadow-2xl overflow-hidden border",
          isDark
            ? "bg-white/5 border-white/5"
            : "bg-black/5 border-black/10"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 border-b backdrop-blur-sm",
            isDark 
              ? "bg-black/40 border-white/10"
              : "bg-white/40 border-black/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "px-2.5 py-2 min-h-[42px] flex items-center rounded-lg backdrop-blur-sm shadow-[0_1px_8px_rgba(0,0,0,0.25)] ring-1",
                model.good
                  ? isDark
                    ? 'ring-amber-300/35 bg-gradient-to-b from-amber-400/10 to-black/60'
                    : 'ring-amber-300/50 bg-gradient-to-b from-amber-100/60 to-white/40'
                  : isDark
                    ? 'ring-white/10 bg-black/60'
                    : 'ring-white/30 bg-white/50'
              )}
            >
              <div
                className={cn(
                  "text-[12px] leading-normal font-medium inline-flex items-center gap-1.5 min-w-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.35)] sm:drop-shadow-none",
                  isDark 
                    ? "text-white"
                    : "text-gray-800"
                )}
              >
                {model.good && (
                  <span className={cn(
                    "inline-flex items-center gap-1 h-6 self-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                    isDark 
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-amber-100 text-amber-700 border border-amber-300"
                  )}>
                    <span className="hidden sm:inline">Pro</span>
                  </span>
                )}
                <span
                  className={cn(
                    "truncate px-2 py-0.5 rounded-full text-[12px]",
                    isDark 
                      ? "border border-white/10 bg-white/5"
                      : "border border-gray-300/40 bg-white/20"
                  )}
                  title={model.label}
                >
                  {model.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "icon-btn h-8 w-8",
              isDark
                ? "hover:bg-white/10 text-white"
                : "hover:bg-black/10 text-gray-700"
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-80px)]">
          {/* User Message */}
          <div className="px-4 py-3 flex justify-end relative">
            <div className="group flex gap-2 items-center justify-end sticky right-0 z-10">
              <div className="inline-flex items-center text-sm leading-relaxed px-3 py-3 rounded-md bg-[var(--accent-interactive-primary)] text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                <span className="truncate whitespace-pre-wrap break-words max-w-[68ch]">
                  {userMessage}
                </span>
              </div>
            </div>
          </div>

          {/* AI Response */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div
              className={cn(
                "group relative rounded-lg h-full min-h-[140px] flex ring-1 transition-shadow backdrop-blur-[2px] p-3",
                isDark
                  ? "bg-gradient-to-b from-black/40 to-black/20 ring-white/10"
                  : "bg-gradient-to-b from-white/40 to-white/20 ring-white/30"
              )}
            >
              <div className="relative overflow-hidden w-full">
                <div
                  className="text-sm leading-relaxed w-full break-words overflow-wrap-anywhere space-y-2 max-h-[80vh] overflow-y-auto custom-scrollbar"
                  style={{ WebkitOverflowScrolling: 'touch', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                  {response && String(response.content || '').length > 0 ? (
                    <div className="rounded-2xl ring-white/10 px-3 py-2 overflow-hidden">
                      <div className="break-words overflow-wrap-anywhere" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        <MarkdownLite text={sanitizeContent(response.content)} />
                      </div>
                    </div>
                  ) : (
                    <span className={cn(
                      "text-sm",
                      isDark ? "text-zinc-400" : "text-gray-500"
                    )}>No response</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
