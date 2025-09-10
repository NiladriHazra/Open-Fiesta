'use client'
import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'


interface Feature {
  id: number
  title: string
  description: string
  color?: string
  icon: string
}

interface ScrollCardsProps {
  features?: Feature[]
  animationDuration?: number
  threshold?: number
}


export default function ScrollCards({ 
  features = [],
  animationDuration = 600,
  threshold = 80
}: ScrollCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  // stable refs to avoid stale closures
  const indexRef = useRef<number>(0)
  const accRef = useRef<number>(0)         // accumulated delta magnitude for the current gesture
  const dirRef = useRef<number>(0)         // current gesture direction: +1 or -1
  const lockedRef = useRef<boolean>(false) // locked during animation
  const resetTimerRef = useRef<number | null>(null)
  const unlockTimerRef = useRef<number | null>(null)

  // keep ref in sync with state
  useEffect(() => {
    indexRef.current = currentIndex
  }, [currentIndex])


  useEffect(() => {
  const THRESHOLD = threshold
  const ANIMATION_DURATION = animationDuration
  const RESET_DELAY = 160

  // Create intersection observer to track when component is in view
  const componentRef = containerRef.current
  let isInView = false

  const observer = new IntersectionObserver(
    ([entry]) => {
      isInView = entry.isIntersecting && entry.intersectionRatio > 0.7
    },
    { threshold: [0.5, 0.7, 0.9], // More precise thresholds
    rootMargin: '-10% 0px -10% 0px' }
  )

  if (componentRef) {
    observer.observe(componentRef)
  }

  const handleWheel = (e: WheelEvent) => {
    // Only handle wheel events when component is in view
    if (!isInView) return

    // Additional snap check - ensure component is well-centered in viewport
const rect = componentRef?.getBoundingClientRect()
if (rect) {
  const viewportHeight = window.innerHeight
  const componentCenter = rect.top + rect.height / 2
  const viewportCenter = viewportHeight / 2
  const distanceFromCenter = Math.abs(componentCenter - viewportCenter)
  
  // Only activate if component is reasonably centered (within 20% of viewport height)
  if (distanceFromCenter > viewportHeight * 0.2) return
}

    const delta = e.deltaY
    if (delta === 0) return

    const direction = Math.sign(delta)
    const wantNext = direction > 0

    // Lock page scroll until all cards viewed
    if ((wantNext && indexRef.current >= features.length - 1) || (!wantNext && indexRef.current <= 0)) {
      return
    } else {
      e.preventDefault()
    }

    if (lockedRef.current) return

    if (dirRef.current === 0 || dirRef.current === direction) {
      accRef.current += Math.abs(delta)
    } else {
      accRef.current = Math.abs(delta)
    }
    dirRef.current = direction

    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => {
      accRef.current = 0
      dirRef.current = 0
      resetTimerRef.current = null
    }, RESET_DELAY)

    if (accRef.current < THRESHOLD) return

    lockedRef.current = true
    accRef.current = 0
    dirRef.current = 0
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }

    setCurrentIndex((prev) => wantNext ? Math.min(prev + 1, features.length - 1) : Math.max(prev - 1, 0))

    if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current)
    unlockTimerRef.current = window.setTimeout(() => {
      lockedRef.current = false
      unlockTimerRef.current = null
    }, ANIMATION_DURATION + 80)
  }

  window.addEventListener('wheel', handleWheel, { passive: false })

  return () => {
    window.removeEventListener('wheel', handleWheel)
    observer.disconnect()
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    if (unlockTimerRef.current) window.clearTimeout(unlockTimerRef.current)
  }
}, [features.length, threshold, animationDuration]);

  return (
    <div ref={containerRef} className={`h-[600px] flex items-center justify-center overflow-hidden border border-white/10 backdrop-blur-md bg-gray/10 shadow-2xl`}>
      <div className={`relative w-full max-w-md`} style={{ touchAction: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -48, scale: 0.98 }}
            transition={{ duration: animationDuration / 1000, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-2xl `}
          >
            <div className="h-full flex flex-col justify-center items-center text-center text-white">
              <div className="text-6xl mb-6">{features[currentIndex].icon}</div>
              <h2 className="text-3xl font-bold mb-4">{features[currentIndex].title}</h2>
              <p className="text-lg opacity-90 leading-relaxed">{features[currentIndex].description}</p>
              
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      
    </div>
  )
}