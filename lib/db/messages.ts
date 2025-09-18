import { supabase } from '@/lib/db/client'
import type { ChatMessage } from '@/lib/types'

export async function addMessage(params: {
  userId: string
  chatId: string
  message: ChatMessage
}): Promise<void> {
  const { userId, chatId, message } = params

  console.log('🔍 addMessage called:', {
    userId: userId?.substring(0, 8) + '...',
    chatId: chatId?.substring(0, 8) + '...',
    role: message.role,
    content: message.content?.substring(0, 50) + '...',
    modelId: message.modelId,
  })

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      owner_id: userId,
      role: message.role,
      content: message.content,
      model: message.modelId ?? null,
      content_json: null,
      metadata: null,
      created_at: message.ts ? new Date(message.ts).toISOString() : new Date().toISOString(),
    })
    .select()

  if (error) {
    console.error('❌ Database error inserting message:', error)
    throw error
  }

  console.log('✅ Message inserted successfully:', data?.[0]?.id)

  // Touch chat updated_at
  const { error: updateError } = await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)

  if (updateError) {
    console.error('⚠️ Failed to update chat timestamp:', updateError)
  }
}
