'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Cog, Eye, EyeOff } from 'lucide-react';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { ApiKeys } from '@/lib/types';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';

type SettingsProps = { compact?: boolean };

export default function Settings({ compact }: SettingsProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useLocalStorage<ApiKeys>("ai-fiesta:keys", {});
  const [gemini, setGemini] = useState(keys.gemini || "");
  const [openrouter, setOpenrouter] = useState(keys.openrouter || "");
  const [mistral, setMistral] = useState(keys['mistral'] || "");
  const [ollama, setOllama] = useState(keys['ollama'] || "");

  // hide/show toggle states
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenrouter, setShowOpenrouter] = useState(false);

  const save = () => {
    const next = {
      gemini: gemini.trim() || undefined,
      openrouter: openrouter.trim() || undefined,
      'mistral': mistral.trim() || undefined,
      'ollama': ollama.trim() || undefined,
    };
    setKeys(next);
    setOpen(false);
    // Force a reload so clients pick up the new keys immediately
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Sync state when keys change
  useEffect(() => {
    setGemini(keys.gemini || "");
    setOpenrouter(keys.openrouter || "");
    setMistral(keys['mistral'] || "");
    setOllama(keys['ollama'] || "");
  }, [keys]);

  // Allow programmatic open from anywhere (e.g., rate-limit CTA)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-settings', handler as EventListener);
    return () => window.removeEventListener('open-settings', handler as EventListener);
  }, []);

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs h-9 rounded-xl border shadow transition-all duration-200",
          compact ? "w-9 justify-center px-0" : "px-3 py-2",
          isDark
            ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
            : "border-white/40 bg-white/70 hover:bg-white/80 text-gray-700"
        )}
        title="Settings"
        aria-label="Settings"
      >
        <Cog size={14} />
        {!compact && <span>Settings</span>}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
              onClick={() => setOpen(false)}
            />
            <div className={cn(
              "relative w-full mx-3 sm:mx-6 max-w-2xl lg:max-w-3xl rounded-2xl border p-5 md:p-6 lg:p-7 shadow-2xl pointer-events-auto",
              isDark
                ? "border-white/10 bg-zinc-900/95 text-white"
                : "border-black/10 bg-white/95 text-gray-800"
            )}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg md:text-xl font-semibold">API Keys</h2>
                <button
                  aria-label="Close"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-md",
                    isDark
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-black/10 hover:bg-black/20"
                  )}
                >
                  <X size={16} />
                </button>
              </div>
              <p className={cn(
                "text-xs md:text-sm mb-5",
                isDark ? "text-zinc-300" : "text-gray-600"
              )}>
                Keys are stored locally in your browser via localStorage and sent only with your
                requests. Do not hardcode keys in code.
              </p>
              <div className="space-y-4">
                {/* Gemini API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm md:text-base font-medium">Gemini API Key</label>
                    <a
                      href="https://aistudio.google.com/app/u/5/apikey?pli=1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border",
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15"
                          : "bg-black/10 hover:bg-black/15 border-black/15"
                      )}
                    >
                      <ExternalLink size={12} /> Get API key
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showGemini ? 'text' : 'password'}
                      value={gemini}
                      onChange={(e) => setGemini(e.target.value)}
                      placeholder="AIza..."
                      className={cn(
                        "w-full border rounded-md px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 pr-10",
                        isDark
                          ? "bg-black/40 border-white/15 placeholder:text-zinc-500 focus:ring-white/20"
                          : "bg-white/40 border-black/15 placeholder:text-gray-500 focus:ring-black/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGemini(!showGemini)}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2",
                        isDark
                          ? "text-zinc-400 hover:text-white"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                {/* OpenRouter API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm md:text-base font-medium">
                      OpenRouter API Key
                    </label>
                    <a
                      href="https://openrouter.ai/sign-in?redirect_url=https%3A%2F%2Fopenrouter.ai%2Fsettings%2Fkeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border",
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15"
                          : "bg-black/10 hover:bg-black/15 border-black/15"
                      )}
                    >
                      <ExternalLink size={12} /> Get API key
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showOpenrouter ? 'text' : 'password'}
                      value={openrouter}
                      onChange={(e) => setOpenrouter(e.target.value)}
                      placeholder="sk-or-..."
                      className={cn(
                        "w-full border rounded-md px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 pr-10",
                        isDark
                          ? "bg-black/40 border-white/15 placeholder:text-zinc-500 focus:ring-white/20"
                          : "bg-white/40 border-black/15 placeholder:text-gray-500 focus:ring-black/20"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenrouter(!showOpenrouter)}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2",
                        isDark
                          ? "text-zinc-400 hover:text-white"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {showOpenrouter ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm md:text-base font-medium">
                      Mistral API Key
                    </label>
                    <a
                      href="https://console.mistral.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border",
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15"
                          : "bg-black/10 hover:bg-black/15 border-black/15"
                      )}
                    >
                      <ExternalLink size={12} /> Get API key
                    </a>
                  </div>
                  <input
                    value={mistral}
                    onChange={(e) => setMistral(e.target.value)}
                    placeholder="..."
                    className={cn(
                      "w-full border rounded-md px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2",
                      isDark
                        ? "bg-black/40 border-white/15 placeholder:text-zinc-500 focus:ring-white/20"
                        : "bg-white/40 border-black/15 placeholder:text-gray-500 focus:ring-black/20"
                    )}
                  />
                  <p className={cn(
                    "text-xs mt-1",
                    isDark ? "text-zinc-400" : "text-gray-500"
                  )}>
                    Access to Mistral Large, Medium, Small, Codestral, Pixtral, and specialized
                    models
                  </p>
                </div>
                {/* Ollama Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm md:text-base font-medium">
                      Ollama Base URL
                    </label>
                    <a
                      href="https://ollama.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border",
                        isDark
                          ? "bg-white/10 hover:bg-white/15 border-white/15"
                          : "bg-black/10 hover:bg-black/15 border-black/15"
                      )}
                    >
                      <ExternalLink size={12} /> Get Ollama
                    </a>
                  </div>
                  <input
                    value={ollama}
                    onChange={(e) => setOllama(e.target.value)}
                    placeholder="http://localhost:11434"
                    className={cn(
                      "w-full border rounded-md px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2",
                      isDark
                        ? "bg-black/40 border-white/15 placeholder:text-zinc-500 focus:ring-white/20"
                        : "bg-white/40 border-black/15 placeholder:text-gray-500 focus:ring-black/20"
                    )}
                  />
                  <p className={cn(
                    "text-xs mt-1",
                    isDark ? "text-zinc-400" : "text-gray-500"
                  )}>
                    Base URL for your local Ollama instance. Default is http://localhost:11434
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-end mt-6">
                <button
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-md border text-sm",
                    isDark
                      ? "border-white/15 bg-white/5 hover:bg-white/10"
                      : "border-black/15 bg-black/5 hover:bg-black/10"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  className="px-4 py-2 rounded-md text-sm font-medium accent-action-fill accent-focus"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
