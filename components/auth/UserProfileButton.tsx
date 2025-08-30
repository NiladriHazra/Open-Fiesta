"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/themeContext'
import { ACCENT_COLORS } from '@/lib/themes'

interface UserProfileButtonProps {
  avatarUrl?: string
  initials: string
  displayName: string
  firstName: string
  className?: string
}

export default function UserProfileButton({ avatarUrl, initials, displayName, firstName, className }: UserProfileButtonProps) {
  const { theme } = useTheme()
  const accent = ACCENT_COLORS[theme.accent]

  return (
    <button
      type="button"
      aria-label={`User: ${displayName}`}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden cursor-default select-none',
        'h-10 xl:h-12 rounded-md xl:rounded-xl px-3 transition-all duration-300 shadow-lg border border-white/15',
        'bg-gradient-to-r from-white/12 to-white/8 backdrop-blur-sm text-white hover:from-white/18 hover:to-white/12',
        'w-[150px] hover:w-[220px]',
        className,
      )}
    >
      <div className="h-6 xl:h-8 w-6 xl:w-8 rounded xl:rounded-lg overflow-hidden bg-gradient-to-br from-white/20 to-white/10 flex items-center justify-center shrink-0 ring-2 ring-white/20 shadow-sm">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-bold text-white/90">{initials}</span>
        )}
      </div>
      {/* Text wrapper: shows first name by default, full name on hover */}
      <div className="relative flex-1 min-w-0">
        <span className="block truncate transition-opacity duration-200 group-hover:opacity-0 text-sm font-medium text-white/90" title={firstName}>
          {firstName}
        </span>
        <span className="pointer-events-none absolute inset-0 truncate opacity-0 transition-opacity duration-200 group-hover:opacity-100 text-sm font-medium text-white/90" title={displayName}>
          {displayName}
        </span>
      </div>
    </button>
  )
}
