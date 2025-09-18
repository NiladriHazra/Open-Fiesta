'use client';
export default function Loading({ backgroundClass }: { backgroundClass: string }) {
  return (
    <div className={`min-h-screen w-full ${backgroundClass} relative text-white`}>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-95" />
      <div className="relative z-10 px-3 lg:px-4 py-4 lg:py-6">
        <div className="flex gap-3 lg:gap-4">
          <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div
                role="status"
                aria-live="polite"
                className="w-full max-w-xs rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md shadow-xl p-6 text-center"
              >
                {/* Spinner */}
                <svg
                  className="mx-auto h-8 w-8 text-white/80 motion-safe:animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-90"
                    d="M22 12a10 10 0 0 1-10 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>

                <h2 className="mt-4 text-sm font-medium tracking-wide text-white/90">
                  Open Fiesta
                </h2>
                <p className="mt-1 text-xs text-white/60">Preparing your workspace…</p>
                <span className="sr-only">Loading</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
