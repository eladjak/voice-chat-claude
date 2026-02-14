import { useState, useCallback, useRef, useEffect } from 'react'
import type { Message } from '../lib/api'
import {
  listConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  type ConversationSummary,
} from '../lib/conversations'

export interface ChatHistoryState {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  isLoading: boolean
  error: string | null
}

export function useChatHistory() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadConversations = useCallback(async () => {
    try {
      const list = await listConversations()
      setConversations(list)
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }, [])

  // Load conversation list on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const loadConversation = useCallback(async (id: string): Promise<Message[]> => {
    setIsLoading(true)
    setError(null)
    try {
      const conversation = await getConversation(id)
      setActiveConversationId(id)
      return conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load conversation'
      setError(message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveMessages = useCallback(
    async (messages: Message[]) => {
      if (messages.length === 0) return

      // Debounce saves to avoid excessive writes during rapid exchanges
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (activeConversationId) {
            await updateConversation(activeConversationId, messages)
          } else {
            const conversation = await createConversation(messages)
            setActiveConversationId(conversation.id)
          }
          // Refresh the list to show updated titles/timestamps
          await loadConversations()
        } catch (err) {
          console.error('Failed to save conversation:', err)
        }
      }, 500)
    },
    [activeConversationId, loadConversations]
  )

  const startNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setError(null)
  }, [])

  const removeConversation = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id)
        if (activeConversationId === id) {
          setActiveConversationId(null)
        }
        await loadConversations()
      } catch (err) {
        console.error('Failed to delete conversation:', err)
      }
    },
    [activeConversationId, loadConversations]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    conversations,
    activeConversationId,
    isLoading,
    error,
    loadConversation,
    saveMessages,
    startNewConversation,
    removeConversation,
    loadConversations,
  }
}
