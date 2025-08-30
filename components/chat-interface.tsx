"use client"
import React, { forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect, useRef } from "react"
import HomeAiInput from "@/components/home/HomeAiInput"
// removed action icons import (Sparkles, Search, Code, GraduationCap)
import { mergeModels, useCustomModels } from "@/lib/customModels"
import type { AiModel } from "@/lib/types"
import MessageDisplay from '@/components/chat/MessageDisplay'

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  avatarUrl?
    : string // optional per-message avatar (model logo)
  avatarAlt?: string
}

export type ChatInterfaceRef = {
  sendTextExternal: (text: string, opts?: { modelLabel?: string }) => void
  loadMessages: (messages: Message[]) => void
  setLoading: (isLoading: boolean, opts?: { modelLabel?: string; modelType?: 'text' | 'image' | 'audio' }) => void
}

export const ChatInterface = forwardRef<ChatInterfaceRef, { hideInput?: boolean }>(function ChatInterface(
  { hideInput = false },
  ref
) {
  const [isDark, setIsDark] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'text' | 'image' | 'audio'>('text')
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastModelLabelRef = useRef<string | undefined>(undefined)
  const [customModels] = useCustomModels()
  const allModels = mergeModels(customModels)

  // Compute brand logo from a model
  const getBrandFromModel = (model?: AiModel): { src: string; alt: string } => {
    const fallback = '/brand.png'
    if (!model) return { src: fallback, alt: 'Open Fiesta' }
    const id = model.id.toLowerCase()
    const m = model.model.toLowerCase()
    const lbl = model.label.toLowerCase()
    if (m.startsWith('gpt-') || m.startsWith('o3') || m.startsWith('o4') || m.includes('openai') || /gpt\b/.test(lbl)) {
      return { src: 'https://cdn.simpleicons.org/openai/ffffff', alt: 'OpenAI / ChatGPT' }
    }
    if (m.includes('gemini') || m.includes('gemma') || id.includes('gemini')) {
      return { src: 'https://cdn.simpleicons.org/googlegemini/ffffff', alt: 'Google Gemini' }
    }
    if (m.includes('claude') || id.includes('claude')) {
      return { src: 'https://cdn.simpleicons.org/anthropic/ffffff', alt: 'Anthropic / Claude' }
    }
    return { src: fallback, alt: 'Open Fiesta' }
  }

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"))
    }

    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendText = async (text: string, modelLabel?: string) => {
    console.log('🎯 ChatInterface.sendText called with:', text);
    // Delegate to parent's handleSubmit instead of managing messages internally
    if (typeof window !== 'undefined' && (window as any).handleSubmit) {
      console.log('✅ Calling parent handleSubmit');
      (window as any).handleSubmit(text);
    } else {
      console.error('❌ No handleSubmit function found on window');
    }
  }

  // Expose an imperative API so parents (Home page) can send via their own inputs
  useImperativeHandle(ref, () => ({
    sendTextExternal: (text: string, opts?: { modelLabel?: string }) => sendText(text, opts?.modelLabel),
    loadMessages: (newMessages: Message[]) => setMessages(newMessages),
    setLoading: (on: boolean, opts?: { modelLabel?: string; modelType?: 'text' | 'image' | 'audio' }) => {
      if (typeof opts?.modelLabel === 'string') {
        lastModelLabelRef.current = opts.modelLabel
      }
      if (opts?.modelType) {
        setLoadingType(opts.modelType)
      }
      setIsLoading(on)
    },
  }))

  // Removed action buttons handler (no longer used)

  const handleExampleClick = (prompt: string) => {
    sendText(prompt)
    console.log(`[v0] Example clicked: ${prompt}`)
  }

  const AnimatedOrb = () => (
    <motion.div
      className="relative w-10 h-10 lg:w-12 lg:h-12 rounded-full flex-shrink-0"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
    >
      {/* Outer glow */}
      <motion.div
        className={`absolute -inset-2 rounded-full blur-lg ${
          isDark
            ? "bg-gradient-radial from-red-500/40 via-orange-600/20 to-transparent"
            : "bg-gradient-radial from-orange-400/40 via-red-500/20 to-transparent"
        }`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Main orb body */}
      <motion.div
        className={`absolute inset-0 rounded-full ${
          isDark
            ? "bg-gradient-radial from-red-400/90 via-red-500/80 to-red-600/90"
            : "bg-gradient-radial from-orange-300/90 via-orange-400/80 to-orange-500/90"
        } shadow-2xl`}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Inner highlight */}
      <motion.div
        className={`absolute inset-1 rounded-full ${
          isDark
            ? "bg-gradient-radial from-red-300/80 via-red-400/60 to-transparent"
            : "bg-gradient-radial from-orange-200/80 via-orange-300/60 to-transparent"
        }`}
        animate={{
          rotate: [0, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          rotate: { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
          scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        }}
      />

      {/* Core light */}
      <motion.div
        className={`absolute inset-3 rounded-full ${isDark ? "bg-red-200/90" : "bg-orange-100/90"} backdrop-blur-sm`}
        animate={{
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 1.5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Sparkle effect */}
      <motion.div
        className={`absolute inset-4 rounded-full ${isDark ? "bg-white/60" : "bg-white/80"} blur-sm`}
        animate={{
          scale: [0.8, 1.2, 0.8],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  )

  // Compact avatar component for assistant
  const AssistantAvatar: React.FC<{ url?: string; alt?: string }> = ({ url, alt }) => {
    if (url) {
      return (
        <div className="relative w-10 h-10 lg:w-12 lg:h-12 flex-shrink-0 rounded-full ring-1 ring-white/10 overflow-hidden bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt || 'Model'}
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/brand.png'
            }}
          />
        </div>
      )
    }
    return <AnimatedOrb />
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 overflow-y-auto" style={{ paddingBottom: hideInput ? "80px" : "200px" }}>
        {messages.length > 0 ? (
          <div className="p-3 lg:p-4 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
                >
                  <MessageDisplay 
                    message={msg} 
                    isDark={isDark} 
                    AssistantAvatar={AssistantAvatar}
                    onEditMessage={(messageId, content) => {
                      // Pass edit functionality to parent
                      if (typeof window !== 'undefined' && (window as any).handleEditMessage) {
                        (window as any).handleEditMessage(messageId, content)
                      }
                    }}
                    onShareMessage={(message) => {
                      // Pass share functionality to parent
                      if (typeof window !== 'undefined' && (window as any).handleShareMessage) {
                        (window as any).handleShareMessage(message)
                      }
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading animation with type-specific skeletons */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
                className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4"
              >
                <AssistantAvatar />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs lg:text-sm font-medium text-zinc-400">
                      {lastModelLabelRef.current || 'AI Assistant'}
                    </span>
                  </div>
                  
                  {/* Only show a minimal text loading indicator; media placeholders are handled by MarkdownLite */}
                  {loadingType === 'text' && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              isDark ? "bg-red-400" : "bg-orange-500"
                            }`}
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs lg:text-sm text-zinc-500">Thinking...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            <div className="h-8" />
            <div ref={messagesEndRef} />
          </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-full p-4 lg:p-6">
          <div className="relative w-full max-w-4xl">
            {/* Soft radial backdrop to blend with page background */}
            <div
              aria-hidden
              className={`pointer-events-none absolute -inset-x-10 -top-6 h-[520px] rounded-[40px] blur-2xl -z-10 ${
                isDark
                  ? 'bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,90,90,0.08)_0%,rgba(255,120,60,0.06)_25%,rgba(0,0,0,0)_70%)]'
                  : 'bg-[radial-gradient(60%_60%_at_50%_30%,rgba(255,176,102,0.20)_0%,rgba(255,214,150,0.14)_30%,rgba(255,255,255,0)_75%)]'
              }`}
            />
            {/* Action Buttons removed */}

            {/* Heading */}
            <motion.div
              className="mb-6 lg:mb-8 px-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <h2
                className={`${
                  isDark
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/70'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-orange-900 via-orange-800 to-orange-700'
                } text-lg lg:text-2xl font-semibold tracking-tight`}
              >
                What do you want to ask?
              </h2>
              <p className={`${isDark ? 'text-white/60' : 'text-orange-900/70'} text-xs lg:text-sm mt-1`}>
                Try a suggestion below or type your own question.
              </p>
            </motion.div>

            {/* Example Prompts */}
            <motion.div
              style={{ perspective: 1200 }}
              className="flex flex-wrap gap-3 lg:gap-4 mb-16 lg:mb-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {[
                "Write a haiku about Monday mornings.",
                "Explain quantum physics like I'm a golden retriever.",
                "Invent a new ice‑cream flavor and its ad.",
                "Roast me gently, but make it motivating.",
              ].map((prompt, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className={`group cursor-pointer relative overflow-hidden inline-flex w-auto max-w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-2xl text-sm lg:text-base font-medium transition-all duration-300 backdrop-blur-lg shadow-md hover:shadow-xl will-change-transform ${
                    isDark
                      ? "text-white/85 hover:text-white bg-gradient-to-br from-black/35 via-black/25 to-black/15 border border-white/10 hover:border-white/20 ring-1 ring-red-400/10 hover:ring-red-400/20 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
                      : "text-orange-950/80 hover:text-orange-950 bg-gradient-to-br from-orange-50/80 to-orange-100/70 border border-orange-200/70 hover:border-orange-300"
                  }`}
                  whileHover={{ x: 4, y: -2, scale: 1.02, rotateX: 2, rotateY: -1 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Left accent stripe */}
                  <span
                    className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                      isDark
                        ? 'bg-gradient-to-b from-red-400/40 via-red-500/25 to-orange-400/40'
                        : 'bg-gradient-to-b from-orange-400/60 via-orange-300/40 to-red-400/50'
                    }`}
                  />

                  {/* Subtle glow overlay on hover */}
                  <span
                    className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      isDark
                        ? 'bg-gradient-to-r from-red-500/5 via-transparent to-transparent'
                        : 'bg-gradient-to-r from-orange-400/10 via-transparent to-transparent'
                    }`}
                  />

                  {/* Center soft glow for blend */}
                  <span
                    className={`pointer-events-none absolute inset-0 -z-0 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300 ${
                      isDark ? 'bg-[radial-gradient(40%_60%_at_30%_50%,rgba(255,120,90,0.12)_0%,rgba(0,0,0,0)_70%)]' : 'bg-[radial-gradient(40%_60%_at_30%_50%,rgba(255,170,120,0.25)_0%,rgba(255,255,255,0)_70%)]'
                    }`}
                  />

                  {/* Top glossy highlight for glass effect */}
                  <span
                    className={`pointer-events-none absolute left-2 right-2 top-0 h-px opacity-50 ${
                      isDark ? 'bg-white/15' : 'bg-orange-400/30'
                    }`}
                  />

                  {/* Bottom soft shadow inside the card to add depth */}
                  <span
                    className={`pointer-events-none absolute left-2 right-2 bottom-0 h-6 rounded-b-2xl ${
                      isDark
                        ? 'bg-gradient-to-t from-black/40 via-black/0 to-transparent'
                        : 'bg-gradient-to-t from-orange-900/10 via-transparent to-transparent'
                    }`}
                  />

                  <span className="relative z-[1] whitespace-normal">{prompt}</span>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
        )}
      </div>

      {!hideInput && (
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-6 backdrop-blur-md bg-gradient-to-t from-black/20 to-transparent z-20">
          <div className="w-full max-w-4xl mx-auto">
            <HomeAiInput isDark={isDark} onSubmit={(t) => sendText(t)} />
          </div>
        </div>
      )}
    </div>
  )
})
