'use client';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import type { AiModel, ChatMessage } from '@/lib/types';
import { Eye, EyeOff, Loader2, Pencil, Star, Trash, Expand, Shrink, Minus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownLite from './MarkdownLite';
import { CopyToClipboard } from '../ui/CopyToClipboard';
import { estimateTokens, sanitizeContent, cn } from '@/lib/utils';
import ModelSelector from '../selectors/ModelSelector';
import { useTheme } from '@/lib/themeContext';
import ExpandedChatModal from '../modals/ExpandedChatModal';

export type ChatGridProps = {
  selectedModels: AiModel[];
  headerTemplate: string;
  collapsedIds: string[];
  setCollapsedIds: (updater: (prev: string[]) => string[]) => void;
  loadingIds: string[];
  pairs: { user: ChatMessage; answers: ChatMessage[] }[];
  onEditUser: (turnIndex: number, newText: string) => void;
  onDeleteUser: (turnIndex: number) => void;
  onToggle: (id: string) => void;
};

export default function ChatGrid({
  selectedModels,
  headerTemplate,
  collapsedIds,
  setCollapsedIds,
  loadingIds,
  pairs,
  onEditUser,
  onDeleteUser,
  onToggle,
}: ChatGridProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [pendingDelete, setPendingDelete] = useState<{ turnIndex: number } | null>(null);
  // Compute grid columns dynamically so expanded model can take full width
  const headerCols = useMemo(() => {
    if (headerTemplate) return headerTemplate;

    const expandedCount = selectedModels.length - collapsedIds.length;

    // If only one model is expanded, give it all space, others get minimal
    if (expandedCount === 1) {
      const cols = selectedModels.map((m) =>
        collapsedIds.includes(m.id) ? '60px' : 'minmax(0, 1fr)',
      );
      return cols.join(' ');
    }

    // Otherwise, use responsive layout that fits container
    return `repeat(${selectedModels.length}, minmax(280px, 1fr))`;
  }, [headerTemplate, selectedModels, collapsedIds]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>('');
  const [expandedModal, setExpandedModal] = useState<{
    model: AiModel;
    response: ChatMessage;
    userMessage: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth', // change to "auto" if you want instant jump
      });
    }
  }, [pairs]);

  return (
    <>
      <div
        ref={scrollRef}
        className={cn(
          'relative rounded-lg border px-0 lg:px-1 pt-0 overflow-x-auto flex-1 overflow-y-auto pb-28 sm:scroll-stable-gutter',
          isDark ? 'border-white/5 bg-white/5' : 'border-black/10 bg-black/5',
        )}
      >
        {selectedModels.length === 0 ? (
          <div className={cn('p-4', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
            Select up to 5 models to compare.
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Header row: model labels */}
            <div
              className={cn(
                'grid w-full gap-1 items-center overflow-visible mt-0 sticky top-0 left-0 right-0 z-30 -mx-0 px-0 lg:-mx-0 lg:px-0 py-0 bg-transparent  ',
                // isDark
                //   ? "sm:bg-black/40 sm:border-white/10"
                //   : "sm:bg-white/40 sm:border-black/10"
              )}
              style={{ gridTemplateColumns: headerCols }}
            >
              {selectedModels.map((m) => {
                const isFree = /(\(|\s)free\)/i.test(m.label);
                const isCollapsed = collapsedIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "px-2.5 py-2 sm:px-2 sm:py-2 min-h-[42px] min-w-0 flex items-center rounded-b-lg backdrop-blur-sm shadow-[0_2px_4px_rgba(0,0,0,0.25)]",
                      isCollapsed ? "justify-center" : "justify-between",
                      m.good
                        ? isDark
                        // ? "bg-black/90 outline-0 shadow-[0px_2px_6px_var(--badge-pro-shadow-border-dark)] bg-gradient-to-b from-amber-400/15 to-black/90"
                          ? "bg-black/90 outline-1 outline-amber-300/50 bg-gradient-to-b from-amber-400/15 to-black/90"
                          : "shadow-[0px_1px_4px_var(--badge-pro-shadow-border-light)] bg-gradient-to-b from-amber-400/20 to-transparent"
                        : isDark
                          ? "bg-black/90 shadow-[0px_1px_2px_rgba(255,255,255,0.25)] "
                          : "shadow-[0_2px_4px_rgba(0,0,0,0.25)]",
                    )}
                  >
                    {!isCollapsed && (
                      <div
                        className={cn(
                          "text-[12px] leading-normal font-medium pr-2 inline-flex items-center gap-1.5 min-w-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.35)] sm:drop-shadow-none",
                          isDark ? "text-white" : "text-gray-800",
                        )}
                      >
                        {m.good && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 h-6 self-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                              isDark
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-amber-100 text-amber-700 border border-amber-300",
                            )}
                          >
                            <Star size={11} />
                            <span className="hidden sm:inline">Pro</span>
                          </span>
                        )}
                        {isFree && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 h-6 self-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                              isDark
                                ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                : "bg-green-100 text-green-700 border border-green-300",
                            )}
                          >
                            <span className="hidden sm:inline">Free</span>
                          </span>
                        )}
                        <span
                          className={cn(
                            "truncate max-w-[18ch] px-2 py-0.5 rounded-full text-[12px]",
                            isDark
                              ? "border border-white/10 bg-white/5"
                              : "border border-gray-300/40 bg-white/20",
                          )}
                          title={m.label}
                        >
                          {m.label}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        key={m.id}
                        onClick={() => onToggle(m.id)}
                        className="icon-btn h-7 w-7 accent-focus"
                        data-selected={true}
                        data-type={m.good ? "pro" : isFree ? "free" : "other"}
                        title="Click to toggle"
                      >
                        <Minus size={16} data-type={m.good ? "pro" : "free"} data-active={true} />
                      </button>

                      {isCollapsed ? (
                        <button
                          onClick={() =>
                            setCollapsedIds((prev) => prev.filter((id) => id !== m.id))
                          }
                          className="icon-btn h-7 w-7 accent-focus"
                          title={`Expand ${m.label}`}
                        >
                          <EyeOff size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setCollapsedIds((prev) => [...prev, m.id])}
                          className="icon-btn h-7 w-7 accent-focus"
                          title={`Collapse ${m.label}`}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pairs.map((row, i) => (
              <div key={i} className="space-y-3">
                {/* User prompt as right-aligned red pill */}
                <div className="px-2 flex justify-end relative">
                  {editingIdx === i && (
                    <div className="ml-auto">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className={cn(
                          'w-full min-h-[40px] max-w-[68ch] text-sm leading-relaxed px-3 py-1.5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/50',
                          isDark
                            ? 'bg-white/10 border border-white/20 text-white placeholder-white/60'
                            : 'bg-black/10 border border-black/20 text-gray-800 placeholder-gray-500',
                        )}
                        placeholder="Edit your message..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (draft.trim()) {
                              onEditUser(i, draft.trim());
                              setEditingIdx(null);
                              setDraft('');
                            }
                          } else if (e.key === 'Escape') {
                            setEditingIdx(null);
                            setDraft('');
                          }
                        }}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            if (draft.trim()) {
                              onEditUser(i, draft.trim());
                              setEditingIdx(null);
                              setDraft('');
                            }
                          }}
                          className="px-3 py-1 text-xs rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingIdx(null);
                            setDraft('');
                          }}
                          className={cn(
                            'px-3 py-1 text-xs rounded transition-colors',
                            isDark
                              ? 'bg-white/10 hover:bg-white/20 text-white'
                              : 'bg-black/10 hover:bg-black/20 text-gray-700',
                          )}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="group flex gap-2 items-center justify-end sticky right-0 z-10">
                    <div className="inline-flex items-center text-sm leading-relaxed px-3 py-3 rounded-md bg-[var(--accent-interactive-primary)] text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                      <span className="truncate whitespace-pre-wrap break-words max-w-[68ch]">
                        {row.user.content}
                      </span>
                    </div>
                    <div className="hidden group-hover:flex order-first gap-1.5 ">
                      <button
                        onClick={() => {
                          setEditingIdx(i);
                          setDraft(row.user.content);
                        }}
                        className="icon-btn h-7 w-7 accent-focus "
                        title="Edit message"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setPendingDelete({ turnIndex: i })}
                        className="icon-btn h-7 w-7 accent-focus "
                        title="Delete message"
                      >
                        <Trash size={14} />
                      </button>
                      <CopyToClipboard getText={() => row.user.content} />
                    </div>
                  </div>
                </div>

                <div
                  className="grid gap-1 items-stretch"
                  style={{ gridTemplateColumns: headerCols }}
                >
                  {selectedModels.map((m) => {
                    const ans = row.answers.find((a) => a.modelId === m.id);
                    const isCollapsed = collapsedIds.includes(m.id);
                    return (
                      <div key={m.id} className="h-full">
                        <div
                          className={cn(
                            'group relative rounded-lg h-full',
                            isCollapsed ? 'p-2.5 cursor-pointer' : 'p-3',
                            // isDark
                            //   ? 'bg-gradient-to-b from-black/40 to-black/20 ring-white/10 hover:ring-white/20'
                            //   : 'bg-gradient-to-b from-white/40 to-white/20 ring-white/30 hover:ring-white/40',
                            // m.good
                            //   ? isDark
                            //     ? 'shadow-[0px_1px_4px_var(--badge-pro-shadow-border-dark)]'
                            //     : 'shadow-[0px_1px_4px_var(--badge-pro-shadow-border-light)]'
                            //   : isDark
                            //     ? 'shadow-[0px_1px_2px_rgba(255,255,255,0.25)]'
                            //     : 'shadow-[0_2px_4px_rgba(0,0,0,0.25)]',
                            isDark
                              ? 'bg-gradient-to-b from-black/40 to-black/20 shadow-[0px_1px_2px_rgba(255,255,255,0.25)]'
                              : 'bg-gradient-to-b from-white/40 to-white/20 shadow-[0_2px_4px_rgba(0,0,0,0.25)]',
                          )}
                          onClick={() => {
                            if (isCollapsed)
                              setCollapsedIds((prev) => prev.filter((id) => id !== m.id));
                          }}
                          title={isCollapsed ? 'Click to expand' : undefined}
                        >
                          {/* decorative overlay removed for cleaner look */}
                          {ans && String(ans.content || '').length > 0 && (
                            <div
                              className={`absolute top-2 right-2 z-10 flex flex-col gap-2 ${
                                isCollapsed
                                  ? 'opacity-0 pointer-events-none'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedModal({
                                    model: m,
                                    response: ans,
                                    userMessage: row.user.content,
                                  });
                                }}
                                className="icon-btn h-7 w-7 accent-focus"
                                title={`Open ${m.label} response in full screen`}
                              >
                                <Expand size={12} />
                              </button>

                              <CopyToClipboard
                                getText={() => sanitizeContent(ans.content)}
                                title={`Copy ${m.label} response`}
                              />
                            </div>
                          )}
                          <div className="relative overflow-hidden">
                            <div
                              className={`text-sm leading-relaxed w-full pr-8 break-words overflow-wrap-anywhere ${
                                isCollapsed
                                  ? 'overflow-hidden max-h-20 opacity-70 line-clamp-3'
                                  : 'space-y-2'
                              } ${
                                !isCollapsed ? 'max-h-[50vh] overflow-y-auto custom-scrollbar' : ''
                              }`}
                              style={{
                                WebkitOverflowScrolling: 'touch',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                              }}
                            >
                              {ans &&
                              String(ans.content || '').length > 0 &&
                              !['Thinking…', 'Typing…'].includes(String(ans.content)) ? (
                                <>
                                  <div className="rounded-2xl ring-white/10 px-3 py-2 overflow-hidden">
                                    <div
                                      className="break-words overflow-wrap-anywhere"
                                      style={{
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                      }}
                                    >
                                      <MarkdownLite text={sanitizeContent(ans.content)} />
                                    </div>
                                  </div>
                                  {/* Token usage footer */}
                                  {ans.tokens &&
                                    !isCollapsed &&
                                    (() => {
                                      const by = ans.tokens?.by;
                                      const model = ans.tokens?.model;
                                      const inTokens = Array.isArray(ans.tokens?.perMessage)
                                        ? ans.tokens!.perMessage!.reduce(
                                            (sum, x) => sum + (Number(x?.tokens) || 0),
                                            0,
                                          )
                                        : (ans.tokens?.total ?? undefined);
                                      const outTokens = estimateTokens(String(ans.content || ''));
                                      return (
                                        <div
                                          className={cn(
                                            'mt-2 text-[11px]',
                                            isDark ? 'text-zinc-300/80' : 'text-gray-600/90',
                                          )}
                                        >
                                          <span
                                            className={cn(
                                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px]',
                                              isDark
                                                ? 'border border-white/10 bg-white/5'
                                                : 'border border-gray-300/30 bg-white/30',
                                            )}
                                          >
                                            {typeof inTokens === 'number' && (
                                              <span className="opacity-80">In:</span>
                                            )}
                                            {typeof inTokens === 'number' && (
                                              <span className="font-medium">{inTokens}</span>
                                            )}
                                            <span className="opacity-80">Out:</span>
                                            <span className="font-medium">{outTokens}</span>
                                            {by && <span className="opacity-70">• {by}</span>}
                                            {model && <span className="opacity-70">• {model}</span>}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  {ans.code === 503 && ans.provider === 'openrouter' && (
                                    <div
                                      className={cn(
                                        'mt-2 inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded ring-1',
                                        isDark
                                          ? 'text-amber-200/90 bg-amber-500/15 ring-amber-300/30'
                                          : 'text-amber-800/90 bg-amber-100/60 ring-amber-400/40',
                                      )}
                                    >
                                      <span>
                                        Free pool temporarily unavailable (503). Try again soon,
                                        switch model, or add your own OpenRouter API key for higher
                                        limits.
                                      </span>
                                      <button
                                        onClick={() =>
                                          window.dispatchEvent(new Event('open-settings'))
                                        }
                                        className={cn(
                                          'ml-1 px-2 py-1 rounded border transition-colors',
                                          isDark
                                            ? 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                            : 'bg-white/60 hover:bg-white/80 text-gray-700 border-gray-300/40',
                                        )}
                                      >
                                        Add key
                                      </button>
                                    </div>
                                  )}
                                  {(() => {
                                    try {
                                      const txt = String(ans.content || '');
                                      const show =
                                        /add your own\s+(?:openrouter|gemini)\s+api key/i.test(txt);
                                      return show;
                                    } catch {
                                      return false;
                                    }
                                  })() && (
                                    <div className="mt-2">
                                      <button
                                        onClick={() =>
                                          window.dispatchEvent(new Event('open-settings'))
                                        }
                                        className={cn(
                                          'text-xs px-2.5 py-1 rounded border accent-action-fill',
                                          isDark
                                            ? 'text-white border-white/10'
                                            : 'text-gray-700 border-gray-300/40',
                                        )}
                                      >
                                        Add keys
                                      </button>
                                    </div>
                                  )}
                                </>
                              ) : loadingIds.includes(m.id) ||
                                (ans && ['Thinking…', 'Typing…'].includes(String(ans.content))) ? (
                                <div className="w-full self-stretch">
                                  <div
                                    className={cn(
                                      'inline-flex items-center gap-2 text-[12px] font-medium',
                                      isDark ? 'text-rose-100' : 'text-rose-700',
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full ring-1',
                                        isDark
                                          ? 'bg-white/10 ring-white/15'
                                          : 'bg-white/40 ring-white/30',
                                      )}
                                    >
                                      <span className={isDark ? 'text-white/90' : 'text-gray-700'}>
                                        Thinking
                                      </span>
                                      <span
                                        className="inline-flex items-center gap-0.5"
                                        aria-hidden
                                      >
                                        <span
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full animate-bounce',
                                            isDark ? 'bg-white/70' : 'bg-gray-600/70',
                                          )}
                                          style={{ animationDelay: '0ms' }}
                                        />
                                        <span
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full animate-bounce',
                                            isDark ? 'bg-white/60' : 'bg-gray-600/60',
                                          )}
                                          style={{ animationDelay: '120ms' }}
                                        />
                                        <span
                                          className={cn(
                                            'w-1.5 h-1.5 rounded-full animate-bounce',
                                            isDark ? 'bg-white/50' : 'bg-gray-600/50',
                                          )}
                                          style={{ animationDelay: '240ms' }}
                                        />
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span
                                  className={cn(
                                    'text-sm',
                                    isDark ? 'text-zinc-400' : 'text-gray-500',
                                  )}
                                >
                                  No response
                                </span>
                              )}
                            </div>
                          </div>
                          {isCollapsed && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={cn(
                                  'opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1',
                                  isDark
                                    ? 'border-white/10 bg-black/50'
                                    : 'border-gray-300/40 bg-white/70',
                                )}
                              >
                                <Eye size={12} /> Expand
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this turn answer"
        message="This will remove your prompt and all model answers for this turn."
        confirmText="Delete"
        cancelText="Cancel"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          onDeleteUser(pendingDelete.turnIndex);
          setPendingDelete(null);
        }}
      />

      {/* Expanded Chat Modal */}
      {expandedModal && (
        <ExpandedChatModal
          isOpen={true}
          onClose={() => setExpandedModal(null)}
          model={expandedModal.model}
          response={expandedModal.response}
          userMessage={expandedModal.userMessage}
        />
      )}
    </>
  );
}
