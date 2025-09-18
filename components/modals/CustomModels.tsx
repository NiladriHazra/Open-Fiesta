'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Wrench } from 'lucide-react';
import { useCustomModels, makeCustomModel } from '@/lib/customModels';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { ApiKeys } from '@/lib/types';
import { X, Check, Copy, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';

type CustomModelsProps = { compact?: boolean };

export default function CustomModels({ compact }: CustomModelsProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [open, setOpen] = useState(false);
  const [customModels, setCustomModels] = useCustomModels();
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [validMsg, setValidMsg] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validState, setValidState] = useState<null | 'ok' | 'fail' | 'error'>(null);
  const [keys] = useLocalStorage<ApiKeys>('ai-fiesta:keys', {});
  // Always use keys.ollama for Ollama base URL (never keys.ollamaUrl or other variants)
  // This ensures consistency with Settings and avoids stale values.

  const addCustom = () => {
    setErr(null);
    setValidMsg(null);
    setValidState(null);
    const l = label.trim();
    const s = slug.trim();
    if (!l || !s) {
      setErr('Please enter both Label and Model ID.');
      return;
    }
    if (customModels.some((m) => m.id === s)) {
      setErr('A custom model with this Model ID already exists.');
      return;
    }
    // Require successful validation before adding
    if (validState !== 'ok') {
      setErr('Please validate the Model ID before adding.');
      return;
    }
    const model = makeCustomModel(l, s);
    setCustomModels([...customModels, model]);
    setLabel('');
    setSlug('');
    // Ensure UI picks up new models consistently
    if (typeof window !== 'undefined') {
      setTimeout(() => window.location.reload(), 10);
    }
  };

  const removeCustom = (id: string) => {
    setCustomModels(customModels.filter((m) => m.id !== id));
  };

  const validate = async () => {
    setErr(null);
    setValidMsg(null);
    setValidState(null);
    const s = slug.trim();
    if (!s) {
      setErr('Enter a Model ID to validate.');
      return;
    }

    // Check if it's an Ollama model (no slash in the name)
    if (!s.includes('/')) {
      // If no Ollama URL is set, show a clear error
      if (!keys?.ollama || !/^https?:\/\/.+:\d+/.test(keys.ollama)) {
        setValidMsg('Please set a valid Ollama Base URL in Settings (e.g. http://localhost:11434 or http://host.docker.internal:11434)');
        setValidState('error');
        return;
      }
      try {
        setValidating(true);
        // Always use keys.ollama for baseUrl
        const res = await fetch("/api/ollama/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: s, baseUrl: keys.ollama }),
        });
        const data = await res.json();
        if (!data?.ok) {
          const errorMsg = [
            "Validation error",
            data?.status ? ` (status ${data.status})` : "",
            data?.error ? `: ${data.error}` : "",
            data?.details ? `: ${data.details}` : ""
          ].join("");
          setValidMsg(errorMsg);
          setValidState("error");
          return;
        }
        if (data.exists) {
          setValidMsg("Ollama model found.");
          setValidState("ok");
        } else {
          let message = "Ollama model not found. Make sure this model is available in your Ollama instance.";
          if (data.availableModels && data.availableModels.length > 0) {
            message += ` Available models: ${data.availableModels.slice(0, 5).join(", ")}`;
            if (data.availableModels.length > 5) {
              message += ` and ${data.availableModels.length - 5} more`;
            }
          }
          setValidMsg(message);
          setValidState("fail");
        }
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        setValidMsg(`Could not validate Ollama model: ${errorMsg}`);
        setValidState("error");
      } finally {
        setValidating(false);
      }
      return;
    }

    // For OpenRouter models, use the existing validation
    try {
      setValidating(true);
      const res = await fetch('/api/openrouter/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: s, apiKey: keys?.openrouter }),
      });
      const data = await res.json();
      if (!data?.ok) {
        const errorMsg = `Validation error${data?.status ? ` (status ${data.status})` : ""}`;
        setValidMsg(errorMsg);
        setValidState("error");
        return;
      }
      if (data.exists) {
        setValidMsg('Model found.');
        setValidState('ok');
      } else {
        setValidMsg('Model not found. Check the exact slug on OpenRouter.');
        setValidState('fail');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setValidMsg(`Could not validate: ${errorMsg}`);
      setValidState("error");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs h-9 ${
          compact ? "w-9 justify-center px-0" : "px-3 py-2"
        } rounded-xl shadow transition-all duration-200
            border border-white/40 bg-white/70 hover:bg-white/80 text-gray-700
            dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10`}
        title="Custom models"
        aria-label="Custom models"
      >
        <Wrench size={14} />
        {!compact && <span>Custom models</span>}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div
              className={cn(
                "absolute inset-0 backdrop-blur-sm",
                isDark ? "bg-black/70" : "bg-white/50"
              )}
              onClick={() => setOpen(false)}
            />
            <div className={cn(
              "relative w-full max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto rounded-2xl border p-6 md:p-7 lg:p-8 shadow-2xl",
              isDark 
                ? "border-white/10 bg-zinc-900/95" 
                : "border-gray-300/50 bg-white/95"
            )}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={cn(
                    "text-base md:text-lg lg:text-xl font-semibold tracking-wide",
                    isDark ? "text-white" : "text-gray-800"
                  )}>
                    Add custom models
                  </h3>
                  <p className={cn(
                    "text-xs md:text-sm mt-1",
                    isDark ? "text-zinc-400" : "text-gray-600"
                  )}>
                    Add any model from OpenRouter or Ollama. Selection is still
                    capped at 5 in the picker.
                  </p>
                </div>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "h-9 w-9 md:h-10 md:w-10 inline-flex items-center justify-center rounded-md transition-colors",
                    isDark 
                      ? "bg-white/10 hover:bg-white/20 text-white" 
                      : "bg-gray-200/50 hover:bg-gray-300/50 text-gray-700"
                  )}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 mb-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className={cn(
                    "text-[11px] md:text-xs",
                    isDark ? "text-zinc-400" : "text-gray-600"
                  )}>Label</label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="DeepSeek: R1 Distill Qwen 14B (free)"
                    className={cn(
                      "w-full border rounded-md px-3.5 py-2.5 text-sm md:text-base focus:outline-none focus:ring-1",
                      isDark 
                        ? "bg-black/40 border-white/10 text-white focus:ring-white/30" 
                        : "bg-gray-50/80 border-gray-300/50 text-gray-800 focus:ring-gray-400/50"
                    )}
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className={cn(
                    "text-[11px] md:text-xs",
                    isDark ? "text-zinc-400" : "text-gray-600"
                  )}>Model ID (slug)</label>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setValidState(null);
                      setValidMsg(null);
                    }}
                    placeholder="provider/model:variant (e.g., deepseek/deepseek-r1:free) or Ollama model name (e.g., llama3)"
                    className={cn(
                      "w-full border rounded-md px-3.5 py-2.5 text-sm md:text-base focus:outline-none focus:ring-1",
                      isDark 
                        ? "bg-black/40 border-white/10 text-white focus:ring-white/30" 
                        : "bg-gray-50/80 border-gray-300/50 text-gray-800 focus:ring-gray-400/50"
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                <div className={cn(
                  "text-[12px] md:text-sm",
                  isDark ? "text-zinc-400" : "text-gray-600"
                )}>
                  Tip: Only use &quot;:free&quot; if the model page lists a free variant.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={validate}
                    disabled={validating}
                    className={cn(
                      "inline-flex items-center gap-2 px-3.5 py-2 rounded-md border disabled:opacity-60 text-sm md:text-base transition-colors",
                      isDark 
                        ? "bg-white/10 border-white/10 hover:bg-white/20 text-white" 
                        : "bg-gray-200/50 border-gray-300/50 hover:bg-gray-300/50 text-gray-700"
                    )}
                  >
                    {validating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    <span>{validating ? 'Validating…' : 'Validate'}</span>
                  </button>
                  <button
                    onClick={addCustom}
                    disabled={validState !== 'ok'}
                    className="px-3.5 py-2 rounded-md accent-action-fill accent-focus disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm md:text-base"
                  >
                    Add Model
                  </button>
                </div>
              </div>
              {err && (
                <div className={cn(
                  "mb-2 text-xs inline-flex items-center gap-2",
                  isDark ? "text-rose-300" : "text-red-600"
                )}>
                  <AlertCircle size={14} /> {err}
                </div>
              )}
              {validMsg && (
                <div
                  className={cn(
                    "mb-2 text-xs inline-flex items-center gap-2 px-2 py-1 rounded-md border",
                    validState === 'ok'
                      ? isDark
                        ? 'text-emerald-300 border-emerald-300/30 bg-emerald-400/10'
                        : 'text-emerald-700 border-emerald-400/50 bg-emerald-100/50'
                      : validState === 'fail'
                        ? isDark
                          ? 'text-rose-300 border-rose-300/30 bg-rose-400/10'
                          : 'text-red-700 border-red-400/50 bg-red-100/50'
                        : isDark
                          ? 'text-yellow-300 border-yellow-300/30 bg-yellow-400/10'
                          : 'text-yellow-700 border-yellow-400/50 bg-yellow-100/50'
                  )}
                >
                  {validState === 'ok' ? (
                    <Check size={14} />
                  ) : validState === 'fail' ? (
                    <X size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  {validMsg}
                </div>
              )}
              {customModels.length > 0 && (
                <div className="max-h-[65vh] overflow-auto rounded-md border border-white/10 mt-3">
                  <table className="w-full text-sm md:text-base">
                    <thead className="bg-white/5 sticky top-0 z-10">
                      <tr className="text-left">
                        <th className="px-3 py-2 font-medium">Label</th>
                        <th className="px-3 py-2 font-medium">Model ID</th>
                        <th className="px-3 py-2 w-32 md:w-40 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customModels.map((m) => (
                        <tr key={m.id} className="border-t border-white/10 hover:bg-white/5">
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[260px] lg:max-w-[360px]">
                                {m.label}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 border border-white/15">
                                custom
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="flex items-center gap-2 text-xs text-white/85">
                              <span
                                className="truncate max-w-[360px] lg:max-w-[520px]"
                                title={m.model}
                              >
                                {m.model}
                              </span>
                              <button
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-white/10 border border-white/10 hover:bg-white/20"
                                onClick={() => navigator.clipboard.writeText(m.model)}
                                title="Copy model ID"
                              >
                                <Copy size={12} /> Copy
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            <button
                              onClick={() => removeCustom(m.id)}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 border border-white/10 hover:bg-white/20"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
