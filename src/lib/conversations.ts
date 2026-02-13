import type { Message } from './api'

export interface StoredMessage extends Message {
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const response = await fetch('/api/conversations')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to list conversations')
  }

  const data = await response.json()
  return data.conversations
}

export async function getConversation(id: string): Promise<Conversation> {
  const response = await fetch(`/api/conversations/${id}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get conversation')
  }

  const data = await response.json()
  return data.conversation
}

export async function createConversation(messages: Message[]): Promise<Conversation> {
  const storedMessages: StoredMessage[] = messages.map((m) => ({
    ...m,
    timestamp: new Date().toISOString(),
  }))

  const response = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: storedMessages }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create conversation')
  }

  const data = await response.json()
  return data.conversation
}

export async function updateConversation(
  id: string,
  messages: Message[]
): Promise<Conversation> {
  const storedMessages: StoredMessage[] = messages.map((m) => ({
    ...m,
    timestamp: new Date().toISOString(),
  }))

  const response = await fetch(`/api/conversations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: storedMessages }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update conversation')
  }

  const data = await response.json()
  return data.conversation
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete conversation')
  }
}
