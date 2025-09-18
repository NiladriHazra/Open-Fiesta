// Compatibility layer: legacy imports from '@/lib/data' now re-export from '@/lib/db'
export { fetchThreads, createThread, deleteThread, updateThreadTitle } from '@/lib/db'
export { addMessage } from '@/lib/db'
