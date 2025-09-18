'use client';
import { useMemo } from 'react';
import { AiModel } from '@/lib/types';
import { mergeModels, useCustomModels } from '@/lib/customModels';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';

export default function ModelSelector({
  selectedIds,
  onToggle,
  max = 5,
}: {
  selectedIds: string[];
  onToggle: (id: string) => void;
  max?: number;
}) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [customModels] = useCustomModels();
  const allModels: AiModel[] = useMemo(() => mergeModels(customModels), [customModels]);
  const disabledIds = useMemo(() => {
    if (selectedIds.length < max) return new Set<string>();
    return new Set<string>(allModels.filter((m) => !selectedIds.includes(m.id)).map((m) => m.id));
  }, [selectedIds, max, allModels]);

  return (
    <div className="flex flex-wrap gap-2">
      {allModels.map((m: AiModel) => {
        const selected = selectedIds.includes(m.id);
        const disabled = disabledIds.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            disabled={!selected && disabled}
            className={cn(
              "px-3 py-1.5 rounded-md border text-sm tracking-tight transition-colors accent-focus inline-flex items-center gap-1 flex-wrap",
              selected
                ? 'accent-selected'
                : isDark
                  ? 'bg-white/10 border-white/15 text-white hover:bg-white/20'
                  : 'bg-black/10 border-black/15 text-gray-700 hover:bg-black/20',
              disabled ? 'opacity-40 cursor-not-allowed' : ''
            )}
            title={disabled ? `Max ${max} models at once` : ''}
          >
            {selected ? '✓ ' : ''}
            {m.label}
            {'custom' in m ? (
              <span className={cn(
                "ml-1 text-[10px] px-1 py-0.5 rounded",
                isDark 
                  ? "bg-white/10 border border-white/15"
                  : "bg-black/10 border border-black/15"
              )}>
                custom
              </span>
            ) : null}
            {m.good ? (
              <span
                className={cn(
                  "ml-1 text-[10px] px-1 py-0.5 rounded border",
                  isDark ? "bg-amber-400/15 border-amber-300/30 text-amber-200" : "bg-amber-300/20 border-amber-400/40 text-amber-700"
                )}
                title="Recommended"
              >
                ★ rec
              </span>
            ) : null}
            {Array.isArray(m.tags) && m.tags.length > 0 ? (
              <span className="ml-1 flex gap-1">
                {m.tags.map((tag) => (
                  <span
                    key={`${m.id}-tag-${tag}`}
                    className={cn(
                      "text-[10px] px-1 py-0.5 rounded border",
                      isDark ? "bg-white/5 border-white/10 text-white/80" : "bg-black/5 border-black/10 text-gray-700/90"
                    )}
                  >
                    {tag}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
