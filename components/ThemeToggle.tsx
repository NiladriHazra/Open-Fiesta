'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Palette, Sun, Moon, Type, Grid3X3, Star, MessageSquare } from 'lucide-react';
import { useTheme } from '@/lib/themeContext';
import { cn } from '@/lib/utils';
import {
  ACCENT_COLORS,
  FONT_FAMILIES,
  BACKGROUND_STYLES,
  type AccentColor,
  type FontFamily,
  type BackgroundStyle,
  type BadgePair,
  type ChatInputStyle,
} from '@/lib/themes';
import { BADGE_PAIRS } from '@/lib/badgeSystem';

// Memoized accent option component
const AccentOption = React.memo<{
  accent: {
    id: AccentColor;
    name: string;
    description: string;
    primary: string;
    secondary: string;
    tertiary: string;
  };
  isSelected: boolean;
  onSelect: (id: AccentColor) => void;
  isDark: boolean;
}>(({ accent, isSelected, onSelect, isDark }) => {
  const handleClick = useCallback(() => {
    onSelect(accent.id);
  }, [accent.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border transition-colors text-left",
        isSelected
          ? isDark
            ? 'border-white/30 bg-white/10'
            : 'border-black/30 bg-black/10'
          : isDark
            ? 'border-white/10 bg-white/5 hover:bg-white/8'
            : 'border-black/10 bg-black/5 hover:bg-black/8'
      )}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-6 h-6 rounded-full border border-white/20 accent-preview accent-preview-${
            accent.id
          }-primary ${
            isSelected
              ? 'ring-2 ring-[var(--accent-interactive-focus)] ring-offset-1 ring-offset-black/20'
              : ''
          }`}
          aria-hidden="true"
        />
        <div>
          <div className="text-sm font-medium">{accent.name}</div>
          <div className={cn(
            "text-xs",
            isDark ? "text-white/60" : "text-gray-600"
          )}>{accent.description}</div>
        </div>
      </div>
      <div className="flex gap-1">
        <div
          className={`w-3 h-3 accent-preview accent-preview-${accent.id}-primary`}
          aria-hidden="true"
        />
        <div
          className={`w-3 h-3 accent-preview accent-preview-${accent.id}-secondary`}
          aria-hidden="true"
        />
        <div
          className={`w-3 h-3 accent-preview accent-preview-${accent.id}-tertiary`}
          aria-hidden="true"
        />
      </div>
    </button>
  );
});

AccentOption.displayName = 'AccentOption';

// Memoized font option component
const FontOption = React.memo<{
  font: {
    id: FontFamily;
    name: string;
    description: string;
    primary: string;
    fallback: string;
  };
  isSelected: boolean;
  onSelect: (id: FontFamily) => void;
  isDark: boolean;
}>(({ font, isSelected, onSelect, isDark }) => {
  const handleClick = useCallback(() => {
    onSelect(font.id);
  }, [font.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-4 rounded-lg border transition-colors text-left w-full",
        isSelected
          ? isDark
            ? 'border-white/30 bg-white/10'
            : 'border-black/30 bg-black/10'
          : isDark
            ? 'border-white/10 bg-white/5 hover:bg-white/8'
            : 'border-black/10 bg-black/5 hover:bg-black/8'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className={cn(
            "text-sm font-medium mb-1",
            isDark ? "text-white" : "text-gray-800"
          )}>{font.name}</div>
          <div className={cn(
            "text-xs",
            isDark ? "text-white/60" : "text-gray-600"
          )}>
            {font.description}
          </div>
        </div>
        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      <div className={cn(
        "text-sm font-preview",
        `font-preview-${font.id}`,
        isDark ? "text-white/80" : "text-gray-700"
      )}>
        The quick brown fox jumps over the lazy dog 123456
      </div>
    </button>
  );
});

FontOption.displayName = 'FontOption';

// Memoized background option component
const BackgroundOption = React.memo<{
  background: {
    id: BackgroundStyle;
    name: string;
    description: string;
    className: string;
  };
  isSelected: boolean;
  onSelect: (id: BackgroundStyle) => void;
  isDark: boolean;
}>(({ background, isSelected, onSelect, isDark }) => {
  const handleClick = useCallback(() => {
    onSelect(background.id);
  }, [background.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border transition-colors text-left",
        isSelected
          ? isDark
            ? 'border-white/30 bg-white/10'
            : 'border-black/30 bg-black/10'
          : isDark
            ? 'border-white/10 bg-white/5 hover:bg-white/8'
            : 'border-black/10 bg-black/5 hover:bg-black/8'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={cn(
            "text-sm font-medium",
            isDark ? "text-white" : "text-gray-800"
          )}>{background.name}</div>
          <div className={cn(
            "text-xs",
            isDark ? "text-white/60" : "text-gray-600"
          )}>{background.description}</div>
        </div>
        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>
      <div className={`w-full h-16 rounded border border-white/20 ${background.className}`} />
    </button>
  );
});

BackgroundOption.displayName = 'BackgroundOption';

// Memoized badge option component
const BadgeOption = React.memo<{
  badge: {
    id: BadgePair;
    name: string;
    description: string;
    pro: { background: string; text: string; border: string };
    free: { background: string; text: string; border: string };
  };
  isSelected: boolean;
  onSelect: (id: BadgePair) => void;
  isDark: boolean;
}>(({ badge, isSelected, onSelect, isDark }) => {
  const handleClick = useCallback(() => {
    onSelect(badge.id);
  }, [badge.id, onSelect]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border transition-colors text-left",
        isSelected
          ? isDark
            ? 'border-white/30 bg-white/10'
            : 'border-black/30 bg-black/10'
          : isDark
            ? 'border-white/10 bg-white/5 hover:bg-white/8'
            : 'border-black/10 bg-black/5 hover:bg-black/8'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={cn(
            "text-sm font-medium",
            isDark ? "text-white" : "text-gray-800"
          )}>{badge.name}</div>
          <div className={cn(
            "text-xs",
            isDark ? "text-white/60" : "text-gray-600"
          )}>{badge.description}</div>
        </div>
        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </div>

      {/* Badge Preview (single-layer containers matching real badges) */}
      <div className="flex items-center gap-3">
        <div
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ring-1"
          style={{
            background: badge.pro.background,
            color: badge.pro.text,
            // Use border color for ring stroke via box-shadow fallback; ring-1 inherits currentColor so use outline
            boxShadow: `0 0 0 1px ${badge.pro.border}`,
          }}
        >
          <Star size={10} className="shrink-0" />
          <span className="text-xs">Pro</span>
        </div>
        <div
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ring-1"
          style={{
            background: badge.free.background,
            color: badge.free.text,
            boxShadow: `0 0 0 1px ${badge.free.border}`,
          }}
        >
          <span className="h-2 w-2 rounded-full bg-current opacity-80" />
          <span className="text-xs">Free</span>
        </div>
      </div>
    </button>
  );
});

BadgeOption.displayName = 'BadgeOption';

type ThemeToggleProps = { compact?: boolean };

export default function ThemeToggle({ compact }: ThemeToggleProps) {
  const { theme, setAccent, setFont, setBackground, setBadgePair, toggleMode, updateTheme } =
    useTheme();
  const isDark = theme.mode === 'dark';
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'accent' | 'font' | 'background' | 'badges' | 'input'>(
    'accent',
  );

  // Memoize the arrays to prevent recreating on every render
  const accentValues = useMemo(() => Object.values(ACCENT_COLORS), []);
  const fontValues = useMemo(() => Object.values(FONT_FAMILIES), []);
  const backgroundValues = useMemo(() => Object.values(BACKGROUND_STYLES), []);
  const badgeValues = useMemo(() => Object.values(BADGE_PAIRS), []);

  // Memoized handlers
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleToggleMode = useCallback(() => toggleMode(), [toggleMode]);

  const handleAccentChange = useCallback(
    (accent: AccentColor) => {
      setAccent(accent);
    },
    [setAccent],
  );

  const handleFontChange = useCallback(
    (font: FontFamily) => {
      console.log('Font change requested:', font);
      try {
        setFont(font);
      } catch (error) {
        console.error('Font change error:', error);
      }
    },
    [setFont],
  );

  const handleBackgroundChange = useCallback(
    (background: BackgroundStyle) => {
      setBackground(background);
    },
    [setBackground],
  );

  const handleBadgeChange = useCallback(
    (badge: BadgePair) => {
      setBadgePair(badge);
    },
    [setBadgePair],
  );

  const handleTabChange = useCallback(
    (tab: 'accent' | 'font' | 'background' | 'badges' | 'input') => {
      setActiveTab(tab);
    },
    [],
  );

  // Memoized current theme info
  const currentAccent = useMemo(() => ACCENT_COLORS[theme.accent], [theme.accent]);
  const currentFont = useMemo(() => FONT_FAMILIES[theme.font], [theme.font]);
  const currentBackground = useMemo(() => BACKGROUND_STYLES[theme.background], [theme.background]);
  const currentChatInputStyle = theme.chatInputStyle || 'default';

  return (
    <div className="relative">
      <button
        aria-label="Open Theme Settings"
        title="Theme Settings"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs h-9 rounded-xl border shadow transition-all duration-200",
          compact ? "w-9 justify-center px-0" : "px-3 py-2",
          isDark
            ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
            : "border-white/40 bg-white/70 hover:bg-white/80 text-gray-700"
        )}
      >
        <Palette size={14} />
        {!compact && <span>Theme</span>}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto" onClick={handleClose} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Theme Settings"
              className={cn(
                "relative w-full mx-3 sm:mx-6 max-w-2xl lg:max-w-3xl max-h-[88vh] rounded-2xl border p-4 md:p-6 lg:p-7 shadow-2xl backdrop-blur-sm z-10 flex flex-col overflow-hidden pointer-events-auto",
                isDark
                  ? "border-white/10 bg-zinc-900/95 text-white"
                  : "border-black/10 bg-white/95 text-gray-800"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Theme Settings</h2>
                <button
                  aria-label="Close"
                  onClick={handleClose}
                  className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors",
                    isDark
                      ? "bg-white/10 hover:bg-white/20"
                      : "bg-black/10 hover:bg-black/20"
                  )}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Mode Toggle */}
              <div className={cn(
                "mb-6 p-3 rounded-lg border shrink-0",
                isDark
                  ? "bg-white/5 border-white/10"
                  : "bg-black/5 border-black/10"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dark/Light Mode</span>
                  <button
                    onClick={handleToggleMode}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                      isDark
                        ? "bg-white/10 hover:bg-white/15"
                        : "bg-black/10 hover:bg-black/15"
                    )}
                  >
                    {theme.mode === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                    <span className="text-sm capitalize">{theme.mode}</span>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className={cn(
                "flex flex-nowrap gap-1 mb-4 p-1 rounded-lg shrink-0 overflow-x-auto -mx-1 px-1",
                isDark ? "bg-white/5" : "bg-black/5"
              )}>
                {[
                  { id: 'accent' as const, label: 'Colors', icon: Palette },
                  { id: 'badges' as const, label: 'Badges', icon: Star },
                  { id: 'font' as const, label: 'Fonts', icon: Type },
                  {
                    id: 'background' as const,
                    label: 'Backgrounds',
                    icon: Grid3X3,
                  },
                  {
                    id: 'input' as const,
                    label: 'Chat Input',
                    icon: MessageSquare,
                  },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => handleTabChange(id)}
                    className={cn(
                      "shrink-0 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                      activeTab === id
                        ? isDark
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'bg-black/15 text-gray-800 border border-black/20'
                        : isDark
                          ? 'text-white/70 hover:text-white hover:bg-white/5'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-black/5'
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content (scrollable) */}
              <div className="min-h-[200px] flex-1 overflow-y-auto pr-1 space-y-0">
                {/* Accent Colors Tab */}
                {activeTab === 'accent' && (
                  <div className="space-y-3">
                    <h3 className={cn(
                      "text-sm font-medium mb-3",
                      isDark ? "text-white/80" : "text-gray-600"
                    )}>
                      Choose your accent color
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {accentValues.map((accent) => (
                        <AccentOption
                          key={accent.id}
                          accent={accent}
                          isSelected={theme.accent === accent.id}
                          onSelect={handleAccentChange}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Badge Colors Tab */}
                {activeTab === 'badges' && (
                  <div className="space-y-3">
                    <h3 className={cn(
                      "text-sm font-medium mb-3",
                      isDark ? "text-white/80" : "text-gray-600"
                    )}>
                      Choose your badge colors
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {badgeValues.map((badge) => (
                        <BadgeOption
                          key={badge.id}
                          badge={badge}
                          isSelected={theme.badgePair === badge.id}
                          onSelect={handleBadgeChange}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                    <div className={cn(
                      "mt-4 p-3 rounded-lg border",
                      isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    )}>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-white/60" : "text-gray-500"
                      )}>
                        Badge colors change the Pro/Free badge appearance while maintaining the same
                        shape, size, and icons.
                      </p>
                    </div>
                  </div>
                )}

                {/* Font Families Tab */}
                {activeTab === 'font' && (
                  <div className="space-y-3">
                    <h3 className={cn(
                      "text-sm font-medium mb-3",
                      isDark ? "text-white/80" : "text-gray-600"
                    )}>
                      Choose your font family
                    </h3>
                    <div className="space-y-2">
                      {fontValues.map((font) => (
                        <FontOption
                          key={font.id}
                          font={font}
                          isSelected={theme.font === font.id}
                          onSelect={handleFontChange}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Styles Tab */}
                {activeTab === 'background' && (
                  <div className="space-y-3">
                    <h3 className={cn(
                      "text-sm font-medium mb-3",
                      isDark ? "text-white/80" : "text-gray-600"
                    )}>
                      Choose your background style
                    </h3>
                    <div className="space-y-3">
                      {backgroundValues.map((bg) => (
                        <BackgroundOption
                          key={bg.id}
                          background={bg}
                          isSelected={theme.background === bg.id}
                          onSelect={handleBackgroundChange}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                    <div className={cn(
                      "mt-4 p-3 rounded-lg border",
                      isDark ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    )}>
                      <p className={cn(
                        "text-xs",
                        isDark ? "text-white/60" : "text-gray-500"
                      )}>
                        <strong>Gradient:</strong> Rich, complex radial gradients that match your
                        accent color
                        <br />
                        <strong>Minimal:</strong> Clean solid background with subtle accent patterns
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'input' && (
                  <div className="space-y-4">
                    <h3 className={cn(
                      "text-sm font-medium mb-3",
                      isDark ? "text-white/80" : "text-gray-600"
                    )}>Chat input style</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        {
                          id: 'default',
                          name: 'Subtle',
                          desc: 'Soft translucent panel',
                        },
                        {
                          id: 'frosty',
                          name: 'Frosty Dark',
                          desc: 'Higher blur & depth',
                        },
                      ].map((opt) => {
                        const selected = currentChatInputStyle === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() =>
                              updateTheme({
                                chatInputStyle: opt.id as ChatInputStyle,
                              })
                            }
                            className={cn(
                              "p-3 rounded-lg border text-left transition-colors",
                              selected
                                ? isDark
                                  ? 'border-white/30 bg-white/10'
                                  : 'border-black/30 bg-black/10'
                                : isDark
                                  ? 'border-white/10 bg-white/5 hover:bg-white/8'
                                  : 'border-black/10 bg-black/5 hover:bg-black/8'
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className={cn(
                                  "text-sm font-medium",
                                  isDark ? "text-white" : "text-gray-800"
                                )}>{opt.name}</div>
                                <div className={cn(
                                  "text-xs",
                                  isDark ? "text-white/60" : "text-gray-600"
                                )}>{opt.desc}</div>
                              </div>
                              {selected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                            </div>
                            <div
                              className={`w-full h-16 rounded border border-white/15 flex items-center justify-center text-[10px] tracking-wide uppercase opacity-70 chat-input-shell ${
                                opt.id === 'default'
                                  ? 'bg-white/10 backdrop-blur-md'
                                  : 'bg-black/30'
                              }`}
                            >
                              Aa
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className={cn(
                      "mt-2 p-3 rounded-lg border text-xs",
                      isDark 
                        ? "bg-white/5 border-white/10 text-white/60"
                        : "bg-black/5 border-black/10 text-gray-500"
                    )}>
                      Frosty adds stronger glass effect, brightness separation and a focus ring when
                      active.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className={cn(
                "flex justify-between items-center mt-6 pt-4 border-t shrink-0",
                isDark ? "border-white/10" : "border-black/10"
              )}>
                <div className={cn(
                  "text-xs",
                  isDark ? "text-white/60" : "text-gray-500"
                )}>
                  Current: {theme.mode} mode, {currentAccent.name}, {currentFont.name},{' '}
                  {currentBackground.name}
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-md text-sm font-medium accent-action-fill accent-action-ring"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
