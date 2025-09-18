'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { X, Chrome, Github } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message?: string
}

export default function AuthModal({ isOpen, onClose, title = "Sign in required", message = "Please sign in to send messages" }: AuthModalProps) {
  const { signInWithProvider } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSignIn = async (provider: 'google' | 'github') => {
    try {
      setLoading(provider)
      await signInWithProvider(provider)
      onClose()
    } catch (error) {
      console.error('Error signing in:', error)
      setLoading(null)
    }
  }

  const handleGoToSignIn = () => {
    onClose()
    router.push('/signin')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <img
              src="/brand.svg"
              alt="AI Fiesta"
              className="mx-auto h-12 w-12 rounded-lg mb-4"
            />
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-sm text-zinc-400">{message}</p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleSignIn('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600"
            >
              {loading === 'google' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Chrome size={18} />
              )}
              Continue with Google
            </Button>

            <Button
              onClick={() => handleSignIn('github')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-600"
            >
              {loading === 'github' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Github size={18} />
              )}
              Continue with GitHub
            </Button>

            <div className="text-center">
              <button
                onClick={handleGoToSignIn}
                className="text-sm text-zinc-400 hover:text-white transition-colors underline"
              >
                Or go to sign in page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
