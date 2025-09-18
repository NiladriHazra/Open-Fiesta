'use client';

// Insert table separators and strip leading heading marker before pipe tables
function normalizeTableLikeMarkdown(lines: string[]): string[] {
  const out = [...lines];

  // 1) Convert lines like "# | Col1 | Col2 |" to "| Col1 | Col2 |"
  for (let i = 0; i < out.length; i++) {
    if (/^\s*#\s*\|/.test(out[i])) {
      out[i] = out[i].replace(/^(\s*)#\s*/, '$1');
    }
  }

  // 2) If a pipe header is followed by rows but missing a separator, insert one
  const looksLikeSep = (s: string) => {
    return (
      /(^\s*\|?\s*(?::?-+\s*\|\s*)*:?-+\s*\|?\s*$)/.test(s) ||
      /^\s*\|?\s*(-+\s*\|\s*)*-+\s*\|?\s*$/.test(s)
    );
  };

  let i = 0;
  while (i < out.length - 1) {
    const cur = out[i];
    const nxt = out[i + 1];
    const isPipe = /\|/.test(cur);
    const nextIsPipe = /\|/.test(nxt);
    if (isPipe && nextIsPipe && !looksLikeSep(nxt)) {
      // Synthesize separator based on header column count
      const cols = splitRow(cur).length || 1;
      const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |';
      out.splice(i + 1, 0, sep);
      i += 2; // skip over inserted separator
      continue;
    }
    i++;
  }

  return out;
}

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { ACCENT_UTILITY_CLASSES } from '../../lib/accentColors';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';
import { CopyToClipboard } from '@/components/ui/CopyToClipboard';
type Props = { text: string };

// Minimal, dependency-free Markdown renderer focusing on bold, italics and inline code.
// Supported:
// - **bold**
// - *italic* or _italic_
// - `inline code`
// - preserves line breaks and paragraphs
// - fenced code blocks ``` ... ```
// - simple lists (-, *, 1.)
// - simple GitHub-style tables

// Download function for images
const downloadImage = async (imageUrl: string, filename: string) => {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download image:', error);
    // Fallback: open image in new tab
    window.open(imageUrl, '_blank');
  }
};

// Small animated ellipsis used for loading labels
function AnimatedEllipsis() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(iv);
  }, []);
  return (
    <span aria-live="polite" aria-label="loading">
      {dots}
    </span>
  );
}

// Audio Player Component
function ProgressBar({
  value,
  max,
  onScrub,
}: {
  value: number;
  max: number;
  onScrub: (next: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const rel = Math.min(rect.right, Math.max(rect.left, clientX)) - rect.left;
      const ratio = rect.width > 0 ? rel / rect.width : 0;
      return ratio * max;
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging) return;
      e.preventDefault();
      onScrub(getPos(e));
    };
    const onUp = () => {
      dragging = false;
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      dragging = true;
      onScrub(getPos(e));
    };

    el.addEventListener('mousedown', onDown as unknown as EventListener);
    el.addEventListener('touchstart', onDown as unknown as EventListener, { passive: false });
    window.addEventListener('mousemove', onMove as unknown as EventListener, { passive: false });
    window.addEventListener('touchmove', onMove as unknown as EventListener, { passive: false });
    window.addEventListener('mouseup', onUp as unknown as EventListener);
    window.addEventListener('touchend', onUp as unknown as EventListener);
    return () => {
      el.removeEventListener('mousedown', onDown as unknown as EventListener);
      el.removeEventListener('touchstart', onDown as unknown as EventListener);
      window.removeEventListener('mousemove', onMove as unknown as EventListener);
      window.removeEventListener('touchmove', onMove as unknown as EventListener);
      window.removeEventListener('mouseup', onUp as unknown as EventListener);
      window.removeEventListener('touchend', onUp as unknown as EventListener);
    };
  }, [max, onScrub]);

  return (
    <div
      ref={ref}
      className="group relative h-2 w-full rounded-full cursor-pointer"
      role="slider"
      aria-valuenow={Math.floor(value)}
      aria-valuemin={0}
      aria-valuemax={Math.floor(max)}
      style={{ background: 'color-mix(in srgb, var(--accent-highlight-subtle) 35%, transparent)' }}
    >
      <div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ width: `${pct}%`, background: 'var(--accent-interactive-primary)' }}
      />
      <div
        className="absolute -top-1 h-4 w-4 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          left: `calc(${pct}% - 8px)`,
          background: 'color-mix(in srgb, white 85%, transparent)',
          border: '1px solid color-mix(in srgb, white 35%, transparent)',
          boxShadow:
            '0 0 8px color-mix(in srgb, var(--accent-interactive-primary) 40%, transparent)',
        }}
      />
    </div>
  );
}

const AudioPlayer = ({ audioUrl, filename, isDark }: { audioUrl: string; filename: string; isDark: boolean }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);
  const [canPlay, setCanPlay] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // When audioUrl changes, build a playable URL and reset playback state
  useEffect(() => {
    let cancelled = false;
    const buildUrl = async () => {
      setError(null);
      setIsPlaying(false);
      setDuration(null);
      setCurrentTime(0);
      setCanPlay(false);

      const el = audioRef.current;
      if (el) {
        try {
          el.pause();
          el.currentTime = 0;
        } catch {}
      }

      try {
        let nextUrl: string;
        if (audioUrl.startsWith('data:')) {
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          nextUrl = URL.createObjectURL(blob);
        } else {
          nextUrl = audioUrl;
        }
        if (cancelled) return;

        // Revoke previous blob URL if any
        if (prevBlobUrlRef.current && prevBlobUrlRef.current.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(prevBlobUrlRef.current);
          } catch {}
        }
        prevBlobUrlRef.current = nextUrl.startsWith('blob:') ? nextUrl : null;
        setBlobUrl(nextUrl);
      } catch (err) {
        console.error('Failed to create blob URL:', err);
        if (cancelled) return;
        setError('Failed to load audio');
        setBlobUrl(audioUrl);
      }
    };

    buildUrl();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  // Ensure the element reloads the new source and we wait for readiness
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !blobUrl) return;
    setCanPlay(false);
    try {
      el.load();
    } catch {}
  }, [blobUrl]);

  const playSafely = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      // Wait for readiness if needed
      if (el.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onErr = () => {
            cleanup();
            reject(new Error('Audio error'));
          };
          const cleanup = () => {
            el.removeEventListener('canplay', onReady);
            el.removeEventListener('error', onErr);
          };
          el.addEventListener('canplay', onReady, { once: true });
          el.addEventListener('error', onErr, { once: true });
          try {
            el.load();
          } catch {}
        });
      }
      setCanPlay(true);
      await el.play();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      // Swallow AbortError which can occur if a new load interrupts play()
      if (e && e.name === 'AbortError') {
        console.warn('Play aborted due to new load');
        return;
      }
      console.warn('Failed to play audio:', e);
    }
  };

  const downloadAudio = async () => {
    try {
      let blob: Blob;

      if (audioUrl.startsWith('data:')) {
        // Convert data URL to blob
        const response = await fetch(audioUrl);
        blob = await response.blob();
      } else {
        // Fetch from URL
        const response = await fetch(audioUrl);
        blob = await response.blob();
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download audio:', error);
      // Fallback: open audio in new tab
      window.open(audioUrl, '_blank');
    }
  };

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 my-4 border bg-transparent transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-interactive-primary) 35%, transparent)',
        boxShadow:
          '0 10px 30px rgba(0,0,0,0.35), 0 6px 10px rgba(0,0,0,0.25), inset 0 1px 0 color-mix(in srgb, var(--accent-highlight-subtle) 14%, transparent)',
        background:
          'radial-gradient(120% 100% at 10% 0%, color-mix(in srgb, var(--accent-highlight-subtle) 14%, transparent), transparent 40%), radial-gradient(140% 120% at 100% 100%, color-mix(in srgb, var(--accent-highlight-subtle) 50%, transparent), transparent 60%)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: 'var(--accent-interactive-primary)' }}
          ></div>
          <span className={cn(
            "text-sm font-medium tracking-wide",
            isDark ? "text-zinc-200" : "text-gray-800"
          )}>
            Generated Audio
          </span>
        </div>
        {blobUrl && !error && (
          <div className="hidden sm:flex items-center gap-2" aria-hidden>
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-4">
                <span
                  className="w-0.5 rounded-sm animate-pulse"
                  style={{
                    backgroundColor: 'var(--accent-highlight-primary)',
                    height: '100%',
                    boxShadow: '0 0 8px var(--accent-highlight-primary)',
                  }}
                />
                <span
                  className="w-0.5 rounded-sm animate-pulse"
                  style={{
                    backgroundColor: 'var(--accent-highlight-secondary)',
                    height: '70%',
                    boxShadow: '0 0 8px var(--accent-highlight-secondary)',
                  }}
                />
                <span
                  className="w-0.5 rounded-sm animate-pulse"
                  style={{
                    backgroundColor: 'var(--accent-interactive-primary)',
                    height: '90%',
                    boxShadow: '0 0 10px var(--accent-interactive-primary)',
                  }}
                />
                <span
                  className="w-0.5 rounded-sm animate-pulse"
                  style={{
                    backgroundColor: 'var(--accent-highlight-secondary)',
                    height: '60%',
                    boxShadow: '0 0 8px var(--accent-highlight-secondary)',
                  }}
                />
              </div>
            )}
            {duration !== null && (
              <span className="text-xs text-zinc-400 tabular-nums">{formatTime(duration)}</span>
            )}
          </div>
        )}
      </div>

      {error ? (
        <div className="text-sm mb-3" style={{ color: 'var(--accent-error)' }}>
          {error}
        </div>
      ) : blobUrl ? (
        <div className="mb-4">
          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={blobUrl || undefined}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (!isNaN(el.duration) && isFinite(el.duration)) {
                setDuration(el.duration);
              }
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime || 0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onCanPlay={() => setCanPlay(true)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setError('Failed to load audio')}
            className="hidden"
          />

          {/* Custom controls */}
          <div
            className="w-full rounded-xl px-3.5 py-2.5 flex items-center gap-3"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--accent-highlight-subtle) 16%, transparent), color-mix(in srgb, var(--accent-highlight-subtle) 6%, transparent))',
              border:
                '1px solid color-mix(in srgb, var(--accent-highlight-subtle) 22%, transparent)',
              boxShadow:
                '0 10px 20px color-mix(in srgb, black 22%, transparent), inset 0 1px 0 color-mix(in srgb, var(--accent-highlight-subtle) 18%, transparent)',
            }}
          >
            {/* Play/Pause */}
            <button
              onClick={() => {
                const el = audioRef.current;
                if (!el) return;
                if (el.paused) {
                  // Only attempt play after we ensure readiness
                  playSafely();
                } else {
                  try {
                    el.pause();
                  } catch {}
                }
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white transition-transform duration-150 active:scale-95`}
              style={{
                background:
                  'radial-gradient(80% 80% at 30% 20%, color-mix(in srgb, white 35%, transparent), transparent 40%), var(--accent-interactive-primary)',
                boxShadow:
                  '0 8px 18px color-mix(in srgb, var(--accent-interactive-primary) 45%, transparent), inset 0 1px 0 color-mix(in srgb, white 35%, transparent)',
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white"
              >
                {isPlaying ? (
                  <g>
                    <rect x="6" y="5" width="4" height="14" rx="1"></rect>
                    <rect x="14" y="5" width="4" height="14" rx="1"></rect>
                  </g>
                ) : (
                  <path d="M8 5v14l11-7z"></path>
                )}
              </svg>
            </button>

            {/* Progress */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-xs tabular-nums text-zinc-400 w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <ProgressBar
                value={Math.min(currentTime, duration ?? 0)}
                max={duration ?? 0}
                onScrub={(next) => {
                  setCurrentTime(next);
                  if (audioRef.current) audioRef.current.currentTime = next;
                }}
              />
              <span className={cn(
                "text-xs tabular-nums w-10",
                isDark ? "text-zinc-400" : "text-gray-500"
              )}>
                {duration !== null ? formatTime(duration) : '--:--'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-3 text-sm mb-4",
          isDark ? "text-zinc-600" : "text-gray-500"
        )}>
          {/* Distinct loading equalizer (different from image skeleton) */}
          <div className="flex items-end gap-1 h-6" aria-hidden>
            <span
              className="w-1 h-2 rounded-sm animate-pulse"
              style={{ backgroundColor: 'var(--accent-highlight-primary)' }}
            />
            <span
              className="w-1 h-4 rounded-sm animate-pulse"
              style={{ backgroundColor: 'var(--accent-highlight-secondary)' }}
            />
            <span
              className="w-1 h-5 rounded-sm animate-pulse"
              style={{ backgroundColor: 'var(--accent-interactive-primary)' }}
            />
            <span
              className="w-1 h-3 rounded-sm animate-pulse"
              style={{ backgroundColor: 'var(--accent-highlight-secondary)' }}
            />
          </div>
          <span>Preparing audio...</span>
        </div>
      )}

      {/* Divider */}
      <div
        className="h-px my-2"
        style={{
          background: 'color-mix(in srgb, var(--accent-highlight-subtle) 22%, transparent)',
        }}
      />

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 justify-between">
        {/* Context (filename) */}
        <div className={cn(
          "text-xs truncate",
          isDark ? "text-zinc-600" : "text-gray-500"
        )} title={filename}>
          {filename}
        </div>

        <div className="flex items-center gap-2">
          <button
            aria-label="Download audio"
            onClick={downloadAudio}
            className={`${ACCENT_UTILITY_CLASSES.button.secondary} flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors`}
            disabled={!blobUrl}
          >
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MarkdownLite({ text }: Props) {
  const { theme } = useTheme();
  const isDark = theme.mode === 'dark';

  if (!text) return null;

  // Check for audio content first (supports multiple formats)
  let audioUrl: string | undefined;
  const tagMatch = text.match(/\[AUDIO:([^\]]+)\]/i);
  if (tagMatch) {
    audioUrl = tagMatch[1];
  } else {
    const prefixMatch = text.match(/^AUDIO:(.+)$/i);
    if (prefixMatch) {
      audioUrl = prefixMatch[1].trim();
    } else if (/^data:audio\//i.test(text)) {
      audioUrl = text.trim();
    } else {
      // Try to find inline data:audio anywhere in the text
      const dataInline = text.match(/(data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/i);
      if (dataInline) {
        audioUrl = dataInline[1];
      } else {
        const urlMatch = text.match(/(https?:[^\s)]+\.(?:mp3|wav|m4a)(?:\?[^\s)]*)?)/i);
        if (urlMatch) audioUrl = urlMatch[1];
      }
    }
  }

  if (audioUrl) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `openfiesta-audio-${timestamp}.mp3`;

    return (
      <div className={cn(
        "leading-relaxed",
        isDark ? "text-zinc-100" : "text-gray-800"
      )}>
        {/* Keep the original marker in DOM but hide it from UI */}
        <span aria-hidden style={{ display: 'none' }}>
          {text}
        </span>
        <AudioPlayer audioUrl={audioUrl} filename={filename} isDark={isDark} />
      </div>
    );
  }

  // Split out fenced code blocks first so we don't transform inside them
  const blocks = splitFencedCodeBlocks(text);

  return (
    <div className={cn(
      "leading-relaxed whitespace-pre-wrap text-[13.5px] sm:text-sm space-y-2 tracking-[0.004em]",
      isDark ? "text-zinc-100" : "text-gray-800"
    )}>
      {blocks.map((b, i) =>
        b.type === 'code' ? (
          <div key={i} className="relative group">
            <pre
              className={cn(
                "my-2 rounded border p-2 overflow-x-auto text-xs pr-10",
                isDark
                  ? "bg-black/40 border-white/10"
                  : "bg-gray-100/60 border-gray-300/40"
              )}
            >
              <code>{maybeDeescapeJsonish(b.content)}</code>
            </pre>
            <CopyToClipboard
              getText={() => maybeDeescapeJsonish(b.content)}
              className={cn(
                "absolute top-2 right-2 p-1 rounded-md transition-opacity opacity-0 group-hover:opacity-100 shadow-sm"
              )}
              iconSize={14}
              timeout={1200}
              title="Copy code"
            />
          </div>
        ) : (
          // For non-code text, clean simple math delimiters like \( \) \[ \] and $...$
          <BlockRenderer key={i} text={sanitizeMath(b.content)} isDark={isDark} />
        ),
      )}
    </div>
  );
}

function splitFencedCodeBlocks(input: string): Array<{ type: 'text' | 'code'; content: string }> {
  const parts: Array<{ type: 'text' | 'code'; content: string }> = [];
  const regex = /```[\w-]*\n([\s\S]*?)\n```/g; // ```lang?\n...\n```
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'text', content: input.slice(lastIndex, m.index) });
    }
    parts.push({ type: 'code', content: m[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    parts.push({ type: 'text', content: input.slice(lastIndex) });
  }
  return parts;
}

// Heuristic de-escape for code blocks that arrive double-escaped (e.g. lots of \\n, \", \\\)
// We only transform when it looks like serialized code rather than legitimate backslashes.
function maybeDeescapeJsonish(src: string): string {
  if (!src) return src;
  const backslashes = (src.match(/\\/g) || []).length;
  const ratio = backslashes / Math.max(1, src.length);
  const hasEscapes = /\\n|\\t|\\r\\n|\\"/.test(src);
  // Bail out for low backslash density and no common escapes
  if (!hasEscapes && ratio < 0.02) return src;

  let out = src;
  // Normalize common escaped sequences first
  out = out.replace(/\\r\\n/g, '\n');
  out = out.replace(/\\n/g, '\n');
  out = out.replace(/\\t/g, '\t');
  out = out.replace(/\\"/g, '"');
  // Collapse double backslashes that are not forming a usual escape
  // Keep \\n, \\t, \\" and \\\\ sequences intact where meaningful
  out = out.replace(/\\\\(?![ntr"\\])/g, '\\');
  // If we ended up with CRs, normalize
  out = out.replace(/\r/g, '\n');
  return out;
}

// Softer heuristic for regular text lines that appear over-escaped (e.g., stray \n, \t, \" in paragraphs)
function maybeDeescapeTextish(src: string): string {
  if (!src) return src;
  const backslashes = (src.match(/\\/g) || []).length;
  const ratio = backslashes / Math.max(1, src.length);
  const hasEscapes = /\\n|\\t|\\"/.test(src);
  // Slightly higher tolerance for text; avoid touching normal prose
  if (!hasEscapes && ratio < 0.04) return src;

  let out = src;
  out = out.replace(/\\r\\n/g, '\n');
  out = out.replace(/\\n/g, '\n');
  out = out.replace(/\\t/g, '\t');
  out = out.replace(/\\"/g, '"');
  // Conservatively collapse double backslashes only when not a common escape
  out = out.replace(/\\\\(?![ntr"\\])/g, '\\');
  out = out.replace(/\r/g, '\n');
  return out;
}

// Image component that shows a skeleton placeholder until the image loads
function ImageWithSkeleton({ src, alt, filename, isDark }: { src: string; alt: string; filename: string; isDark: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset state whenever the image source changes (important when different models
  // share an initial placeholder URL and later swap to their own URLs)
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setDimensions(null);
  }, [src]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen]);

  return (
    <>
      <div
        className="my-3 rounded-2xl overflow-hidden border relative"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-interactive-primary) 22%, transparent)',
          boxShadow:
            '0 8px 22px color-mix(in srgb, black 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--accent-highlight-subtle) 10%, transparent)',
        }}
      >
        {/* Accent stripe */}
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            background:
              'linear-gradient(180deg, var(--accent-interactive-primary), color-mix(in srgb, var(--accent-interactive-primary) 50%, transparent))',
            boxShadow:
              '0 0 8px color-mix(in srgb, var(--accent-interactive-primary) 35%, transparent)',
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 pl-6 border-b"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-highlight-subtle) 18%, transparent)',
            background:
              'linear-gradient(180deg, color-mix(in srgb, var(--accent-highlight-subtle) 12%, transparent), color-mix(in srgb, var(--accent-highlight-subtle) 4%, transparent))',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--accent-interactive-primary)',
                boxShadow: '0 0 8px var(--accent-interactive-primary)',
              }}
            />
            <span className={cn(
              "text-sm font-medium",
              isDark ? "text-zinc-100" : "text-gray-800"
            )}>
              {loaded && !failed ? (
                'Generated Image'
              ) : (
                <>
                  Generating image
                  <AnimatedEllipsis />
                </>
              )}
            </span>
          </div>
          {dimensions && (
            <span className={cn(
              "text-[11px] tabular-nums",
              isDark ? "text-zinc-400" : "text-gray-500"
            )}>
              {dimensions.w}×{dimensions.h}px
            </span>
          )}
        </div>

        {/* Stage background */}
        <div
          className="relative p-3"
          style={{
            background: `
            linear-gradient(180deg, color-mix(in srgb, var(--accent-highlight-subtle) 5%, transparent), transparent),
            radial-gradient(120% 100% at 100% 0%, color-mix(in srgb, black 14%, transparent), transparent 40%),
            linear-gradient(135deg,
              color-mix(in srgb, var(--accent-highlight-subtle) 4%, transparent) 25%,
              transparent 25%, transparent 50%,
              color-mix(in srgb, var(--accent-highlight-subtle) 4%, transparent) 50%,
              color-mix(in srgb, var(--accent-highlight-subtle) 4%, transparent) 75%,
              transparent 75%, transparent
            )`,
            backgroundSize: 'auto, auto, 24px 24px',
          }}
        >
          {/* Inner frame */}
          <div
            className="rounded-xl p-1.5"
            style={{
              border:
                '1px solid color-mix(in srgb, var(--accent-highlight-subtle) 20%, transparent)',
              boxShadow:
                'inset 0 1px 0 color-mix(in srgb, white 8%, transparent), inset 0 0 0 9999px color-mix(in srgb, black 4%, transparent)',
            }}
          >
            {/* Unified image container */}
            <div
              className="relative w-full rounded-lg overflow-hidden"
              style={{
                border:
                  '1px solid color-mix(in srgb, var(--accent-highlight-subtle) 20%, transparent)',
                aspectRatio: !loaded && !failed ? '3 / 2' : undefined,
              }}
            >
              {/* Skeleton layers only while loading */}
              {!loaded && !failed && (
                <div className="absolute inset-0">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `
                      radial-gradient(85% 120% at 50% 30%, color-mix(in srgb, var(--accent-highlight-subtle) 12%, transparent), transparent 65%),
                      linear-gradient(135deg,
                        color-mix(in srgb, var(--accent-highlight-subtle) 2.5%, transparent) 25%,
                        transparent 25%, transparent 50%,
                        color-mix(in srgb, var(--accent-highlight-subtle) 2.5%, transparent) 50%,
                        color-mix(in srgb, var(--accent-highlight-subtle) 2.5%, transparent) 75%,
                        transparent 75%, transparent
                      )
                    `,
                    }}
                  />
                  <div
                    className="absolute inset-y-0 -left-1/3 w-1/3 img-sweep"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, color-mix(in srgb, white 10%, transparent) 40%, color-mix(in srgb, var(--accent-highlight-subtle) 22%, transparent) 50%, transparent 80%)',
                      filter: 'blur(6px)',
                    }}
                  />
                  <div
                    className="absolute inset-0 rounded-[0.5rem] pointer-events-none img-breathe-strong"
                    style={{
                      boxShadow:
                        'inset 0 0 0 1px color-mix(in srgb, var(--accent-highlight-subtle) 28%, transparent), inset 0 0 30px color-mix(in srgb, var(--accent-interactive-primary) 10%, transparent)',
                    }}
                  />
                  {/* center ripple */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full img-ripple"
                    style={{
                      width: '120px',
                      height: '120px',
                      background:
                        'radial-gradient(closest-side, color-mix(in srgb, var(--accent-interactive-primary) 22%, transparent), transparent 70%)',
                      filter: 'blur(8px)',
                      opacity: 0.6,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="opacity-70 animate-pulse">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className="text-zinc-400"
                      >
                        <path
                          d="M4 7h3l2-2h6l2 2h3v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
                          strokeWidth="1.2"
                        />
                        <circle cx="12" cy="13" r="3.5" strokeWidth="1.2" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}

              {/* Actual image */}
              <img
                key={src}
                src={src}
                alt={alt}
                onLoad={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  const w = el.naturalWidth;
                  const h = el.naturalHeight;
                  setDimensions({ w, h });
                  // Some providers briefly return a 1x1 (or tiny) placeholder asset.
                  // Keep the skeleton (with breathing effect) until the image has meaningful size.
                  const isTiny = w <= 2 && h <= 2;
                  if (!isTiny) {
                    setLoaded(true);
                  }
                }}
                onError={() => setFailed(true)}
                className={`w-full h-auto rounded-lg ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 shadow-[0_8px_22px_rgba(0,0,0,0.28)] cursor-zoom-in`}
                style={{
                  display: failed ? ('none' as const) : 'block',
                  border:
                    '1px solid color-mix(in srgb, var(--accent-highlight-subtle) 22%, transparent)',
                }}
                onClick={() => loaded && !failed && setLightboxOpen(true)}
              />

              {/* Status pill removed per request */}
            </div>
          </div>

          {/* Error state */}
          {failed && (
            <div className="mt-2 text-xs" style={{ color: 'var(--accent-error)' }}>
              Failed to load image.
            </div>
          )}

          {/* Download button after load */}
          {loaded && !failed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadImage(src, filename);
              }}
              className="absolute top-4 right-4 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              style={{
                color: '#fff',
                background:
                  'radial-gradient(80% 80% at 30% 20%, rgba(255,255,255,0.25), rgba(255,255,255,0) 40%), var(--accent-interactive-primary)',
                boxShadow:
                  '0 8px 18px color-mix(in srgb, var(--accent-interactive-primary) 40%, transparent)',
              }}
              title="Download image"
            >
              <Download size={14} />
              Download
            </button>
          )}
        </div>
      </div>
      {/* Lightbox overlay via Portal to body */}
      {lightboxOpen &&
        !failed &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            {/* Close button */}
            <button
              aria-label="Close image preview"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center text-white/90 bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 border border-white/20 shadow-lg"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div
              className="relative max-w-[95vw] max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={src}
                alt={alt}
                className="max-w-[95vw] max-h-[95vh] w-auto h-auto rounded-lg shadow-2xl"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

// Renders a text block with support for paragraphs, simple lists, and tables.
function BlockRenderer({ text, isDark }: { text: string; isDark: boolean }) {
  // Normalize newlines
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n');
  const lines = normalizeTableLikeMarkdown(rawLines);
  const nodes: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headings: # to ######
    const heading = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2].trim();
      const Tag = `h${Math.min(6, Math.max(1, level))}` as unknown as React.ElementType;
      nodes.push(
        <Tag
          key={`h-${i}`}
          className={`mt-2 mb-1 font-semibold tracking-tight ${
            level <= 2 ? 'text-base md:text-lg' : level === 3 ? 'text-sm md:text-base' : 'text-sm'
            }`}
        >
          {renderInline(content, isDark)}
        </Tag>,
      );
      i++;
      continue;
    }

    // Blockquote: lines starting with ">"; group consecutive
    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      nodes.push(
        <div key={`q-${i}`} className={cn(
          "my-2 px-3 py-2 rounded-md border",
          isDark
            ? "border-white/10 bg-white/5"
            : "border-gray-300/30 bg-gray-100/40"
        )}>
          <BlockRenderer text={quoteLines.join('\n')} isDark={isDark} />
        </div>,
      );
      continue;
    }

    // Table detection: header | --- | --- | followed by rows starting with |
    if (isTableHeader(lines, i)) {
      const { element, nextIndex } = parseTable(lines, i, isDark);
      nodes.push(
        <div
          key={`tbl-${i}`}
          className={cn(
            "my-2 overflow-x-auto rounded-lg ring-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] p-2",
            isDark
              ? "ring-white/20 bg-gradient-to-b from-black/40 to-black/20"
              : "ring-gray-300/30 bg-gradient-to-b from-white/40 to-gray-50/20"
          )}
        >
          {element}
        </div>,
      );
      i = nextIndex;
      continue;
    }

    // List detection: -, *, or numbered like 1.
    if (isListLine(line)) {
      const { element, nextIndex } = parseList(lines, i, isDark);
      nodes.push(
        <div key={`list-${i}`} className="my-1">
          {element}
        </div>,
      );
      i = nextIndex;
      continue;
    }

    // Blank line -> paragraph break
    if (!line.trim()) {
      nodes.push(<br key={`br-${i}`} />);
      i++;
      continue;
    }

    // Regular paragraph line(s) until next blank/table/list/heading/blockquote
    const start = i;
    const buf: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (
        !l.trim() ||
        isTableHeader(lines, i) ||
        isListLine(l) ||
        /^\s{0,3}#{1,6}\s+/.test(l) ||
        /^\s*>\s?/.test(l)
      )
        break;
      buf.push(l);
      i++;
    }
    nodes.push(
      <p key={`p-${start}`} className="whitespace-pre-wrap my-1">
        {renderInline(buf.join('\n'), isDark)}
      </p>,
    );
  }

  return <>{nodes}</>;
}

// Remove simple math delimiters so math reads cleanly without a renderer
function sanitizeMath(input: string): string {
  let out = input;
  // Remove escaped LaTeX inline/block delimiters \( \) \[ \]
  out = out.replace(/\\[()\[\]]/g, '');
  // Replace $...$ or $$...$$ with the inner content
  out = out.replace(/\${1,2}([\s\S]*?)\${1,2}/g, (_, inner) => inner);
  return out;
}

function isTableHeader(lines: string[], idx: number): boolean {
  const header = lines[idx] || '';
  const sep = lines[idx + 1] || '';
  // Require some pipes and a separator line like |---|---| (allow spaces/colons)
  if (!/\|/.test(header) || !/\|/.test(sep)) return false;
  const looksLikeSep =
    /^\s*\|?\s*(?::?-+\s*\|\s*)*:?-+\s*\|?\s*$/.test(sep) ||
    /^\s*\|?\s*(-+\s*\|\s*)*-+\s*\|?\s*$/.test(sep);
  return looksLikeSep;
}

function parseTable(
  lines: string[],
  idx: number,
  isDark: boolean,
): { element: React.ReactElement; nextIndex: number } {
  const headerLine = lines[idx] || '';
  // skip separator line
  let i = idx + 2;
  const rows: string[] = [];
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw || raw.trim() === '') break;
    // Skip any separator-like row inside body (rows made only/mostly of dashes, mdashes, en-dashes, colons, or spaces)
    const isSepLike = (() => {
      const core = raw.trim().replace(/^\|/, '').replace(/\|$/, '');
      const cells = core.split('|').map((s) => s.trim());
      const sepRe = /^[:\-\s—–]+$/;
      const sepCount = cells.filter((c) => c === '' || sepRe.test(c)).length;
      if (cells.length <= 1) return sepCount === 1; // handle lines without pipes
      return sepCount >= Math.ceil(cells.length / 2); // majority separator-like -> skip
    })();
    if (isSepLike) {
      i++;
      continue;
    }
    if (!/\|/.test(raw)) {
      // continuation text for previous row
      if (rows.length > 0) {
        rows[rows.length - 1] = rows[rows.length - 1] + ' ' + raw.trim();
        i++;
        continue;
      } else {
        break;
      }
    }
    const pipeCount = (raw.match(/\|/g) || []).length;
    if (pipeCount < 2 && rows.length > 0) {
      // Likely a continuation that begins with a single pipe
      const cont = raw.replace(/^\|?\s*/, '').trim();
      // If the continuation is only separator characters (dashes/colons/mdashes/en-dashes/spaces), skip it
      if (/^[:\-\s—–]+$/.test(cont)) {
        i++;
        continue;
      }
      rows[rows.length - 1] = rows[rows.length - 1] + ' ' + cont;
    } else {
      // If cells are only separator characters, skip
      const cells = splitRow(raw);
      const allSep = cells.length > 0 && cells.every((c) => /^[:\-\s—–]+$/.test(c));
      if (!allSep) rows.push(raw);
    }
    i++;
  }

  // Split headers and drop empty/separator-only header columns to avoid blank columns
  let headers = splitRow(headerLine);
  const sepOnly = (s: string) => /^[:\-\s—–]*$/.test(s || '');
  const keepIdx: number[] = [];
  headers.forEach((h, idx) => {
    if (h.trim() !== '' && !sepOnly(h)) keepIdx.push(idx);
  });
  if (keepIdx.length > 0) {
    headers = keepIdx.map((i) => headers[i]);
  } else {
    // If all were empty, fall back to original to avoid losing data
    headers = headers.map((h) => (h || '').trim());
    headers = headers.length ? headers : [''];
  }

  // Map body rows to kept columns and normalize lengths
  const bodyRaw = rows.map(splitRow);
  const projectCols = (cols: string[]) => {
    if (keepIdx.length > 0) {
      const projected = keepIdx.map((i) => (i < cols.length ? cols[i] : ''));
      return projected;
    }
    return cols;
  };
  const colCount = headers.length;
  const body = bodyRaw.map((cols) => {
    const proj = projectCols(cols);
    if (proj.length === colCount) return proj;
    if (proj.length < colCount) return proj.concat(Array(colCount - proj.length).fill(''));
    // If too many, merge extras into last cell
    return proj.slice(0, colCount - 1).concat([proj.slice(colCount - 1).join(' | ')]);
  });

  const element = (
    <table className="text-[13px] sm:text-sm w-full table-auto border-separate border-spacing-0">
      <thead>
        <tr>
          {headers.map((h, hi) => (
            <th
              key={hi}
              className={cn(
                "text-left font-semibold border px-3 py-1.5",
                isDark
                  ? "text-zinc-100 bg-black/30 border-white/15"
                  : "text-gray-800 bg-gray-100/60 border-gray-300/40"
              )}
            >
              {renderInline(h, isDark)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {body.map((r, ri) => (
          <tr key={ri} className={isDark ? "even:bg-black/20" : "even:bg-gray-50/40"}>
            {r.map((c, ci) => (
              <td
                key={ci}
                className={cn(
                  "align-top border px-3 py-1.5 whitespace-pre-wrap",
                  isDark
                    ? "border-white/15 text-zinc-200"
                    : "border-gray-300/40 text-gray-700"
                )}
              >
                {renderInline(c, isDark)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return { element, nextIndex: i };
}

function splitRow(line: string): string[] {
  // Trim outer pipes, then split; keep empty cells; collapse inner spaces
  const core = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const parts = core.split('|').map((s) => s.replace(/\s+/g, ' ').trim());
  return parts;
}

function isListLine(line: string): boolean {
  return /^\s*(?:[-*]\s+|\d+\.\s+)/.test(line);
}

function parseList(
  lines: string[],
  idx: number,
  isDark: boolean,
): { element: React.ReactElement; nextIndex: number } {
  const items: { marker: 'ul' | 'ol'; text: string }[] = [];
  let i = idx;
  let mode: 'ul' | 'ol' | null = null;
  while (i < lines.length) {
    const line = lines[i];
    if (!isListLine(line)) break;
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    const ul = /^\s*(?:[-*])\s+(.*)$/.exec(line);
    if (ol) {
      if (mode && mode !== 'ol') break; // stop when list type changes
      mode = 'ol';
      items.push({ marker: 'ol', text: ol[1] });
    } else if (ul) {
      if (mode && mode !== 'ul') break;
      mode = 'ul';
      items.push({ marker: 'ul', text: ul[1] });
    } else {
      break;
    }
    i++;
  }

  const element =
    mode === 'ol' ? (
      <ol className="list-decimal list-outside pl-5 space-y-1">
        {items.map((it, idx2) => (
          <li key={idx2} className="whitespace-pre-wrap">
            {renderInline(it.text, isDark)}
          </li>
        ))}
      </ol>
    ) : (
      <ul className="list-disc list-outside pl-5 space-y-1">
        {items.map((it, idx2) => (
          <li key={idx2} className="whitespace-pre-wrap">
            {renderInline(it.text, isDark)}
          </li>
        ))}
      </ul>
    );

  return { element, nextIndex: i };
}

function renderInline(input: string, isDark?: boolean): React.ReactNode[] {
  // First handle images ![alt](url)
  const imageSegments = input.split(/(!\[[^\]]*\]\([^)]+\))/g);
  const out: React.ReactNode[] = [];

  imageSegments.forEach((imgSeg, imgIdx) => {
    const isHiddenNoise = (txt: string) => {
      const t = (txt || '').trim();
      if (!t) return false;
      if (/^\{\{?\s*Generated\s+Image\s*\}?\}$/i.test(t)) return true;
      if (/^\[\s*Generated\s+Image\s*\]$/i.test(t)) return true;
      if (/^Generated\s+Image$/i.test(t)) return true;
      if (/^!\($/.test(t) || /^\)$/.test(t)) return true;
      if (/(https?:\/\/(?:image\.)?pollinations\.ai[^\s)\]\}>"']+)/i.test(t)) return true;
      return false;
    };

    const imageMatch = imgSeg.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, alt, src] = imageMatch;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `openfiesta-image-${timestamp}.png`;

      out.push(
        <ImageWithSkeleton
          key={`img-container-${imgIdx}`}
          src={src}
          alt={alt}
          filename={filename}
          isDark={isDark ?? true}
        />,
      );
      return;
    }

    // If this segment is known noise (provider labels, stray md, bare pollinations URL), keep it in DOM but hide
    if (isHiddenNoise(imgSeg)) {
      out.push(
        <span key={`hidden-${imgIdx}`} aria-hidden style={{ display: 'none' }}>
          {imgSeg}
        </span>,
      );
      return;
    }

    // Then split by inline code `...`
    const segments = imgSeg.split(/(`[^`]+`)/g);
    segments.forEach((seg, idx) => {
      if (isHiddenNoise(seg)) {
        out.push(
          <span key={`hidden-${imgIdx}-${idx}`} aria-hidden style={{ display: 'none' }}>
            {seg}
          </span>,
        );
        return;
      }
      if (/^`[^`]+`$/.test(seg)) {
        const content = seg.slice(1, -1);
        out.push(
          <code
            key={`${imgIdx}-${idx}`}
            className="rounded bg-black/40 px-1 py-0.5 border border-white/10 text-[0.85em]"
          >
            {content}
          </code>,
        );
      } else {
        // For regular text, first de-escape if it looks over-escaped
        const cleaned = maybeDeescapeTextish(seg);
        // Bold then italics on the remaining text. Keep it simple and safe.
        // Replace **bold**
        const withBold = splitAndWrap(cleaned, /\*\*([^*]+)\*\*/g, (m, i) => (
          <strong key={`b-${imgIdx}-${idx}-${i}`} className="font-semibold text-zinc-100">
            {m}
          </strong>
        ));
        // For each piece, also apply _italic_ or *italic*
        const withItalics: React.ReactNode[] = [];
        withBold.forEach((piece, i) => {
          if (typeof piece !== 'string') {
            withItalics.push(piece);
            return;
          }
          const italics = splitAndWrap(piece, /(?:\*([^*]+)\*|_([^_]+)_)/g, (m2, ii) => (
            <em key={`i-${imgIdx}-${idx}-${i}-${ii}`} className="italic text-zinc-100/90">
              {m2}
            </em>
          ));
          // After italics, highlight standalone word FREE in emerald
          italics.forEach((part, j) => {
            if (typeof part !== 'string') {
              withItalics.push(part);
              return;
            }
            const chunks = part.split(/(\bFREE\b)/gi);
            chunks.forEach((ch, k) => {
              if (/^\bFREE\b$/i.test(ch)) {
                withItalics.push(
                  <span
                    key={`free-${imgIdx}-${idx}-${i}-${j}-${k}`}
                    className="text-emerald-300 font-semibold"
                  >
                    FREE
                  </span>,
                );
              } else if (ch) {
                withItalics.push(
                  <React.Fragment key={`t-${imgIdx}-${idx}-${i}-${j}-${k}`}>{ch}</React.Fragment>,
                );
              }
            });
          });
        });
        out.push(<React.Fragment key={`t-${imgIdx}-${idx}`}>{withItalics}</React.Fragment>);
      }
    });
  });
  return out;
}

function splitAndWrap(
  input: string,
  regex: RegExp,
  wrap: (matchText: string, idx: number) => React.ReactNode,
): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = re.exec(input)) !== null) {
    if (m.index > lastIndex) result.push(input.slice(lastIndex, m.index));
    const captured = m[1] || m[2] || '';
    result.push(wrap(captured, i++));
    lastIndex = re.lastIndex;
  }
  if (lastIndex < input.length) result.push(input.slice(lastIndex));
  return result;
}
